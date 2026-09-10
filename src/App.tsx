import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import OpeningTree, { type TreeFilter } from './components/OpeningTree'
import Chessboard from './components/Chessboard'
import MoveList from './components/MoveList'
import SearchBar from './components/SearchBar'
import StudyPanel from './components/StudyPanel'
import GamesPanel from './components/GamesPanel'
import ExplorerPanel from './components/ExplorerPanel'
import { positionFromSans } from './lib/chess'
import { ancestorIds, buildTree, nearestNamed, type TreeIndex } from './lib/tree'
import { buildBranchStatus, loadProgress, markExplored, saveProgress, setStatus } from './lib/progress'
import { loadGames, mapGamesToTree, mergeGames, parsePgn, saveGames } from './lib/games'
import type { ImportedGame, OpeningsData, ProgressMap, StudyStatus } from './lib/types'

type PanelTab = 'study' | 'games' | 'explorer'
type MobileView = 'tree' | 'board' | 'study' | 'games'

const USER_KEY = 'chess-openings:username'

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])
  return matches
}

export default function App() {
  const [tree, setTree] = useState<TreeIndex | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['']))
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress())
  const [games, setGames] = useState<ImportedGame[]>(() => loadGames())
  const [filter, setFilter] = useState<TreeFilter>('all')
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [tab, setTab] = useState<PanelTab>('study')
  const [mobileView, setMobileView] = useState<MobileView>('tree')
  const [username, setUsername] = useState(() => localStorage.getItem(USER_KEY) ?? '')
  const [activeGame, setActiveGame] = useState<ImportedGame | null>(null)
  const [dropping, setDropping] = useState(false)
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const dropDepth = useRef(0)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}openings.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<OpeningsData>
      })
      .then((data) => setTree(buildTree(data)))
      .catch((err: unknown) => setLoadError(err instanceof Error ? err.message : 'Chargement impossible'))
  }, [])

  useEffect(() => saveProgress(progress), [progress])
  useEffect(() => saveGames(games), [games])
  useEffect(() => localStorage.setItem(USER_KEY, username), [username])

  const root = tree?.root
  const selectedNode = (selectedId && tree?.byId.get(selectedId)) || root
  const sans = useMemo(() => (selectedId ? selectedId.split(' ') : []), [selectedId])
  const position = useMemo(() => positionFromSans(sans), [sans])
  const pathIds = useMemo(() => new Set(ancestorIds(selectedId)), [selectedId])
  const branchStatus = useMemo(() => buildBranchStatus(progress), [progress])
  const ownStatus = useMemo(
    () => new Map(Object.entries(progress).map(([id, entry]) => [id, entry.status])),
    [progress],
  )
  const mapping = useMemo(
    () => (root ? mapGamesToTree(games, root) : { games: [], stats: new Map() }),
    [games, root],
  )
  const named = selectedNode ? nearestNamed(selectedNode) : null
  const childSans = useMemo(() => new Set(selectedNode?.children.map((c) => c.san) ?? []), [selectedNode])

  /** Selectionne une branche : deplie le chemin, memorise le passage, recentre. */
  const selectPath = useCallback(
    (id: string, options?: { expandChildren?: boolean }) => {
      setSelectedId(id)
      setExpanded((prev) => {
        const next = new Set(prev)
        for (const ancestor of ancestorIds(id)) next.add(ancestor)
        if (options?.expandChildren !== false) next.add(id)
        return next
      })
      setProgress((prev) => markExplored(prev, id) ?? prev)
      if (!isDesktop) setMobileView('tree')
    },
    [isDesktop],
  )

  const toggleNode = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const goToPly = useCallback((ply: number) => setSelectedId(sans.slice(0, ply).join(' ')), [sans])

  const importGames = useCallback(
    (incoming: ImportedGame[]) => {
      setGames((prev) => mergeGames(prev, incoming).games)
    },
    [],
  )

  const openGame = useCallback(
    (game: ImportedGame) => {
      setActiveGame(game)
      if (game.color) setOrientation(game.color)
      if (game.nodeId !== undefined) selectPath(game.nodeId, { expandChildren: false })
    },
    [selectPath],
  )

  // Navigation clavier dans la branche courante
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft' && sans.length > 0) {
        e.preventDefault()
        setSelectedId(sans.slice(0, -1).join(' '))
      } else if (e.key === 'ArrowRight' && selectedNode?.children.length) {
        e.preventDefault()
        selectPath(selectedNode.children[0].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sans, selectedNode, selectPath])

  // Depot d'un fichier PGN n'importe ou sur la page
  useEffect(() => {
    const onDragEnter = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes('Files')) return
      dropDepth.current++
      setDropping(true)
    }
    const onDragLeave = () => {
      dropDepth.current = Math.max(0, dropDepth.current - 1)
      if (dropDepth.current === 0) setDropping(false)
    }
    const onDragOver = (e: DragEvent) => e.preventDefault()
    const onDrop = (e: DragEvent) => {
      e.preventDefault()
      dropDepth.current = 0
      setDropping(false)
      const file = e.dataTransfer?.files?.[0]
      if (!file) return
      void file.text().then((text) => {
        const parsed = parsePgn(text, username)
        if (parsed.length > 0) {
          importGames(parsed)
          setTab('games')
          if (!isDesktop) setMobileView('games')
        }
      })
    }
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [username, importGames, isDesktop])

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-sm text-rose-400">
          Impossible de charger la base d’ouvertures ({loadError}).<br />
          Lancez <code className="text-slate-300">npm run data</code> puis rechargez la page.
        </p>
      </div>
    )
  }

  if (!tree || !root || !selectedNode) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="animate-pulse text-sm text-slate-400">Chargement des ouvertures Lichess…</p>
      </div>
    )
  }

  const boardBlock = (
    <div className="space-y-3">
      <div style={{ containerType: 'inline-size' }}>
        <Chessboard position={position} orientation={orientation} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-100">
            {named?.name ?? 'Position initiale'}
          </p>
          <p className="text-[11px] text-slate-500">
            {named?.eco ? `${named.eco} · ` : ''}
            {selectedNode.count > 1 ? `${selectedNode.count} variantes en aval` : 'Fin de branche'}
          </p>
        </div>
        <button
          onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
          className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          title="Retourner l’échiquier"
        >
          ⇅ Retourner
        </button>
      </div>
      <MoveList sans={sans} onGoTo={goToPly} />
      {activeGame && (
        <div className="rounded-lg border border-purple-700/50 bg-purple-950/20 px-2.5 py-2 text-[11px] text-purple-200">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">
              Partie : {activeGame.white} – {activeGame.black} ({activeGame.result})
            </span>
            <button onClick={() => setActiveGame(null)} className="shrink-0 text-purple-400 hover:text-purple-200">
              ✕
            </button>
          </div>
          <p className="mt-1 font-mono text-[10px] break-words text-purple-300/80">
            Suite jouée : {activeGame.sans.slice(sans.length, sans.length + 12).join(' ') || '—'}
          </p>
          {activeGame.url && (
            <a href={activeGame.url} target="_blank" rel="noreferrer" className="text-purple-400 underline">
              Voir sur Lichess
            </a>
          )}
        </div>
      )}
    </div>
  )

  const studyBlock = (
    <StudyPanel
      node={selectedNode}
      progress={progress}
      byId={tree.byId}
      onSetStatus={(status: StudyStatus | null) => setProgress((prev) => setStatus(prev, selectedId, status))}
      onSelectNode={(id) => selectPath(id, { expandChildren: false })}
      onReset={() => {
        if (confirm('Effacer toute votre progression enregistrée ?')) setProgress({})
      }}
    />
  )

  const gamesBlock = (
    <GamesPanel
      games={mapping.games}
      nodeId={selectedId}
      nodeStats={mapping.stats.get(selectedId)}
      username={username}
      onUsernameChange={setUsername}
      onImport={importGames}
      onSelectGame={openGame}
      onClear={() => {
        if (confirm('Supprimer les parties importées ?')) {
          setGames([])
          setActiveGame(null)
        }
      }}
    />
  )

  const explorerBlock = (
    <ExplorerPanel
      uci={position.uci}
      playableSans={childSans}
      onPlayMove={(san) => {
        const child = selectedNode.children.find((c) => c.san === san)
        if (child) selectPath(child.id)
      }}
    />
  )

  const treeBlock = (
    <OpeningTree
      root={root}
      expanded={expanded}
      selectedId={selectedId}
      pathIds={pathIds}
      branchStatus={branchStatus}
      ownStatus={ownStatus}
      gameStats={mapping.stats}
      filter={filter}
      onSelect={(node) => selectPath(node.id)}
      onToggle={(node) => toggleNode(node.id)}
    />
  )

  const tabs: { id: PanelTab; label: string }[] = [
    { id: 'study', label: 'Étude' },
    { id: 'games', label: `Parties${games.length ? ` (${games.length})` : ''}` },
    { id: 'explorer', label: 'Lichess' },
  ]

  return (
    <div className="flex h-full flex-col bg-slate-950">
      <header className="z-20 shrink-0 border-b border-slate-800 bg-slate-900/70 px-3 py-2.5 backdrop-blur lg:px-4">
        <div className="flex items-center gap-3">
          <div className="hidden shrink-0 items-baseline gap-2 sm:flex">
            <h1 className="text-base font-bold text-slate-100">Arbre des ouvertures</h1>
            <span className="hidden text-[11px] text-slate-500 xl:inline">
              {tree.data.openings.toLocaleString('fr-FR')} variantes · données Lichess
            </span>
          </div>
          <div className="min-w-0 flex-1 lg:max-w-md">
            <SearchBar data={tree.data} onSelect={(path) => selectPath(path, { expandChildren: false })} />
          </div>
          <div className="flex shrink-0 rounded-lg border border-slate-700 p-0.5">
            {(
              [
                { id: 'all', label: 'Tout' },
                { id: 'repertoire', label: 'Mon répertoire' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                className={`rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap transition-colors ${
                  filter === option.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1">
        {isDesktop ? (
          <>
            <aside className="flex w-[380px] shrink-0 flex-col overflow-y-auto border-r border-slate-800 bg-slate-900/40 p-3">
              {boardBlock}
              <div className="mt-4 flex gap-1 border-b border-slate-800">
                {tabs.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setTab(item.id)}
                    className={`-mb-px border-b-2 px-3 py-1.5 text-xs font-medium transition-colors ${
                      tab === item.id
                        ? 'border-blue-500 text-slate-100'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="pt-3">
                {tab === 'study' && studyBlock}
                {tab === 'games' && gamesBlock}
                {tab === 'explorer' && explorerBlock}
              </div>
            </aside>
            <section className="min-w-0 flex-1">{treeBlock}</section>
          </>
        ) : (
          <section className="min-h-0 flex-1">
            <div className={mobileView === 'tree' ? 'h-full' : 'hidden'}>{treeBlock}</div>
            {mobileView === 'board' && (
              <div className="h-full space-y-4 overflow-y-auto p-3 pb-20">
                {boardBlock}
                {explorerBlock}
              </div>
            )}
            {mobileView === 'study' && <div className="h-full overflow-y-auto p-3 pb-20">{studyBlock}</div>}
            {mobileView === 'games' && <div className="h-full overflow-y-auto p-3 pb-20">{gamesBlock}</div>}
          </section>
        )}
      </main>

      {!isDesktop && (
        <nav className="z-20 shrink-0 border-t border-slate-800 bg-slate-900/95 backdrop-blur">
          <div className="grid grid-cols-4">
            {(
              [
                { id: 'tree', label: 'Arbre', icon: '🌳' },
                { id: 'board', label: 'Position', icon: '♟' },
                { id: 'study', label: 'Étude', icon: '🎯' },
                { id: 'games', label: 'Parties', icon: '📥' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setMobileView(item.id)}
                className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors ${
                  mobileView === item.id ? 'text-blue-400' : 'text-slate-500'
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </nav>
      )}

      {dropping && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <p className="rounded-2xl border-2 border-dashed border-blue-500 px-8 py-6 text-sm text-blue-200">
            Déposez votre fichier .pgn pour placer vos parties dans l’arbre
          </p>
        </div>
      )}
    </div>
  )
}
