import type { LineReview, SideSummary } from '../lib/lineReview'
import { describeFaults } from '../lib/lineReview'

interface Props {
  review: LineReview
  /** Nombre de demi-coups de la ligne (pour rappeler la couverture des jugements). */
  plies: number
  compact?: boolean
}

const tone = (accuracy: number) =>
  accuracy >= 90 ? 'text-emerald-300' : accuracy >= 75 ? 'text-lime-300' : accuracy >= 60 ? 'text-amber-300' : 'text-rose-300'

function Side({ label, side, compact }: { label: string; side: SideSummary; compact?: boolean }) {
  if (side.accuracy === null) return null
  const faults = describeFaults(side.counts)
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold tabular-nums ${tone(side.accuracy)}`}>{Math.round(side.accuracy)} %</span>
      {faults && !compact && <span className="text-slate-500">({faults})</span>}
    </span>
  )
}

/**
 * Precision de chaque camp sur la ligne affichee (moyenne des precisions par
 * coup, formule Lichess), avec le detail des fautes.
 */
export default function LineSummary({ review, plies, compact }: Props) {
  const judged = review.white.judged + review.black.judged
  if (judged === 0) return null
  return (
    <p
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-0.5 ${compact ? 'text-[10px]' : 'text-[11px]'}`}
      title={`Précision moyenne des coups jugés (${judged} sur ${plies}) : 100 % = meilleur coup à chaque fois`}
    >
      <span className="text-slate-400">Précision</span>
      <Side label="blancs" side={review.white} compact={compact} />
      <Side label="noirs" side={review.black} compact={compact} />
      {judged < plies && <span className="text-slate-600">{judged}/{plies} coups jugés</span>}
    </p>
  )
}
