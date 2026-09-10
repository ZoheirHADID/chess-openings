import type { MoveExplanation } from '../lib/explain'

interface Props {
  explanation: MoveExplanation | null
  openingName?: string
  eco?: string
  /** Le coup expliqué sort de l'arbre théorique. */
  outOfBook: boolean
  /** Version resserrée, pour la bulle posée sur l'échiquier. */
  compact?: boolean
}

/** « Pourquoi ce coup ? » — commentaire théorique et analyse de la position. */
export default function ExplainPanel({ explanation, openingName, eco, outOfBook, compact }: Props) {
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
    const points = explanation.note ? explanation.points.slice(0, 1) : explanation.points.slice(0, 3)
    return (
      <div className="space-y-1.5">
        <p className="flex items-baseline gap-1.5">
          <span className="font-mono text-xs font-bold text-slate-100">{explanation.numbered}</span>
          {openingName && (
            <span className="min-w-0 truncate text-[10px] text-slate-400">
              {eco && <span className="text-slate-500">{eco} </span>}
              {openingName}
            </span>
          )}
        </p>

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

      {explanation.note && (
        <section className="rounded-lg border border-emerald-800/50 bg-emerald-950/20 p-2.5">
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-emerald-400 uppercase">Théorie</p>
          <p className="text-xs leading-relaxed text-slate-200">{explanation.note}</p>
        </section>
      )}

      {explanation.points.length > 0 && (
        <section>
          <p className="mb-1 text-[10px] font-semibold tracking-wide text-slate-500 uppercase">
            Analyse de la position
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
