import { winPercent } from './engine'
import { totalOf, whiteScore, type MoveStat } from './moveStats'

/**
 * Score pratique d'un coup : ce que les joueurs humains en tirent reellement
 * (bilan Lichess), confronte a ce que le moteur en attend.
 *
 * Le moteur juge la position « objectivement » ; les statistiques disent si
 * elle est facile ou difficile a jouer pour un humain. L'ecart entre les deux
 * revele les coups piegeux (les adversaires se trompent souvent) et les coups
 * corrects mais ingrats (theoriquement bons, pratiquement perdants).
 */
export type PracticalVerdict = 'trap' | 'ungrateful' | 'consistent' | 'sample'

export interface PracticalNote {
  verdict: PracticalVerdict
  /** Parties Lichess ayant vu ce coup. */
  games: number
  /** Points marques par le camp qui a joue le coup, en pourcentage. */
  score: number
  /** Chances de gain attendues d'apres le moteur, en pourcentage. */
  expected: number | null
  /** Part des parties de la position ou ce coup est choisi (0 a 100). */
  share: number | null
  /** Rang de popularite (1 = coup le plus joue). */
  rank: number | null
  headline: string
  detail: string
}

/** En dessous, le bilan est trop mince pour conclure. */
const MIN_GAMES = 50
/** Ecart moteur / pratique (points de pourcentage) juge significatif. */
const GAP = 8

const pct = (value: number) => `${Math.round(value)} %`

export function practicalNote(
  stat: MoveStat | undefined,
  /** Bilans de tous les coups joues depuis la meme position (le coup compris). */
  siblings: MoveStat[],
  mover: 'w' | 'b',
  /** Evaluation de la position apres le coup, en centipions du point de vue du joueur. */
  engineScore: number | null,
): PracticalNote | null {
  if (!stat) return null
  const games = totalOf(stat)
  if (games === 0) return null
  const score = (mover === 'w' ? whiteScore(stat) : 1 - whiteScore(stat)) * 100
  const expected = engineScore === null ? null : winPercent(engineScore)

  const parentTotal = siblings.reduce((sum, s) => sum + totalOf(s), 0)
  const share = parentTotal > 0 ? (games / parentTotal) * 100 : null
  const rank = parentTotal > 0 ? siblings.filter((s) => totalOf(s) > games).length + 1 : null
  const popularity =
    share !== null && rank !== null
      ? `Choisi dans ${pct(share)} des parties depuis cette position (${rank === 1 ? 'coup le plus joué' : `${rank}e choix`}).`
      : ''

  if (games < MIN_GAMES) {
    return {
      verdict: 'sample',
      games,
      score,
      expected,
      share,
      rank,
      headline: `Trop peu de parties (${games}) pour un score pratique fiable`,
      detail: popularity,
    }
  }

  const you = mover === 'w' ? 'les blancs' : 'les noirs'
  const toYou = mover === 'w' ? 'aux blancs' : 'aux noirs'
  if (expected === null) {
    return {
      verdict: 'consistent',
      games,
      score,
      expected,
      share,
      rank,
      headline: `${pct(score)} de points pour ${you} sur ${games.toLocaleString('fr-FR')} parties`,
      detail: popularity,
    }
  }

  const gap = score - expected
  if (gap >= GAP) {
    return {
      verdict: 'trap',
      games,
      score,
      expected,
      share,
      rank,
      headline: 'Coup piégeux : les humains font bien mieux que le moteur ne l’annonce',
      detail: `Le moteur n’accorde que ${pct(expected)} de chances ${toYou}, mais en pratique ce coup rapporte ${pct(score)} des points : l’adversaire se trompe souvent dans la suite. ${popularity}`.trim(),
    }
  }
  if (gap <= -GAP) {
    return {
      verdict: 'ungrateful',
      games,
      score,
      expected,
      share,
      rank,
      headline: 'Coup ingrat : correct pour le moteur, difficile à jouer pour un humain',
      detail: `Le moteur donne ${pct(expected)} de chances ${toYou}, mais en pratique ce coup ne rapporte que ${pct(score)} des points : la suite est délicate, à préparer soigneusement. ${popularity}`.trim(),
    }
  }
  return {
    verdict: 'consistent',
    games,
    score,
    expected,
    share,
    rank,
    headline: `Score pratique ${pct(score)}, en accord avec le moteur (${pct(expected)})`,
    detail: `${games.toLocaleString('fr-FR')} parties Lichess. ${popularity}`.trim(),
  }
}
