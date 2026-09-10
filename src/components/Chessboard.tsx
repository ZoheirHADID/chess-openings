import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import type { PositionInfo } from '../lib/chess'
import { Piece } from './pieces'

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const PROMOTIONS = ['q', 'r', 'b', 'n'] as const

/** Palette de l'echiquier vert classique (type chess.com). */
const LIGHT = '#ebecd0'
const DARK = '#739552'
const HIGHLIGHT = 'rgba(255, 236, 76, 0.55)'

interface Props {
  position: PositionInfo
  orientation: 'white' | 'black'
  /** Coups presents dans l'arbre theorique depuis cette position. */
  knownSans: Set<string>
  onMove: (san: string) => void
  /** Explication du dernier coup, revelee au survol de la pastille. */
  hint?: ReactNode
}

export default function Chessboard({ position, orientation, knownSans, onMove, hint }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const [from, setFrom] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ square: string; x: number; y: number; size: number } | null>(null)
  const [promotion, setPromotion] = useState<{ from: string; to: string } | null>(null)
  /**
   * La bulle est rendue dans <body> : les panneaux qui defilent ne peuvent donc
   * pas la rogner. Sa position est calculee en coordonnees ecran.
   */
  const [hintBox, setHintBox] = useState<{ left: number; top?: number; bottom?: number; width: number } | null>(null)
  const badgeRef = useRef<HTMLButtonElement>(null)
  const bubbleRef = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<number | null>(null)

  const placeHint = useCallback(() => {
    const rect = badgeRef.current?.getBoundingClientRect()
    if (!rect) return
    const margin = 8
    const width = Math.min(320, window.innerWidth - margin * 2)
    // Aligne sur le bord droit de la pastille, sans jamais sortir de l'ecran
    const left = Math.max(margin, Math.min(rect.right - width, window.innerWidth - width - margin))
    // Au-dessus si la pastille est dans la moitie basse, en dessous sinon
    const above = rect.top > window.innerHeight / 2
    setHintBox({
      left,
      width,
      ...(above ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
    })
  }, [])

  const openHint = useCallback(() => {
    if (closeTimer.current) {
      window.clearTimeout(closeTimer.current)
      closeTimer.current = null
    }
    placeHint()
  }, [placeHint])

  /** Petit delai : la souris doit pouvoir passer de la pastille a la bulle. */
  const scheduleClose = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setHintBox(null), 220)
  }, [])

  // Toute nouvelle position repart d'une selection vierge
  useEffect(() => {
    setFrom(null)
    setDrag(null)
    setPromotion(null)
    setHintBox(null)
  }, [position.fen])

  // La bulle suit la fenetre : on la referme plutot que de la laisser flotter
  useEffect(() => {
    if (!hintBox) return
    const close = () => setHintBox(null)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (badgeRef.current?.contains(target) || bubbleRef.current?.contains(target)) return
      close()
    }
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onDown, true)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onDown, true)
    }
  }, [hintBox])

  useEffect(() => () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current)
  }, [])

  const squareAt = (clientX: number, clientY: number): string | null => {
    const rect = gridRef.current?.getBoundingClientRect()
    if (!rect) return null
    const size = rect.width / 8
    const col = Math.floor((clientX - rect.left) / size)
    const row = Math.floor((clientY - rect.top) / size)
    if (col < 0 || col > 7 || row < 0 || row > 7) return null
    return orientation === 'white' ? `${FILES[col]}${8 - row}` : `${FILES[7 - col]}${row + 1}`
  }

  const pieceAt = (square: string) => {
    for (const row of position.board) {
      for (const cell of row) if (cell && cell.square === square) return cell
    }
    return null
  }

  const canMoveFrom = (square: string) => position.moves.some((m) => m.from === square)

  /** Joue le coup s'il est legal ; ouvre le selecteur en cas de promotion. */
  const commit = (source: string, target: string): boolean => {
    const candidates = position.moves.filter((m) => m.from === source && m.to === target)
    if (candidates.length === 0) return false
    if (candidates.length > 1 && candidates.every((c) => c.promotion)) {
      setPromotion({ from: source, to: target })
      setFrom(null)
      return true
    }
    onMove(candidates[0].san)
    setFrom(null)
    return true
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (promotion) return
    const square = squareAt(e.clientX, e.clientY)
    if (!square) return

    // Second clic sur une destination valide
    if (from && from !== square && commit(from, square)) return

    if (canMoveFrom(square)) {
      const rect = gridRef.current!.getBoundingClientRect()
      setFrom(square)
      setDrag({ square, x: e.clientX, y: e.clientY, size: rect.width / 8 })
      gridRef.current?.setPointerCapture(e.pointerId)
    } else {
      setFrom(null)
    }
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return
    setDrag({ ...drag, x: e.clientX, y: e.clientY })
  }

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const source = drag.square
    const target = squareAt(e.clientX, e.clientY)
    setDrag(null)
    // Relache sur la case de depart : on conserve la selection pour jouer en deux clics
    if (target && target !== source && !commit(source, target)) setFrom(null)
  }

  const targetMap = new Map(
    from ? position.moves.filter((m) => m.from === from).map((m) => [m.to, m] as const) : [],
  )
  const rows = orientation === 'white' ? position.board : [...position.board].reverse().map((r) => [...r].reverse())
  const dragPiece = drag ? pieceAt(drag.square) : null

  // Pastille d'information posee sur la case ou la derniere piece s'est arretee
  const hintSquare = position.lastMove?.to
  let hintPos: { left: string; top: string } | null = null
  if (hint && hintSquare) {
    const file = FILES.indexOf(hintSquare[0])
    const rank = Number(hintSquare[1]) - 1
    const col = orientation === 'white' ? file : 7 - file
    const row = orientation === 'white' ? 7 - rank : rank
    hintPos = { left: `${(col + 0.98) * 12.5}%`, top: `${(row + 0.02) * 12.5}%` }
  }

  return (
    <div className="relative w-full select-none">
      <div
        ref={gridRef}
        className="grid aspect-square w-full overflow-hidden rounded-md shadow-lg shadow-black/40 ring-1 ring-slate-900/60"
        style={{
          gridTemplateColumns: 'repeat(8, 1fr)',
          gridTemplateRows: 'repeat(8, 1fr)',
          touchAction: 'none',
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => setDrag(null)}
        role="grid"
        aria-label="Échiquier"
      >
        {rows.map((row, rankIndex) =>
          row.map((piece, fileIndex) => {
            const rank = orientation === 'white' ? 8 - rankIndex : rankIndex + 1
            const file = orientation === 'white' ? FILES[fileIndex] : FILES[7 - fileIndex]
            const square = `${file}${rank}`
            const isLight = (rankIndex + fileIndex) % 2 === 0
            const isLast = position.lastMove?.from === square || position.lastMove?.to === square
            const move = targetMap.get(square)
            const isSelected = from === square
            const isDragged = drag?.square === square
            const inTheory = move ? knownSans.has(move.san) : false
            const dotColor = inTheory ? 'rgba(34, 150, 60, 0.55)' : 'rgba(0, 0, 0, 0.18)'

            return (
              <div
                key={square}
                className="relative"
                style={{
                  background: isLight ? LIGHT : DARK,
                  cursor: canMoveFrom(square) || move ? 'pointer' : 'default',
                }}
              >
                {(isLast || isSelected) && (
                  <div className="absolute inset-0" style={{ background: HIGHLIGHT }} />
                )}

                {move &&
                  (piece ? (
                    <div
                      className="absolute inset-0 rounded-full"
                      style={{ boxShadow: `inset 0 0 0 min(7px, 8%) ${dotColor}` }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-[30%] w-[30%] rounded-full" style={{ background: dotColor }} />
                    </div>
                  ))}

                {piece && (
                  <Piece
                    type={piece.type}
                    color={piece.color}
                    className="absolute inset-0 h-full w-full"
                    style={{ opacity: isDragged ? 0.25 : 1 }}
                  />
                )}

                {fileIndex === 0 && (
                  <span
                    className="pointer-events-none absolute top-px left-0.5 text-[clamp(7px,1.6cqw,11px)] font-bold"
                    style={{ color: isLight ? DARK : LIGHT }}
                  >
                    {rank}
                  </span>
                )}
                {rankIndex === 7 && (
                  <span
                    className="pointer-events-none absolute right-0.5 bottom-0 text-[clamp(7px,1.6cqw,11px)] font-bold"
                    style={{ color: isLight ? DARK : LIGHT }}
                  >
                    {file}
                  </span>
                )}
              </div>
            )
          }),
        )}
      </div>

      {hintPos && (
        <div
          className="absolute z-30"
          style={{ left: hintPos.left, top: hintPos.top, transform: 'translate(-100%, 0)' }}
          onMouseEnter={openHint}
          onMouseLeave={scheduleClose}
        >
          <button
            ref={badgeRef}
            onClick={(e) => {
              e.stopPropagation()
              if (hintBox) setHintBox(null)
              else openHint()
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Pourquoi ce coup ?"
            title="Pourquoi ce coup ?"
            className="flex items-center justify-center rounded-full bg-slate-900/55 font-bold text-slate-100/90 ring-1 ring-slate-100/30 transition-opacity hover:bg-slate-900/90"
            style={{
              width: 'clamp(10px, 3cqw, 17px)',
              height: 'clamp(10px, 3cqw, 17px)',
              fontSize: 'clamp(7px, 2cqw, 11px)',
              lineHeight: 1,
              opacity: hintBox ? 1 : 0.6,
            }}
          >
            i
          </button>
        </div>
      )}

      {hintBox &&
        createPortal(
          <div
            ref={bubbleRef}
            className="animate-fade-in fixed z-[60] overflow-y-auto rounded-lg border border-slate-600 bg-slate-900/97 p-3 text-left shadow-2xl shadow-black/80 backdrop-blur"
            style={{
              left: hintBox.left,
              top: hintBox.top,
              bottom: hintBox.bottom,
              width: hintBox.width,
              maxHeight: 'min(60vh, 420px)',
            }}
            onMouseEnter={openHint}
            onMouseLeave={scheduleClose}
            onPointerDown={(e) => e.stopPropagation()}
            role="tooltip"
          >
            {hint}
          </div>,
          document.body,
        )}

      {drag && dragPiece && (
        <Piece
          type={dragPiece.type}
          color={dragPiece.color}
          className="pointer-events-none fixed z-50"
          style={{
            left: drag.x,
            top: drag.y,
            width: drag.size * 1.06,
            height: drag.size * 1.06,
            transform: 'translate(-50%, -50%)',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.5))',
          }}
        />
      )}

      {promotion && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
          <div className="rounded-xl border border-slate-600 bg-slate-800 p-3">
            <p className="mb-2 text-center text-xs text-slate-300">Choisissez la promotion</p>
            <div className="flex gap-2">
              {PROMOTIONS.map((type) => {
                const move = position.moves.find(
                  (m) => m.from === promotion.from && m.to === promotion.to && m.promotion === type,
                )
                if (!move) return null
                return (
                  <button
                    key={type}
                    onClick={() => {
                      onMove(move.san)
                      setPromotion(null)
                    }}
                    className="h-12 w-12 rounded-lg bg-slate-700 p-1 hover:bg-slate-600"
                    aria-label={`Promouvoir en ${type}`}
                  >
                    <Piece type={type} color={position.turn} className="h-full w-full" />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
