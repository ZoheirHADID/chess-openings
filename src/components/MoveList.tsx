import { movePairs } from '../lib/chess'

interface Props {
  sans: string[]
  onGoTo: (ply: number) => void
}

export default function MoveList({ sans, onGoTo }: Props) {
  if (sans.length === 0) {
    return <p className="px-1 text-sm text-slate-500">Position de départ — choisissez un premier coup dans l’arbre.</p>
  }

  const pairs = movePairs(sans)

  return (
    <div className="flex flex-wrap gap-x-1.5 gap-y-1 font-mono text-sm">
      {pairs.map((pair) => (
        <span key={pair.number} className="inline-flex items-center gap-1">
          <span className="text-slate-500">{pair.number}.</span>
          <button
            onClick={() => onGoTo(pair.whitePly)}
            className={`rounded px-1 py-0.5 transition-colors hover:bg-slate-700 ${
              pair.whitePly === sans.length ? 'bg-blue-600 text-white' : 'text-slate-200'
            }`}
          >
            {pair.white}
          </button>
          {pair.black && (
            <button
              onClick={() => onGoTo(pair.whitePly + 1)}
              className={`rounded px-1 py-0.5 transition-colors hover:bg-slate-700 ${
                pair.whitePly + 1 === sans.length ? 'bg-blue-600 text-white' : 'text-slate-200'
              }`}
            >
              {pair.black}
            </button>
          )}
        </span>
      ))}
    </div>
  )
}
