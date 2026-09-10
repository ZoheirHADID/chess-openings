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
import { inferColors, mapGamesToTree, parsePgn } from '../src/lib/games'
import { buildBranchStatus, setStatus } from '../src/lib/progress'
import { explainMove } from '../src/lib/explain'
import ExplainPanel from '../src/components/ExplainPanel'
import type { OpeningsData, ProgressMap } from '../src/lib/types'

const data = JSON.parse(readFileSync('public/openings.json', 'utf8')) as OpeningsData
const tree = buildTree(data)

const PGN = `[Event "Rated Blitz"]
[Site "https://lichess.org/xyz"]
[White "zoheir"]
[Black "rival"]
[Result "0-1"]

1. a3 h6 2. h3 a6 3. Nf3 Nf6 4. Rg1 Rg8 5. Ra2 Ra7 0-1

[Event "Rated Blitz"]
[Site "https://lichess.org/xyz2"]
[White "zoheir"]
[Black "autre"]
[Result "1-0"]

1. a3 h6 2. h3 a6 3. Nf3 Nf6 4. Rg1 d5 5. d4 e6 1-0`

const games = parsePgn(PGN, 'zoheir')
const mapping = mapGamesToTree(games, tree.root)

let progress: ProgressMap = {}
progress = setStatus(progress, 'd4 Nf6 c4 e6 Nc3 Bb4', 'mastered')
progress = setStatus(progress, 'e4 c5 Nf3', 'studying')

const selectedIdForGraft = 'e4 c5 Nf3'
const selectedId = 'e4 c5 Nf3'
const selectedNode = tree.byId.get(selectedId)!
const sans = selectedId.split(' ')
const position = positionFromSans(sans)
const expanded = new Set(['', 'e4', 'e4 c5', 'e4 c5 Nf3'])
// Ligne partiellement hors theorie : 1. e4 c5 2. Nf3 puis un coup libre
const grafts = new Map(mapping.grafts)
grafts.set(selectedIdForGraft, [
  { id: `${selectedIdForGraft} Na3`, san: 'Na3', ply: 4, count: 1, children: [], parent: null, virtual: true },
])

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
          grafts={grafts}
          colorMode="study"
          moveStats={new Map()}
          onVisibleParents={() => {}}
          filter="all"
          onSelect={() => {}}
          onToggle={() => {}}
        />,
      ),
  ],
  [
    'Chessboard',
    () =>
      renderToString(
        <Chessboard
          position={position}
          orientation="white"
          knownSans={new Set(selectedNode.children.map((c) => c.san))}
          onMove={() => {}}
          hint={<p>bulle</p>}
        />,
      ),
  ],
  ['MoveList', () => renderToString(<MoveList sans={sans} theoryPlies={3} onGoTo={() => {}} />)],
  [
    'ExplainPanel',
    () =>
      renderToString(
        <ExplainPanel
          explanation={explainMove(sans, positionFromSans(sans).lastMoveDetail, 'Sicilian Defense')}
          openingName="Sicilian Defense"
          eco="B27"
          outOfBook={false}
          compact
        />,
      ),
  ],
  [
    'StudyPanel',
    () =>
      renderToString(
        <StudyPanel
          node={selectedNode}
          outOfBook={false}
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
          usernames={{ lichess: 'zoheir', chesscom: 'zoheir' }}
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

// Explications : commentaire redige, prophylaxie, roque
const spanish = explainMove(
  ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'],
  positionFromSans(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5']).lastMoveDetail,
  'Ruy Lopez',
)
console.log(`  ${spanish?.numbered} : ${spanish?.note ? 'note theorique OK' : 'NOTE MANQUANTE'}`)
if (!spanish?.note || !spanish.plan || spanish.numbered !== '3. Bb5') {
  console.error('  ECHEC explication de 3. Bb5')
  failed++
}

const morphy = ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6']
const morphyExp = explainMove(morphy, positionFromSans(morphy).lastMoveDetail, 'Ruy Lopez')
if (!morphyExp?.points.some((p) => p.includes('b5'))) {
  console.error('  ECHEC prophylaxie de 3...a6 non detectee :', morphyExp?.points)
  failed++
}
if (morphyExp?.numbered !== '3...a6') {
  console.error('  ECHEC numerotation du coup noir :', morphyExp?.numbered)
  failed++
}

const castle = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5', 'O-O']
const castleExp = explainMove(castle, positionFromSans(castle).lastMoveDetail)
if (!castleExp?.points.some((p) => p.includes('roque'))) {
  console.error('  ECHEC roque non detecte :', castleExp?.points)
  failed++
}

// Sans pseudo a l'import, la couleur jouee doit etre deduite (joueur majoritaire)
const anonymous = parsePgn(PGN)
if (anonymous.some((g) => g.color)) {
  console.error('  ECHEC une couleur a ete attribuee sans pseudo')
  failed++
}
const resolved = inferColors(anonymous)
if (resolved.length !== 2 || resolved.some((g) => g.color !== 'white')) {
  console.error('  ECHEC deduction de la couleur :', resolved.map((g) => g.color))
  failed++
} else {
  console.log('  couleur deduite sans pseudo : blancs pour les 2 parties')
}

// Les continuations reellement jouees doivent etre greffees et fusionnees
const first = mapping.games[0]
const anchorId = first.nodeId ?? ''
const anchorPlies = anchorId ? anchorId.split(' ').length : 0
const firstFreeSan = first.sans[anchorPlies]
const graftRoot = mapping.grafts.get(anchorId)
const graftNode = graftRoot?.find((n) => n.san === firstFreeSan)
console.log(`  theorie jusqu'a ${anchorPlies} demi-coups, puis ${firstFreeSan}`)
if (!graftNode) {
  console.error('  ECHEC aucune greffe pour le premier coup hors theorie')
  failed++
} else {
  // Les deux parties partagent ce coup : le noeud doit etre mutualise
  if (graftNode.count !== 2) {
    console.error(`  ECHEC compteur du noeud greffe : ${graftNode.count} au lieu de 2`)
    failed++
  }
  if (mapping.stats.get(graftNode.id)?.total !== 2) {
    console.error('  ECHEC statistiques absentes sur un noeud hors theorie')
    failed++
  }
  // Puis les parties divergent
  let cursor = graftNode
  let depth = 1
  while (cursor.children.length === 1) {
    cursor = cursor.children[0]
    depth++
  }
  console.log(`  greffe : ${graftNode.san} x${graftNode.count}, divergence apres ${depth} coup(s) en ${cursor.children.map((c) => c.san).join(' / ')}`)
  if (cursor.children.length !== 2) {
    console.error('  ECHEC les deux continuations distinctes ne sont pas branchees ensemble')
    failed++
  }
}

// La branche libre doit apparaitre greffee sur l'arbre
const treeHtml = checks[0][1]()
for (const needle of ['Na3', 'hors th']) {
  if (!treeHtml.includes(needle)) {
    console.error(`  ECHEC la branche hors theorie n'est pas rendue (${needle} absent)`)
    failed++
  }
}

// L'echiquier doit referencer les pieces du sprite
const boardHtml = checks[1][1]()
if (!boardHtml.includes('#piece-wK')) {
  console.error('  ECHEC les pieces SVG ne sont pas rendues')
  failed++
}

// La position doit exposer des coups jouables sur l'echiquier
if (position.moves.length === 0) {
  console.error('  ECHEC aucun coup legal expose par positionFromSans')
  failed++
}
const knight = position.moves.find((m) => m.from === 'b8' && m.to === 'c6')
if (!knight || knight.san !== 'Nc6') {
  console.error('  ECHEC coup legal Nc6 introuvable')
  failed++
}

// Controles metier sur le placement des parties
const played = mapping.games[0]
console.log(`  partie placee sur : ${played.nodeId} -> ${played.openingEco} ${played.openingName}`)
if (played.nodeId !== anchorId) {
  console.error('  ECHEC placement de la partie')
  failed++
}
if (mapping.stats.get('a3')?.total !== 2 || mapping.stats.get('a3')?.wins !== 1) {
  console.error('  ECHEC comptage des resultats :', mapping.stats.get('a3'))
  failed++
}

console.log(failed === 0 ? '\nRendu conforme.' : `\n${failed} echec(s).`)
process.exit(failed === 0 ? 0 : 1)
