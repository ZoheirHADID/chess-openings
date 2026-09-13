import { formatEval, sharpness, type EngineLine, type EngineSnapshot } from '../lib/engine'
import type { CloudEval } from '../lib/cloudEval'

interface Props {
  snapshot: EngineSnapshot | null
  enabled: boolean
  onToggle: () => void
  /** La position courante est sortie de l'arbre theorique. */
  outOfBook: boolean
  onPlayMove: (san: string) => void
  failure: string | null
  /** Evaluation cloud Lichess de la position affichee (`null` = inconnue, `undefined` = en attente). */
  cloud?: CloudEval | null
  /** Camp au trait dans la position affichee. */
  mover: 'w' | 'b'
}

const SHARPNESS_TEXT = {
  critical: 'Position critique : un seul coup tient, le deuxième perd',
  sharp: 'Position tranchante : le choix du coup compte',
  flexible: 'Position souple : plusieurs coups se valent',
} as const

/** Liste de variantes cliquables, commune au moteur local et au cloud. */
function LinesList({ lines, onPlayMove }: { lines: EngineLine[]; onPlayMove: (san: string) => void }) {
  return (
    <ul className="space-y-1">
      {lines.map((line) => (
        <li key={line.rank}>
          <button
            onClick={() => line.sans[0] && onPlayMove(line.sans[0])}
            className="flex w-full items-baseline gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-slate-800"
            title="Jouer ce coup"
          >
            <span
              className={`w-11 shrink-0 rounded px-1 text-center font-mono text-[11px] font-bold ${
                (line.cp ?? 0) >= 0 || (line.mate ?? 0) > 0 ? 'bg-slate-100 text-slate-900' : 'bg-slate-800 text-slate-100'
              }`}
            >
              {formatEval(line)}
            </span>
            <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-300">{line.sans.join(' ')}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

/**
 * Meilleurs coups selon Stockfish (local) et selon le cloud Lichess (positions
 * connues, analysees bien plus profondement), avec la criticite de la position.
 */
export default function EnginePanel({ snapshot, enabled, onToggle, outOfBook, onPlayMove, failure, cloud, mover }: Props) {
  const lines = snapshot?.lines ?? []
  const best = lines[0]
  // La criticite se lit sur l'analyse la plus profonde disponible
  const reference = cloud && (!enabled || cloud.depth > (snapshot?.depth ?? 0)) ? cloud.lines : enabled ? lines : []
  const sharp = sharpness(reference, mover)

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

      {sharp && (
        <p
          className={`mt-1.5 rounded-md px-2 py-1 text-[11px] ${
            sharp.level === 'critical'
              ? 'bg-rose-950/30 text-rose-300'
              : sharp.level === 'sharp'
                ? 'bg-amber-950/30 text-amber-300'
                : 'bg-slate-800/60 text-slate-400'
          }`}
          title="Écart de chances de gain entre le meilleur coup et le second"
        >
          {SHARPNESS_TEXT[sharp.level]} ({sharp.gap < 1 ? 'moins de 1' : Math.round(sharp.gap)} % d’écart avec le 2e
          coup).
        </p>
      )}

      {enabled && outOfBook && best && (
        <p className="mt-1.5 rounded-md bg-amber-950/30 px-2 py-1 text-[11px] text-amber-300">
          Hors théorie : le moteur recommande <strong className="font-mono">{best.sans[0]}</strong> (
          {formatEval(best)}).
        </p>
      )}

      {enabled && lines.length > 0 && (
        <div className="mt-2">
          <LinesList lines={lines} onPlayMove={onPlayMove} />
        </div>
      )}

      {cloud && cloud.lines.length > 0 && (
        <div className="mt-2 border-t border-slate-800 pt-2">
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-sky-300">
            ☁ Cloud Lichess
            <span className="font-normal text-slate-500">
              prof. {cloud.depth} · {cloud.knodes >= 1000 ? `${Math.round(cloud.knodes / 1000)} M` : `${cloud.knodes} k`} nœuds
            </span>
          </p>
          <LinesList lines={cloud.lines} onPlayMove={onPlayMove} />
        </div>
      )}
      {cloud === null && !enabled && !failure && (
        <p className="mt-1.5 text-[10px] text-slate-600">Position inconnue du cloud Lichess : activez le moteur local.</p>
      )}
    </section>
  )
}
