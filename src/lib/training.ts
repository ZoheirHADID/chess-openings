import type { TreeNode } from './types'

/**
 * Mode « jouer la théorie » : l'ordinateur repond par un coup de l'arbre tire
 * au sort. Le tirage est pondere par la richesse de la branche (racine carree
 * du nombre de variantes en aval) : les grandes lignes reviennent souvent, les
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

export interface TrainingScore {
  /** Coups theoriques trouves par le joueur. */
  found: number
  /** Coups joues hors theorie. */
  missed: number
}
