import { movePairs } from '../lib/chess'

interface Props {
  sans: string[]
  /** Nombre de demi-coups couverts par l'arbre theorique. */
  theoryPlies: number
  onGoTo: (ply: number) => void
}

export default function MoveList({ sans, theoryPlies, onGoTo }: Props) {
  if (sans.length === 0) {
    return (
      <p className="px-1 text-sm text-slate-500">
        Position de départ — jouez un coup sur l’échiquier ou choisissez une branche dans l’arbre.
      </p>
    )
  }

  const pairs = movePairs(sans)
  const tone = (ply: number) =>
    ply === sans.length
      ? ply > theoryPlies
        ? 'bg-amber-500 text-slate-900'
        : 'bg-blue-600 text-white'
      : ply > theoryPlies
        ? 'text-amber-400'
        : 'text-slate-200'

  return (
    <div className="flex flex-wrap gap-x-1.5 gap-y-1 font-mono text-sm">
      {pairs.map((pair) => (
        <span key={pair.number} className="inline-flex items-center gap-1">
          <span className="text-slate-500">{pair.number}.</span>
          <button
            onClick={() => onGoTo(pair.whitePly)}
            className={`rounded px-1 py-0.5 transition-colors hover:bg-slate-700 ${tone(pair.whitePly)}`}
          >
            {pair.white}
          </button>
          {pair.black && (
            <button
              onClick={() => onGoTo(pair.whitePly + 1)}
              className={`rounded px-1 py-0.5 transition-colors hover:bg-slate-700 ${tone(pair.whitePly + 1)}`}
            >
              {pair.black}
            </button>
          )}
        </span>
      ))}
    </div>
  )
}
