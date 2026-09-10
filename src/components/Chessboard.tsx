import { useEffect, useRef, useState, type ReactNode } from 'react'
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
  const [hintOpen, setHintOpen] = useState(false)

  // Toute nouvelle position repart d'une selection vierge
  useEffect(() => {
    setFrom(null)
    setDrag(null)
    setPromotion(null)
    setHintOpen(false)
  }, [position.fen])

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
  let hintPos: { left: string; top: string; alignRight: boolean; alignBottom: boolean } | null = null
  if (hint && hintSquare) {
    const file = FILES.indexOf(hintSquare[0])
    const rank = Number(hintSquare[1]) - 1
    const col = orientation === 'white' ? file : 7 - file
    const row = orientation === 'white' ? 7 - rank : rank
    hintPos = {
      left: `${(col + 0.98) * 12.5}%`,
      top: `${(row + 0.02) * 12.5}%`,
      alignRight: col > 4,
      alignBottom: row < 4,
    }
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
          onMouseEnter={() => setHintOpen(true)}
          onMouseLeave={() => setHintOpen(false)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              setHintOpen((open) => !open)
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label="Pourquoi ce coup ?"
            title="Pourquoi ce coup ?"
            className="flex items-center justify-center rounded-full bg-slate-900/55 font-bold text-slate-100/90 ring-1 ring-slate-100/30 transition-opacity hover:bg-slate-900/90"
            style={{
              width: 'clamp(9px, 3cqw, 17px)',
              height: 'clamp(9px, 3cqw, 17px)',
              fontSize: 'clamp(6px, 2cqw, 11px)',
              lineHeight: 1,
              opacity: hintOpen ? 1 : 0.55,
            }}
          >
            i
          </button>

          {hintOpen && (
            <div
              className="animate-fade-in absolute z-40 w-[min(76vw,290px)] rounded-lg border border-slate-700 bg-slate-900/95 p-2.5 text-left shadow-2xl shadow-black/70 backdrop-blur"
              style={
                hintPos.alignRight
                  ? hintPos.alignBottom
                    ? { right: 0, top: 'calc(100% + 6px)' }
                    : { right: 0, bottom: 'calc(100% + 6px)' }
                  : hintPos.alignBottom
                    ? { left: 0, top: 'calc(100% + 6px)' }
                    : { left: 0, bottom: 'calc(100% + 6px)' }
              }
              onPointerDown={(e) => e.stopPropagation()}
            >
              {hint}
            </div>
          )}
        </div>
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
