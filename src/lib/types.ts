/** Noeud tel que serialise par scripts/build-openings.mjs (format compact). */
export interface RawNode {
  s: string
  e?: string
  n?: string
  f?: string
  va?: string
  v: number
  c?: RawNode[]
}

export interface OpeningIndexEntry {
  eco: string
  name: string
  family: string
  path: string
}

export interface OpeningsData {
  version: number
  source: string
  generatedAt: string
  openings: number
  nodes: number
  maxDepth: number
  root: RawNode
  index: OpeningIndexEntry[]
}

/** Noeud enrichi utilise dans l'application. */
export interface TreeNode {
  /** Chemin SAN complet, ex. "e4 c5 Nf3" — identifiant stable. */
  id: string
  san: string
  ply: number
  eco?: string
  name?: string
  family?: string
  variation?: string
  /** Nombre d'ouvertures nommees dans le sous-arbre. */
  count: number
  children: TreeNode[]
  parent: TreeNode | null
  /** Vrai pour un coup joue hors de l'arbre theorique (branche libre). */
  virtual?: boolean
}

export type StudyStatus = 'explored' | 'studying' | 'mastered'

export interface StudyEntry {
  status: StudyStatus
  updatedAt: number
  note?: string
}

export type ProgressMap = Record<string, StudyEntry>

export interface ImportedGame {
  id: string
  white: string
  black: string
  result: string
  date?: string
  event?: string
  url?: string
  /** Coups SAN de la partie (limites aux 40 premiers demi-coups). */
  sans: string[]
  /** Couleur jouee par l'utilisateur si connue. */
  color?: 'white' | 'black'
  source: 'pgn' | 'lichess'
  /** Noeud le plus profond atteint dans l'arbre theorique. */
  nodeId?: string
  /** Derniere ouverture nommee rencontree sur le chemin. */
  openingName?: string
  openingEco?: string
}
