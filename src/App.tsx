import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import OpeningTree, { type ColorMode, type TreeFilter } from './components/OpeningTree'
import Chessboard from './components/Chessboard'
import MoveList from './components/MoveList'
import SearchBar from './components/SearchBar'
import StudyPanel from './components/StudyPanel'
import GamesPanel, { type Platform } from './components/GamesPanel'
import ExplorerPanel from './components/ExplorerPanel'
import EvalBar from './components/EvalBar'
import EnginePanel from './components/EnginePanel'
import ExplainPanel from './components/ExplainPanel'
import { PieceSprite } from './components/pieces'
import { engine, judgeMove } from './lib/engine'
import { useEngine } from './lib/useEngine'
import { positionFromSans } from './lib/chess'
import { useMoveStats } from './lib/moveStats'
import { explainMove } from './lib/explain'
import { buildTree, followSans, nearestNamed, type TreeIndex } from './lib/tree'
import { buildBranchStatus, loadProgress, markExplored, saveProgress, setStatus } from './lib/progress'
import { inferColors, loadGames, mapGamesToTree, mergeGames, parsePgn, saveGames } from './lib/games'
import type { ImportedGame, OpeningsData, ProgressMap, StudyStatus, TreeNode } from './lib/types'

type PanelTab = 'study' | 'games' | 'explorer'
type MobileView = 'tree' | 'board' | 'study' | 'games'

const USER_KEY = 'chess-openings:usernames:v2'

const loadUsernames = (): Record<Platform, string> => {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (raw) return JSON.parse(raw) as Record<Platform, string>
    // Reprise de l'ancien reglage mono-plateforme
    return { lichess: localStorage.getItem('chess-openings:username') ?? '', chesscom: '' }
  } catch {
    return { lichess: '', chesscom: '' }
  }
}

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

/** Tous les prefixes d'une ligne, racine comprise : sert a surligner le chemin. */
const prefixesOf = (line: string[]) => {
  const ids = new Set<string>([''])
  for (let i = 1; i <= line.length; i++) ids.add(line.slice(0, i).join(' '))
  return ids
}

export default function App() {
  const [tree, setTree] = useState<TreeIndex | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  /** Ligne de coups courante — source de verite de la position et de l'arbre. */
  const [line, setLine] = useState<string[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['']))
  const [progress, setProgress] = useState<ProgressMap>(() => loadProgress())
  const [games, setGames] = useState<ImportedGame[]>(() => loadGames())
  const [filter, setFilter] = useState<TreeFilter>('all')
  const [colorMode, setColorMode] = useState<ColorMode>('study')
  const [visibleParents, setVisibleParents] = useState<string[]>([])
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [tab, setTab] = useState<PanelTab>('study')
  const [mobileView, setMobileView] = useState<MobileView>('tree')
  const [usernames, setUsernames] = useState<Record<Platform, string>>(loadUsernames)
  const [activeGame, setActiveGame] = useState<ImportedGame | null>(null)
  const [engineOn, setEngineOn] = useState(() => localStorage.getItem('chess-openings:engine') === 'on')
  const [storageWarning, setStorageWarning] = useState(false)
  const [miniBoardOpen, setMiniBoardOpen] = useState(true)
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
  useEffect(() => setStorageWarning(!saveGames(games)), [games])
  useEffect(() => localStorage.setItem(USER_KEY, JSON.stringify(usernames)), [usernames])
  useEffect(() => localStorage.setItem('chess-openings:engine', engineOn ? 'on' : 'off'), [engineOn])

  const root = tree?.root ?? null

  // Ancrage de la ligne courante dans l'arbre theorique
  const { anchor, matched } = useMemo(() => {
    if (!root) return { anchor: null, matched: 0 }
    const result = followSans(root, line)
    return { anchor: result.node, matched: result.matched }
  }, [root, line])

  const anchorId = anchor?.id ?? ''
  const freeLine = useMemo(() => line.slice(matched), [line, matched])
  const outOfBook = freeLine.length > 0

  /**
   * Partie chargee dont la ligne courante est un prefixe : on affiche alors toute
   * la suite reellement jouee, et pas seulement les coups deja parcourus.
   */
  const gameLine = useMemo(() => {
    if (!activeGame) return null
    const sans = activeGame.sans
    if (line.length > sans.length) return null
    for (let i = 0; i < line.length; i++) if (line[i] !== sans[i]) return null
    return sans
  }, [activeGame, line])

  /** Ligne libre en cours de saisie, a greffer en plus des parties jouees. */
  const currentGraft = useMemo(() => {
    if (freeLine.length === 0) return null
    return { anchorId, sans: freeLine, ply: anchorId ? anchorId.split(' ').length : 0 }
  }, [anchorId, freeLine])
  const selectedId = line.join(' ')
  const position = useMemo(() => positionFromSans(line), [line])
  const pathIds = useMemo(() => prefixesOf(line), [line])
  const branchStatus = useMemo(() => buildBranchStatus(progress), [progress])
  const ownStatus = useMemo(
    () => new Map(Object.entries(progress).map(([id, entry]) => [id, entry.status])),
    [progress],
  )
  const mapping = useMemo(
    () => (root ? mapGamesToTree(inferColors(games), root) : { games: [], stats: new Map(), grafts: new Map() }),
    [games, root],
  )

  /**
   * Greffons affiches dans l'arbre : toutes les continuations reellement jouees
   * dans les parties importees, plus la ligne libre en cours de saisie.
   */
  const treeGrafts = useMemo(() => {
    const map = new Map(mapping.grafts)
    if (!currentGraft) return map

    let parentId = currentGraft.anchorId
    let ply = currentGraft.ply
    let parent: TreeNode | null = null
    let siblings = [...(map.get(parentId) ?? [])]
    map.set(parentId, siblings)

    for (const san of currentGraft.sans) {
      ply++
      const id = parentId ? `${parentId} ${san}` : san
      const existing = siblings.find((n) => n.san === san)
      let node: TreeNode
      if (existing) {
        // On clone la branche traversee pour ne pas modifier le cache des parties
        node = { ...existing, children: [...existing.children], parent }
        siblings[siblings.indexOf(existing)] = node
      } else {
        node = { id, san, ply, count: 0, children: [], parent, virtual: true }
        siblings.unshift(node)
      }
      parent = node
      parentId = id
      siblings = node.children
    }
    return map
  }, [mapping.grafts, currentGraft])
  const named = anchor ? nearestNamed(anchor) : null
  /** Coups theoriques jouables depuis la position affichee. */
  const knownSans = useMemo(
    () => new Set(outOfBook ? [] : (anchor?.children.map((c) => c.san) ?? [])),
    [anchor, outOfBook],
  )
  const engineSnapshot = useEngine(position.fen, engineOn)
  const moveStats = useMoveStats(visibleParents, colorMode === 'stats')
  const handleVisibleParents = useCallback((ids: string[]) => {
    setVisibleParents((prev) => (prev.length === ids.length && prev.every((v, i) => v === ids[i]) ? prev : ids))
  }, [])
  /** Explication du dernier coup joue. */
  const explanation = useMemo(
    () => explainMove(line, position.lastMoveDetail, named?.family),
    [line, position.lastMoveDetail, named],
  )
  /** Coup suivant de la partie chargee, s'il en reste. */
  const nextGameMove = gameLine && line.length < gameLine.length ? gameLine[line.length] : null
  /** Meilleur coup du moteur pour la position affichee. */
  const bestLine = engineSnapshot?.fen === position.fen ? engineSnapshot.lines[0] : undefined

  /** Position precedente : le moteur l'evalue aussi, pour juger le coup joue. */
  const parentFen = useMemo(
    () => (line.length > 0 ? positionFromSans(line.slice(0, -1)).fen : null),
    [line],
  )
  useEffect(() => {
    if (engineOn && parentFen) void engine.requestEval(parentFen)
  }, [engineOn, parentFen])

  /** Jugement du coup joue : comparaison des evaluations avant / apres. */
  const verdict = useMemo(() => {
    if (!engineOn || !parentFen || line.length === 0) return null
    return judgeMove(
      engine.getEval(parentFen),
      engine.getEval(position.fen),
      line.length % 2 === 1 ? 'w' : 'b',
      line[line.length - 1],
    )
    // engineSnapshot sert de signal : les evaluations arrivent au fil du calcul
  }, [engineOn, parentFen, position.fen, line, engineSnapshot?.version])

  // La branche parcourue est memorisee et depliee automatiquement
  useEffect(() => {
    if (!anchorId) return
    setProgress((prev) => markExplored(prev, anchorId) ?? prev)
    setExpanded((prev) => {
      const next = new Set(prev)
      const parts = anchorId.split(' ')
      for (let i = 0; i < parts.length; i++) next.add(parts.slice(0, i).join(' '))
      next.add(anchorId)
      return next
    })
  }, [anchorId])

  /** Positionne la ligne sur un chemin SAN complet (theorique ou libre). */
  const selectPath = useCallback(
    (id: string) => {
      setLine(id ? id.split(' ') : [])
      if (!isDesktop) setMobileView('tree')
    },
    [isDesktop],
  )

  /** Joue un coup depuis la position courante. */
  const playMove = useCallback((san: string) => {
    setLine((prev) => [...prev, san])
  }, [])

  const goToPly = useCallback((ply: number) => setLine((prev) => prev.slice(0, ply)), [])

  const toggleNode = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const importGames = useCallback((incoming: ImportedGame[]) => {
    setGames((prev) => mergeGames(prev, incoming).games)
  }, [])

  const openGame = useCallback(
    (game: ImportedGame) => {
      setActiveGame(game)
      if (game.color) setOrientation(game.color)
      // On se place la ou la theorie s'arrete : la suite reellement jouee est
      // greffee en pointilles et se parcourt coup par coup avec ▶.
      const stop = root ? followSans(root, game.sans).matched : 0
      setLine(game.sans.slice(0, stop))
      if (!isDesktop) setMobileView('tree')
    },
    [isDesktop, root],
  )

  // Navigation clavier dans la ligne courante
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
      if (e.key === 'ArrowLeft' && line.length > 0) {
        e.preventDefault()
        setLine((prev) => prev.slice(0, -1))
      } else if (e.key === 'ArrowRight') {
        // Priorite a la partie chargee, sinon variante principale de la theorie
        const next = nextGameMove ?? (outOfBook ? null : (anchor?.children[0]?.san ?? null))
        if (next) {
          e.preventDefault()
          playMove(next)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [line, anchor, outOfBook, playMove, nextGameMove])

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
        const parsed = parsePgn(text, [usernames.lichess, usernames.chesscom])
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
  }, [usernames, importGames, isDesktop])

  if (loadError) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center">
        <p className="text-sm text-rose-400">
          Impossible de charger la base d’ouvertures ({loadError}).
          <br />
          Lancez <code className="text-slate-300">npm run data</code> puis rechargez la page.
        </p>
      </div>
    )
  }

  if (!tree || !root || !anchor) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="animate-pulse text-sm text-slate-400">Chargement des ouvertures Lichess…</p>
      </div>
    )
  }

  /** Bulle revelee au survol de la pastille posee sur la derniere piece jouee. */
  const moveHint = (
    <ExplainPanel
      explanation={explanation}
      openingName={named?.name}
      eco={named?.eco}
      outOfBook={outOfBook}
      compact
      verdict={verdict}
    />
  )

  const forwardMove = nextGameMove ?? (outOfBook ? null : (anchor.children[0]?.san ?? null))

  const boardBlock = (
    <div className="space-y-2.5">
      <div className="flex gap-1.5" style={{ containerType: 'inline-size' }}>
        <EvalBar snapshot={engineSnapshot} orientation={orientation} enabled={engineOn} />
        <div className="min-w-0 flex-1">
          <Chessboard
            position={position}
            orientation={orientation}
            knownSans={knownSans}
            onMove={playMove}
            hint={moveHint}
            bestMove={engineOn ? bestLine?.uci : undefined}
          />
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => setLine([])}
          disabled={line.length === 0}
          className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-30"
          title="Position de départ"
        >
          ⏮
        </button>
        <button
          onClick={() => setLine((prev) => prev.slice(0, -1))}
          disabled={line.length === 0}
          className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-30"
          title="Reculer d’un coup (←)"
        >
          ◀
        </button>
        <button
          onClick={() => forwardMove && playMove(forwardMove)}
          disabled={!forwardMove}
          className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-30"
          title={nextGameMove ? 'Coup suivant de la partie (→)' : 'Avancer dans la variante principale (→)'}
        >
          ▶
        </button>
        {gameLine && (
          <button
            onClick={() => setLine(gameLine)}
            disabled={line.length === gameLine.length}
            className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-30"
            title="Fin de la partie"
          >
            ⏭
          </button>
        )}
        <button
          onClick={() => setEngineOn((on) => !on)}
          className={`ml-auto rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
            engineOn
              ? 'border-emerald-600 bg-emerald-600/20 text-emerald-300'
              : 'border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
          title={engineOn ? 'Désactiver le moteur Stockfish' : 'Calculer le meilleur coup (Stockfish)'}
        >
          {engineOn ? (bestLine ? `⌾ ${bestLine.sans[0]}` : '⌾ …') : '⌾ Meilleur coup'}
        </button>
        <button
          onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
          className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          title="Retourner l’échiquier"
        >
          ⇅
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-100">{named?.name ?? 'Position initiale'}</p>
          <p className="text-[11px] text-slate-500">
            {named?.eco ? `${named.eco} · ` : ''}
            {anchor.count > 1 ? `${anchor.count} variantes en aval` : 'Fin de branche théorique'}
            {' · '}
            {position.turn === 'w' ? 'trait aux blancs' : 'trait aux noirs'}
          </p>
        </div>
      </div>

      {outOfBook && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-700/50 bg-amber-950/25 px-2.5 py-1.5 text-[11px] text-amber-300">
          <span className="min-w-0 flex-1">
            {freeLine.length} coup{freeLine.length > 1 ? 's' : ''} hors théorie Lichess — branche libre en pointillés.
          </span>
          <button
            onClick={() => setLine(line.slice(0, matched))}
            className="shrink-0 rounded border border-amber-700/60 px-1.5 py-0.5 hover:bg-amber-900/40"
          >
            Revenir
          </button>
        </div>
      )}

      <MoveList sans={line} theoryPlies={matched} onGoTo={goToPly} />

      {activeGame && (
        <div className="rounded-lg border border-purple-700/50 bg-purple-950/20 px-2.5 py-2 text-[11px] text-purple-200">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">
              Partie : {activeGame.white} – {activeGame.black} ({activeGame.result})
            </span>
            <button
              onClick={() => setActiveGame(null)}
              className="shrink-0 text-purple-400 hover:text-purple-200"
              title="Fermer la partie"
            >
              ✕
            </button>
          </div>
          <p className="mt-0.5 text-purple-300/80">
            {gameLine
              ? `Demi-coup ${line.length} / ${gameLine.length} · ▶ suit les coups réellement joués`
              : 'Vous avez quitté la ligne de cette partie'}
            {activeGame.url && (
              <>
                {' · '}
                <a href={activeGame.url} target="_blank" rel="noreferrer" className="text-purple-400 underline">
                  Voir la partie
                </a>
              </>
            )}
          </p>
        </div>
      )}

      <EnginePanel
        snapshot={engineSnapshot}
        enabled={engineOn}
        onToggle={() => setEngineOn((on) => !on)}
        outOfBook={outOfBook}
        onPlayMove={playMove}
        failure={engine.failure}
      />
    </div>
  )

  const studyBlock = (
    <StudyPanel
      node={anchor}
      outOfBook={outOfBook}
      progress={progress}
      byId={tree.byId}
      onSetStatus={(status: StudyStatus | null) => setProgress((prev) => setStatus(prev, anchorId, status))}
      onSelectNode={selectPath}
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
      usernames={usernames}
      onUsernameChange={(platform, value) => setUsernames((prev) => ({ ...prev, [platform]: value }))}
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

  /**
   * Version compacte affichee au-dessus de l'arbre sur mobile : l'echiquier
   * reste visible pendant la navigation dans les branches.
   */
  const miniBoardBlock = (
    <div className="flex gap-2 bg-slate-900/40 p-2">
      <div className="flex w-[44%] max-w-[230px] shrink-0 gap-1" style={{ containerType: 'inline-size' }}>
        <EvalBar snapshot={engineSnapshot} orientation={orientation} enabled={engineOn} />
        <div className="min-w-0 flex-1">
          <Chessboard
            position={position}
            orientation={orientation}
            knownSans={knownSans}
            onMove={playMove}
            hint={moveHint}
            bestMove={engineOn ? bestLine?.uci : undefined}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-slate-100">{named?.name ?? 'Position initiale'}</p>
            <p className="truncate text-[10px] text-slate-500">
              {named?.eco ? `${named.eco} · ` : ''}
              {position.turn === 'w' ? 'trait aux blancs' : 'trait aux noirs'}
              {anchor.count > 1 ? ` · ${anchor.count} variantes` : ''}
            </p>
          </div>
        </div>

        <div className="flex gap-1">
          {[
            { label: '⏮', title: 'Position de départ', onClick: () => setLine([]), disabled: line.length === 0 },
            {
              label: '◀',
              title: 'Reculer d’un coup',
              onClick: () => setLine((prev) => prev.slice(0, -1)),
              disabled: line.length === 0,
            },
            {
              label: '▶',
              title: nextGameMove ? 'Coup suivant de la partie' : 'Variante principale',
              onClick: () => forwardMove && playMove(forwardMove),
              disabled: !forwardMove,
            },
            {
              label: '⇅',
              title: 'Retourner l’échiquier',
              onClick: () => setOrientation((o) => (o === 'white' ? 'black' : 'white')),
              disabled: false,
            },
            {
              label: engineOn ? (bestLine ? bestLine.sans[0] : '…') : '⌾',
              title: engineOn ? 'Meilleur coup selon Stockfish' : 'Calculer le meilleur coup',
              onClick: () => setEngineOn((on) => !on),
              disabled: false,
            },
          ].map((button) => (
            <button
              key={button.label}
              onClick={button.onClick}
              disabled={button.disabled}
              title={button.title}
              className="min-h-9 flex-1 rounded-lg border border-slate-700 text-xs text-slate-300 active:bg-slate-800 disabled:opacity-30"
            >
              {button.label}
            </button>
          ))}
        </div>

        {outOfBook && (
          <p className="rounded bg-amber-950/30 px-1.5 py-0.5 text-[10px] text-amber-300">
            {freeLine.length} coup{freeLine.length > 1 ? 's' : ''} hors théorie
            {engineOn && engineSnapshot?.lines[0] && ` · moteur : ${engineSnapshot.lines[0].sans[0]}`}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <MoveList sans={line} theoryPlies={matched} onGoTo={goToPly} />
        </div>
      </div>
    </div>
  )

  const explorerBlock = <ExplorerPanel uci={position.uci} knownSans={knownSans} onPlayMove={playMove} />

  const treeBlock = (
    <OpeningTree
      root={root}
      expanded={expanded}
      selectedId={selectedId}
      pathIds={pathIds}
      branchStatus={branchStatus}
      ownStatus={ownStatus}
      gameStats={mapping.stats}
      grafts={treeGrafts}
      filter={filter}
      colorMode={colorMode}
      moveStats={moveStats}
      onVisibleParents={handleVisibleParents}
      onSelect={(node) => selectPath(node.id)}
      onToggle={(node) => toggleNode(node.id)}
      onOpenGames={(nodeId) => {
        selectPath(nodeId)
        setTab('games')
        if (!isDesktop) setMobileView('games')
      }}
    />
  )

  const tabs: { id: PanelTab; label: string }[] = [
    { id: 'study', label: 'Étude' },
    { id: 'games', label: `Parties${games.length ? ` (${games.length})` : ''}` },
    { id: 'explorer', label: 'Lichess' },
  ]

  return (
    <div className="flex h-full flex-col bg-slate-950">
      <PieceSprite />
      <header className="z-20 shrink-0 border-b border-slate-800 bg-slate-900/70 px-3 py-2.5 backdrop-blur lg:px-4">
        <div className="flex flex-wrap items-center gap-2 lg:gap-3">
          <div className="hidden shrink-0 items-baseline gap-2 sm:flex">
            <h1 className="text-base font-bold text-slate-100">Arbre des ouvertures</h1>
            <span className="hidden text-[11px] text-slate-500 xl:inline">
              {tree.data.openings.toLocaleString('fr-FR')} variantes · données Lichess
            </span>
          </div>
          <div className="min-w-0 flex-1 lg:max-w-md">
            <SearchBar data={tree.data} onSelect={selectPath} />
          </div>
          <div className="flex shrink-0 rounded-lg border border-slate-700 p-0.5">
            {(
              [
                { id: 'all', label: 'Tout', short: 'Tout' },
                { id: 'repertoire', label: 'Mon répertoire', short: 'Rép.' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                onClick={() => setFilter(option.id)}
                title={option.label}
                className={`rounded-md px-1.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors sm:px-2 sm:text-xs ${
                  filter === option.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="sm:hidden">{option.short}</span>
                <span className="hidden sm:inline">{option.label}</span>
              </button>
            ))}
          </div>
          <div
            className="flex shrink-0 rounded-lg border border-slate-700 p-0.5"
            title="Ce que traduit la couleur des branches"
          >
            {(
              [
                { id: 'study', label: 'Ma progression', short: 'Étude' },
                { id: 'stats', label: 'Résultats', short: 'Résul.' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                onClick={() => setColorMode(option.id)}
                title={option.label}
                className={`rounded-md px-1.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors sm:px-2 sm:text-xs ${
                  colorMode === option.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="sm:hidden">{option.short}</span>
                <span className="hidden sm:inline">{option.label}</span>
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
            <div className={mobileView === 'tree' ? 'flex h-full flex-col' : 'hidden'}>
              {miniBoardOpen && <div className="shrink-0">{miniBoardBlock}</div>}
              <button
                onClick={() => setMiniBoardOpen((open) => !open)}
                className="flex shrink-0 items-center justify-center gap-1.5 border-y border-slate-800 bg-slate-900/60 py-1 text-[10px] font-medium text-slate-400"
                aria-expanded={miniBoardOpen}
              >
                {miniBoardOpen ? '▲ Masquer l’échiquier' : '▼ Afficher l’échiquier'}
              </button>
              <div className="min-h-0 flex-1">{treeBlock}</div>
            </div>
            {mobileView === 'board' && (
              <div className="h-full space-y-4 overflow-y-auto p-3 pb-20">
                {boardBlock}
                {explorerBlock}
              </div>
            )}
            {mobileView === 'study' && (
              <div className="flex h-full flex-col">
                <div className="shrink-0 border-b border-slate-800">{miniBoardBlock}</div>
                <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-20">{studyBlock}</div>
              </div>
            )}
            {mobileView === 'games' && <div className="h-full overflow-y-auto p-3 pb-20">{gamesBlock}</div>}
          </section>
        )}
      </main>

      {!isDesktop && (
        <nav
          className="z-20 shrink-0 border-t border-slate-800 bg-slate-900/95 backdrop-blur"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="grid grid-cols-4">
            {(
              [
                { id: 'tree', label: 'Arbre', icon: '🌳' },
                { id: 'board', label: 'Échiquier', icon: '♟' },
                { id: 'study', label: 'Étude', icon: '🎯' },
                { id: 'games', label: 'Parties', icon: '📥' },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                onClick={() => setMobileView(item.id)}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-medium transition-colors ${
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

      {storageWarning && (
        <div className="fixed inset-x-3 bottom-16 z-40 rounded-lg border border-amber-700/60 bg-amber-950/90 px-3 py-2 text-xs text-amber-200 backdrop-blur lg:inset-x-auto lg:right-4 lg:bottom-4 lg:max-w-sm">
          Stockage du navigateur saturé : les dernières parties importées ne seront pas conservées au prochain
          chargement. Réduisez le nombre de parties ou supprimez-en depuis l’onglet Parties.
        </div>
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
