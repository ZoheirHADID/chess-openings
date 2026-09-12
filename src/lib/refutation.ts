import { Chess } from 'chess.js'
import type { EngineLine, MoveVerdict } from './engine'

/**
 * Explication de la punition d'une faute : comment l'adversaire exploite une
 * imprecision, une erreur ou une gaffe, d'apres la meilleure variante du moteur
 * dans la position qui suit le coup fautif.
 */
export interface Refutation {
  /** Variante numerotee, ex. « 3.Qxe5+ Be7 4.Qxg7 ». */
  line: string
  /** Ce que l'adversaire obtient, phrase par phrase. */
  points: string[]
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

/** « un pion », « deux pions », « une pièce mineure », « la qualité », « du matériel (N points) ». */
function describeLoss(points: number, captures: string[]): string {
  if (points >= 9) return 'la dame'
  if (points === 5) return 'une tour'
  if (points === 3) return 'une pièce mineure'
  if (points === 2) return captures.some((c) => c.includes('tour')) ? 'la qualité' : 'deux pions'
  if (points === 1) return 'un pion'
  return `du matériel (${points} points)`
}

function numberLine(fen: string, sans: string[]): string {
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

/**
 * Decrit la punition d'un coup fautif. `fenAfter` est la position apres le
 * coup, `best` la meilleure variante du moteur dans cette position.
 */
export function describeRefutation(
  fenAfter: string,
  best: EngineLine | undefined,
  verdict: MoveVerdict | null,
): Refutation | null {
  if (!verdict || !FAULTS.has(verdict.quality) || !best || best.sans.length === 0) return null

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
    const byEnemy = move.color === enemy
    if (byEnemy && move.captured) {
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
  if (mateForEnemy) {
    points.push(`L’adversaire force le mat en ${Math.abs(best.mate!)} coup${Math.abs(best.mate!) > 1 ? 's' : ''}.`)
  }

  // Premier coup de la punition (un mat en un se passe de commentaire)
  const mateInOne = mateForEnemy && Math.abs(best.mate!) === 1
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
      points.push(`${firstReply.san} attaque ${others.slice(0, 2).map(name).join(' et ')} : une fourchette, l’une des deux tombe.`)
    } else if (others.length === 1) {
      points.push(`${firstReply.san} menace ${name(others[0])}, insuffisamment défendu${FEMININE.has(others[0].type) ? 'e' : ''}.`)
    } else if (firstReply.check && !firstReply.captured) {
      points.push(`${firstReply.san} donne échec et gagne un temps.`)
    }
  }

  // Bilan materiel au bout de la variante
  const balanceAfter = material(chess, victim) - material(chess, enemy)
  const lost = balanceBefore - balanceAfter
  if (!mateForEnemy) {
    if (lost >= 1) {
      const extra = captures.length > 1 ? ` (${captures.slice(0, 3).join(', ')})` : ''
      points.push(`Au bout de la variante, vous perdez ${describeLoss(lost, captures)}${extra}.`)
    } else if (points.length === 0) {
      const pawns = (verdict.loss / 100).toFixed(1)
      points.push(
        `Pas de gain de matériel immédiat, mais l’adversaire prend l’initiative : l’évaluation chute de ${pawns} pion${
          verdict.loss >= 200 ? 's' : ''
        }.`,
      )
    }
  }
  if (verdict.best && !points.some((p) => p.includes(verdict.best!))) {
    points.push(`Il fallait jouer ${verdict.best}.`)
  }

  return { line: numberLine(fenAfter, played), points }
}
