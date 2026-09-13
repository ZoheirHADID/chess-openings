import { movePairs } from '../lib/chess'
import { QUALITY_BADGE, type MoveVerdict } from '../lib/engine'
import { NOTABLE } from '../lib/lineReview'

interface Props {
  sans: string[]
  /** Nombre de demi-coups couverts par l'arbre theorique. */
  theoryPlies: number
  onGoTo: (ply: number) => void
  /** Verdict de chaque demi-coup (index = ply - 1), pour annoter les coups remarquables. */
  verdicts?: (MoveVerdict | null)[]
}

/** Glyphe de qualite accole au coup : !!, !, ?!, ?, ✗, ?? (les bons coups ordinaires restent muets). */
function Mark({ verdict }: { verdict: MoveVerdict | null | undefined }) {
  if (!verdict || !NOTABLE.has(verdict.quality)) return null
  const badge = QUALITY_BADGE[verdict.quality]
  return (
    <span className="ml-0.5 text-[10px] font-bold" style={{ color: badge.color }} title={badge.label}>
      {badge.glyph}
    </span>
  )
}

export default function MoveList({ sans, theoryPlies, onGoTo, verdicts }: Props) {
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
            <Mark verdict={verdicts?.[pair.whitePly - 1]} />
          </button>
          {pair.black && (
            <button
              onClick={() => onGoTo(pair.whitePly + 1)}
              className={`rounded px-1 py-0.5 transition-colors hover:bg-slate-700 ${tone(pair.whitePly + 1)}`}
            >
              {pair.black}
              <Mark verdict={verdicts?.[pair.whitePly]} />
            </button>
          )}
        </span>
      ))}
    </div>
  )
}
