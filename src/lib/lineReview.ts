import { engine, judgeMove, pairEvals, scoreFor, winPercent, type MoveQuality, type MoveVerdict } from './engine'
import { getCloudEval, toStoredEval } from './cloudEval'

/**
 * Revue de toute la ligne affichee, coup par coup : chaque demi-coup est juge
 * avec les evaluations disponibles (cloud Lichess de preference, sinon
 * Stockfish local), et chaque camp recoit une precision, comme dans l'analyse
 * de partie Lichess.
 */
export interface PlyReview {
  ply: number
  san: string
  verdict: MoveVerdict | null
}

export interface SideSummary {
  /** Precision moyenne (0 a 100) sur les coups juges, `null` si aucun. */
  accuracy: number | null
  judged: number
  counts: Partial<Record<MoveQuality, number>>
}

export interface LineReview {
  plies: PlyReview[]
  white: SideSummary
  black: SideSummary
}

/**
 * Precision d'un coup d'apres la perte de chances de gain (formule Lichess) :
 * 100 pour le meilleur coup, ~60 pour une erreur, ~10 pour une gaffe.
 */
export function moveAccuracy(wpBefore: number, wpAfter: number): number {
  const drop = Math.max(0, wpBefore - wpAfter)
  const raw = 103.1668 * Math.exp(-0.04354 * drop) - 3.1669
  return Math.max(0, Math.min(100, raw))
}

/**
 * Juge chaque coup de la ligne. `fens[i]` est la position apres i demi-coups
 * (`fens[0]` = depart) ; `matched` = nombre de demi-coups couverts par la theorie.
 */
export function reviewLine(fens: string[], sans: string[], matched: number): LineReview {
  const plies: PlyReview[] = []
  const sides: Record<'w' | 'b', { total: number; judged: number; counts: Partial<Record<MoveQuality, number>> }> = {
    w: { total: 0, judged: 0, counts: {} },
    b: { total: 0, judged: 0, counts: {} },
  }

  for (let i = 0; i < sans.length; i++) {
    const before = fens[i]
    const after = fens[i + 1]
    const mover: 'w' | 'b' = i % 2 === 0 ? 'w' : 'b'
    let verdict: MoveVerdict | null = null
    if (before && after) {
      const [evalBefore, evalAfter] = pairEvals(
        engine.getEval(before),
        engine.getEval(after),
        toStoredEval(getCloudEval(before)),
        toStoredEval(getCloudEval(after)),
      )
      verdict = judgeMove(evalBefore, evalAfter, mover, sans[i], { fenBefore: before, inBook: i < matched })
      if (verdict) {
        const scoreBefore = scoreFor(evalBefore, mover)
        const scoreAfter = scoreFor(evalAfter, mover)
        if (scoreBefore !== null && scoreAfter !== null) {
          const side = sides[mover]
          side.total += moveAccuracy(winPercent(scoreBefore), winPercent(scoreAfter))
          side.judged++
          side.counts[verdict.quality] = (side.counts[verdict.quality] ?? 0) + 1
        }
      }
    }
    plies.push({ ply: i + 1, san: sans[i], verdict })
  }

  const summary = (side: 'w' | 'b'): SideSummary => ({
    accuracy: sides[side].judged > 0 ? sides[side].total / sides[side].judged : null,
    judged: sides[side].judged,
    counts: sides[side].counts,
  })
  return { plies, white: summary('w'), black: summary('b') }
}

/** Qualites signalees dans la liste de coups (les bons coups ordinaires restent muets). */
export const NOTABLE: ReadonlySet<MoveQuality> = new Set<MoveQuality>([
  'brilliant',
  'great',
  'inaccuracy',
  'mistake',
  'miss',
  'blunder',
])

/** Libelle des fautes d'un camp : « 1 imprécision, 2 erreurs ». */
export function describeFaults(counts: Partial<Record<MoveQuality, number>>): string {
  const parts: string[] = []
  const add = (n: number | undefined, one: string, many: string) => {
    if (n) parts.push(`${n} ${n > 1 ? many : one}`)
  }
  add(counts.inaccuracy, 'imprécision', 'imprécisions')
  add(counts.mistake, 'erreur', 'erreurs')
  add(counts.miss, 'occasion manquée', 'occasions manquées')
  add(counts.blunder, 'gaffe', 'gaffes')
  return parts.join(', ')
}
