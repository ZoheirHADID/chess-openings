import { Chess } from 'chess.js'

/**
 * Pilotage de Stockfish 18 (WASM, GPL-3.0) dans un Web Worker, via le protocole UCI.
 * Variante « lite single-thread » : aucun en-tete COOP/COEP necessaire.
 *
 * Deux files coexistent : l'analyse de la position affichee (prioritaire) et des
 * evaluations ponctuelles demandees en arriere-plan — notamment celle de la
 * position precedente, qui permet de juger le coup joue.
 */

const ENGINE_URL = `${import.meta.env.BASE_URL}engine/stockfish-18-lite-single.js`

export interface EngineLine {
  /** Rang de la variante (1 = meilleure). */
  rank: number
  /** Evaluation en centipions, du point de vue des blancs. */
  cp: number | null
  /** Mat en N coups, du point de vue des blancs (positif = les blancs matent). */
  mate: number | null
  /** Premiers coups de la variante, en notation algebrique. */
  sans: string[]
  /** Coup joue, en notation UCI. */
  uci: string
  depth: number
}

export interface EngineSnapshot {
  fen: string
  depth: number
  lines: EngineLine[]
  /** Vrai tant que le moteur calcule. */
  thinking: boolean
  /** Incremente a chaque mise a jour, y compris des evaluations d'arriere-plan. */
  version: number
}

/** Evaluation conservee pour une position deja analysee. */
export interface StoredEval {
  cp: number | null
  mate: number | null
  depth: number
  bestSan?: string
  /** Seconde meilleure variante (MultiPV 2) : sert a reperer le seul bon coup. */
  second?: { cp: number | null; mate: number | null }
}

type Listener = (snapshot: EngineSnapshot) => void

/** Profondeur des analyses d'arriere-plan (position precedente). */
const SIDE_DEPTH = 14
/** En dessous, une evaluation est trop superficielle pour juger un coup. */
export const JUDGE_MIN_DEPTH = 10

/** Convertit une variante UCI en coups algebriques lisibles. */
function uciToSans(fen: string, uciMoves: string[], limit = 6): string[] {
  const chess = new Chess(fen)
  const sans: string[] = []
  for (const uci of uciMoves.slice(0, limit)) {
    try {
      const move = chess.move({
        from: uci.slice(0, 2),
        to: uci.slice(2, 4),
        promotion: uci.length > 4 ? uci[4] : undefined,
      })
      sans.push(move.san)
    } catch {
      break
    }
  }
  return sans
}

class Engine {
  private worker: Worker | null = null
  private ready = false
  private starting: Promise<void> | null = null
  private listeners = new Set<Listener>()

  /** Position en cours d'analyse et nature de cette analyse. */
  private analysingFen = ''
  private mode: 'main' | 'side' = 'main'
  private thinking = false

  /** Resultat de l'analyse principale. */
  private mainFen = ''
  private lines = new Map<number, EngineLine>()
  private depth = 0
  private version = 0

  /** Analyses d'arriere-plan. */
  private history = new Map<string, StoredEval>()
  private sideQueue: string[] = []
  private sideResult: StoredEval | null = null

  private multiPv = 3
  private pendingMain: { fen: string; depth: number } | null = null

  failure: string | null = null

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  /** Evaluation deja connue d'une position. */
  getEval(fen: string): StoredEval | undefined {
    return this.history.get(fen)
  }

  private emit() {
    this.version++
    const snapshot: EngineSnapshot = {
      fen: this.mainFen,
      depth: this.depth,
      thinking: this.thinking && this.mode === 'main',
      version: this.version,
      lines: [...this.lines.values()].sort((a, b) => a.rank - b.rank),
    }
    for (const listener of this.listeners) listener(snapshot)
  }

  private start(): Promise<void> {
    if (this.starting) return this.starting
    this.starting = new Promise<void>((resolve, reject) => {
      try {
        this.worker = new Worker(ENGINE_URL)
      } catch (err) {
        this.failure = err instanceof Error ? err.message : 'Worker indisponible'
        reject(err)
        return
      }

      const timeout = setTimeout(() => {
        this.failure = 'Le moteur n’a pas répondu (chargement trop long)'
        reject(new Error(this.failure))
      }, 40_000)

      this.worker.onerror = (event) => {
        clearTimeout(timeout)
        this.failure = event.message || 'Erreur de chargement du moteur'
        reject(new Error(this.failure))
      }

      this.worker.onmessage = (event: MessageEvent) => {
        const line = typeof event.data === 'string' ? event.data : String(event.data?.data ?? '')
        if (line === 'uciok') {
          this.send(`setoption name MultiPV value ${this.multiPv}`)
          this.send('isready')
        } else if (line === 'readyok' && !this.ready) {
          clearTimeout(timeout)
          this.ready = true
          resolve()
        } else {
          this.handle(line)
        }
      }

      this.send('uci')
    })
    return this.starting
  }

  private send(command: string) {
    this.worker?.postMessage(command)
  }

  private handle(line: string) {
    if (line.startsWith('bestmove')) {
      this.thinking = false
      if (this.mode === 'side' && this.sideResult) {
        const known = this.history.get(this.analysingFen)
        if (!known || known.depth <= this.sideResult.depth) this.history.set(this.analysingFen, this.sideResult)
        this.sideResult = null
      }
      this.emit()
      this.next()
      return
    }
    if (!line.startsWith('info ') || !line.includes(' pv ')) return

    const depthMatch = /\bdepth (\d+)/.exec(line)
    const multiMatch = /\bmultipv (\d+)/.exec(line)
    const cpMatch = /\bscore cp (-?\d+)/.exec(line)
    const mateMatch = /\bscore mate (-?\d+)/.exec(line)
    const pvMatch = /\bpv (.+)$/.exec(line)
    if (!depthMatch || !pvMatch) return

    const rank = multiMatch ? Number(multiMatch[1]) : 1
    const depth = Number(depthMatch[1])
    const uciMoves = pvMatch[1].trim().split(/\s+/)
    const sans = uciToSans(this.analysingFen, uciMoves)
    if (sans.length === 0) return

    // Les scores UCI sont donnes du point de vue du trait : on repasse cote blancs
    const whiteToMove = this.analysingFen.split(' ')[1] !== 'b'
    const sign = whiteToMove ? 1 : -1
    const cp = cpMatch ? sign * Number(cpMatch[1]) : null
    const mate = mateMatch ? sign * Number(mateMatch[1]) : null

    if (this.mode === 'side') {
      if (rank === 1) this.sideResult = { cp, mate, depth, bestSan: sans[0], second: this.sideResult?.second }
      else if (rank === 2 && this.sideResult) this.sideResult.second = { cp, mate }
      return
    }

    this.lines.set(rank, { rank, depth, cp, mate, sans, uci: uciMoves[0] ?? '' })
    this.depth = Math.max(this.depth, depth)
    this.thinking = true
    // L'analyse principale alimente aussi l'historique des evaluations
    if (rank === 1) {
      const second = this.lines.get(2)
      this.history.set(this.analysingFen, {
        cp,
        mate,
        depth,
        bestSan: sans[0],
        second: second ? { cp: second.cp, mate: second.mate } : undefined,
      })
    } else if (rank === 2) {
      const stored = this.history.get(this.analysingFen)
      if (stored) stored.second = { cp, mate }
    }
    this.emit()
  }

  /** Enchaine sur la position en attente, sinon sur la file d'arriere-plan. */
  private next() {
    if (this.pendingMain) {
      const target = this.pendingMain
      this.pendingMain = null
      void this.analyse(target.fen, target.depth)
      return
    }
    const fen = this.sideQueue.shift()
    if (fen && !this.isSettled(fen)) this.run(fen, SIDE_DEPTH, 'side')
  }

  /** Une evaluation assez profonde existe deja pour cette position. */
  private isSettled(fen: string): boolean {
    return (this.history.get(fen)?.depth ?? 0) >= JUDGE_MIN_DEPTH
  }

  private run(fen: string, depth: number, mode: 'main' | 'side') {
    this.mode = mode
    this.analysingFen = fen
    this.thinking = true
    if (mode === 'main') {
      this.mainFen = fen
      this.lines.clear()
      this.depth = 0
      this.emit()
    }
    this.send('ucinewgame')
    this.send(`position fen ${fen}`)
    this.send(`go depth ${depth}`)
  }

  /** Analyse la position affichee. Toute analyse en cours est interrompue. */
  async analyse(fen: string, depth = 16) {
    if (this.failure) return
    try {
      await this.start()
    } catch {
      this.emit()
      return
    }
    if (this.thinking) {
      this.pendingMain = { fen, depth }
      this.send('stop')
      return
    }
    this.run(fen, depth, 'main')
  }

  /** Demande, sans urgence, l'evaluation d'une position (position precedente). */
  async requestEval(fen: string) {
    if (this.failure || !fen) return
    // Une evaluation superficielle (analyse principale interrompue tot) est refaite
    if (this.isSettled(fen) || this.sideQueue.includes(fen)) return
    this.sideQueue.push(fen)
    if (this.sideQueue.length > 20) this.sideQueue.shift()
    try {
      await this.start()
    } catch {
      return
    }
    if (!this.thinking) this.next()
  }

  stop() {
    this.pendingMain = null
    this.sideQueue.length = 0
    if (this.thinking) this.send('stop')
  }

  dispose() {
    this.worker?.terminate()
    this.worker = null
    this.ready = false
    this.starting = null
    this.thinking = false
  }
}

export const engine = new Engine()

/** Score en pions, du point de vue des blancs (borne pour l'affichage). */
export function evalToPawns(line: { cp: number | null; mate: number | null } | undefined): number | null {
  if (!line) return null
  if (line.mate !== null) return line.mate > 0 ? 10 : -10
  if (line.cp === null) return null
  return Math.max(-10, Math.min(10, line.cp / 100))
}

/** Libelle court : « +1.4 », « −0.6 », « M4 ». */
export function formatEval(line: { cp: number | null; mate: number | null } | undefined): string {
  if (!line) return '—'
  if (line.mate !== null) return `${line.mate > 0 ? '' : '−'}M${Math.abs(line.mate)}`
  if (line.cp === null) return '—'
  const pawns = line.cp / 100
  const rounded = Math.abs(pawns).toFixed(pawns === 0 ? 1 : Math.abs(pawns) >= 10 ? 0 : 1)
  return `${pawns >= 0 ? '+' : '−'}${rounded}`
}

/**
 * Part de l'echiquier revenant aux blancs dans la barre d'evaluation (0 a 1).
 * Courbe logistique classique : ±3 pions ≈ 85 %.
 */
export function evalToShare(line: { cp: number | null; mate: number | null } | undefined): number {
  const pawns = evalToPawns(line)
  if (pawns === null) return 0.5
  return 1 / (1 + Math.exp(-0.6 * pawns))
}

/** Evaluation en centipions ramenee au point de vue d'un camp. */
export function scoreFor(value: Pick<StoredEval, 'cp' | 'mate'> | undefined, color: 'w' | 'b'): number | null {
  if (!value) return null
  const sign = color === 'w' ? 1 : -1
  if (value.mate !== null) return sign * value.mate > 0 ? 10_000 : -10_000
  if (value.cp === null) return null
  return sign * value.cp
}

export type MoveQuality =
  | 'brilliant'
  | 'great'
  | 'best'
  | 'excellent'
  | 'good'
  | 'book'
  | 'inaccuracy'
  | 'mistake'
  | 'miss'
  | 'blunder'

export interface MoveVerdict {
  quality: MoveQuality
  /** Perte en centipions par rapport au meilleur coup. */
  loss: number
  /** Perte en points de pourcentage de victoire (bareme Lichess). */
  drop: number
  /** Coup que le moteur aurait joue. */
  best?: string
  label: string
}

export const QUALITY_LABEL: Record<MoveQuality, string> = {
  brilliant: 'Brillant',
  great: 'Excellent',
  best: 'Meilleur coup',
  excellent: 'Très bon coup',
  good: 'Bon coup',
  book: 'Théorie',
  inaccuracy: 'Imprécision',
  mistake: 'Erreur',
  miss: 'Occasion manquée',
  blunder: 'Gaffe',
}

/** Pastille posee sur l'echiquier : glyphe et couleur, dans l'esprit de chess.com. */
export interface QualityBadge {
  glyph: string
  color: string
  /** Texte sombre (fonds clairs). */
  dark?: boolean
  label: string
}

export const QUALITY_BADGE: Record<MoveQuality, QualityBadge> = {
  brilliant: { glyph: '!!', color: '#26c2a3', label: QUALITY_LABEL.brilliant },
  great: { glyph: '!', color: '#5b8bb0', label: QUALITY_LABEL.great },
  best: { glyph: '★', color: '#81b64c', label: QUALITY_LABEL.best },
  excellent: { glyph: '!', color: '#96bc4b', label: QUALITY_LABEL.excellent },
  good: { glyph: '✓', color: '#96af8b', label: QUALITY_LABEL.good },
  book: { glyph: '▤', color: '#a88865', label: QUALITY_LABEL.book },
  inaccuracy: { glyph: '?!', color: '#f7c631', dark: true, label: QUALITY_LABEL.inaccuracy },
  mistake: { glyph: '?', color: '#ffa459', dark: true, label: QUALITY_LABEL.mistake },
  miss: { glyph: '✗', color: '#ff7769', label: QUALITY_LABEL.miss },
  blunder: { glyph: '??', color: '#fa412d', label: QUALITY_LABEL.blunder },
}

/**
 * Pourcentage de victoire (0 a 100) du camp qui joue, d'apres une evaluation
 * exprimee de son point de vue. Formule Lichess (calibree sur les parties reelles).
 */
export function winPercent(score: number): number {
  if (score >= 10_000) return 100
  if (score <= -10_000) return 0
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * score)) - 1)
}

const PIECE_VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

/**
 * Le coup abandonne-t-il du materiel ? Une piece (pas un pion) qui se pose sur une
 * case ou l'adversaire peut la prendre sans compensation immediate, ou une capture
 * d'une piece de moindre valeur suivie d'une reprise.
 */
function isSacrifice(fenBefore: string, san: string): boolean {
  try {
    const chess = new Chess(fenBefore)
    const move = chess.move(san)
    if (!move || move.piece === 'k' || move.piece === 'p') return false
    const mover = move.color
    const enemy = mover === 'w' ? 'b' : 'w'
    const attackers = chess.attackers(move.to, enemy)
    if (attackers.length === 0) return false
    const value = PIECE_VALUE[move.promotion ?? move.piece]
    if (move.captured) return PIECE_VALUE[move.captured] < value
    const cheapest = Math.min(...attackers.map((sq) => PIECE_VALUE[chess.get(sq)?.type ?? 'q']))
    const defended = chess.attackers(move.to, mover).length > 0
    return !defended || cheapest < value
  } catch {
    return false
  }
}

export interface JudgeContext {
  /** Position avant le coup, pour detecter un sacrifice. */
  fenBefore?: string
  /** Le coup figure dans l'arbre theorique. */
  inBook?: boolean
}

/**
 * Compare la position avant et apres le coup pour le classer, selon les criteres
 * des analyses Lichess (perte en pourcentage de victoire) et chess.com (categories
 * Brillant / Excellent / Meilleur / Très bon / Bon / Imprécision / Erreur / Occasion
 * manquée / Gaffe).
 */
export function judgeMove(
  before: StoredEval | undefined,
  after: StoredEval | undefined,
  moverColor: 'w' | 'b',
  playedSan: string,
  context: JudgeContext = {},
): MoveVerdict | null {
  // Une analyse trop superficielle ne voit pas encore la refutation d'un mauvais coup :
  // on attend que les deux positions soient evaluees a une profondeur suffisante.
  if (!before || !after || before.depth < JUDGE_MIN_DEPTH || after.depth < JUDGE_MIN_DEPTH) return null
  const scoreBefore = scoreFor(before, moverColor)
  const scoreAfter = scoreFor(after, moverColor)
  if (scoreBefore === null || scoreAfter === null) return null

  const loss = Math.max(0, scoreBefore - scoreAfter)
  const wpBefore = winPercent(scoreBefore)
  const wpAfter = winPercent(scoreAfter)
  const drop = Math.max(0, wpBefore - wpAfter)
  const playedBest = before?.bestSan === playedSan || drop < 0.5

  let quality: MoveQuality
  if (playedBest) {
    quality = 'best'
    const wasWinning = wpBefore >= 90
    const second = before?.second ? scoreFor(before.second, moverColor) : null
    // Seul bon coup : la seconde variante du moteur perd nettement plus
    if (second !== null && !wasWinning && wpBefore - winPercent(second) >= 10) quality = 'great'
    // Sacrifice sain dans une position pas encore gagnee
    if (!wasWinning && wpAfter >= 35 && context.fenBefore && isSacrifice(context.fenBefore, playedSan)) {
      quality = 'brilliant'
    }
  } else if (drop < 2) quality = 'excellent'
  else if (drop < 5) quality = 'good'
  else if (drop < 10) quality = 'inaccuracy'
  else if (drop < 20) quality = 'mistake'
  else quality = 'blunder'

  // Occasion manquee : on tenait un gain net (mat ou gros avantage) et on le laisse filer
  const hadWin = (before?.mate !== null && before?.mate !== undefined && scoreBefore > 0) || wpBefore >= 85
  if (hadWin && (quality === 'mistake' || quality === 'blunder') && wpAfter < 80) quality = 'miss'

  // Coup de theorie correct (ni le meilleur, ni fautif) : pastille « livre »
  if (context.inBook && (quality === 'excellent' || quality === 'good')) quality = 'book'

  return {
    quality,
    loss,
    drop,
    best: before?.bestSan,
    label: QUALITY_LABEL[quality],
  }
}
