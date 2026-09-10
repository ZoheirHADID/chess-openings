import { useMemo, useState } from 'react'
import type { ImportedGame, TreeNode } from '../lib/types'
import type { GameNodeStats } from '../lib/games'
import { nearestNamed } from '../lib/tree'

interface Props {
  /** Parties importees, deja rattachees a leur ouverture. */
  games: ImportedGame[]
  /** Bilan par noeud de l'arbre, theorie et hors theorie. */
  stats: Map<string, GameNodeStats>
  byId: Map<string, TreeNode>
  onSelect: (nodeId: string) => void
}

type Grouping = 'opening' | 'branch'
type Sorting = 'impact' | 'losses' | 'score'
type Side = 'all' | 'white' | 'black'

interface Row {
  key: string
  /** Noeud vers lequel naviguer. */
  target: string
  label: string
  eco?: string
  total: number
  wins: number
  draws: number
  losses: number
  score: number
  /** Points perdus sous la barre des 50 % : le vrai coût de la ligne. */
  impact: number
}

/** En dessous, l'echantillon ne veut rien dire. */
const MIN_GAMES = 5
const MIN_PLIES = 4

const finish = (row: Omit<Row, 'score' | 'impact'>): Row => {
  const score = row.total > 0 ? (row.wins + row.draws / 2) / row.total : 0
  return { ...row, score, impact: row.total * Math.max(0, 0.5 - score) }
}

export default function WeakSpots({ games, stats, byId, onSelect }: Props) {
  const [grouping, setGrouping] = useState<Grouping>('opening')
  const [sorting, setSorting] = useState<Sorting>('impact')
  const [side, setSide] = useState<Side>('all')

  const rows = useMemo(() => {
    const selected = side === 'all' ? games : games.filter((g) => g.color === side)
    let list: Row[] = []

    if (grouping === 'opening') {
      const byOpening = new Map<string, Omit<Row, 'score' | 'impact'>>()
      for (const game of selected) {
        const key = game.openingName ?? 'Hors répertoire Lichess'
        let row = byOpening.get(key)
        if (!row) {
          row = {
            key,
            target: game.openingId ?? game.nodeId ?? '',
            label: key,
            eco: game.openingEco,
            total: 0,
            wins: 0,
            draws: 0,
            losses: 0,
          }
          byOpening.set(key, row)
        }
        row.total++
        if (game.result === '1/2-1/2') row.draws++
        else if (game.color) {
          const won =
            (game.result === '1-0' && game.color === 'white') || (game.result === '0-1' && game.color === 'black')
          if (won) row.wins++
          else row.losses++
        }
      }
      list = [...byOpening.values()].filter((r) => r.total >= MIN_GAMES).map(finish)
    } else {
      // Regroupement par noeud : plus precis, mais uniquement sans filtre de couleur
      const candidates: Row[] = []
      for (const [id, stat] of stats) {
        if (!id || id.split(' ').length < MIN_PLIES || stat.total < MIN_GAMES) continue
        if (side === 'white' && stat.asWhite === 0) continue
        if (side === 'black' && stat.asBlack === 0) continue
        const node = byId.get(id)
        const named = node ? nearestNamed(node) : null
        candidates.push(
          finish({
            key: id,
            target: id,
            label: named?.name ?? id,
            eco: named?.eco,
            total: stat.total,
            wins: stat.wins,
            draws: stat.draws,
            losses: stat.losses,
          }),
        )
      }
      // On conserve la branche la plus profonde de chaque chemin equivalent
      candidates.sort((a, b) => b.key.length - a.key.length)
      const kept: Row[] = []
      for (const row of candidates) {
        if (!kept.some((k) => k.key.startsWith(`${row.key} `) && Math.abs(k.score - row.score) < 0.06)) {
          kept.push(row)
        }
      }
      list = kept
    }

    const compare: Record<Sorting, (a: Row, b: Row) => number> = {
      impact: (a, b) => b.impact - a.impact || b.losses - a.losses,
      losses: (a, b) => b.losses - a.losses || a.score - b.score,
      score: (a, b) => a.score - b.score || b.total - a.total,
    }
    return list.sort(compare[sorting]).slice(0, 12)
  }, [games, stats, byId, grouping, sorting, side])

  if (games.length === 0) return null

  const worst = rows[0]

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
        <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">À travailler en priorité</h3>
        <div className="flex gap-0.5 rounded-md border border-slate-700 p-0.5 text-[10px]">
          {(
            [
              { id: 'all', label: 'Tout', title: 'Les deux couleurs' },
              { id: 'white', label: '○', title: 'Parties jouées avec les blancs' },
              { id: 'black', label: '●', title: 'Parties jouées avec les noirs' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              onClick={() => setSide(option.id)}
              title={option.title}
              className={`rounded px-1.5 py-0.5 ${
                side === option.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-2 flex flex-wrap gap-1.5">
        <div className="flex gap-0.5 rounded-md border border-slate-700 p-0.5 text-[10px]">
          {(
            [
              { id: 'opening', label: 'Par ouverture' },
              { id: 'branch', label: 'Par branche' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              onClick={() => setGrouping(option.id)}
              className={`rounded px-1.5 py-0.5 ${
                grouping === option.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex gap-0.5 rounded-md border border-slate-700 p-0.5 text-[10px]">
          {(
            [
              { id: 'impact', label: 'Coût', title: 'Points perdus sous la barre des 50 %' },
              { id: 'losses', label: 'Défaites', title: 'Nombre brut de défaites' },
              { id: 'score', label: 'Score', title: 'Pourcentage de points le plus bas' },
            ] as const
          ).map((option) => (
            <button
              key={option.id}
              onClick={() => setSorting(option.id)}
              title={option.title}
              className={`rounded px-1.5 py-0.5 ${
                sorting === option.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-500">
          Aucune ligne ne totalise {MIN_GAMES} parties dans cette sélection : importez davantage de parties ou
          élargissez le filtre.
        </p>
      ) : (
        <>
          {worst && worst.impact > 0.5 && (
            <p className="mb-2 rounded-lg border border-rose-800/50 bg-rose-950/25 px-2.5 py-1.5 text-[11px] text-rose-200">
              Priorité : <strong>{worst.label}</strong> vous coûte {worst.impact.toFixed(1)} point
              {worst.impact >= 2 ? 's' : ''} ({worst.losses} défaite{worst.losses > 1 ? 's' : ''} sur {worst.total}{' '}
              parties).
            </p>
          )}

          <ul className="space-y-1">
            {rows.map((row) => {
              const percent = Math.round(row.score * 100)
              return (
                <li key={row.key}>
                  <button
                    onClick={() => row.target && onSelect(row.target)}
                    disabled={!row.target}
                    className="w-full rounded-lg border border-slate-700/70 bg-slate-900/50 px-2.5 py-1.5 text-left transition-colors hover:bg-slate-800 disabled:opacity-50"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="w-8 shrink-0 rounded px-1 text-center text-[11px] font-bold"
                        style={{
                          background: percent < 40 ? '#7f1d1d' : percent < 50 ? '#78350f' : '#334155',
                          color: '#fee2e2',
                        }}
                      >
                        {percent}%
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs text-slate-200">
                        {row.eco && <span className="text-slate-500">{row.eco} </span>}
                        {row.label}
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-rose-400">−{row.losses}</span>
                    </span>
                    <span className="mt-0.5 flex items-baseline gap-2 text-[10px] text-slate-500">
                      <span>
                        {row.total} parties · {row.wins}G {row.draws}N {row.losses}P
                      </span>
                      <span className="ml-auto shrink-0">coût {row.impact.toFixed(1)} pt</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-[10px] text-slate-600">
            Coût = nombre de parties × écart sous 50 %. Une ligne jouée souvent et perdue souvent remonte avant une
            ligne rare mais catastrophique.
          </p>
        </>
      )}
    </section>
  )
}
