import type { ImportedGame } from './types'

/**
 * Ecarts de theorie du joueur dans ses parties importees : la position ou la
 * theorie repertoriee s'arrete et le coup joue a la place, quand c'est le
 * joueur (et non l'adversaire) qui a quitte la theorie.
 */
export interface DeviationStat {
  nodeId: string
  san: string
  count: number
  wins: number
  draws: number
  losses: number
}

/** Coup theorique propose a la place d'un ecart. */
export interface TheoryMove {
  san: string
  /** Ouverture nommee la plus proche apres ce coup. */
  name?: string
  /** Parties Lichess ayant joue ce coup (0 si bilan inconnu). */
  games: number
}

/** Ecart de theorie en cours d'affichage, avec les coups theoriques preconises. */
export interface TheoryGap {
  san: string
  /** Fois ou le joueur a commis cet ecart dans ses parties. */
  count: number
  losses: number
  expected: TheoryMove[]
}

/** Resultat de la partie pour le joueur. */
export function resultFor(game: ImportedGame): 'win' | 'draw' | 'loss' | null {
  if (game.result === '1/2-1/2') return 'draw'
  if (!game.color) return null
  if (game.result === '1-0') return game.color === 'white' ? 'win' : 'loss'
  if (game.result === '0-1') return game.color === 'black' ? 'win' : 'loss'
  return null
}

/**
 * Le premier ecart de theorie de la partie, s'il est le fait du joueur :
 * position ou la theorie s'arrete et coup joue a la place.
 */
export function ownDeviation(game: ImportedGame): { nodeId: string; san: string } | null {
  if (!game.color) return null
  const matched = game.nodeId ? game.nodeId.split(' ').length : 0
  if (matched >= game.sans.length) return null
  const mover = matched % 2 === 0 ? 'white' : 'black'
  if (mover !== game.color) return null
  return { nodeId: game.nodeId ?? '', san: game.sans[matched] }
}

export const deviationKey = (nodeId: string, san: string) => `${nodeId}|${san}`

/** Ecarts agreges par position et coup, sur toutes les parties. */
export function aggregateDeviations(games: ImportedGame[]): Map<string, DeviationStat> {
  const byKey = new Map<string, DeviationStat>()
  for (const game of games) {
    const dev = ownDeviation(game)
    if (!dev) continue
    const key = deviationKey(dev.nodeId, dev.san)
    let entry = byKey.get(key)
    if (!entry) {
      entry = { nodeId: dev.nodeId, san: dev.san, count: 0, wins: 0, draws: 0, losses: 0 }
      byKey.set(key, entry)
    }
    entry.count++
    const res = resultFor(game)
    if (res === 'win') entry.wins++
    else if (res === 'draw') entry.draws++
    else if (res === 'loss') entry.losses++
  }
  return byKey
}
