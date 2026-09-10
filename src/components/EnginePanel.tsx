import { formatEval, type EngineSnapshot } from '../lib/engine'

interface Props {
  snapshot: EngineSnapshot | null
  enabled: boolean
  onToggle: () => void
  /** La position courante est sortie de l'arbre theorique. */
  outOfBook: boolean
  onPlayMove: (san: string) => void
  failure: string | null
}

/** Meilleurs coups selon Stockfish, avec mise en avant hors theorie. */
export default function EnginePanel({ snapshot, enabled, onToggle, outOfBook, onPlayMove, failure }: Props) {
  const lines = snapshot?.lines ?? []
  const best = lines[0]

  return (
    <section className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          Moteur Stockfish
          {enabled && snapshot?.thinking && (
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" title="Analyse en cours" />
          )}
          {enabled && snapshot && snapshot.depth > 0 && (
            <span className="font-normal text-slate-500">prof. {snapshot.depth}</span>
          )}
        </h4>
        <button
          onClick={onToggle}
          className={`rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors ${
            enabled
              ? 'border-emerald-600 bg-emerald-600/20 text-emerald-300'
              : 'border-slate-600 text-slate-400 hover:text-slate-200'
          }`}
        >
          {enabled ? 'Activé' : 'Activer'}
        </button>
      </div>

      {failure && <p className="mt-2 text-[11px] text-rose-400">Moteur indisponible : {failure}</p>}

      {!enabled && !failure && (
        <p className="mt-1.5 text-[11px] text-slate-500">
          Analyse locale dans votre navigateur (Stockfish 18 WASM, ~7 Mo au premier chargement).
        </p>
      )}

      {enabled && !failure && lines.length === 0 && (
        <p className="mt-1.5 text-[11px] text-slate-500">Chargement du moteur…</p>
      )}

      {enabled && outOfBook && best && (
        <p className="mt-1.5 rounded-md bg-amber-950/30 px-2 py-1 text-[11px] text-amber-300">
          Hors théorie : le moteur recommande <strong className="font-mono">{best.sans[0]}</strong> (
          {formatEval(best)}).
        </p>
      )}

      {enabled && lines.length > 0 && (
        <ul className="mt-2 space-y-1">
          {lines.map((line) => (
            <li key={line.rank}>
              <button
                onClick={() => onPlayMove(line.sans[0])}
                className="flex w-full items-baseline gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-slate-800"
                title="Jouer ce coup"
              >
                <span
                  className={`w-11 shrink-0 rounded px-1 text-center font-mono text-[11px] font-bold ${
                    (line.cp ?? 0) >= 0 || (line.mate ?? 0) > 0
                      ? 'bg-slate-100 text-slate-900'
                      : 'bg-slate-800 text-slate-100'
                  }`}
                >
                  {formatEval(line)}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-300">
                  {line.sans.join(' ')}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
