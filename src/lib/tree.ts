import type { OpeningsData, RawNode, TreeNode } from './types'
import { frName } from './frenchNames'

export interface TreeIndex {
  root: TreeNode
  byId: Map<string, TreeNode>
  data: OpeningsData
}

/** Materialise l'arbre compact en noeuds enrichis (parents, identifiants, ply). */
export function buildTree(data: OpeningsData): TreeIndex {
  const byId = new Map<string, TreeNode>()

  const walk = (raw: RawNode, parent: TreeNode | null, id: string, ply: number): TreeNode => {
    const node: TreeNode = {
      id,
      san: raw.s,
      ply,
      eco: raw.e,
      name: raw.n,
      family: raw.f,
      variation: raw.va,
      count: raw.v,
      children: [],
      parent,
    }
    byId.set(id, node)
    if (raw.c) {
      node.children = raw.c.map((child) => walk(child, node, id ? `${id} ${child.s}` : child.s, ply + 1))
    }
    return node
  }

  const root = walk(data.root, null, '', 0)
  root.name = 'Position initiale'
  return { root, byId, data }
}

/** Chemin racine -> noeud (racine incluse). */
export function pathTo(node: TreeNode): TreeNode[] {
  const path: TreeNode[] = []
  let current: TreeNode | null = node
  while (current) {
    path.unshift(current)
    current = current.parent
  }
  return path
}

/** Identifiants de tous les ancetres d'un noeud, racine comprise. */
export function ancestorIds(nodeId: string): string[] {
  if (!nodeId) return ['']
  const parts = nodeId.split(' ')
  const ids: string[] = ['']
  for (let i = 1; i <= parts.length; i++) ids.push(parts.slice(0, i).join(' '))
  return ids
}

/** Derniere ouverture nommee sur le chemin (le noeud lui-meme ou son ancetre le plus proche). */
export function nearestNamed(node: TreeNode): TreeNode | null {
  let current: TreeNode | null = node
  while (current) {
    if (current.name && current.eco) return current
    current = current.parent
  }
  return null
}

/** Descend l'arbre en suivant des coups SAN ; renvoie le noeud atteint et le nb de coups reconnus. */
export function followSans(root: TreeNode, sans: string[]): { node: TreeNode; matched: number } {
  let node = root
  let matched = 0
  for (const san of sans) {
    const child = node.children.find((c) => c.san === san)
    if (!child) break
    node = child
    matched++
  }
  return { node, matched }
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

export interface SearchHit {
  eco: string
  name: string
  family: string
  path: string
  score: number
}

/** Recherche par nom d'ouverture, famille ou code ECO. */
export function searchOpenings(data: OpeningsData, query: string, limit = 40): SearchHit[] {
  const q = normalize(query.trim())
  if (q.length < 2) return []
  const hits: SearchHit[] = []
  for (const entry of data.index) {
    const name = normalize(entry.name)
    const fr = normalize(frName(entry.name))
    const eco = entry.eco.toLowerCase()
    let score = -1
    if (eco === q) score = 0
    else if (name.startsWith(q) || fr.startsWith(q)) score = 1
    else if (normalize(entry.family).startsWith(q) || normalize(frName(entry.family)).startsWith(q)) score = 2
    else if (name.includes(q) || fr.includes(q)) score = 3
    else if (eco.startsWith(q)) score = 4
    if (score >= 0) hits.push({ ...entry, score })
  }
  hits.sort((a, b) => a.score - b.score || a.name.length - b.name.length || a.name.localeCompare(b.name))
  return hits.slice(0, limit)
}

/** Familles d'ouvertures les plus fournies (pour les raccourcis de navigation). */
export function topFamilies(data: OpeningsData, limit = 12): { family: string; path: string; count: number }[] {
  const map = new Map<string, { family: string; path: string; count: number }>()
  for (const entry of data.index) {
    const existing = map.get(entry.family)
    if (!existing) {
      map.set(entry.family, { family: entry.family, path: entry.path, count: 1 })
    } else {
      existing.count++
      if (entry.path.length < existing.path.length) existing.path = entry.path
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, limit)
}
