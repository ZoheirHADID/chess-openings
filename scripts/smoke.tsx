/**
 * Smoke test de rendu : rend les composants principaux hors navigateur pour
 * detecter toute exception de rendu (layout d3, echiquier, panneaux).
 * Lance par `npm run smoke`.
 */
import { readFileSync } from 'node:fs'
import { renderToString } from 'react-dom/server'
import OpeningTree from '../src/components/OpeningTree'
import Chessboard from '../src/components/Chessboard'
import MoveList from '../src/components/MoveList'
import StudyPanel from '../src/components/StudyPanel'
import GamesPanel from '../src/components/GamesPanel'
import { buildTree } from '../src/lib/tree'
import { positionFromSans } from '../src/lib/chess'
import { mapGamesToTree, parsePgn } from '../src/lib/games'
import { buildBranchStatus, setStatus } from '../src/lib/progress'
import type { OpeningsData, ProgressMap } from '../src/lib/types'

const data = JSON.parse(readFileSync('public/openings.json', 'utf8')) as OpeningsData
const tree = buildTree(data)

const PGN = `[Event "Rated Blitz"]
[Site "https://lichess.org/xyz"]
[White "zoheir"]
[Black "rival"]
[Result "0-1"]

1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3 O-O 0-1`

const games = parsePgn(PGN, 'zoheir')
const mapping = mapGamesToTree(games, tree.root)

let progress: ProgressMap = {}
progress = setStatus(progress, 'd4 Nf6 c4 e6 Nc3 Bb4', 'mastered')
progress = setStatus(progress, 'e4 c5 Nf3', 'studying')

const selectedId = 'e4 c5 Nf3'
const selectedNode = tree.byId.get(selectedId)!
const sans = selectedId.split(' ')
const position = positionFromSans(sans)
const expanded = new Set(['', 'e4', 'e4 c5', 'e4 c5 Nf3'])

const checks: [string, () => string][] = [
  [
    'OpeningTree',
    () =>
      renderToString(
        <OpeningTree
          root={tree.root}
          expanded={expanded}
          selectedId={selectedId}
          pathIds={new Set(['', 'e4', 'e4 c5', 'e4 c5 Nf3'])}
          branchStatus={buildBranchStatus(progress)}
          ownStatus={new Map(Object.entries(progress).map(([id, e]) => [id, e.status]))}
          gameStats={mapping.stats}
          filter="all"
          onSelect={() => {}}
          onToggle={() => {}}
        />,
      ),
  ],
  ['Chessboard', () => renderToString(<Chessboard position={position} orientation="white" />)],
  ['MoveList', () => renderToString(<MoveList sans={sans} onGoTo={() => {}} />)],
  [
    'StudyPanel',
    () =>
      renderToString(
        <StudyPanel
          node={selectedNode}
          progress={progress}
          byId={tree.byId}
          onSetStatus={() => {}}
          onSelectNode={() => {}}
          onReset={() => {}}
        />,
      ),
  ],
  [
    'GamesPanel',
    () =>
      renderToString(
        <GamesPanel
          games={mapping.games}
          nodeId="d4 Nf6 c4 e6"
          nodeStats={mapping.stats.get('d4 Nf6 c4 e6')}
          username="zoheir"
          onUsernameChange={() => {}}
          onImport={() => {}}
          onSelectGame={() => {}}
          onClear={() => {}}
        />,
      ),
  ],
]

let failed = 0
for (const [name, run] of checks) {
  try {
    const html = run()
    const ok = html.length > 80
    console.log(`  ${ok ? 'OK  ' : 'VIDE'} ${name} (${html.length} caracteres)`)
    if (!ok) failed++
  } catch (err) {
    failed++
    console.error(`  ECHEC ${name} :`, err)
  }
}

// Controles metier sur le placement des parties
const played = mapping.games[0]
console.log(`  partie placee sur : ${played.nodeId} -> ${played.openingEco} ${played.openingName}`)
if (played.nodeId !== 'd4 Nf6 c4 e6 Nc3 Bb4 e3 O-O') {
  console.error('  ECHEC placement de la partie')
  failed++
}
if (mapping.stats.get('d4')?.losses !== 1) {
  console.error('  ECHEC comptage du resultat (defaite attendue avec les noirs)')
  failed++
}

console.log(failed === 0 ? '\nRendu conforme.' : `\n${failed} echec(s).`)
process.exit(failed === 0 ? 0 : 1)
