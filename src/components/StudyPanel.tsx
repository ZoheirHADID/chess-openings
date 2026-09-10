import { useMemo } from 'react'
import type { ProgressMap, StudyStatus, TreeNode } from '../lib/types'
import { STATUS_COLOR, STATUS_LABEL, progressStats } from '../lib/progress'
import { nearestNamed } from '../lib/tree'
import type { GameNodeStats } from '../lib/games'
import { totalOf, whiteScore, type MoveStat } from '../lib/moveStats'

interface Props {
  node: TreeNode
  /** La ligne courante sort de l'arbre theorique : le marquage est suspendu. */
  outOfBook: boolean
  progress: ProgressMap
  byId: Map<string, TreeNode>
  onSetStatus: (status: StudyStatus | null) => void
  onSelectNode: (id: string) => void
  onReset: () => void
  /** Bilan personnel sur la branche affichee. */
  ownStats?: GameNodeStats
  /** Bilan de reference Lichess pour le meme coup. */
  reference?: MoveStat
  /** Camp qui vient de jouer le coup menant a cette position. */
  moverIsWhite: boolean
  children?: React.ReactNode
}

const ORDER: StudyStatus[] = ['explored', 'studying', 'mastered']

const DESCRIPTIONS: Record<StudyStatus, string> = {
  explored: 'Branche parcourue, pas encore travaillée',
  studying: 'En cours de travail, à réviser',
  mastered: 'Validée : je la joue de mémoire',
}

export default function StudyPanel({
  node,
  outOfBook,
  progress,
  byId,
  onSetStatus,
  onSelectNode,
  onReset,
  ownStats,
  reference,
  moverIsWhite,
  children,
}: Props) {
  const current = progress[node.id]?.status
  const stats = useMemo(() => progressStats(progress), [progress])

  const repertoire = useMemo(() => {
    return Object.entries(progress)
      .filter(([, entry]) => entry.status !== 'explored')
      .map(([id, entry]) => {
        const target = byId.get(id)
        const named = target ? nearestNamed(target) : null
        return {
          id,
          status: entry.status,
          updatedAt: entry.updatedAt,
          label: named?.name ?? (id ? id : 'Position initiale'),
          eco: named?.eco,
          moves: id,
        }
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [progress, byId])

  const exportRepertoire = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      entries: Object.entries(progress).map(([id, entry]) => ({ path: id, ...entry })),
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'repertoire-ouvertures.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Score de reference du camp qui vient de jouer, pour comparer ce qui est comparable
  const refScore = reference ? (moverIsWhite ? whiteScore(reference) : 1 - whiteScore(reference)) : null
  const ownScore = ownStats && ownStats.total > 0 ? (ownStats.wins + ownStats.draws / 2) / ownStats.total : null

  return (
    <div className="space-y-4">
      {(ownScore !== null || refScore !== null) && (
        <section className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-2.5">
          <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">
            Votre score sur cette branche
          </h3>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-lg leading-none font-bold text-slate-100">
                {ownScore !== null ? `${Math.round(ownScore * 100)} %` : '—'}
              </p>
              <p className="text-[10px] text-slate-500">
                {ownStats ? `vous, sur ${ownStats.total} partie(s)` : 'aucune de vos parties'}
              </p>
            </div>
            <div>
              <p className="text-lg leading-none font-bold text-slate-400">
                {refScore !== null ? `${Math.round(refScore * 100)} %` : '—'}
              </p>
              <p className="text-[10px] text-slate-500">
                {reference ? `référence Lichess (${totalOf(reference).toLocaleString('fr-FR')} parties)` : 'référence indisponible'}
              </p>
            </div>
            {ownScore !== null && refScore !== null && (
              <p
                className={`ml-auto text-xs font-semibold ${
                  ownScore >= refScore ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {ownScore >= refScore ? '+' : '−'}
                {Math.abs(Math.round((ownScore - refScore) * 100))} pts
              </p>
            )}
          </div>
          {ownStats && (
            <p className="mt-1.5 text-[11px] text-slate-400">
              {ownStats.wins} gain(s) · {ownStats.draws} nulle(s) · {ownStats.losses} défaite(s) ·{' '}
              {ownStats.asWhite} avec les blancs, {ownStats.asBlack} avec les noirs
            </p>
          )}
        </section>
      )}

      <section>
        <h3 className="mb-2 text-xs font-semibold tracking-wide text-slate-400 uppercase">Où en suis-je ?</h3>
        <div className="grid grid-cols-3 gap-1.5">
          {ORDER.map((status) => {
            const active = current === status
            return (
              <button
                key={status}
                onClick={() => onSetStatus(active ? null : status)}
                title={DESCRIPTIONS[status]}
                disabled={!node.id || outOfBook}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                  active ? 'text-slate-900' : 'text-slate-300 hover:border-slate-500'
                }`}
                style={{
                  borderColor: active ? STATUS_COLOR[status] : '#334155',
                  background: active ? STATUS_COLOR[status] : 'transparent',
                }}
              >
                {STATUS_LABEL[status]}
              </button>
            )
          })}
        </div>
        <p className="mt-2 text-xs text-slate-500">
          {outOfBook
            ? 'Ligne hors théorie : revenez sur la branche répertoriée pour la marquer.'
            : !node.id
              ? 'Jouez un coup ou sélectionnez une branche pour la marquer.'
              : current
                ? DESCRIPTIONS[current]
                : 'Marquez cette branche pour la retrouver dans votre répertoire.'}
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Progression</h3>
          <span className="text-xs text-slate-500">{stats.total} branches suivies</span>
        </div>
        <div className="flex h-2 overflow-hidden rounded-full bg-slate-800">
          {ORDER.map((status) => {
            const value = stats[status]
            if (!value) return null
            return (
              <div
                key={status}
                style={{ width: `${(value / Math.max(stats.total, 1)) * 100}%`, background: STATUS_COLOR[status] }}
              />
            )
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-xs">
          {ORDER.map((status) => (
            <span key={status} className="inline-flex items-center gap-1.5 text-slate-400">
              <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLOR[status] }} />
              {STATUS_LABEL[status]} <strong className="text-slate-200">{stats[status]}</strong>
            </span>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between">
          <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Mon répertoire</h3>
          {repertoire.length > 0 && (
            <button onClick={exportRepertoire} className="text-xs text-blue-400 hover:text-blue-300">
              Exporter
            </button>
          )}
        </div>
        {repertoire.length === 0 ? (
          <p className="text-xs text-slate-500">
            Aucune branche validée pour l’instant. Marquez une variante « à l’étude » ou « acquise » pour la voir ici.
          </p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {repertoire.map((entry) => (
              <li key={entry.id}>
                <button
                  onClick={() => onSelectNode(entry.id)}
                  className={`w-full rounded-lg border px-2.5 py-1.5 text-left transition-colors hover:bg-slate-800 ${
                    entry.id === node.id ? 'border-blue-500 bg-slate-800' : 'border-slate-700/70 bg-slate-900/50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: STATUS_COLOR[entry.status] }}
                    />
                    <span className="truncate text-xs font-medium text-slate-200">{entry.label}</span>
                    {entry.eco && <span className="ml-auto shrink-0 text-[10px] text-slate-500">{entry.eco}</span>}
                  </span>
                  <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-500">{entry.moves}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {stats.total > 0 && (
          <button onClick={onReset} className="mt-3 text-xs text-slate-500 hover:text-red-400">
            Réinitialiser ma progression
          </button>
        )}
      </section>

      {children}
    </div>
  )
}
