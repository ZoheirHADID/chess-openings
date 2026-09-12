import type { TreeNode } from './types'
import { totalOf, whiteScore, type MoveStat } from './moveStats'

/**
 * Mode « jouer la théorie » : choix de la reponse de l'ordinateur parmi les
 * coups theoriques de la position.
 */
export type TrainingStrategy = 'random' | 'popular' | 'favorable'

export const STRATEGY_LABEL: Record<TrainingStrategy, string> = {
  random: 'Aléatoire',
  popular: 'La plus jouée',
  favorable: 'Favorable pour moi',
}

export const STRATEGY_TITLE: Record<TrainingStrategy, string> = {
  random: 'Variante tirée au sort, pondérée par la richesse de la branche : toutes les ouvertures finissent par sortir',
  popular: 'Variante la plus jouée sur Lichess (à défaut, la variante principale de l’arbre)',
  favorable: 'Variante qui vous réussit le mieux d’après les résultats Lichess (à défaut, la plus jouée)',
}

/** Parties minimales pour qu'un bilan Lichess soit pris au serieux. */
const MIN_GAMES = 10

/**
 * Tirage au sort pondere par la richesse de la branche (racine carree du
 * nombre de variantes en aval) : les grandes lignes reviennent souvent, les
 * lignes rares finissent tout de meme par sortir.
 */
export function pickTheoryReply(children: TreeNode[], random: () => number = Math.random): TreeNode | null {
  const candidates = children.filter((child) => !child.virtual)
  if (candidates.length === 0) return null
  const weights = candidates.map((child) => 1 + Math.sqrt(child.count))
  let roll = random() * weights.reduce((sum, w) => sum + w, 0)
  for (let i = 0; i < candidates.length; i++) {
    roll -= weights[i]
    if (roll < 0) return candidates[i]
  }
  return candidates[candidates.length - 1]
}

/**
 * Reponse de l'ordinateur selon la strategie. Renvoie `'wait'` quand le bilan
 * Lichess de la position est encore attendu (l'appelant retente a son arrivee).
 */
export function chooseReply(
  children: TreeNode[],
  strategy: TrainingStrategy,
  stats: Map<string, MoveStat>,
  statsReady: boolean,
  playerColor: 'white' | 'black',
): TreeNode | null | 'wait' {
  const candidates = children.filter((child) => !child.virtual)
  if (candidates.length === 0) return null
  if (strategy === 'random') return pickTheoryReply(candidates)

  const known = candidates
    .map((child) => ({ child, stat: stats.get(child.id) }))
    .filter((entry): entry is { child: TreeNode; stat: MoveStat } => entry.stat !== undefined)

  if (strategy === 'favorable') {
    const solid = known.filter(({ stat }) => totalOf(stat) >= MIN_GAMES)
    if (solid.length > 0) {
      // Score du joueur : part des points prise par sa couleur
      const forPlayer = ({ stat }: { stat: MoveStat }) => (playerColor === 'white' ? whiteScore(stat) : 1 - whiteScore(stat))
      return solid.reduce((best, entry) => (forPlayer(entry) > forPlayer(best) ? entry : best)).child
    }
  }

  // « La plus jouée » (et repli de « favorable ») : le plus de parties Lichess
  if (known.length > 0) {
    return known.reduce((best, entry) => (totalOf(entry.stat) > totalOf(best.stat) ? entry : best)).child
  }
  // Bilan absent : on attend s'il est en route, sinon variante principale de l'arbre
  return statsReady ? candidates[0] : 'wait'
}

export interface TrainingScore {
  /** Coups theoriques trouves par le joueur. */
  found: number
  /** Coups joues hors theorie. */
  missed: number
}
