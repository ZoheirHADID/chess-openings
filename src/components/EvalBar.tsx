import { evalToShare, formatEval, type EngineSnapshot } from '../lib/engine'

interface Props {
  snapshot: EngineSnapshot | null
  orientation: 'white' | 'black'
  enabled: boolean
  /** Origine de l'evaluation affichee (Stockfish local ou cloud Lichess). */
  source?: string
}

const WHITE = '#f1f5f9'
const BLACK = '#111827'

/** Barre d'evaluation verticale, alignee sur l'echiquier. */
export default function EvalBar({ snapshot, orientation, enabled, source = 'Stockfish' }: Props) {
  const best = snapshot?.lines[0]
  const whiteShare = enabled ? evalToShare(best) : 0.5
  const label = enabled ? formatEval(best) : '—'

  const bottomIsWhite = orientation === 'white'
  const bottomShare = bottomIsWhite ? whiteShare : 1 - whiteShare
  // L'etiquette se place du cote du camp qui mene, sur son propre fond
  const labelAtBottom = whiteShare >= 0.5 === bottomIsWhite

  return (
    <div
      className="relative flex w-5 shrink-0 flex-col overflow-hidden rounded-md ring-1 ring-slate-700/70 sm:w-6"
      title={enabled ? `Évaluation ${source} (point de vue des blancs)` : 'Moteur désactivé'}
      aria-label={`Évaluation ${label}`}
    >
      <div className="flex-1" style={{ background: bottomIsWhite ? BLACK : WHITE }} />
      <div
        className="transition-[height] duration-300 ease-out"
        style={{ height: `${bottomShare * 100}%`, background: bottomIsWhite ? WHITE : BLACK }}
      />
      <span
        className={`absolute inset-x-0 text-center text-[9px] font-bold tabular-nums ${
          labelAtBottom ? 'bottom-0.5' : 'top-0.5'
        }`}
        style={{ color: whiteShare >= 0.5 ? BLACK : WHITE }}
      >
        {label}
      </span>
    </div>
  )
}
