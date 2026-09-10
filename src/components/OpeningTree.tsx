import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { hierarchy, tree as d3tree, type HierarchyPointNode } from 'd3-hierarchy'
import type { StudyStatus, TreeNode } from '../lib/types'
import type { GameNodeStats } from '../lib/games'
import { STATUS_COLOR } from '../lib/progress'
import { confidenceOf, scoreColor, totalOf, whiteScore, type MoveStat } from '../lib/moveStats'

const NODE_W = 172
const NODE_H = 30
const ROW = 46
const COL = 214
/** Enfants affiches par defaut sur un noeud avant le bouton « + N autres ». */
const DEFAULT_CHILDREN = 8

export type TreeFilter = 'all' | 'repertoire'
/** Ce que traduit la couleur des branches. */
export type ColorMode = 'study' | 'stats'

interface Datum {
  node: TreeNode
  children?: Datum[]
  hidden: number
}

interface Props {
  root: TreeNode
  expanded: Set<string>
  selectedId: string
  pathIds: Set<string>
  branchStatus: Map<string, StudyStatus>
  ownStatus: Map<string, StudyStatus>
  gameStats: Map<string, GameNodeStats>
  /**
    * Coups joues hors theorie, greffes par identifiant de noeud d'ancrage :
    * continuations des parties importees et ligne libre en cours.
    */
  grafts: Map<string, TreeNode[]>
  filter: TreeFilter
  colorMode: ColorMode
  /** Bilan Lichess par coup, indexe par identifiant de noeud. */
  moveStats: Map<string, MoveStat>
  /** Signale les positions dont les enfants sont affiches (a interroger). */
  onVisibleParents: (ids: string[]) => void
  onSelect: (node: TreeNode) => void
  onToggle: (node: TreeNode) => void
}

interface Transform {
  x: number
  y: number
  k: number
}

const linkPath = (source: HierarchyPointNode<Datum>, target: HierarchyPointNode<Datum>) => {
  const x0 = source.y + NODE_W / 2
  const y0 = source.x
  const x1 = target.y - NODE_W / 2
  const y1 = target.x
  const mid = (x0 + x1) / 2
  return `M${x0},${y0}C${mid},${y0} ${mid},${y1} ${x1},${y1}`
}

export default function OpeningTree({
  root,
  expanded,
  selectedId,
  pathIds,
  branchStatus,
  ownStatus,
  gameStats,
  grafts,
  filter,
  colorMode,
  moveStats,
  onVisibleParents,
  onSelect,
  onToggle,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [size, setSize] = useState({ width: 800, height: 600 })
  const [transform, setTransform] = useState<Transform>({ x: 90, y: 300, k: 1 })
  const [showAll, setShowAll] = useState<Set<string>>(new Set())
  const [dragging, setDragging] = useState(false)
  const [animate, setAnimate] = useState(true)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const pinch = useRef<{ dist: number; k: number } | null>(null)
  const dragState = useRef<{ x: number; y: number; tx: number; ty: number; moved: boolean } | null>(null)

  // Taille disponible ; sur petit ecran on demarre a un zoom plus large
  const sized = useRef(false)
  useEffect(() => {
    const el = svgRef.current?.parentElement
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
      if (!sized.current && width > 0) {
        sized.current = true
        if (width < 700) setTransform((t) => ({ ...t, k: 0.72, x: 40, y: height / 2 }))
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const inRepertoire = useCallback(
    (node: TreeNode) => branchStatus.has(node.id) || gameStats.has(node.id),
    [branchStatus, gameStats],
  )

  // Construction de la hierarchie visible
  const layout = useMemo(() => {
    const build = (node: TreeNode): Datum => {
      // Coups joues greffes sur ce noeud : ils s'ajoutent aux enfants theoriques
      const played = grafts.get(node.id) ?? []
      // Les coups reellement joues passent devant : ils ne doivent jamais etre
      // repousses hors de la liste par les enfants theoriques.
      let children = node.virtual ? node.children : [...played, ...node.children]
      if (filter === 'repertoire') children = children.filter((child) => child.virtual || inRepertoire(child))

      const isOpen = filter === 'repertoire' ? children.length > 0 : expanded.has(node.id)
      if (!isOpen || children.length === 0) return { node, hidden: children.length }

      const limit = showAll.has(node.id) ? children.length : DEFAULT_CHILDREN
      const shown = children.slice(0, limit)
      return {
        node,
        hidden: children.length - shown.length,
        children: shown.map(build),
      }
    }

    const h = hierarchy(build(root), (d) => d.children)
    d3tree<Datum>().nodeSize([ROW, COL])(h)
    return h as HierarchyPointNode<Datum>
  }, [root, expanded, filter, showAll, inRepertoire, grafts])

  const nodes = useMemo(() => layout.descendants(), [layout])
  const links = useMemo(() => layout.links(), [layout])

  // Les positions dont on affiche les enfants sont celles a interroger
  useEffect(() => {
    if (colorMode !== 'stats') return
    const parents = nodes.filter((n) => n.data.children?.length).map((n) => n.data.node.id)
    onVisibleParents(parents)
  }, [nodes, colorMode, onVisibleParents])

  const bounds = useMemo(() => {
    let minX = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const n of nodes) {
      minX = Math.min(minX, n.x)
      maxX = Math.max(maxX, n.x)
      maxY = Math.max(maxY, n.y)
    }
    return { minX, maxX, maxY }
  }, [nodes])

  // Recentrage sur la selection
  const centerOn = useCallback(
    (id: string, zoom?: number) => {
      const target = nodes.find((n) => n.data.node.id === id)
      if (!target || size.width === 0) return
      setAnimate(true)
      setTransform((t) => {
        const k = zoom ?? t.k
        return {
          k,
          x: size.width * (size.width < 700 ? 0.5 : 0.34) - target.y * k,
          y: size.height / 2 - target.x * k,
        }
      })
    },
    [nodes, size.width, size.height],
  )

  const lastCentered = useRef('')
  useEffect(() => {
    if (selectedId === lastCentered.current) return
    lastCentered.current = selectedId
    centerOn(selectedId)
  }, [selectedId, centerOn])

  // Pan / zoom
  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 1) {
      setAnimate(false)
      setDragging(true)
      dragState.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y, moved: false }
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), k: transform.k }
    }
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const k = Math.max(0.2, Math.min(2.4, (pinch.current.k * dist) / pinch.current.dist))
      setTransform((t) => ({ ...t, k }))
      return
    }
    const state = dragState.current
    if (!state) return
    const dx = e.clientX - state.x
    const dy = e.clientY - state.y
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) state.moved = true
    setTransform((t) => ({ ...t, x: state.tx + dx, y: state.ty + dy }))
  }

  const endPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    if (pointers.current.size === 0) {
      setDragging(false)
      dragState.current = null
    }
  }

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    setAnimate(false)
    setTransform((t) => {
      const k = Math.max(0.2, Math.min(2.4, t.k * (e.deltaY < 0 ? 1.12 : 1 / 1.12)))
      const ratio = k / t.k
      return { k, x: px - (px - t.x) * ratio, y: py - (py - t.y) * ratio }
    })
  }

  const fitAll = () => {
    if (!nodes.length) return
    const w = bounds.maxY + NODE_W + 60
    const h = bounds.maxX - bounds.minX + ROW * 2
    const k = Math.max(0.2, Math.min(1.2, Math.min(size.width / w, size.height / h)))
    setAnimate(true)
    setTransform({ k, x: 40, y: size.height / 2 - ((bounds.minX + bounds.maxX) / 2) * k })
  }

  const zoomBy = (factor: number) => {
    setAnimate(true)
    setTransform((t) => {
      const k = Math.max(0.2, Math.min(2.4, t.k * factor))
      const ratio = k / t.k
      const cx = size.width / 2
      const cy = size.height / 2
      return { k, x: cx - (cx - t.x) * ratio, y: cy - (cy - t.y) * ratio }
    })
  }

  const handleNodeClick = (node: TreeNode) => {
    if (dragState.current?.moved) return
    onSelect(node)
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <svg
        ref={svgRef}
        className={`tree-canvas h-full w-full ${dragging ? 'dragging' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
        onWheel={onWheel}
        role="tree"
        aria-label="Arbre des ouvertures"
      >
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#020617" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#glow)" />
        <g
          transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}
          style={animate && !dragging ? { transition: 'transform 320ms cubic-bezier(0.22,1,0.36,1)' } : undefined}
        >
          {links.map((link) => {
            const target = link.target.data.node
            const status = branchStatus.get(target.id)
            const onPath = pathIds.has(target.id)
            const stat = moveStats.get(target.id)
            const statsStroke = stat ? scoreColor(whiteScore(stat), confidenceOf(stat)) : '#1e293b'
            const stroke = colorMode === 'stats' ? statsStroke : status ? STATUS_COLOR[status] : '#334155'
            const width =
              colorMode === 'stats'
                ? stat
                  ? Math.min(4, 1 + Math.log10(totalOf(stat) + 1) * 0.6)
                  : 1
                : onPath
                  ? 3.4
                  : status
                    ? 2.2
                    : Math.min(2, 0.7 + Math.log10(target.count + 1) * 0.7)
            return (
              <path
                key={target.id}
                d={linkPath(link.source as HierarchyPointNode<Datum>, link.target as HierarchyPointNode<Datum>)}
                fill="none"
                stroke={target.virtual ? '#f59e0b' : onPath && colorMode === 'study' ? '#e2e8f0' : stroke}
                strokeOpacity={
                  target.virtual ? 0.9 : colorMode === 'stats' ? (stat ? 0.95 : 0.3) : onPath ? 0.95 : status ? 0.75 : 0.45
                }
                strokeWidth={target.virtual ? 2.4 : width}
                strokeDasharray={target.virtual ? '5 4' : undefined}
                strokeLinecap="round"
              />
            )
          })}

          {nodes.map((point) => {
            const node = point.data.node
            const isRoot = node.id === ''
            const selected = node.id === selectedId
            const onPath = pathIds.has(node.id)
            const own = ownStatus.get(node.id)
            const branch = branchStatus.get(node.id)
            const games = gameStats.get(node.id)
            const hasChildren = node.children.length > 0
            const isOpen = point.data.children !== undefined
            const label = node.variation ?? node.family ?? node.name
            const w = isRoot ? 128 : NODE_W

            return (
              <g key={node.id || 'root'} transform={`translate(${point.y - w / 2},${point.x - NODE_H / 2})`}>
                <rect
                  width={w}
                  height={NODE_H}
                  rx={9}
                  className="cursor-pointer"
                  fill={selected ? '#1d4ed8' : node.virtual ? '#292116' : onPath ? '#1e293b' : '#0f172a'}
                  stroke={
                    selected
                      ? '#93c5fd'
                      : node.virtual
                        ? '#f59e0b'
                        : own
                          ? STATUS_COLOR[own]
                          : branch
                            ? STATUS_COLOR[branch]
                            : '#334155'
                  }
                  strokeWidth={selected ? 2 : own || node.virtual ? 1.8 : 1}
                  strokeOpacity={own || selected || node.virtual ? 1 : 0.7}
                  strokeDasharray={node.virtual ? '4 3' : undefined}
                  onClick={() => handleNodeClick(node)}
                />
                <text
                  x={10}
                  y={NODE_H / 2 + 4}
                  fontSize={13}
                  fontWeight={600}
                  fill={selected ? '#ffffff' : '#e2e8f0'}
                  className="pointer-events-none select-none"
                  style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}
                >
                  {isRoot ? 'Départ' : node.san}
                </text>
                {node.virtual && !node.parent && (
                  <text
                    x={10}
                    y={NODE_H + 13}
                    fontSize={10}
                    fill="#f59e0b"
                    className="pointer-events-none select-none"
                  >
                    hors théorie
                  </text>
                )}
                {label && !isRoot && (
                  <text
                    x={10}
                    y={NODE_H + 13}
                    fontSize={10}
                    fill={selected ? '#bfdbfe' : '#94a3b8'}
                    className="pointer-events-none select-none"
                  >
                    {label.length > 30 ? `${label.slice(0, 29)}…` : label}
                  </text>
                )}
                {colorMode === 'stats' && !isRoot ? (
                  (() => {
                    const stat = moveStats.get(node.id)
                    if (!stat) return null
                    const score = whiteScore(stat)
                    return (
                      <g className="pointer-events-none">
                        <rect
                          x={w - 40}
                          y={NODE_H / 2 - 8}
                          width={32}
                          height={16}
                          rx={4}
                          fill={scoreColor(score, confidenceOf(stat))}
                        />
                        <text
                          x={w - 24}
                          y={NODE_H / 2 + 4}
                          fontSize={10}
                          fontWeight={700}
                          textAnchor="middle"
                          fill={score >= 0.5 ? '#0f172a' : '#450a0a'}
                        >
                          {Math.round(score * 100)}%
                        </text>
                      </g>
                    )
                  })()
                ) : node.eco ? (
                  <text
                    x={w - 10}
                    y={NODE_H / 2 + 4}
                    fontSize={10}
                    textAnchor="end"
                    fill={selected ? '#bfdbfe' : '#64748b'}
                    className="pointer-events-none select-none"
                  >
                    {node.eco}
                  </text>
                ) : null}
                {games && (
                  <g transform={`translate(${w - 8}, 4)`} className="pointer-events-none">
                    <circle r={8} fill="#7c3aed" />
                    <text y={3.5} fontSize={9} textAnchor="middle" fill="#ffffff" fontWeight={700}>
                      {games.total > 99 ? '99' : games.total}
                    </text>
                  </g>
                )}
                {own && (
                  <circle cx={-1} cy={NODE_H / 2} r={4.5} fill={STATUS_COLOR[own]} className="pointer-events-none" />
                )}
                {hasChildren && filter === 'all' && (
                  <g
                    transform={`translate(${w + 4}, ${NODE_H / 2})`}
                    className="cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggle(node)
                    }}
                  >
                    <circle r={9} fill={isOpen ? '#1e293b' : '#334155'} stroke="#475569" strokeWidth={1} />
                    <text y={3.5} fontSize={11} textAnchor="middle" fill="#cbd5e1" fontWeight={700}>
                      {isOpen ? '–' : '+'}
                    </text>
                    {!isOpen && node.count > 1 && (
                      <text x={14} y={3.5} fontSize={9} fill="#64748b">
                        {node.count}
                      </text>
                    )}
                  </g>
                )}
              </g>
            )
          })}

          {nodes
            .filter((p) => p.data.hidden > 0 && p.data.children)
            .map((p) => {
              const last = p.children?.[p.children.length - 1]
              if (!last) return null
              return (
                <g
                  key={`more-${p.data.node.id}`}
                  transform={`translate(${last.y - NODE_W / 2}, ${last.x + ROW - NODE_H / 2})`}
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowAll((s) => new Set(s).add(p.data.node.id))
                  }}
                >
                  <rect width={NODE_W} height={22} rx={7} fill="#0f172a" stroke="#475569" strokeDasharray="3 3" />
                  <text x={NODE_W / 2} y={15} fontSize={10.5} textAnchor="middle" fill="#94a3b8">
                    + {p.data.hidden} autres coups
                  </text>
                </g>
              )
            })}
        </g>
      </svg>

      <div className="absolute right-3 bottom-3 flex flex-col gap-1.5">
        <button
          onClick={() => zoomBy(1.25)}
          className="h-10 w-10 rounded-lg border border-slate-700 bg-slate-900/90 text-lg text-slate-200 backdrop-blur active:bg-slate-800 sm:h-9 sm:w-9"
          aria-label="Zoom avant"
        >
          +
        </button>
        <button
          onClick={() => zoomBy(0.8)}
          className="h-10 w-10 rounded-lg border border-slate-700 bg-slate-900/90 text-lg text-slate-200 backdrop-blur active:bg-slate-800 sm:h-9 sm:w-9"
          aria-label="Zoom arrière"
        >
          –
        </button>
        <button
          onClick={fitAll}
          className="h-10 w-10 rounded-lg border border-slate-700 bg-slate-900/90 text-xs text-slate-200 backdrop-blur active:bg-slate-800 sm:h-9 sm:w-9"
          aria-label="Vue d'ensemble"
          title="Vue d'ensemble"
        >
          ⤢
        </button>
        <button
          onClick={() => centerOn(selectedId, 1)}
          className="h-10 w-10 rounded-lg border border-slate-700 bg-slate-900/90 text-xs text-slate-200 backdrop-blur active:bg-slate-800 sm:h-9 sm:w-9"
          aria-label="Centrer sur la position"
          title="Centrer sur la position"
        >
          ◎
        </button>
      </div>

      {colorMode === 'stats' && (
        <div className="absolute top-2 left-2 max-w-[70%] rounded-lg border border-slate-700 bg-slate-900/90 px-2 py-1 text-[9px] text-slate-300 backdrop-blur sm:top-3 sm:left-3 sm:px-2.5 sm:py-1.5 sm:text-[10px]">
          <p className="mb-1 font-semibold">Score des blancs (Lichess)</p>
          <div className="flex items-center gap-1.5">
            <span>Noirs</span>
            <span
              className="h-2 w-24 rounded-full"
              style={{ background: 'linear-gradient(to right, rgb(248,113,113), rgb(100,116,139), rgb(219,234,254))' }}
            />
            <span>Blancs</span>
          </div>
          <p className="mt-1 text-slate-500">Épaisseur = popularité · gris = peu de parties</p>
        </div>
      )}

      {filter === 'repertoire' && nodes.length <= 1 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
          <p className="max-w-xs text-center text-sm text-slate-400">
            Votre répertoire est vide. Explorez une branche puis marquez-la « à l’étude » ou « acquise », ou importez
            vos parties.
          </p>
        </div>
      )}
    </div>
  )
}
