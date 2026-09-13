/**
 * Explorateur d'ouvertures Lichess : statistiques reelles issues des millions de
 * parties jouees sur lichess.org (API publique, sans authentification), et base
 * des parties de maitres (plus de deux millions de parties OTB, Elo 2200+).
 * https://lichess.org/api#tag/Opening-Explorer
 */
export type ExplorerDb = 'lichess' | 'masters'

export const EXPLORER_DB_LABEL: Record<ExplorerDb, string> = {
  lichess: 'Amateurs',
  masters: 'Maîtres',
}
export const EXPLORER_DB_NOTE: Record<ExplorerDb, string> = {
  lichess: 'Parties classées blitz / rapide / classique, Elo 1600+, source lichess.org.',
  masters: 'Parties de maîtres en tournoi (Elo 2200+), base masters de lichess.org.',
}
export interface ExplorerMove {
  uci: string
  san: string
  white: number
  draws: number
  black: number
  averageRating?: number
}

export interface ExplorerResult {
  white: number
  draws: number
  black: number
  moves: ExplorerMove[]
  opening?: { eco: string; name: string } | null
}

const BASE = 'https://explorer.lichess.ovh'
const cache = new Map<string, ExplorerResult>()

export async function fetchExplorer(uci: string[], db: ExplorerDb = 'lichess', signal?: AbortSignal): Promise<ExplorerResult> {
  const play = uci.join(',')
  const key = `${db}|${play}`
  const cached = cache.get(key)
  if (cached) return cached

  const params =
    db === 'masters'
      ? new URLSearchParams({ play, topGames: '0', moves: '12' })
      : new URLSearchParams({
          variant: 'standard',
          speeds: 'blitz,rapid,classical',
          ratings: '1600,1800,2000,2200,2500',
          play,
          topGames: '0',
          recentGames: '0',
          moves: '12',
        })
  const res = await fetch(`${BASE}/${db}?${params}`, { signal })
  if (res.status === 429) throw new Error('Limite de requêtes Lichess atteinte, patientez un instant')
  if (res.status === 401 || res.status >= 500)
    throw new Error(`Explorateur Lichess hors service côté Lichess (${res.status}) : réessayez plus tard`)
  if (!res.ok) throw new Error(`Explorateur Lichess indisponible (${res.status})`)
  const json = (await res.json()) as ExplorerResult
  if (cache.size > 200) cache.clear()
  cache.set(key, json)
  return json
}

export const totalGames = (r: { white: number; draws: number; black: number }) => r.white + r.draws + r.black

export function formatCount(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace('.0', '')} M`
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace('.0', '')} k`
  return String(n)
}
