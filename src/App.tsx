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
import WeakSpots from './components/WeakSpots'
import { PieceSprite } from './components/pieces'
import { engine, judgeMove, QUALITY_BADGE } from './lib/engine'
import { useEngine } from './lib/useEngine'
import { positionFromSans } from './lib/chess'
import { isResolved, totalOf, useMoveStats } from './lib/moveStats'
import { explainMove } from './lib/explain'
import { explainFault } from './lib/refutation'
import { buildFaultPrompt } from './lib/aiExplain'
import { chooseReply, STRATEGY_LABEL, STRATEGY_TITLE, type TrainingScore, type TrainingStrategy } from './lib/training'
import { videoLinkFor } from './data/openingVideos'
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
  /** Restreint tout l'affichage des parties a la couleur choisie. */
  const [sideFilter, setSideFilter] = useState<'all' | 'white' | 'black'>(
    () => (localStorage.getItem('chess-openings:side') as 'all' | 'white' | 'black' | null) ?? 'all',
  )
  const [visibleParents, setVisibleParents] = useState<string[]>([])
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [tab, setTab] = useState<PanelTab>('study')
  const [mobileView, setMobileView] = useState<MobileView>('tree')
  const [usernames, setUsernames] = useState<Record<Platform, string>>(loadUsernames)
  const [activeGame, setActiveGame] = useState<ImportedGame | null>(null)
  const [engineOn, setEngineOn] = useState(() => localStorage.getItem('chess-openings:engine') === 'on')
  const [storageWarning, setStorageWarning] = useState(false)
  const [miniBoardOpen, setMiniBoardOpen] = useState(true)
  /** Mode « jouer la théorie » : l'ordinateur répond au hasard dans l'arbre. */
  const [training, setTraining] = useState<{ color: 'white' | 'black' } | null>(null)
  const [trainScore, setTrainScore] = useState<TrainingScore>({ found: 0, missed: 0 })
  const [trainStrategy, setTrainStrategy] = useState<TrainingStrategy>(
    () => (localStorage.getItem('chess-openings:train-strategy') as TrainingStrategy | null) ?? 'random',
  )
  const [hintOpen, setHintOpen] = useState(false)
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
  useEffect(() => localStorage.setItem('chess-openings:train-strategy', trainStrategy), [trainStrategy])
  useEffect(() => localStorage.setItem('chess-openings:side', sideFilter), [sideFilter])

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
  const mapping = useMemo(() => {
    if (!root) return { games: [], stats: new Map(), grafts: new Map() }
    const resolved = inferColors(games)
    const selected = sideFilter === 'all' ? resolved : resolved.filter((g) => g.color === sideFilter)
    return mapGamesToTree(selected, root)
  }, [games, root, sideFilter])

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
  /** Positions dont on veut le bilan Lichess : tout l'ecran en mode Résultats,
   *  sinon la position precedant le coup affiche et la position courante (pour
   *  designer le coup suivant le plus joue). */
  const statsTargets = useMemo(() => {
    if (colorMode === 'stats') return visibleParents
    const targets: string[] = []
    if (line.length > 0) targets.push(line.slice(0, -1).join(' '))
    if (!outOfBook) targets.push(anchorId)
    return targets
  }, [colorMode, visibleParents, line, outOfBook, anchorId])
  const moveStats = useMoveStats(statsTargets, true)

  /**
   * Coup theorique suivant a mettre en avant : le plus joue d'apres le bilan
   * Lichess, a defaut la variante principale (celle qui compte le plus de suites).
   */
  // Le cache des bilans est une Map stable : cette cle change quand les bilans des suites arrivent
  const childStatsKey = anchor
    ? anchor.children
        .map((child) => {
          const stat = moveStats.get(child.id)
          return stat ? totalOf(stat) : -1
        })
        .join(',')
    : ''
  const recommendedId = useMemo(() => {
    if (!anchor || outOfBook || anchor.children.length === 0) return null
    let best: TreeNode | null = null
    let bestTotal = 0
    for (const child of anchor.children) {
      const stat = moveStats.get(child.id)
      const total = stat ? totalOf(stat) : 0
      if (total > bestTotal) {
        best = child
        bestTotal = total
      }
    }
    return (best ?? anchor.children[0]).id
  }, [anchor, outOfBook, moveStats, childStatsKey])
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
  /** Entrainement : a qui le trait ? */
  const playerTurn = training !== null && position.turn === (training.color === 'white' ? 'w' : 'b')
  const computerTurn = training !== null && !playerTurn
  /** Entrainement : la theorie repertoriee s'arrete ici. */
  const theoryEnded = training !== null && !outOfBook && line.length > 0 && (anchor?.children.length ?? 0) === 0
  /** Video francophone pour l'ouverture courante. */
  const video = useMemo(() => videoLinkFor(named?.family, named?.name), [named])

  /** Meilleur coup du moteur pour la position affichee. */
  const bestLine = engineSnapshot?.fen === position.fen ? engineSnapshot.lines[0] : undefined

  /** Position precedente : le moteur l'evalue aussi, pour juger le coup joue. */
  const parentFen = useMemo(
    () => (line.length > 0 ? positionFromSans(line.slice(0, -1)).fen : null),
    [line],
  )
  /**
   * Le dernier coup est toujours juge. Moteur allume, l'analyse principale evalue
   * la position courante et seule la precedente est demandee en arriere-plan.
   * Moteur eteint, un coup de theorie porte d'office la pastille « livre » ; un
   * coup hors theorie est evalue en tache de fond (les deux positions).
   */
  useEffect(() => {
    if (!parentFen) return
    if (!engineOn && !outOfBook) return
    void engine.requestEval(parentFen)
    if (!engineOn) void engine.requestEval(position.fen)
  }, [engineOn, parentFen, position.fen, outOfBook])

  /** Signal d'arrivee des evaluations d'arriere-plan, meme moteur eteint. */
  const [evalVersion, setEvalVersion] = useState(0)
  useEffect(() => {
    const unsubscribe = engine.subscribe((snapshot) => setEvalVersion(snapshot.version))
    return () => {
      unsubscribe()
    }
  }, [])

  /** Jugement du coup joue : comparaison des evaluations avant / apres. */
  const verdict = useMemo(() => {
    if (!parentFen || line.length === 0) return null
    return judgeMove(
      engine.getEval(parentFen),
      engine.getEval(position.fen),
      line.length % 2 === 1 ? 'w' : 'b',
      line[line.length - 1],
      { fenBefore: parentFen, inBook: !outOfBook },
    )
    // evalVersion sert de signal : les evaluations arrivent au fil du calcul
  }, [parentFen, position.fen, line, outOfBook, evalVersion])

  /** Pastille du dernier coup : verdict du moteur, sinon « théorie » si le coup est dans l'arbre. */
  const moveBadge = useMemo(() => {
    if (line.length === 0) return null
    if (verdict) return QUALITY_BADGE[verdict.quality]
    return outOfBook ? null : QUALITY_BADGE.book
  }, [line.length, verdict, outOfBook])
  /** Pourquoi le dernier coup est fautif : evaluations, concessions, meilleur coup, punition. */
  const fault = useMemo(
    () =>
      parentFen && line.length > 0
        ? explainFault({
            fenBefore: parentFen,
            fenAfter: position.fen,
            playedSan: line[line.length - 1],
            verdict,
            before: engine.getEval(parentFen),
            after: engine.getEval(position.fen),
            bestLine,
            warnings: explanation?.warnings,
          })
        : null,
    // evalVersion : les evaluations (et leurs variantes) arrivent au fil du calcul
    [parentFen, position.fen, line, verdict, bestLine, explanation, evalVersion],
  )
  const aiPrompt = useMemo(
    () =>
      fault && verdict && parentFen
        ? buildFaultPrompt({
            fault,
            sans: line.slice(0, -1),
            playedSan: line[line.length - 1],
            fenBefore: parentFen,
            fenAfter: position.fen,
            openingName: named?.name,
            qualityLabel: verdict.label,
          })
        : null,
    [fault, verdict, parentFen, line, position.fen, named],
  )

  // La branche parcourue est memorisee et depliee automatiquement. En mode
  // entrainement, les suites du noeud courant restent repliees pendant le tour
  // du joueur : l'arbre ne souffle pas la reponse.
  const hideReplies = training !== null && playerTurn && !outOfBook
  useEffect(() => {
    if (!anchorId) return
    setProgress((prev) => markExplored(prev, anchorId) ?? prev)
    setExpanded((prev) => {
      const next = new Set(prev)
      const parts = anchorId.split(' ')
      for (let i = 0; i < parts.length; i++) next.add(parts.slice(0, i).join(' '))
      if (!hideReplies) next.add(anchorId)
      return next
    })
  }, [anchorId, hideReplies])

  // Entrainement : l'ordinateur repond par un coup theorique selon la strategie
  // choisie (tirage au sort, variante la plus jouee, variante favorable au joueur)
  useEffect(() => {
    if (!training || !anchor || outOfBook || !computerTurn || anchor.children.length === 0) return
    const expectedId = anchorId
    const play = (san: string) => setLine((prev) => (prev.join(' ') === expectedId ? [...prev, san] : prev))
    const choice = chooseReply(anchor.children, trainStrategy, moveStats, isResolved(anchorId), training.color)
    if (choice === null) return
    // Bilan Lichess encore en route : on le laisse arriver, avec un repli sur la variante principale
    const delay = choice === 'wait' ? 3000 : 600
    const san = choice === 'wait' ? anchor.children[0].san : choice.san
    const timer = setTimeout(() => play(san), delay)
    return () => clearTimeout(timer)
    // childStatsKey relance l'effet a l'arrivee des bilans
  }, [training, trainStrategy, anchor, anchorId, outOfBook, computerTurn, moveStats, childStatsKey])

  // L'indice se referme des que la position change
  useEffect(() => setHintOpen(false), [anchorId])

  const startTraining = useCallback(
    (color: 'white' | 'black') => {
      setTraining({ color })
      setTrainScore({ found: 0, missed: 0 })
      setOrientation(color)
      setActiveGame(null)
      setLine([])
      if (!isDesktop) setMobileView('board')
    },
    [isDesktop],
  )
  const stopTraining = useCallback(() => setTraining(null), [])

  /** Positionne la ligne sur un chemin SAN complet (theorique ou libre). */
  const selectPath = useCallback(
    (id: string) => {
      setLine(id ? id.split(' ') : [])
      if (!isDesktop) setMobileView('tree')
    },
    [isDesktop],
  )

  /** Joue un coup depuis la position courante (compte les reponses en entrainement). */
  const playMove = useCallback(
    (san: string) => {
      if (training && playerTurn && !outOfBook) {
        const known = knownSans.has(san)
        setTrainScore((score) => (known ? { ...score, found: score.found + 1 } : { ...score, missed: score.missed + 1 }))
      }
      setLine((prev) => [...prev, san])
    },
    [training, playerTurn, outOfBook, knownSans],
  )

  const goToPly = useCallback((ply: number) => setLine((prev) => prev.slice(0, ply)), [])

  /** Choisir une couleur oriente aussi l'echiquier de ce cote. */
  const changeSide = useCallback((next: 'all' | 'white' | 'black') => {
    setSideFilter(next)
    if (next !== 'all') setOrientation(next)
  }, [])

  const toggleNode = useCallback((id: string, forceOpen = false) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id) && !forceOpen) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const importGames = useCallback((incoming: ImportedGame[]) => {
    setGames((prev) => mergeGames(prev, incoming).games)
  }, [])

  /**
   * Ouvre une partie a etudier dans l'arbre. L'echiquier se tourne du cote du
   * joueur : couleur connue de la partie, sinon camp choisi explicitement, sinon
   * pseudo reconnu parmi les joueurs, sinon couleur du filtre courant.
   */
  const openGame = useCallback(
    (game: ImportedGame, side?: 'white' | 'black') => {
      const me = new Set(
        Object.values(usernames)
          .map((name) => name.trim().toLowerCase())
          .filter(Boolean),
      )
      const guessed = me.has(game.white.toLowerCase())
        ? 'white'
        : me.has(game.black.toLowerCase())
          ? 'black'
          : undefined
      const color = game.color ?? side ?? guessed ?? (sideFilter === 'all' ? undefined : sideFilter)
      const studied = color && color !== game.color ? { ...game, color } : game
      // La couleur decouverte est conservee : bilans et pastilles en tiennent compte
      if (studied !== game) setGames((prev) => prev.map((g) => (g.id === game.id ? studied : g)))
      setActiveGame(studied)
      if (color) setOrientation(color)
      // On se place la ou la theorie s'arrete : la suite reellement jouee est
      // greffee en pointilles et se parcourt coup par coup avec ▶.
      const stop = root ? followSans(root, game.sans).matched : 0
      setLine(game.sans.slice(0, stop))
      if (!isDesktop) setMobileView('tree')
    },
    [isDesktop, root, usernames, sideFilter],
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
      fault={fault}
      aiPrompt={aiPrompt}
    />
  )

  const forwardMove = nextGameMove ?? (outOfBook ? null : (anchor.children[0]?.san ?? null))

  /**
   * Echiquier principal avec sa barre d'evaluation. En mode `flush` (mobile),
   * la rangee barre + echiquier occupe toute la largeur de l'ecran, seules les
   * commandes gardent une marge ; la hauteur reste bornee au viewport en paysage.
   */
  const renderBoardBlock = (flush = false) => (
    <div className="space-y-2.5">
      <div
        className={`mx-auto flex w-full gap-1.5 ${flush ? 'px-1' : ''}`}
        style={{ containerType: 'inline-size', ...(flush ? { maxWidth: 'calc(100dvh - 9rem)' } : {}) }}
      >
        <EvalBar snapshot={engineSnapshot} orientation={orientation} enabled={engineOn} />
        <div className="min-w-0 flex-1">
          <Chessboard
            position={position}
            orientation={orientation}
            knownSans={knownSans}
            onMove={playMove}
            hint={moveHint}
            bestMove={engineOn ? bestLine?.uci : undefined}
            badge={moveBadge}
          />
        </div>
      </div>

      <div className={`flex items-center gap-1 ${flush ? 'px-3' : ''}`}>
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
          disabled={!forwardMove || hideReplies}
          className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-30"
          title={
            hideReplies
              ? 'À vous de trouver le coup théorique'
              : nextGameMove
                ? 'Coup suivant de la partie (→)'
                : 'Avancer dans la variante principale (→)'
          }
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

      {training && (
        <div
          className={`space-y-1.5 rounded-lg border border-indigo-700/60 bg-indigo-950/30 px-2.5 py-2 text-[11px] text-indigo-100 ${
            flush ? 'mx-3' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">
              🤖 Jouer la théorie · vous avez les {training.color === 'white' ? 'blancs' : 'noirs'}
            </span>
            <span className="ml-auto shrink-0 tabular-nums text-indigo-300" title="Coups théoriques trouvés · coups hors théorie">
              <span className="text-emerald-300">{trainScore.found} ✓</span> · <span className="text-rose-300">{trainScore.missed} ✗</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-indigo-300">Réponse :</span>
            <div className="flex rounded-md border border-indigo-700/70 p-0.5">
              {(Object.keys(STRATEGY_LABEL) as TrainingStrategy[]).map((id) => (
                <button
                  key={id}
                  onClick={() => setTrainStrategy(id)}
                  title={STRATEGY_TITLE[id]}
                  className={`rounded px-1.5 py-0.5 text-[10px] font-medium whitespace-nowrap transition-colors ${
                    trainStrategy === id ? 'bg-indigo-600 text-white' : 'text-indigo-300 hover:text-white'
                  }`}
                >
                  {STRATEGY_LABEL[id]}
                </button>
              ))}
            </div>
          </div>
          <p className="text-indigo-200/90">
            {outOfBook
              ? `Hors théorie. Coups attendus : ${anchor.children.map((c) => c.san).join(', ')}.`
              : theoryEnded
                ? `Fin de la théorie répertoriée : ${named?.name ?? 'ligne sans nom'}. Bravo, nouvelle partie ?`
                : computerTurn
                  ? 'L’ordinateur choisit une variante…'
                  : `À vous : trouvez un coup théorique (${anchor.children.length} possible${anchor.children.length > 1 ? 's' : ''}).`}
          </p>
          {hintOpen && !outOfBook && anchor.children.length > 0 && (
            <ul className="space-y-0.5 text-indigo-200/80">
              {anchor.children.slice(0, 6).map((child) => {
                const label = child.variation ?? child.name ?? nearestNamed(child)?.name
                return (
                  <li key={child.id}>
                    <span className="font-mono text-slate-100">{child.san}</span>
                    {label && <span className="text-indigo-300/80"> · {label}</span>}
                  </li>
                )
              })}
              {anchor.children.length > 6 && <li>… et {anchor.children.length - 6} autre(s)</li>}
            </ul>
          )}
          <div className="flex flex-wrap gap-1">
            {outOfBook && (
              <button
                onClick={() => setLine((prev) => prev.slice(0, matched))}
                className="rounded-md border border-amber-600/70 px-2 py-1 text-amber-200 hover:bg-amber-900/40"
              >
                ↶ Reprendre
              </button>
            )}
            {playerTurn && !outOfBook && !theoryEnded && (
              <button
                onClick={() => setHintOpen((open) => !open)}
                className="rounded-md border border-indigo-600/70 px-2 py-1 hover:bg-indigo-900/40"
              >
                💡 {hintOpen ? 'Masquer' : 'Indice'}
              </button>
            )}
            <button
              onClick={() => setLine([])}
              className="rounded-md border border-indigo-600/70 px-2 py-1 hover:bg-indigo-900/40"
            >
              🔁 Nouvelle partie
            </button>
            <button
              onClick={() => startTraining(training.color === 'white' ? 'black' : 'white')}
              className="rounded-md border border-indigo-600/70 px-2 py-1 hover:bg-indigo-900/40"
            >
              ⇅ Changer de couleur
            </button>
            <button onClick={stopTraining} className="ml-auto rounded-md px-2 py-1 text-indigo-300 hover:text-white">
              ✕ Quitter
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          {named && video ? (
            <a
              href={video.url}
              target="_blank"
              rel="noreferrer"
              title={video.direct ? `Vidéo : ${video.label}` : video.label}
              className="flex items-baseline gap-1.5 text-sm font-semibold text-slate-100 hover:text-blue-300"
            >
              <span className="truncate">{named.name}</span>
              <span className={`shrink-0 text-[10px] ${video.direct ? 'text-rose-400' : 'text-slate-500'}`}>▶</span>
            </a>
          ) : (
            <p className="truncate text-sm font-semibold text-slate-100">{named?.name ?? 'Position initiale'}</p>
          )}
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
      ownStats={mapping.stats.get(selectedId)}
      reference={moveStats.get(selectedId)}
      moverIsWhite={line.length % 2 === 1}
    >
      <WeakSpots games={mapping.games} stats={mapping.stats} byId={tree.byId} onSelect={selectPath} />
    </StudyPanel>
  )

  const gamesBlock = (
    <GamesPanel
      games={mapping.games}
      nodeId={selectedId}
      nodeStats={mapping.stats.get(selectedId)}
      usernames={usernames}
      onUsernameChange={(platform, value) => setUsernames((prev) => ({ ...prev, [platform]: value }))}
      onImport={importGames}
      sideFilter={sideFilter}
      activeGameId={activeGame?.id ?? null}
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
    <div className="bg-slate-900/40 py-1.5">
      <div
        className="mx-auto flex w-full gap-1.5 px-1"
        style={{ containerType: 'inline-size', maxWidth: 'calc(100dvh - 16rem)' }}
      >
        <EvalBar snapshot={engineSnapshot} orientation={orientation} enabled={engineOn} />
        <div className="min-w-0 flex-1">
          <Chessboard
            position={position}
            orientation={orientation}
            knownSans={knownSans}
            onMove={playMove}
            hint={moveHint}
            bestMove={engineOn ? bestLine?.uci : undefined}
            badge={moveBadge}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5 px-2 pt-1.5">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            {named && video ? (
              <a
                href={video.url}
                target="_blank"
                rel="noreferrer"
                title={video.direct ? `Vidéo : ${video.label}` : video.label}
                className="flex items-baseline gap-1 text-xs font-semibold text-slate-100"
              >
                <span className="truncate">{named.name}</span>
                <span className={`shrink-0 text-[9px] ${video.direct ? 'text-rose-400' : 'text-slate-500'}`}>▶</span>
              </a>
            ) : (
              <p className="truncate text-xs font-semibold text-slate-100">{named?.name ?? 'Position initiale'}</p>
            )}
            <p className="truncate text-[10px] text-slate-500">
              {named?.eco ? `${named.eco} · ` : ''}
              {position.turn === 'w' ? 'trait aux blancs' : 'trait aux noirs'}
              {anchor.count > 1 ? ` · ${anchor.count} variantes` : ''}
            </p>
          </div>

          <div className="flex shrink-0 gap-1">
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
              disabled: !forwardMove || hideReplies,
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
              className="min-h-9 min-w-9 rounded-lg border border-slate-700 px-1.5 text-xs text-slate-300 active:bg-slate-800 disabled:opacity-30"
            >
              {button.label}
            </button>
          ))}
          </div>
        </div>

        {training && (
          <div className="flex items-center gap-2 rounded bg-indigo-950/40 px-1.5 py-0.5 text-[10px] text-indigo-200">
            <span className="truncate">
              🤖 Théorie ·{' '}
              {outOfBook
                ? 'hors théorie'
                : theoryEnded
                  ? 'fin de la théorie'
                  : computerTurn
                    ? 'l’ordinateur joue…'
                    : 'à vous de jouer'}{' '}
              · {trainScore.found} ✓ {trainScore.missed} ✗
            </span>
            <button onClick={() => setMobileView('board')} className="ml-auto shrink-0 text-indigo-300">
              Échiquier ▸
            </button>
          </div>
        )}

        {activeGame && (
          <div className="flex items-center gap-2 rounded bg-purple-950/30 px-1.5 py-0.5 text-[10px] text-purple-200">
            <span className="truncate">
              Partie {activeGame.color === 'black' ? '●' : '○'} {activeGame.white} – {activeGame.black} (
              {activeGame.result})
              {gameLine ? ` · ${line.length}/${gameLine.length} · ▶ suit la partie` : ' · ligne quittée'}
            </span>
            <button
              onClick={() => setActiveGame(null)}
              className="ml-auto shrink-0 text-purple-400"
              title="Fermer la partie"
            >
              ✕
            </button>
          </div>
        )}

        {outOfBook && (
          <p className="rounded bg-amber-950/30 px-1.5 py-0.5 text-[10px] text-amber-300">
            {freeLine.length} coup{freeLine.length > 1 ? 's' : ''} hors théorie
            {engineOn && engineSnapshot?.lines[0] && ` · moteur : ${engineSnapshot.lines[0].sans[0]}`}
          </p>
        )}

        {line.length > 0 && (
          <div className="max-h-12 overflow-y-auto">
            <MoveList sans={line} theoryPlies={matched} onGoTo={goToPly} />
          </div>
        )}
      </div>
    </div>
  )

  const explorerBlock = <ExplorerPanel uci={position.uci} knownSans={knownSans} onPlayMove={playMove} />

  const treeBlock = (
    <OpeningTree
      root={root}
      expanded={expanded}
      selectedId={selectedId}
      focusId={hideReplies ? null : recommendedId}
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
      onExpand={(node) => toggleNode(node.id, true)}
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
            title="Ne montrer que les parties jouées avec cette couleur"
          >
            {(
              [
                { id: 'all', label: 'Les 2', title: 'Toutes vos parties' },
                { id: 'white', label: '○', title: 'Uniquement vos parties avec les blancs' },
                { id: 'black', label: '●', title: 'Uniquement vos parties avec les noirs' },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                onClick={() => changeSide(option.id)}
                title={option.title}
                className={`rounded-md px-1.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors sm:px-2 sm:text-xs ${
                  sideFilter === option.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {option.label}
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
          <button
            onClick={() => (training ? stopTraining() : startTraining(sideFilter === 'all' ? orientation : sideFilter))}
            title={
              training
                ? 'Quitter le mode « jouer la théorie »'
                : 'Jouer la théorie contre l’ordinateur : il répond par une variante tirée au sort'
            }
            className={`shrink-0 rounded-lg border px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors sm:text-xs ${
              training
                ? 'border-indigo-500 bg-indigo-600 text-white'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            <span className="sm:hidden">🤖</span>
            <span className="hidden sm:inline">🤖 Jouer la théorie</span>
          </button>
        </div>
      </header>

      <main className="flex min-h-0 flex-1">
        {isDesktop ? (
          <>
            <aside className="flex w-[380px] shrink-0 flex-col overflow-y-auto border-r border-slate-800 bg-slate-900/40 p-3">
              {renderBoardBlock()}
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
              <div className="h-full space-y-4 overflow-x-hidden overflow-y-auto pt-2 pb-20">
                {renderBoardBlock(true)}
                <div className="px-3">{explorerBlock}</div>
              </div>
            )}
            {mobileView === 'study' && (
              <div className="flex h-full flex-col">
                <div className="shrink-0 border-b border-slate-800">{miniBoardBlock}</div>
                <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-3 pb-20">{studyBlock}</div>
              </div>
            )}
            {mobileView === 'games' && <div className="h-full overflow-x-hidden overflow-y-auto p-3 pb-20">{gamesBlock}</div>}
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
