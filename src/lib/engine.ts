import { Chess } from 'chess.js'

/**
 * Pilotage de Stockfish 18 (WASM, GPL-3.0) dans un Web Worker, via le protocole UCI.
 * Variante « lite single-thread » : aucun en-tete COOP/COEP necessaire.
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
}

type Listener = (snapshot: EngineSnapshot) => void

/** Convertit une variante UCI en coups algebriques lisibles. */
function uciToSans(fen: string, uciMoves: string[], limit = 6): { sans: string[]; first: string } {
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
  return { sans, first: uciMoves[0] ?? '' }
}

class Engine {
  private worker: Worker | null = null
  private ready = false
  private starting: Promise<void> | null = null
  private listeners = new Set<Listener>()
  private currentFen = ''
  private lines = new Map<number, EngineLine>()
  private depth = 0
  private thinking = false
  private multiPv = 3
  /** Derniere position demandee tant que le moteur n'a pas confirme l'arret. */
  private pending: { fen: string; depth: number } | null = null

  failure: string | null = null

  subscribe(listener: Listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit() {
    const snapshot: EngineSnapshot = {
      fen: this.currentFen,
      depth: this.depth,
      thinking: this.thinking,
      lines: [...this.lines.values()].sort((a, b) => a.rank - b.rank),
    }
    for (const listener of this.listeners) listener(snapshot)
  }

  /** Demarre le worker et attend `uciok` / `readyok`. */
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
      }, 30_000)

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
      this.emit()
      if (this.pending) {
        const next = this.pending
        this.pending = null
        void this.analyse(next.fen, next.depth)
      }
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
    const { sans, first } = uciToSans(this.currentFen, uciMoves)
    if (sans.length === 0) return

    // Les scores UCI sont donnes du point de vue du trait : on repasse cote blancs
    const whiteToMove = this.currentFen.split(' ')[1] !== 'b'
    const sign = whiteToMove ? 1 : -1

    this.lines.set(rank, {
      rank,
      depth,
      cp: cpMatch ? sign * Number(cpMatch[1]) : null,
      mate: mateMatch ? sign * Number(mateMatch[1]) : null,
      sans,
      uci: first,
    })
    this.depth = Math.max(this.depth, depth)
    this.thinking = true
    this.emit()
  }

  /** Lance l'analyse d'une position (FEN). Toute analyse en cours est interrompue. */
  async analyse(fen: string, depth = 16) {
    if (this.failure) return
    try {
      await this.start()
    } catch {
      this.emit()
      return
    }
    if (this.thinking) {
      // On attend le `bestmove` de l'analyse precedente avant d'enchainer
      this.pending = { fen, depth }
      this.send('stop')
      return
    }
    this.currentFen = fen
    this.lines.clear()
    this.depth = 0
    this.thinking = true
    this.emit()
    this.send('ucinewgame')
    this.send(`position fen ${fen}`)
    this.send(`go depth ${depth}`)
  }

  stop() {
    this.pending = null
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
export function evalToPawns(line: EngineLine | undefined): number | null {
  if (!line) return null
  if (line.mate !== null) return line.mate > 0 ? 10 : -10
  if (line.cp === null) return null
  return Math.max(-10, Math.min(10, line.cp / 100))
}

/** Libelle court : « +1.4 », « −0.6 », « M4 ». */
export function formatEval(line: EngineLine | undefined): string {
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
export function evalToShare(line: EngineLine | undefined): number {
  const pawns = evalToPawns(line)
  if (pawns === null) return 0.5
  return 1 / (1 + Math.exp(-0.6 * pawns))
}
