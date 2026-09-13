import { Chess } from 'chess.js'
import type { TreeNode } from './types'

/**
 * Transpositions : la meme position peut etre atteinte par plusieurs ordres de
 * coups (1.d4 Nf6 2.c4 e6 3.Nf3 = 1.Nf3 Nf6 2.c4 e6 3.d4). L'arbre est un
 * trie de coups : une ligne « hors theorie » peut donc tres bien correspondre
 * a une ouverture repertoriee sous un autre ordre. L'index associe chaque
 * position (pieces, trait, roques, prise en passant) aux noeuds qui y menent.
 */
export type FenIndex = Map<string, TreeNode[]>

/** Cle de position : les quatre premiers champs FEN (sans les compteurs de coups). */
export const positionKey = (fen: string) => fen.split(' ').slice(0, 4).join(' ')

/**
 * Parcourt tout l'arbre avec un seul echiquier (coup / annulation), par
 * tranches : chaque `yield` rend la main pour ne pas bloquer l'interface
 * (~8 700 noeuds, environ 1,5 s de calcul au total).
 */
export function* fenIndexBuilder(root: TreeNode, chunk = 150): Generator<number, FenIndex> {
  const index: FenIndex = new Map()
  const chess = new Chess()
  // Pile explicite : [noeud, prochain enfant a visiter]
  const stack: [TreeNode, number][] = [[root, 0]]
  let visited = 0
  const add = (node: TreeNode) => {
    const key = positionKey(chess.fen())
    const list = index.get(key)
    if (list) list.push(node)
    else index.set(key, [node])
    visited++
  }
  add(root)
  while (stack.length > 0) {
    const frame = stack[stack.length - 1]
    const [node, next] = frame
    if (next >= node.children.length) {
      stack.pop()
      if (stack.length > 0) chess.undo()
      continue
    }
    frame[1] = next + 1
    const child = node.children[next]
    try {
      chess.move(child.san)
    } catch {
      continue
    }
    add(child)
    stack.push([child, 0])
    if (visited % chunk === 0) yield visited
  }
  return index
}

/** Construction synchrone (scripts et tests). */
export function buildFenIndex(root: TreeNode): FenIndex {
  const builder = fenIndexBuilder(root, Number.MAX_SAFE_INTEGER)
  let step = builder.next()
  while (!step.done) step = builder.next()
  return step.value
}

/**
 * Construction en arriere-plan : une tranche par tour de boucle d'evenements
 * (temps mort du navigateur quand il en propose). Renvoie une fonction d'annulation.
 */
export function buildFenIndexAsync(root: TreeNode, onDone: (index: FenIndex) => void): () => void {
  const builder = fenIndexBuilder(root)
  let cancelled = false
  const idle: (cb: () => void) => void =
    typeof requestIdleCallback === 'function' ? (cb) => requestIdleCallback(() => cb(), { timeout: 200 }) : (cb) => setTimeout(cb, 0)
  const step = () => {
    if (cancelled) return
    const result = builder.next()
    if (result.done) onDone(result.value)
    else idle(step)
  }
  idle(step)
  return () => {
    cancelled = true
  }
}

/**
 * Noeuds theoriques correspondant a la position, autres que la ligne affichee.
 * Les noeuds nommes passent en premier, puis les plus courts.
 */
export function findTranspositions(index: FenIndex | null, fen: string, currentId: string, limit = 3): TreeNode[] {
  if (!index) return []
  const nodes = (index.get(positionKey(fen)) ?? []).filter((node) => node.id !== currentId)
  return nodes
    .sort((a, b) => Number(!!b.name) - Number(!!a.name) || a.ply - b.ply)
    .slice(0, limit)
}
