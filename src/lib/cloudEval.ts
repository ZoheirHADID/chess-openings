import { uciToSans, type EngineLine, type StoredEval } from './engine'

/**
 * Evaluation cloud Lichess : positions deja analysees en profondeur (souvent
 * 40 a 60 demi-coups) par les serveurs de lichess.org, disponibles sans
 * authentification pour toutes les positions d'ouverture courantes.
 * https://lichess.org/api#tag/Analysis/operation/apiCloudEval
 *
 * Elle complete Stockfish local (profondeur 14 a 16 dans le navigateur) : plus
 * profonde, immediate, mais seulement pour les positions connues.
 */
export interface CloudEval {
  fen: string
  depth: number
  /** Milliers de noeuds explores par le serveur. */
  knodes: number
  lines: EngineLine[]
}

const BASE = 'https://lichess.org/api/cloud-eval'
const cache = new Map<string, CloudEval | null>()
const pending = new Map<string, Promise<CloudEval | null>>()
const listeners = new Set<() => void>()

/** Notifie l'arrivee d'une evaluation cloud (pour recalculer les verdicts). */
export function subscribeCloud(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Evaluation cloud deja recue pour cette position (`null` = inconnue de Lichess). */
export const getCloudEval = (fen: string): CloudEval | null | undefined => cache.get(fen)

/** Forme comparable aux evaluations locales, pour juger un coup. */
export function toStoredEval(cloud: CloudEval | null | undefined): StoredEval | undefined {
  if (!cloud || cloud.lines.length === 0) return undefined
  const [first, second] = cloud.lines
  return {
    cp: first.cp,
    mate: first.mate,
    depth: cloud.depth,
    bestSan: first.sans[0],
    pv: first.sans,
    second: second ? { cp: second.cp, mate: second.mate } : undefined,
    source: 'cloud',
  }
}

interface ApiResponse {
  fen: string
  depth: number
  knodes: number
  pvs: { moves: string; cp?: number; mate?: number }[]
}

/**
 * Interroge le cloud Lichess pour une position. Les positions inconnues (404)
 * sont memorisees pour ne pas etre redemandees. Les scores sont donnes du point
 * de vue des blancs, comme les evaluations locales.
 */
export function fetchCloudEval(fen: string): Promise<CloudEval | null> {
  const cached = cache.get(fen)
  if (cached !== undefined) return Promise.resolve(cached)
  const inFlight = pending.get(fen)
  if (inFlight) return inFlight

  const params = new URLSearchParams({ fen, multiPv: '3' })
  const request = fetch(`${BASE}?${params}`)
    .then(async (res) => {
      if (res.status === 404) return null
      if (!res.ok) throw new Error(`cloud-eval ${res.status}`)
      const json = (await res.json()) as ApiResponse
      const lines: EngineLine[] = json.pvs.map((pv, index) => {
        const uciMoves = pv.moves.split(' ')
        return {
          rank: index + 1,
          depth: json.depth,
          cp: pv.cp ?? null,
          mate: pv.mate ?? null,
          sans: uciToSans(fen, uciMoves, 8),
          uci: uciMoves[0] ?? '',
        }
      })
      return { fen, depth: json.depth, knodes: json.knodes, lines }
    })
    .then((result) => {
      cache.set(fen, result)
      for (const notify of listeners) notify()
      return result
    })
    .catch(() => {
      // Reseau ou limite de requetes : on retentera a la prochaine visite
      return null
    })
    .finally(() => pending.delete(fen))
  pending.set(fen, request)
  return request
}
