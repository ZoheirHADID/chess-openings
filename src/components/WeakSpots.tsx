import { useMemo, useState } from 'react'
import type { TreeNode } from '../lib/types'
import type { GameNodeStats } from '../lib/games'
import { nearestNamed } from '../lib/tree'

interface Props {
  stats: Map<string, GameNodeStats>
  byId: Map<string, TreeNode>
  onSelect: (nodeId: string) => void
}

type Side = 'all' | 'white' | 'black'

interface Row {
  id: string
  label: string
  eco?: string
  total: number
  score: number
  wins: number
  draws: number
  losses: number
}

/** Nombre de parties minimum pour qu'une branche soit jugee. */
const MIN_GAMES = 6
/** Profondeur minimum : au-dessous, la branche est trop generale. */
const MIN_PLIES = 4

export default function WeakSpots({ stats, byId, onSelect }: Props) {
  const [side, setSide] = useState<Side>('all')

  const rows = useMemo(() => {
    const candidates: Row[] = []
    for (const [id, stat] of stats) {
      if (!id) continue
      const plies = id.split(' ').length
      if (plies < MIN_PLIES) continue

      // Parties retenues selon la couleur demandee
      const total = side === 'all' ? stat.total : side === 'white' ? stat.asWhite : stat.asBlack
      if (total < MIN_GAMES) continue
      // Les compteurs de resultats ne sont pas ventiles par couleur : on ne filtre
      // par couleur que les branches jouees exclusivement de ce cote.
      if (side === 'white' && stat.asBlack > 0) continue
      if (side === 'black' && stat.asWhite > 0) continue

      const node = byId.get(id)
      const named = node ? nearestNamed(node) : null
      candidates.push({
        id,
        label: named?.name ?? id,
        eco: named?.eco,
        total: stat.total,
        wins: stat.wins,
        draws: stat.draws,
        losses: stat.losses,
        score: (stat.wins + stat.draws / 2) / stat.total,
      })
    }

    // On garde la branche la plus profonde de chaque chemin : la plus precise
    candidates.sort((a, b) => b.id.length - a.id.length)
    const kept: Row[] = []
    for (const row of candidates) {
      const covered = kept.some((k) => k.id.startsWith(`${row.id} `) && Math.abs(k.score - row.score) < 0.06)
      if (!covered) kept.push(row)
    }

    return kept.sort((a, b) => a.score - b.score || b.total - a.total).slice(0, 12)
  }, [stats, byId, side])

  if (stats.size === 0) return null

  return (
    <section>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">À travailler en priorité</h3>
        <div className="flex gap-0.5 rounded-md border border-slate-700 p-0.5 text-[10px]">
          {(
            [
              { id: 'all', label: 'Tout' },
              { id: 'white', label: '○' },
              { id: 'black', label: '●' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              onClick={() => setSide(option.id)}
              title={option.id === 'white' ? 'Branches jouées avec les blancs' : option.id === 'black' ? 'Branches jouées avec les noirs' : 'Toutes les branches'}
              className={`rounded px-1.5 py-0.5 ${
                side === option.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">
          Pas encore assez de parties sur une même branche ({MIN_GAMES} minimum) pour dégager une faiblesse.
        </p>
      ) : (
        <ul className="space-y-1">
          {rows.map((row) => {
            const percent = Math.round(row.score * 100)
            return (
              <li key={row.id}>
                <button
                  onClick={() => onSelect(row.id)}
                  className="w-full rounded-lg border border-slate-700/70 bg-slate-900/50 px-2.5 py-1.5 text-left transition-colors hover:bg-slate-800"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className="w-9 shrink-0 rounded px-1 text-center text-[11px] font-bold"
                      style={{
                        background: percent < 40 ? '#7f1d1d' : percent < 50 ? '#78350f' : '#334155',
                        color: '#fecaca',
                      }}
                    >
                      {percent} %
                    </span>
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{row.label}</span>
                    <span className="shrink-0 text-[10px] text-slate-500">{row.total} p.</span>
                  </span>
                  <span className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="truncate font-mono text-[10px] text-slate-500">{row.id}</span>
                    <span className="ml-auto shrink-0 text-[10px] text-slate-600">
                      {row.wins}G {row.draws}N {row.losses}P
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
