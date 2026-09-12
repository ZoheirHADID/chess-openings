import { Chess } from 'chess.js'
import { scoreFor, type EngineLine, type MoveVerdict, type StoredEval } from './engine'
import { motifsOf } from './explain'

/**
 * Explication d'une faute (imprecision, erreur, occasion manquee, gaffe),
 * construite a partir des evaluations Stockfish : bascule d'evaluation, ce que
 * le coup concede, ce qu'il fallait jouer et pourquoi, punition adverse.
 */
export interface FaultExplanation {
  /** « Pourquoi c'est une imprécision ». */
  title: string
  /** Bascule d'evaluation avant / apres, du point de vue du joueur. */
  swing: string
  /** Ce que le coup concede : faits verifies dans la position. */
  concedes: string[]
  /** Coup recommande par le moteur, sa variante et ses idees. */
  better?: { san: string; line: string; reasons: string[] }
  /** Comment l'adversaire exploite la faute. */
  punishment?: { line: string; points: string[] }
}

const PIECE_NAMES: Record<string, string> = {
  p: 'pion',
  n: 'cavalier',
  b: 'fou',
  r: 'tour',
  q: 'dame',
  k: 'roi',
}
const FEMININE = new Set(['r', 'q'])
const article = (type: string) => (FEMININE.has(type) ? 'la' : 'le')
const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 }

const FAULTS = new Set<MoveVerdict['quality']>(['inaccuracy', 'mistake', 'miss', 'blunder'])
const FAULT_TITLE: Partial<Record<MoveVerdict['quality'], string>> = {
  inaccuracy: 'Pourquoi c’est une imprécision',
  mistake: 'Pourquoi c’est une erreur',
  miss: 'Pourquoi c’est une occasion manquée',
  blunder: 'Pourquoi c’est une gaffe',
}
/** Demi-coups de la variante pris en compte. */
const PLIES = 6

type Square = Parameters<Chess['get']>[0]

/** Materiel d'un camp, en points. */
function material(chess: Chess, color: 'w' | 'b'): number {
  let total = 0
  for (const row of chess.board()) {
    for (const piece of row) if (piece && piece.color === color) total += VALUES[piece.type]
  }
  return total
}

/** Pieces d'un camp attaquees sans defense suffisante. */
function hangingPieces(chess: Chess, victim: 'w' | 'b'): { square: string; type: string }[] {
  const enemy = victim === 'w' ? 'b' : 'w'
  const found: { square: string; type: string }[] = []
  for (const row of chess.board()) {
    for (const piece of row) {
      if (!piece || piece.color !== victim || piece.type === 'k') continue
      const attackers = chess.attackers(piece.square, enemy)
      if (attackers.length === 0) continue
      const defended = chess.attackers(piece.square, victim).length > 0
      const cheapest = Math.min(...attackers.map((sq) => VALUES[chess.get(sq as Square)?.type ?? 'q']))
      if (!defended || cheapest < VALUES[piece.type]) found.push({ square: piece.square, type: piece.type })
    }
  }
  return found.sort((a, b) => VALUES[b.type] - VALUES[a.type])
}

/** « un pion », « deux pions », « une pièce mineure », « la qualité »… */
function describeLoss(points: number, captures: string[]): string {
  if (points >= 9) return 'la dame'
  if (points === 5) return 'une tour'
  if (points === 3) return 'une pièce mineure'
  if (points === 2) return captures.some((c) => c.includes('tour')) ? 'la qualité' : 'deux pions'
  if (points === 1) return 'un pion'
  return `du matériel (${points} points)`
}

/** Variante numerotee a partir d'une position. */
export function numberLine(fen: string, sans: string[]): string {
  const parts = fen.split(' ')
  const whiteToMove = parts[1] !== 'b'
  let move = Number(parts[5] ?? 1)
  const out: string[] = []
  sans.forEach((san, i) => {
    const white = whiteToMove ? i % 2 === 0 : i % 2 === 1
    if (white) out.push(`${move}.${san}`)
    else {
      out.push(i === 0 ? `${move}...${san}` : san)
      move++
    }
  })
  return out.join(' ')
}

/** Evaluation en pions, signee, du point de vue du joueur : « +0,4 », « −1,2 », « mat en 3 ». */
function formatScore(value: Pick<StoredEval, 'cp' | 'mate'> | undefined, mover: 'w' | 'b'): string | null {
  if (!value) return null
  if (value.mate !== null) {
    const forMover = (mover === 'w' ? value.mate : -value.mate) > 0
    return `${forMover ? 'mat en votre faveur' : 'mat contre vous'} en ${Math.abs(value.mate)}`
  }
  const score = scoreFor(value, mover)
  if (score === null) return null
  const pawns = score / 100
  return `${pawns > 0 ? '+' : pawns < 0 ? '−' : ''}${Math.abs(pawns).toFixed(1).replace('.', ',')}`
}

/** Premiere lettre en minuscule (pour enchainer apres « : »). */
const lower = (text: string) => text.charAt(0).toLowerCase() + text.slice(1)

/**
 * Punition : la meilleure variante de l'adversaire dans la position qui suit le
 * coup fautif, rejouee et traduite en clair.
 */
function describePunishment(
  fenAfter: string,
  best: { sans: string[]; mate: number | null } | undefined,
): { line: string; points: string[]; replyMotifs: string[] } | null {
  if (!best || best.sans.length === 0) return null
  let chess: Chess
  try {
    chess = new Chess(fenAfter)
  } catch {
    return null
  }
  const enemy = chess.turn()
  const victim: 'w' | 'b' = enemy === 'w' ? 'b' : 'w'
  const balanceBefore = material(chess, victim) - material(chess, enemy)

  const sans = best.sans.slice(0, PLIES)
  const played: string[] = []
  const captures: string[] = []
  let firstReply: { san: string; piece: string; captured?: string; to: string; check: boolean } | null = null
  let threats: { square: string; type: string }[] = []

  for (let i = 0; i < sans.length; i++) {
    let move
    try {
      move = chess.move(sans[i])
    } catch {
      break
    }
    played.push(move.san)
    if (move.color === enemy && move.captured) {
      captures.push(`${article(move.captured)} ${PIECE_NAMES[move.captured]} en ${move.to}`)
    }
    if (i === 0) {
      firstReply = { san: move.san, piece: move.piece, captured: move.captured, to: move.to, check: chess.inCheck() }
      threats = hangingPieces(chess, victim)
    }
  }
  if (!firstReply) return null

  const points: string[] = []
  const mateForEnemy = best.mate !== null && (enemy === 'w' ? best.mate > 0 : best.mate < 0)
  const mateInOne = mateForEnemy && Math.abs(best.mate!) === 1
  if (mateForEnemy) {
    points.push(`L’adversaire force le mat en ${Math.abs(best.mate!)} coup${Math.abs(best.mate!) > 1 ? 's' : ''}.`)
  }

  if (firstReply.captured && !mateInOne) {
    points.push(
      `${firstReply.san} prend ${article(firstReply.captured)} ${PIECE_NAMES[firstReply.captured]} en ${firstReply.to}${
        firstReply.check ? ' avec échec : il faut d’abord parer l’échec' : ''
      }.`,
    )
  }

  const others = threats.filter((t) => t.square !== firstReply!.to)
  const name = (t: { square: string; type: string }) => `${article(t.type)} ${PIECE_NAMES[t.type]} en ${t.square}`
  if (!mateInOne) {
    if (firstReply.check && others.length >= 1) {
      points.push(
        `${firstReply.san} donne échec et attaque en même temps ${name(others[0])} : une fourchette, la pièce est perdue.`,
      )
    } else if (others.length >= 2) {
      points.push(
        `${firstReply.san} attaque ${others.slice(0, 2).map(name).join(' et ')} : une fourchette, l’une des deux tombe.`,
      )
    } else if (others.length === 1) {
      points.push(
        `${firstReply.san} menace ${name(others[0])}, insuffisamment défendu${FEMININE.has(others[0].type) ? 'e' : ''}.`,
      )
    } else if (firstReply.check && !firstReply.captured) {
      points.push(`${firstReply.san} donne échec et gagne un temps.`)
    }
  }

  const balanceAfter = material(chess, victim) - material(chess, enemy)
  const lost = balanceBefore - balanceAfter
  if (!mateForEnemy && lost >= 1) {
    const extra = captures.length > 1 ? ` (${captures.slice(0, 3).join(', ')})` : ''
    points.push(`Au bout de la variante, vous perdez ${describeLoss(lost, captures)}${extra}.`)
  }

  // Idees positionnelles de la reponse adverse (developpement avec tempo, espace, centre…)
  const replyMotifs = motifsOf(fenAfter, firstReply.san).filter((m) => !m.startsWith('Capture') && !m.startsWith('Attaque'))

  return { line: numberLine(fenAfter, played), points, replyMotifs }
}

export interface FaultInput {
  fenBefore: string
  fenAfter: string
  playedSan: string
  verdict: MoveVerdict | null
  /** Evaluation de la position avant le coup (meilleur coup, variante, score). */
  before?: StoredEval
  /** Evaluation de la position apres le coup. */
  after?: StoredEval
  /** Analyse principale en cours sur la position apres le coup, si le moteur est allume. */
  bestLine?: EngineLine
  /** Defauts deja reperes par l'analyse de motifs (piece en prise, roque perdu…). */
  warnings?: string[]
}

/** Explication complete d'une faute ; `null` si le coup n'en est pas une. */
export function explainFault(input: FaultInput): FaultExplanation | null {
  const { verdict, before, after } = input
  if (!verdict || !FAULTS.has(verdict.quality)) return null

  const mover: 'w' | 'b' = input.fenBefore.split(' ')[1] === 'b' ? 'b' : 'w'
  const enemyName = mover === 'w' ? 'les noirs' : 'les blancs'

  // 1. Bascule d'evaluation
  const scoreBefore = formatScore(before, mover)
  const scoreAfter = formatScore(after, mover)
  let swing = ''
  if (scoreBefore && scoreAfter) {
    const drop = (verdict.loss / 100).toFixed(1).replace('.', ',')
    swing = `Avant ${input.playedSan}, Stockfish vous donnait ${scoreBefore} ; après, ${scoreAfter}. Le coup coûte ${drop} pion d’évaluation (${Math.round(verdict.drop)} % de chances de gain en moins).`
  }

  // 2. Punition et ce que le coup concede
  const best = input.bestLine ?? (after?.pv ? { sans: after.pv, mate: after.mate } : undefined)
  const punishment = describePunishment(input.fenAfter, best)
  const concedes: string[] = [...(input.warnings ?? [])]
  if (punishment && punishment.replyMotifs.length > 0) {
    const ideas = punishment.replyMotifs
      .slice(0, 2)
      .map((motif) => lower(motif).replace(/\.$/, ''))
      .join(' ; ')
    concedes.push(`Laisse ${enemyName} jouer ${punishment.line.split(' ')[0]} : ${ideas}.`)
  }
  if (concedes.length === 0 && punishment && punishment.points.length === 0) {
    concedes.push(
      `Pas de perte de matériel immédiate : le coup est trop lent ou mal placé, ${enemyName} prennent l’initiative avec ${punishment.line.split(' ')[0]}.`,
    )
  }

  // 3. Ce qu'il fallait jouer, et pourquoi
  let better: FaultExplanation['better']
  const bestSan = verdict.best ?? before?.bestSan
  if (bestSan && bestSan !== input.playedSan) {
    const pv = before?.pv && before.pv[0] === bestSan ? before.pv.slice(0, PLIES) : [bestSan]
    const reasons = motifsOf(input.fenBefore, bestSan).slice(0, 3)
    better = { san: bestSan, line: numberLine(input.fenBefore, pv), reasons }
  }

  return {
    title: FAULT_TITLE[verdict.quality] ?? 'Pourquoi ce coup est fautif',
    swing,
    concedes: [...new Set(concedes)].slice(0, 4),
    better,
    punishment: punishment && punishment.points.length > 0 ? { line: punishment.line, points: punishment.points } : undefined,
  }
}
