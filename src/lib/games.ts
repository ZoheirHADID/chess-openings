import { Chess } from 'chess.js'
import type { ImportedGame, TreeNode } from './types'
import { followSans, nearestNamed, pathTo } from './tree'

const KEY = 'chess-openings:games:v1'
/** On ne conserve que la phase d'ouverture : l'arbre Lichess plafonne a 36 demi-coups. */
const MAX_PLIES = 40

export function loadGames(): ImportedGame[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ImportedGame[]) : []
  } catch {
    return []
  }
}

export function saveGames(games: ImportedGame[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(games))
  } catch {
    /* stockage indisponible */
  }
}

function cleanMovetext(movetext: string): string {
  let text = movetext.replace(/\{[^}]*\}/g, ' ').replace(/;[^\n]*/g, ' ')
  // Variantes entre parentheses, potentiellement imbriquees
  let previous: string
  do {
    previous = text
    text = text.replace(/\([^()]*\)/g, ' ')
  } while (text !== previous)
  return text
    .replace(/\$\d+/g, ' ')
    .replace(/\d+\.(\.\.)?/g, ' ')
    .replace(/(1-0|0-1|1\/2-1\/2|\*)/g, ' ')
}

function sansFromMovetext(movetext: string): string[] {
  const tokens = cleanMovetext(movetext).split(/\s+/).filter(Boolean)
  const chess = new Chess()
  const sans: string[] = []
  for (const token of tokens) {
    if (sans.length >= MAX_PLIES) break
    try {
      const move = chess.move(token)
      sans.push(move.san)
    } catch {
      break
    }
  }
  return sans
}

/** Decoupe un fichier PGN (une ou plusieurs parties) en parties exploitables. */
export function parsePgn(text: string, username?: string, source: 'pgn' | 'lichess' = 'pgn'): ImportedGame[] {
  const chunks = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*(?=\[Event\s)/)
    .map((c) => c.trim())
    .filter(Boolean)

  const games: ImportedGame[] = []
  const me = username?.trim().toLowerCase()

  for (const chunk of chunks) {
    const headers: Record<string, string> = {}
    const headerRe = /\[(\w+)\s+"([^"]*)"\]/g
    let match: RegExpExecArray | null
    let headerEnd = 0
    while ((match = headerRe.exec(chunk))) {
      headers[match[1]] = match[2]
      headerEnd = match.index + match[0].length
    }
    const movetext = chunk.slice(headerEnd)
    const sans = sansFromMovetext(movetext)
    if (sans.length === 0) continue

    const white = headers.White ?? 'Blancs'
    const black = headers.Black ?? 'Noirs'
    let color: 'white' | 'black' | undefined
    if (me) {
      if (white.toLowerCase() === me) color = 'white'
      else if (black.toLowerCase() === me) color = 'black'
    }

    games.push({
      id: `${headers.Site ?? ''}|${white}|${black}|${headers.Date ?? ''}|${sans.slice(0, 6).join('')}`,
      white,
      black,
      result: headers.Result ?? '*',
      date: headers.UTCDate ?? headers.Date,
      event: headers.Event,
      url: headers.Site?.startsWith('http') ? headers.Site : undefined,
      sans,
      color,
      source,
    })
  }
  return games
}

/** Telecharge les dernieres parties d'un joueur via l'API publique Lichess. */
export async function fetchLichessGames(username: string, max = 60): Promise<ImportedGame[]> {
  const user = username.trim()
  if (!user) throw new Error('Pseudo Lichess manquant')
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(user)}?max=${max}&clocks=false&evals=false&opening=false&literate=false`
  const res = await fetch(url, { headers: { Accept: 'application/x-chess-pgn' } })
  if (res.status === 404) throw new Error(`Joueur « ${user} » introuvable sur Lichess`)
  if (res.status === 429) throw new Error('Trop de requêtes vers Lichess, réessayez dans une minute')
  if (!res.ok) throw new Error(`Lichess a répondu ${res.status}`)
  const pgn = await res.text()
  const games = parsePgn(pgn, user, 'lichess')
  if (games.length === 0) throw new Error(`Aucune partie exploitable pour « ${user} »`)
  return games
}

/** Fusionne sans doublons (meme identifiant). */
export function mergeGames(existing: ImportedGame[], incoming: ImportedGame[]): { games: ImportedGame[]; added: number } {
  const seen = new Set(existing.map((g) => g.id))
  const added = incoming.filter((g) => !seen.has(g.id))
  return { games: [...added, ...existing], added: added.length }
}

export interface GameNodeStats {
  total: number
  wins: number
  draws: number
  losses: number
  /** Parties dont la branche s'arrete exactement sur ce noeud. */
  endingHere: number
}

export interface GameMapping {
  /** Parties enrichies du noeud atteint dans l'arbre theorique. */
  games: ImportedGame[]
  /** Statistiques cumulees par noeud (toutes les parties qui traversent le noeud). */
  stats: Map<string, GameNodeStats>
}

function outcome(game: ImportedGame): 'win' | 'draw' | 'loss' | null {
  if (game.result === '1/2-1/2') return 'draw'
  if (!game.color) return null
  if (game.result === '1-0') return game.color === 'white' ? 'win' : 'loss'
  if (game.result === '0-1') return game.color === 'black' ? 'win' : 'loss'
  return null
}

/** Place chaque partie sur la branche theorique correspondante. */
export function mapGamesToTree(games: ImportedGame[], root: TreeNode): GameMapping {
  const stats = new Map<string, GameNodeStats>()
  const bump = (id: string, res: ReturnType<typeof outcome>, ending: boolean) => {
    let entry = stats.get(id)
    if (!entry) {
      entry = { total: 0, wins: 0, draws: 0, losses: 0, endingHere: 0 }
      stats.set(id, entry)
    }
    entry.total++
    if (res === 'win') entry.wins++
    else if (res === 'draw') entry.draws++
    else if (res === 'loss') entry.losses++
    if (ending) entry.endingHere++
  }

  const mapped = games.map((game) => {
    const { node } = followSans(root, game.sans)
    const named = nearestNamed(node)
    const res = outcome(game)
    const chain = pathTo(node)
    chain.forEach((n, i) => bump(n.id, res, i === chain.length - 1))
    return {
      ...game,
      nodeId: node.id,
      openingName: named?.name,
      openingEco: named?.eco,
    }
  })

  return { games: mapped, stats }
}
