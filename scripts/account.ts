/**
 * Importe et analyse un compte hors navigateur, avec exactement le meme code que
 * l'application (parsing PGN, placement dans l'arbre, statistiques).
 *
 * Usage : npm run account -- chesscom MonPseudo 2000
 *         npm run account -- lichess MonPseudo 500
 */
import { readFileSync } from 'node:fs'
import { fetchChessComGames, fetchLichessGames, mapGamesToTree } from '../src/lib/games'
import { buildTree, nearestNamed } from '../src/lib/tree'
import type { ImportedGame, OpeningsData } from '../src/lib/types'

const [platform = 'chesscom', username = '', maxArg = '500'] = process.argv.slice(2)
const max = Number(maxArg)

if (!username) {
  console.error('Usage : npm run account -- <chesscom|lichess> <pseudo> [nombre]')
  process.exit(1)
}

const pct = (part: number, total: number) => (total === 0 ? '  0' : String(Math.round((part / total) * 100)).padStart(3))

async function main() {
  console.log(`Import de ${max} parties — ${platform} / ${username}\n`)

  const games: ImportedGame[] =
    platform === 'lichess'
      ? await fetchLichessGames(username, max, (info) => process.stdout.write(`\r  ${info.label.padEnd(70)}`))
      : await fetchChessComGames(username, max, (info) => process.stdout.write(`\r  ${info.label.padEnd(70)}`))

  process.stdout.write('\n\n')

  const data = JSON.parse(readFileSync('public/openings.json', 'utf8')) as OpeningsData
  const tree = buildTree(data)
  const mapping = mapGamesToTree(games, tree.root)

  // Vue d'ensemble
  const dates = games.map((g) => g.date).filter(Boolean).sort() as string[]
  const asWhite = games.filter((g) => g.color === 'white').length
  const asBlack = games.filter((g) => g.color === 'black').length
  const unknown = games.length - asWhite - asBlack

  console.log('=== Vue d’ensemble ===')
  console.log(`  parties importées : ${games.length}`)
  console.log(`  période           : ${dates[0]} → ${dates[dates.length - 1]}`)
  console.log(`  couleur           : ${asWhite} avec les blancs, ${asBlack} avec les noirs${unknown ? `, ${unknown} indéterminé(s)` : ''}`)

  // Sortie de theorie
  const depths = mapping.games.map((g) => (g.nodeId ? g.nodeId.split(' ').length : 0))
  const avgDepth = depths.reduce((a, b) => a + b, 0) / Math.max(depths.length, 1)
  const named = mapping.games.filter((g) => g.openingName).length
  console.log(`  suivi théorique   : ${avgDepth.toFixed(1)} demi-coups en moyenne`)
  console.log(`  ouverture nommée  : ${named} parties (${Math.round((named / games.length) * 100)} %)`)

  // Regroupement par ouverture nommee
  interface Row {
    name: string
    eco: string
    total: number
    wins: number
    draws: number
    losses: number
    white: number
  }
  const byOpening = new Map<string, Row>()
  for (const game of mapping.games) {
    const key = game.openingName ?? 'Hors répertoire'
    let row = byOpening.get(key)
    if (!row) {
      row = { name: key, eco: game.openingEco ?? '—', total: 0, wins: 0, draws: 0, losses: 0, white: 0 }
      byOpening.set(key, row)
    }
    row.total++
    if (game.color === 'white') row.white++
    if (game.result === '1/2-1/2') row.draws++
    else if (game.color) {
      const won = (game.result === '1-0' && game.color === 'white') || (game.result === '0-1' && game.color === 'black')
      if (won) row.wins++
      else row.losses++
    }
  }

  const rows = [...byOpening.values()].sort((a, b) => b.total - a.total)

  console.log('\n=== Ouvertures les plus jouées ===')
  console.log('  ECO   parties   G    N    P   score  ouverture')
  for (const row of rows.slice(0, 20)) {
    const score = pct(row.wins + row.draws / 2, row.total)
    console.log(
      `  ${row.eco.padEnd(4)} ${String(row.total).padStart(7)} ${String(row.wins).padStart(4)} ${String(row.draws).padStart(4)} ${String(row.losses).padStart(4)}  ${score} %  ${row.name.slice(0, 52)}`,
    )
  }

  // Branches problematiques : au moins 8 parties, score le plus faible
  const weak = rows
    .filter((r) => r.total >= 8 && r.name !== 'Hors répertoire')
    .map((r) => ({ ...r, score: (r.wins + r.draws / 2) / r.total }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)

  if (weak.length > 0) {
    console.log('\n=== À travailler en priorité (≥ 8 parties, score le plus bas) ===')
    for (const row of weak) {
      console.log(
        `  ${pct(row.wins + row.draws / 2, row.total)} %  ${String(row.total).padStart(3)} parties  ${row.eco}  ${row.name.slice(0, 56)}`,
      )
    }
  }

  // Noeuds les plus traverses (branches reelles de l'arbre)
  const busiest = [...mapping.stats.entries()]
    .filter(([id, stat]) => id.split(' ').length >= 6 && stat.total >= 8)
    .map(([id, stat]) => {
      const node = tree.byId.get(id)
      const opening = node ? nearestNamed(node) : null
      return { id, stat, label: opening?.name ?? id }
    })
    .sort((a, b) => b.stat.total - a.stat.total)
    .slice(0, 10)

  if (busiest.length > 0) {
    console.log('\n=== Branches les plus fréquentées (≥ 3 coups) ===')
    for (const item of busiest) {
      console.log(
        `  ${String(item.stat.total).padStart(3)} parties  ${pct(item.stat.wins + item.stat.draws / 2, item.stat.total)} %  ${item.id.slice(0, 40).padEnd(40)}  ${item.label.slice(0, 40)}`,
      )
    }
  }

  // Continuations hors theorie les plus jouees (greffons de l'arbre)
  const graftRows: { path: string; count: number; stats?: { wins: number; draws: number; losses: number } }[] = []
  const walkGraft = (node: { id: string; san: string; count: number; children: unknown[] }) => {
    graftRows.push({ path: node.id, count: node.count })
    for (const child of node.children as typeof node[]) walkGraft(child)
  }
  for (const [, roots] of mapping.grafts) for (const root of roots) walkGraft(root as never)

  const topGrafts = graftRows.sort((a, b) => b.count - a.count).slice(0, 10)
  if (topGrafts.length > 0) {
    console.log('\n=== Vos suites hors théorie les plus jouées ===')
    for (const row of topGrafts) {
      const stat = mapping.stats.get(row.path)
      const score = stat ? pct(stat.wins + stat.draws / 2, stat.total) : '  -'
      console.log(`  ${String(row.count).padStart(3)} fois  ${score} %  ${row.path.slice(0, 62)}`)
    }
  }

  const bytes = JSON.stringify(games).length
  console.log(`\nStockage navigateur estimé : ${(bytes / 1024 / 1024).toFixed(1)} Mo`)
  if (bytes > 4.5 * 1024 * 1024) {
    console.log('  ⚠ au-delà du quota localStorage habituel (~5 Mo) : réduisez le nombre de parties.')
  }
}

main().catch((err) => {
  console.error('\nÉchec :', err instanceof Error ? err.message : err)
  process.exit(1)
})
