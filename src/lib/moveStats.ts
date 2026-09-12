import { useEffect, useRef, useState } from 'react'
import { fetchExplorer } from './explorer'
import { positionFromSans } from './chess'

/**
 * Statistiques de resultats par coup, issues de l'explorateur Lichess.
 *
 * Une requete sur une position renvoie le bilan de TOUS ses coups : deplier un
 * noeud suffit donc a colorer toutes ses branches filles. Les reponses sont
 * mises en cache en memoire et dans le navigateur.
 */
export interface MoveStat {
  white: number
  draws: number
  black: number
}

const KEY = 'chess-openings:winrates:v1'
const MAX_ENTRIES = 4000
const THROTTLE_MS = 260

const cache = new Map<string, MoveStat>()
/** Positions deja interrogees (evite de redemander un noeud sans suite connue). */
const resolved = new Set<string>()
/** Le bilan de cette position a deja ete demande (avec ou sans resultat). */
export const isResolved = (parentId: string) => resolved.has(parentId)
let loaded = false

function load() {
  if (loaded) return
  loaded = true
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return
    const data = JSON.parse(raw) as { stats: Record<string, [number, number, number]>; done: string[] }
    for (const [id, [white, draws, black]] of Object.entries(data.stats ?? {})) {
      cache.set(id, { white, draws, black })
    }
    for (const id of data.done ?? []) resolved.add(id)
  } catch {
    /* cache illisible : on repart de zero */
  }
}

function persist() {
  try {
    const stats: Record<string, [number, number, number]> = {}
    let count = 0
    for (const [id, value] of cache) {
      if (count++ > MAX_ENTRIES) break
      stats[id] = [value.white, value.draws, value.black]
    }
    localStorage.setItem(KEY, JSON.stringify({ stats, done: [...resolved].slice(0, MAX_ENTRIES) }))
  } catch {
    /* quota depasse : le cache reste en memoire */
  }
}

export const totalOf = (s: MoveStat) => s.white + s.draws + s.black

/** Part de points prise par les blancs (nulle = un demi-point). */
export const whiteScore = (s: MoveStat) => {
  const total = totalOf(s)
  return total === 0 ? 0.5 : (s.white + s.draws / 2) / total
}

/**
 * Couleur d'une branche selon le score des blancs.
 * Bleu clair = les blancs marquent mieux, rouge = les noirs, gris = equilibre.
 */
export function scoreColor(score: number, confidence = 1): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t)
  const grey = [100, 116, 139]
  const white = [219, 234, 254]
  const black = [248, 113, 113]

  // 0.5 -> gris ; 0.60 et au-dela -> teinte pleine
  const strength = Math.min(1, Math.abs(score - 0.5) / 0.1)
  const target = score >= 0.5 ? white : black
  const rgb = mix(grey, target, strength * confidence)
  return `rgb(${clamp(rgb[0])}, ${clamp(rgb[1])}, ${clamp(rgb[2])})`
}

/** Fiabilite d'un echantillon : en dessous de ~200 parties, la couleur est attenuee. */
export const confidenceOf = (s: MoveStat) => Math.min(1, Math.log10(totalOf(s) + 1) / Math.log10(1000))

let running = false
const queue: string[] = []
const subscribers = new Set<() => void>()
let paused = 0

async function drain() {
  if (running) return
  running = true
  while (queue.length > 0) {
    if (Date.now() < paused) break
    const parentId = queue.shift()!
    if (resolved.has(parentId)) continue
    try {
      const sans = parentId ? parentId.split(' ') : []
      const { uci } = positionFromSans(sans)
      const result = await fetchExplorer(uci)
      for (const move of result.moves) {
        const childId = parentId ? `${parentId} ${move.san}` : move.san
        cache.set(childId, { white: move.white, draws: move.draws, black: move.black })
      }
      resolved.add(parentId)
      for (const notify of subscribers) notify()
      persist()
    } catch {
      // Limite de requetes ou reseau indisponible : on met la file en pause
      resolved.add(parentId)
      paused = Date.now() + 20_000
    }
    await new Promise((r) => setTimeout(r, THROTTLE_MS))
  }
  running = false
}

/**
 * Reclame les statistiques des enfants des positions fournies et renvoie le cache
 * courant. Le composant se met a jour au fil des reponses.
 */
export function useMoveStats(parentIds: string[], enabled: boolean): Map<string, MoveStat> {
  load()
  const [, forceUpdate] = useState(0)
  const key = parentIds.join('|')
  const lastKey = useRef('')

  useEffect(() => {
    if (!enabled) return
    const notify = () => forceUpdate((n) => n + 1)
    subscribers.add(notify)
    return () => {
      subscribers.delete(notify)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled || key === lastKey.current) return
    lastKey.current = key
    for (const id of parentIds) {
      if (!resolved.has(id) && !queue.includes(id)) queue.push(id)
    }
    void drain()
  }, [key, enabled, parentIds])

  return cache
}
