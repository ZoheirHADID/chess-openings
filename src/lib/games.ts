import { Chess } from 'chess.js'
import type { ImportedGame, TreeNode } from './types'
import { followSans, nearestNamed, pathTo } from './tree'

const KEY = 'chess-openings:games:v1'
/**
 * Coups conserves par partie. L'arbre theorique plafonne a 36 demi-coups, mais on
 * garde la suite reellement jouee pour pouvoir rejouer la partie hors theorie.
 */
const MAX_PLIES = 160

export function loadGames(): ImportedGame[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ImportedGame[]) : []
  } catch {
    return []
  }
}

/** Enregistre les parties ; renvoie false si le quota du navigateur est depasse. */
export function saveGames(games: ImportedGame[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(games))
    return true
  } catch {
    return false
  }
}

/** Rapport d'avancement pendant un import qui peut durer plusieurs secondes. */
export type ImportProgress = (info: { fetched: number; label: string }) => void

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

/**
 * Decoupe un fichier PGN (une ou plusieurs parties) en parties exploitables.
 * `usernames` sert a reconnaitre la couleur jouee ; `keepLast` limite le travail
 * aux N dernieres parties du fichier (archives mensuelles volumineuses).
 */
export function parsePgn(
  text: string,
  usernames?: string | string[],
  source: ImportedGame['source'] = 'pgn',
  keepLast?: number,
): ImportedGame[] {
  const all = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*(?=\[Event\s)/)
    .map((c) => c.trim())
    .filter(Boolean)
  const chunks = keepLast ? all.slice(-keepLast) : all

  const games: ImportedGame[] = []
  const me = new Set(
    (Array.isArray(usernames) ? usernames : [usernames ?? ''])
      .map((u) => u.trim().toLowerCase())
      .filter(Boolean),
  )

  for (const chunk of chunks) {
    const headers: Record<string, string> = {}
    const headerRe = /\[(\w+)\s+"([^"]*)"\]/g
    let match: RegExpExecArray | null
    let headerEnd = 0
    while ((match = headerRe.exec(chunk))) {
      headers[match[1]] = match[2]
      headerEnd = match.index + match[0].length
    }
    // Positions de depart personnalisees et variantes exotiques : hors sujet ici
    if (headers.FEN || headers.SetUp === '1') continue
    if (headers.Variant && !/^(standard|chess)$/i.test(headers.Variant)) continue

    const movetext = chunk.slice(headerEnd)
    const sans = sansFromMovetext(movetext)
    if (sans.length === 0) continue

    const white = headers.White ?? 'Blancs'
    const black = headers.Black ?? 'Noirs'
    let color: 'white' | 'black' | undefined
    if (me.has(white.toLowerCase())) color = 'white'
    else if (me.has(black.toLowerCase())) color = 'black'

    // Chess.com place le lien dans [Link], Lichess dans [Site]
    const link = headers.Link ?? (headers.Site?.startsWith('http') ? headers.Site : undefined)

    games.push({
      id: `${link ?? headers.Site ?? ''}|${white}|${black}|${headers.UTCDate ?? headers.Date ?? ''}|${headers.UTCTime ?? headers.StartTime ?? ''}|${sans.slice(0, 6).join('')}`,
      white,
      black,
      result: headers.Result ?? '*',
      date: headers.UTCDate ?? headers.Date,
      event: headers.Event,
      url: link,
      sans,
      color,
      source,
    })
  }
  return games
}

/** Telecharge les parties d'un joueur via l'API publique Lichess. */
export async function fetchLichessGames(
  username: string,
  max = 500,
  onProgress?: ImportProgress,
): Promise<ImportedGame[]> {
  const user = username.trim()
  if (!user) throw new Error('Pseudo Lichess manquant')
  onProgress?.({ fetched: 0, label: 'Téléchargement depuis Lichess…' })
  const url = `https://lichess.org/api/games/user/${encodeURIComponent(user)}?max=${max}&clocks=false&evals=false&opening=false&literate=false`
  const res = await fetch(url, { headers: { Accept: 'application/x-chess-pgn' } })
  if (res.status === 404) throw new Error(`Joueur « ${user} » introuvable sur Lichess`)
  if (res.status === 429) throw new Error('Trop de requêtes vers Lichess, réessayez dans une minute')
  if (!res.ok) throw new Error(`Lichess a répondu ${res.status}`)
  const pgn = await res.text()
  onProgress?.({ fetched: 0, label: 'Analyse des parties…' })
  const games = parsePgn(pgn, user, 'lichess')
  if (games.length === 0) throw new Error(`Aucune partie exploitable pour « ${user} »`)
  onProgress?.({ fetched: games.length, label: `${games.length} partie(s) récupérée(s)` })
  return games
}

interface ChessComArchives {
  archives?: string[]
}

interface ChessComMonth {
  games?: { pgn?: string; end_time?: number; rules?: string }[]
}

/**
 * Telecharge les parties d'un joueur via l'API publique Chess.com.
 * Les archives sont mensuelles : on remonte l'historique complet, du mois le plus
 * recent au plus ancien, jusqu'a reunir `max` parties. Chaque mois est lu au
 * format JSON, dont l'ordre (`end_time` croissant) est fiable — le fichier PGN
 * mensuel, lui, est trie du plus recent au plus ancien et ne doit pas servir a
 * choisir « les N dernieres » parties.
 */
export async function fetchChessComGames(
  username: string,
  max = 500,
  onProgress?: ImportProgress,
): Promise<ImportedGame[]> {
  const user = username.trim()
  if (!user) throw new Error('Pseudo Chess.com manquant')

  onProgress?.({ fetched: 0, label: 'Lecture des archives Chess.com…' })
  const listRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(user.toLowerCase())}/games/archives`)
  if (listRes.status === 404) throw new Error(`Joueur « ${user} » introuvable sur Chess.com`)
  if (listRes.status === 429) throw new Error('Trop de requêtes vers Chess.com, réessayez dans une minute')
  if (!listRes.ok) throw new Error(`Chess.com a répondu ${listRes.status}`)

  const { archives } = (await listRes.json()) as ChessComArchives
  if (!archives || archives.length === 0) throw new Error(`Aucune partie publiée par « ${user} » sur Chess.com`)

  // Historique complet, du mois le plus recent au plus ancien
  const months = [...archives].reverse()
  const collected: ImportedGame[] = []

  for (const [index, month] of months.entries()) {
    if (collected.length >= max) break
    const period = month.slice(-7).replace('/', '-')
    onProgress?.({
      fetched: collected.length,
      label: `Mois ${index + 1}/${months.length} (${period}) — ${collected.length} partie(s)`,
    })
    // Le mois en cours change en permanence : on evite le cache du navigateur
    const res = await fetch(month, { cache: index === 0 ? 'no-cache' : 'default' })
    if (!res.ok) continue
    const { games: monthGames } = (await res.json()) as ChessComMonth
    if (!monthGames || monthGames.length === 0) continue
    // De la plus recente a la plus ancienne, parties d'echecs classiques seulement
    const recent = [...monthGames]
      .filter((g) => g.pgn && (!g.rules || g.rules === 'chess'))
      .sort((a, b) => (b.end_time ?? 0) - (a.end_time ?? 0))
    for (const game of recent) {
      if (collected.length >= max) break
      collected.push(...parsePgn(game.pgn!, user, 'chesscom').slice(0, max - collected.length))
    }
  }

  if (collected.length === 0) throw new Error(`Aucune partie standard exploitable pour « ${user} »`)
  onProgress?.({ fetched: collected.length, label: `${collected.length} partie(s) récupérée(s)` })
  return collected
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
  /** Parties jouees avec les blancs / avec les noirs sur cette branche. */
  asWhite: number
  asBlack: number
  /** Parties dont la branche s'arrete exactement sur ce noeud. */
  endingHere: number
}

export interface GameMapping {
  /** Parties enrichies du noeud atteint dans l'arbre theorique. */
  games: ImportedGame[]
  /** Statistiques cumulees par noeud (toutes les parties qui traversent le noeud). */
  stats: Map<string, GameNodeStats>
  /**
   * Coups reellement joues au-dela de la theorie, sous forme de sous-arbres
   * greffes sur le noeud theorique ou la partie a quitte le repertoire.
   */
  grafts: Map<string, TreeNode[]>
}

/**
 * Deduit la couleur jouee quand le pseudo n'a pas ete reconnu a l'import :
 * le joueur present dans le plus grand nombre de parties est l'utilisateur.
 */
export function inferColors(games: ImportedGame[]): ImportedGame[] {
  const missing = games.filter((g) => !g.color)
  if (missing.length === 0) return games

  const counts = new Map<string, number>()
  for (const game of games) {
    for (const name of [game.white, game.black]) {
      const key = name.toLowerCase()
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  let owner = ''
  let best = 0
  for (const [name, count] of counts) {
    if (count > best) {
      best = count
      owner = name
    }
  }
  // Il faut que ce joueur soit present dans une nette majorite des parties
  if (!owner || best < games.length * 0.6) return games

  return games.map((game) => {
    if (game.color) return game
    if (game.white.toLowerCase() === owner) return { ...game, color: 'white' as const }
    if (game.black.toLowerCase() === owner) return { ...game, color: 'black' as const }
    return game
  })
}

function outcome(game: ImportedGame): 'win' | 'draw' | 'loss' | null {
  if (game.result === '1/2-1/2') return 'draw'
  if (!game.color) return null
  if (game.result === '1-0') return game.color === 'white' ? 'win' : 'loss'
  if (game.result === '0-1') return game.color === 'black' ? 'win' : 'loss'
  return null
}

/** Demi-coups conserves dans l'arbre au-dela de la theorie repertoriee. */
const GRAFT_PLIES = 14

/** Place chaque partie sur la branche theorique correspondante. */
export function mapGamesToTree(games: ImportedGame[], root: TreeNode): GameMapping {
  const stats = new Map<string, GameNodeStats>()
  const bump = (id: string, game: ImportedGame, res: ReturnType<typeof outcome>, ending: boolean) => {
    let entry = stats.get(id)
    if (!entry) {
      entry = { total: 0, wins: 0, draws: 0, losses: 0, asWhite: 0, asBlack: 0, endingHere: 0 }
      stats.set(id, entry)
    }
    entry.total++
    if (res === 'win') entry.wins++
    else if (res === 'draw') entry.draws++
    else if (res === 'loss') entry.losses++
    if (game.color === 'white') entry.asWhite++
    else if (game.color === 'black') entry.asBlack++
    if (ending) entry.endingHere++
  }

  /** Coups reellement joues au-dela de la theorie, greffes par noeud d'ancrage. */
  const grafts = new Map<string, TreeNode[]>()
  const graftIndex = new Map<string, TreeNode>()

  const mapped = games.map((game) => {
    const { node, matched } = followSans(root, game.sans)
    const named = nearestNamed(node)
    const res = outcome(game)
    const extra = game.sans.slice(matched, matched + GRAFT_PLIES)
    const chain = pathTo(node)
    chain.forEach((n, i) => bump(n.id, game, res, i === chain.length - 1 && extra.length === 0))

    // Prolongement hors theorie : un noeud virtuel par coup joue, fusionne entre parties
    let parentId = node.id
    let parentNode: TreeNode | null = null
    let ply = node.ply
    for (const [index, san] of extra.entries()) {
      ply++
      const id = parentId ? `${parentId} ${san}` : san
      let child = graftIndex.get(id)
      if (!child) {
        child = { id, san, ply, count: 0, children: [], parent: parentNode, virtual: true }
        graftIndex.set(id, child)
        const siblings = grafts.get(parentId)
        if (siblings) siblings.push(child)
        else grafts.set(parentId, [child])
      }
      child.count++
      bump(id, game, res, index === extra.length - 1)
      parentId = id
      parentNode = child
    }

    return {
      ...game,
      nodeId: node.id,
      openingName: named?.name,
      openingEco: named?.eco,
      openingId: named?.id,
    }
  })

  // Les enfants d'un noeud greffe sont ranges sous ce noeud ; il ne reste dans
  // `grafts` que les continuations accrochees a un noeud theorique.
  for (const [parentId, siblings] of [...grafts]) {
    const parent = graftIndex.get(parentId)
    if (parent) {
      parent.children = siblings
      grafts.delete(parentId)
    }
  }

  // Les continuations les plus jouees en premier
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => b.count - a.count || a.san.localeCompare(b.san))
    for (const child of nodes) if (child.children.length > 0) sortChildren(child.children)
  }
  for (const [, siblings] of grafts) sortChildren(siblings)

  return { games: mapped, stats, grafts }
}
