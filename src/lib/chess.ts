import { Chess } from 'chess.js'

export interface BoardSquare {
  square: string
  type: string
  color: 'w' | 'b'
}

export interface PositionInfo {
  fen: string
  board: (BoardSquare | null)[][]
  turn: 'w' | 'b'
  lastMove?: { from: string; to: string }
  /** Coups en notation UCI, pour l'explorateur Lichess. */
  uci: string[]
  /** Coups legaux depuis la position, en SAN. */
  legal: string[]
}

const cache = new Map<string, PositionInfo>()

/** Rejoue une suite de coups SAN et renvoie la position resultante (memoisee). */
export function positionFromSans(sans: string[]): PositionInfo {
  const key = sans.join(' ')
  const cached = cache.get(key)
  if (cached) return cached

  const chess = new Chess()
  const uci: string[] = []
  let lastMove: { from: string; to: string } | undefined
  for (const san of sans) {
    try {
      const move = chess.move(san)
      uci.push(move.from + move.to + (move.promotion ?? ''))
      lastMove = { from: move.from, to: move.to }
    } catch {
      break
    }
  }

  const info: PositionInfo = {
    fen: chess.fen(),
    board: chess.board() as unknown as (BoardSquare | null)[][],
    turn: chess.turn(),
    lastMove,
    uci,
    legal: chess.moves(),
  }
  if (cache.size > 600) cache.clear()
  cache.set(key, info)
  return info
}

/** Formate un chemin SAN en notation numerotee : "1. e4 c5 2. Nf3". */
export function formatMoveList(sans: string[]): string {
  return sans
    .map((san, i) => (i % 2 === 0 ? `${i / 2 + 1}. ${san}` : san))
    .join(' ')
}

/** Regroupe les coups par paires (blanc, noir) pour l'affichage en tableau. */
export function movePairs(sans: string[]): { number: number; white?: string; black?: string; whitePly: number }[] {
  const pairs: { number: number; white?: string; black?: string; whitePly: number }[] = []
  for (let i = 0; i < sans.length; i += 2) {
    pairs.push({ number: i / 2 + 1, white: sans[i], black: sans[i + 1], whitePly: i + 1 })
  }
  return pairs
}
