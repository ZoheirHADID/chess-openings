import type { ProgressMap, StudyStatus } from './types'
import { ancestorIds } from './tree'

const KEY = 'chess-openings:progress:v1'

export const STATUS_ORDER: Record<StudyStatus, number> = {
  explored: 1,
  studying: 2,
  mastered: 3,
}

export const STATUS_LABEL: Record<StudyStatus, string> = {
  explored: 'Exploré',
  studying: 'À l’étude',
  mastered: 'Acquis',
}

export const STATUS_COLOR: Record<StudyStatus, string> = {
  explored: '#38bdf8',
  studying: '#fbbf24',
  mastered: '#34d399',
}

export function loadProgress(): ProgressMap {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ProgressMap) : {}
  } catch {
    return {}
  }
}

export function saveProgress(progress: ProgressMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    /* quota depasse ou stockage indisponible : on ignore */
  }
}

/**
 * Applique un statut a un noeud. Les ancetres sont automatiquement marques
 * « exploré » au minimum : on ne peut pas avoir etudie une variante sans avoir
 * traverse la branche qui y mene.
 */
export function setStatus(progress: ProgressMap, nodeId: string, status: StudyStatus | null): ProgressMap {
  const next: ProgressMap = { ...progress }
  if (status === null) {
    delete next[nodeId]
    return next
  }
  next[nodeId] = { status, updatedAt: Date.now(), note: progress[nodeId]?.note }
  for (const id of ancestorIds(nodeId)) {
    if (!id || id === nodeId) continue
    if (!next[id]) next[id] = { status: 'explored', updatedAt: Date.now() }
  }
  return next
}

/** Marque un noeud comme explore sans ecraser un statut plus avance. */
export function markExplored(progress: ProgressMap, nodeId: string): ProgressMap | null {
  if (!nodeId) return null
  const ids = ancestorIds(nodeId).filter(Boolean)
  const missing = ids.filter((id) => !progress[id])
  if (missing.length === 0) return null
  const next = { ...progress }
  const now = Date.now()
  for (const id of missing) next[id] = { status: 'explored', updatedAt: now }
  return next
}

export interface ProgressStats {
  explored: number
  studying: number
  mastered: number
  total: number
}

export function progressStats(progress: ProgressMap): ProgressStats {
  const stats: ProgressStats = { explored: 0, studying: 0, mastered: 0, total: 0 }
  for (const entry of Object.values(progress)) {
    stats[entry.status]++
    stats.total++
  }
  return stats
}

/**
 * Statut « herite » d'une branche : le meilleur statut present dans le sous-arbre.
 * Permet de colorer une branche repliee dont une variante profonde est acquise.
 */
export function buildBranchStatus(progress: ProgressMap): Map<string, StudyStatus> {
  const branch = new Map<string, StudyStatus>()
  for (const [id, entry] of Object.entries(progress)) {
    for (const ancestor of ancestorIds(id)) {
      const current = branch.get(ancestor)
      if (!current || STATUS_ORDER[entry.status] > STATUS_ORDER[current]) {
        branch.set(ancestor, entry.status)
      }
    }
  }
  return branch
}
