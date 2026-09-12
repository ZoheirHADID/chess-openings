import type { MoveExplanation } from '../lib/explain'
import { QUALITY_BADGE, type MoveVerdict } from '../lib/engine'
import QualityGlyph from './QualityGlyph'
import type { FaultExplanation } from '../lib/refutation'
import AiExplain from './AiExplain'

const VERDICT_STYLE: Record<MoveVerdict['quality'], { bg: string; text: string }> = {
  brilliant: { bg: 'bg-teal-500/20 border-teal-500/60', text: 'text-teal-300' },
  great: { bg: 'bg-sky-600/20 border-sky-600/60', text: 'text-sky-300' },
  best: { bg: 'bg-emerald-600/20 border-emerald-600/60', text: 'text-emerald-300' },
  excellent: { bg: 'bg-emerald-600/15 border-emerald-700/50', text: 'text-emerald-300' },
  good: { bg: 'bg-emerald-600/10 border-emerald-700/50', text: 'text-emerald-300' },
  book: { bg: 'bg-amber-900/25 border-amber-800/60', text: 'text-amber-200' },
  inaccuracy: { bg: 'bg-amber-600/15 border-amber-600/60', text: 'text-amber-300' },
  mistake: { bg: 'bg-orange-600/20 border-orange-600/60', text: 'text-orange-300' },
  miss: { bg: 'bg-rose-500/15 border-rose-500/60', text: 'text-rose-300' },
  blunder: { bg: 'bg-rose-600/20 border-rose-600/60', text: 'text-rose-300' },
}

const NO_BEST_SHOWN = new Set<MoveVerdict['quality']>(['brilliant', 'great', 'best', 'book'])

/** Pourquoi le coup est fautif : bascule d'evaluation, concessions, meilleur coup, punition. */
function FaultBlock({ fault, compact }: { fault: FaultExplanation; compact?: boolean }) {
  const text = compact ? 'text-[10px]' : 'text-[11px]'
  const head = compact ? 'text-[9px]' : 'text-[10px]'
  return (
    <section
      className={`space-y-1.5 rounded-lg border border-rose-800/60 bg-rose-950/20 ${compact ? 'p-2' : 'p-2.5'}`}
      aria-label={fault.title}
    >
      <p className={`font-semibold tracking-wide text-rose-400 uppercase ${head}`}>{fault.title}</p>
      {fault.swing && <p className={`leading-snug text-rose-100/90 ${text}`}>{fault.swing}</p>}
      {fault.concedes.length > 0 && (
        <ul className="space-y-0.5">
          {fault.concedes.map((point) => (
            <li key={point} className={`flex gap-1.5 leading-snug text-amber-200/90 ${text}`}>
              <span className="shrink-0">▲</span>
              {point}
            </li>
          ))}
        </ul>
      )}
      {fault.better && (
        <div className={`rounded-md border border-emerald-800/50 bg-emerald-950/30 px-2 py-1.5 ${text}`}>
          <p className="text-emerald-200">
            <span className="font-semibold">Il fallait {fault.better.san}</span>
            {fault.better.line !== fault.better.san && (
              <span className="font-mono text-emerald-300/80"> · {fault.better.line}</span>
            )}
          </p>
          {fault.better.reasons.length > 0 && (
            <ul className="mt-0.5 space-y-0.5">
              {fault.better.reasons.map((reason) => (
                <li key={reason} className="flex gap-1.5 leading-snug text-emerald-100/85">
                  <span className="mt-1.5 h-0.5 w-0.5 shrink-0 rounded-full bg-emerald-400" />
                  {reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {fault.punishment && (
        <div>
          <p className={`mb-0.5 font-semibold tracking-wide text-rose-400 uppercase ${head}`}>
            Comment l’adversaire en profite
          </p>
          <p className={`font-mono text-slate-200 ${text}`}>{fault.punishment.line}</p>
          <ul className="mt-0.5 space-y-0.5">
            {fault.punishment.points.map((point) => (
              <li key={point} className={`flex gap-1.5 leading-snug text-rose-100/90 ${text}`}>
                <span className="mt-1.5 h-0.5 w-0.5 shrink-0 rounded-full bg-rose-400" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

/** Bandeau de verdict du moteur, avec le coup qu'il aurait joue. */
function Verdict({ verdict, compact }: { verdict: MoveVerdict; compact?: boolean }) {
  const style = VERDICT_STYLE[verdict.quality]
  const badge = QUALITY_BADGE[verdict.quality]
  const showBest = !NO_BEST_SHOWN.has(verdict.quality) && verdict.best
  return (
    <p
      className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 rounded-md border px-2 py-1 ${style.bg} ${
        compact ? 'text-[10px]' : 'text-[11px]'
      }`}
    >
      <span
        className="inline-flex h-3.5 min-w-3.5 items-center justify-center self-center rounded-full px-0.5 text-[8px] font-bold leading-none"
        style={{ background: badge.color, color: badge.dark ? '#1f2937' : '#fff' }}
        aria-hidden
      >
        <QualityGlyph badge={badge} />
      </span>
      <span className={`font-semibold ${style.text}`}>{verdict.label}</span>
      {verdict.loss >= 20 && <span className="text-slate-400">−{(verdict.loss / 100).toFixed(1)} pion</span>}
      {showBest && (
        <span className="text-slate-400">
          le moteur jouait <span className="font-mono text-slate-200">{verdict.best}</span>
        </span>
      )}
    </p>
  )
}

interface Props {
  explanation: MoveExplanation | null
  openingName?: string
  eco?: string
  /** Le coup expliqué sort de l'arbre théorique. */
  outOfBook: boolean
  /** Version resserrée, pour la bulle posée sur l'échiquier. */
  compact?: boolean
  /** Jugement du moteur sur ce coup, quand il est activé. */
  verdict?: MoveVerdict | null
  /** Pourquoi le coup est fautif (imprécision, erreur, occasion manquée, gaffe). */
  fault?: FaultExplanation | null
  /** Requête prête pour une explication par IA générative, quand le coup est fautif. */
  aiPrompt?: string | null
}

/** « Pourquoi ce coup ? » — commentaire théorique et analyse de la position. */
export default function ExplainPanel({
  explanation,
  openingName,
  eco,
  outOfBook,
  compact,
  verdict,
  fault,
  aiPrompt,
}: Props) {
  if (!explanation) {
    return (
      <p className="text-sm text-slate-400">
        Aucun coup joué pour l’instant. Jouez un coup sur l’échiquier ou choisissez une branche dans l’arbre : son
        idée s’affichera ici.
      </p>
    )
  }

  // Bulle survolée : le coup, l'essentiel, et de quoi approfondir
  if (compact) {
    // Pour une faute, les motifs positifs generiques n'ont plus leur place
    const points = fault ? [] : explanation.note ? explanation.points.slice(0, 2) : explanation.points.slice(0, 4)
    return (
      <div className="space-y-1.5">
        <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
          <span className="font-mono text-xs font-bold text-slate-100">{explanation.numbered}</span>
          {openingName && (
            <span className="text-[10px] text-slate-400">
              {eco && <span className="text-slate-500">{eco} </span>}
              {openingName}
            </span>
          )}
        </p>

        {verdict && <Verdict verdict={verdict} compact />}
        {fault && <FaultBlock fault={fault} compact />}
        {fault && aiPrompt && <AiExplain prompt={aiPrompt} compact />}

        {explanation.note && (
          <p className="border-l-2 border-emerald-600/70 pl-2 text-[11px] leading-relaxed text-slate-200">
            {explanation.note}
          </p>
        )}

        {points.length > 0 && (
          <ul className="space-y-0.5">
            {points.map((point) => (
              <li key={point} className="flex gap-1.5 text-[11px] leading-snug text-slate-400">
                <span className="mt-1.5 h-0.5 w-0.5 shrink-0 rounded-full bg-slate-500" />
                {point}
              </li>
            ))}
          </ul>
        )}

        {explanation.warnings.length > 0 && (
          <ul className="space-y-0.5">
            {explanation.warnings.map((warning) => (
              <li key={warning} className="flex gap-1.5 text-[11px] leading-snug text-amber-300/90">
                <span className="shrink-0">▲</span>
                {warning}
              </li>
            ))}
          </ul>
        )}

        {explanation.plan && (
          <p className="text-[10px] leading-relaxed text-slate-400">
            <span className="text-slate-500">Plan : </span>
            {explanation.plan}
          </p>
        )}

        {outOfBook && <p className="text-[10px] text-amber-400">Coup hors du répertoire Lichess.</p>}

        <a
          href={explanation.wikibooks}
          target="_blank"
          rel="noreferrer"
          className="inline-block text-[10px] text-blue-400 hover:text-blue-300"
        >
          Théorie détaillée ↗
        </a>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="flex items-baseline gap-2">
        <span className="font-mono text-base font-bold text-slate-100">{explanation.numbered}</span>
        {openingName && (
          <span className="min-w-0 truncate text-xs text-slate-400">
            {eco && <span className="text-slate-500">{eco} </span>}
            {openingName}
          </span>
        )}
      </p>

      {verdict && <Verdict verdict={verdict} />}
      {fault && <FaultBlock fault={fault} />}
      {fault && aiPrompt && <AiExplain prompt={aiPrompt} />}

      {explanation.note && (
        <section className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-2.5">
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-emerald-400 uppercase">Théorie</p>
          <p className="text-xs leading-relaxed text-slate-200">{explanation.note}</p>
        </section>
      )}

      {!fault && explanation.points.length > 0 && (
        <section>
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
            Ce que le coup apporte
          </p>
          <ul className="space-y-1">
            {explanation.points.map((point) => (
              <li key={point} className="flex gap-1.5 text-xs leading-relaxed text-slate-300">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-500" />
                {point}
              </li>
            ))}
          </ul>
        </section>
      )}

      {explanation.warnings.length > 0 && (
        <section>
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-amber-500/80 uppercase">
            Ce que le coup concède
          </p>
          <ul className="space-y-1">
            {explanation.warnings.map((warning) => (
              <li key={warning} className="flex gap-1.5 text-xs leading-relaxed text-amber-300/90">
                <span className="shrink-0">▲</span>
                {warning}
              </li>
            ))}
          </ul>
        </section>
      )}

      {explanation.plan && (
        <section>
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
            Plan de cette ouverture
          </p>
          <p className="text-xs leading-relaxed text-slate-300">{explanation.plan}</p>
        </section>
      )}

      {outOfBook && (
        <p className="rounded-lg bg-amber-950/25 px-2.5 py-1.5 text-[11px] text-amber-300">
          Ce coup est sorti du répertoire Lichess : seule l’analyse automatique de la position s’applique, complétée
          par le moteur.
        </p>
      )}

      {!explanation.note && !outOfBook && (
        <p className="text-[11px] text-slate-500">
          Aucun commentaire rédigé pour cette ligne : les points ci-dessus sont déduits automatiquement de la
          position.
        </p>
      )}

      <a
        href={explanation.wikibooks}
        target="_blank"
        rel="noreferrer"
        className="inline-block text-xs text-blue-400 hover:text-blue-300"
      >
        Théorie détaillée sur Wikibooks ↗
      </a>
    </div>
  )
}
