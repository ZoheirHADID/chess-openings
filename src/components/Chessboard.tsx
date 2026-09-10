import type { PositionInfo } from '../lib/chess'

const GLYPHS: Record<string, string> = {
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

interface Props {
  position: PositionInfo
  orientation: 'white' | 'black'
}

export default function Chessboard({ position, orientation }: Props) {
  const rows = orientation === 'white' ? position.board : [...position.board].reverse().map((r) => [...r].reverse())

  return (
    <div className="w-full">
      <div className="grid aspect-square w-full grid-cols-8 overflow-hidden rounded-lg ring-1 ring-slate-700/70 shadow-lg shadow-black/40">
        {rows.map((row, rankIndex) =>
          row.map((piece, fileIndex) => {
            const rank = orientation === 'white' ? 8 - rankIndex : rankIndex + 1
            const file = orientation === 'white' ? FILES[fileIndex] : FILES[7 - fileIndex]
            const square = `${file}${rank}`
            const isLight = (rankIndex + fileIndex) % 2 === 0
            const isLast = position.lastMove?.from === square || position.lastMove?.to === square

            return (
              <div
                key={square}
                className="relative flex items-center justify-center"
                style={{ background: isLight ? '#ebecd0' : '#779556' }}
              >
                {isLast && <div className="absolute inset-0 bg-yellow-300/45" />}
                {piece && (
                  <span
                    className="relative select-none leading-none"
                    style={{
                      fontSize: 'clamp(18px, 7.2cqw, 46px)',
                      color: piece.color === 'w' ? '#ffffff' : '#1e1e1e',
                      textShadow:
                        piece.color === 'w'
                          ? '0 0 1px #111, 1px 1px 0 #111, -1px 1px 0 #111, 1px -1px 0 #111, -1px -1px 0 #111'
                          : '0 0 1px #000, 0 1px 2px rgba(0,0,0,0.35)',
                    }}
                  >
                    {GLYPHS[piece.type]}
                  </span>
                )}
                {fileIndex === 0 && (
                  <span
                    className="absolute top-0 left-0.5 text-[9px] font-semibold opacity-60"
                    style={{ color: isLight ? '#779556' : '#ebecd0' }}
                  >
                    {rank}
                  </span>
                )}
                {rankIndex === 7 && (
                  <span
                    className="absolute right-0.5 bottom-0 text-[9px] font-semibold opacity-60"
                    style={{ color: isLight ? '#779556' : '#ebecd0' }}
                  >
                    {file}
                  </span>
                )}
              </div>
            )
          }),
        )}
      </div>
    </div>
  )
}
