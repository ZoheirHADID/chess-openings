import { useMemo, useState } from 'react'
import type { ImportedGame, TreeNode } from '../lib/types'
import type { GameNodeStats } from '../lib/games'
import { nearestNamed } from '../lib/tree'
import { frName } from '../lib/frenchNames'
import { ownDeviation, resultFor } from '../lib/deviations'
import OpeningName from './OpeningName'

interface Props {
  /** Parties importees, deja rattachees a leur ouverture. */
  games: ImportedGame[]
  /** Bilan par noeud de l'arbre, theorie et hors theorie. */
  stats: Map<string, GameNodeStats>
  byId: Map<string, TreeNode>
  onSelect: (nodeId: string) => void
}

type Grouping = 'opening' | 'branch'
type Sorting = 'priority' | 'impact' | 'losses' | 'score'
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
  /** Fois ou le joueur a quitte la theorie de lui-meme dans cette ligne. */
  deviations: number
  /** Coût + récurrence des écarts : ce qu'apprendre la ligne peut rapporter. */
  priority: number
  /** Ecart de theorie le plus couteux et le plus frequent de la ligne : cible du clic. */
  focus?: Deviation
}

/** Ecart de theorie commis par le joueur, agrege sur toutes ses parties. */
interface Deviation {
  key: string
  /** Position (noeud theorique) ou le joueur a quitte la theorie. */
  nodeId: string
  /** Coup joue a la place de la theorie. */
  san: string
  /** Coups theoriques attendus a cet endroit. */
  expected: string[]
  opening: string
  eco?: string
  count: number
  wins: number
  draws: number
  losses: number
  score: number
  /** Points perdus apres cet ecart (defaites + demi-nulles). */
  cost: number
}

/** L'ecart qui coute le plus de points, puis le plus frequent. */
const costliest = (list: Deviation[]): Deviation | undefined =>
  [...list].sort((a, b) => b.cost - a.cost || b.count - a.count || a.score - b.score)[0]

/** En dessous, l'echantillon ne veut rien dire. */
const MIN_GAMES = 5
const MIN_PLIES = 4
/** Poids d'un ecart de theorie repete, en points, dans la priorite. */
const DEVIATION_WEIGHT = 0.5

const finish = (row: Omit<Row, 'score' | 'impact' | 'priority'>): Row => {
  const score = row.total > 0 ? (row.wins + row.draws / 2) / row.total : 0
  const impact = row.total * Math.max(0, 0.5 - score)
  return { ...row, score, impact, priority: impact + DEVIATION_WEIGHT * row.deviations }
}

export default function WeakSpots({ games, stats, byId, onSelect }: Props) {
  const [grouping, setGrouping] = useState<Grouping>('opening')
  const [sorting, setSorting] = useState<Sorting>('priority')
  const [side, setSide] = useState<Side>('all')

  const selected = useMemo(() => (side === 'all' ? games : games.filter((g) => g.color === side)), [games, side])

  /** Ecarts de theorie du joueur, regroupes par position et coup. */
  const allDeviations = useMemo(() => {
    const byKey = new Map<string, Deviation>()
    for (const game of selected) {
      const dev = ownDeviation(game)
      if (!dev) continue
      const key = `${dev.nodeId}|${dev.san}`
      let entry = byKey.get(key)
      if (!entry) {
        const node = byId.get(dev.nodeId)
        const named = node ? nearestNamed(node) : null
        entry = {
          key,
          nodeId: dev.nodeId,
          san: dev.san,
          expected: node ? node.children.slice(0, 3).map((c) => c.san) : [],
          opening: named?.name ?? game.openingName ?? 'Hors répertoire Lichess',
          eco: named?.eco ?? game.openingEco,
          count: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          score: 0,
          cost: 0,
        }
        byKey.set(key, entry)
      }
      entry.count++
      const res = resultFor(game)
      if (res === 'win') entry.wins++
      else if (res === 'draw') entry.draws++
      else if (res === 'loss') entry.losses++
    }
    return [...byKey.values()].map((d) => ({
      ...d,
      score: d.count > 0 ? (d.wins + d.draws / 2) / d.count : 0,
      cost: d.losses + d.draws / 2,
    }))
  }, [selected, byId])
  /** Ecarts repetes, pour la liste « Erreurs recurrentes » : recurrence d'abord, puis gravite. */
  const deviations = useMemo(
    () => allDeviations.filter((d) => d.count >= 2).sort((a, b) => b.count - a.count || a.score - b.score),
    [allDeviations],
  )

  const rows = useMemo(() => {
    let list: Row[] = []

    if (grouping === 'opening') {
      const byOpening = new Map<string, Omit<Row, 'score' | 'impact' | 'priority'>>()
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
            deviations: 0,
          }
          byOpening.set(key, row)
        }
        row.total++
        const res = resultFor(game)
        if (res === 'win') row.wins++
        else if (res === 'draw') row.draws++
        else if (res === 'loss') row.losses++
        if (ownDeviation(game)) row.deviations++
      }
      // Le clic mene a l'ecart le plus couteux de l'ouverture, pas seulement a son noeud nomme
      list = [...byOpening.values()]
        .filter((r) => r.total >= MIN_GAMES)
        .map(finish)
        .map((row) => {
          const focus = costliest(allDeviations.filter((d) => d.opening === row.key))
          return focus ? { ...row, focus, target: `${focus.nodeId} ${focus.san}`.trim() } : row
        })
    } else {
      // Regroupement par noeud : plus precis, mais uniquement sans filtre de couleur
      const deviationsByNode = new Map<string, number>()
      for (const game of selected) {
        const dev = ownDeviation(game)
        if (dev) deviationsByNode.set(dev.nodeId, (deviationsByNode.get(dev.nodeId) ?? 0) + 1)
      }
      const candidates: Row[] = []
      for (const [id, stat] of stats) {
        if (!id || id.split(' ').length < MIN_PLIES || stat.total < MIN_GAMES) continue
        if (side === 'white' && stat.asWhite === 0) continue
        if (side === 'black' && stat.asBlack === 0) continue
        const node = byId.get(id)
        const named = node ? nearestNamed(node) : null
        // Ecarts commis sur ce noeud ou en aval
        let deviationCount = 0
        for (const [nodeId, count] of deviationsByNode) {
          if (nodeId === id || nodeId.startsWith(`${id} `)) deviationCount += count
        }
        const focus = costliest(allDeviations.filter((d) => d.nodeId === id || d.nodeId.startsWith(`${id} `)))
        candidates.push({
          ...finish({
            key: id,
            target: id,
            label: named?.name ?? id,
            eco: named?.eco,
            total: stat.total,
            wins: stat.wins,
            draws: stat.draws,
            losses: stat.losses,
            deviations: deviationCount,
          }),
          focus,
          target: focus ? `${focus.nodeId} ${focus.san}`.trim() : id,
        })
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
      priority: (a, b) => b.priority - a.priority || b.losses - a.losses,
      impact: (a, b) => b.impact - a.impact || b.losses - a.losses,
      losses: (a, b) => b.losses - a.losses || a.score - b.score,
      score: (a, b) => a.score - b.score || b.total - a.total,
    }
    return list.sort(compare[sorting]).slice(0, 12)
  }, [selected, stats, byId, grouping, sorting, side, allDeviations])

  if (games.length === 0) return null

  const worst = rows[0]
  const topDeviation = deviations[0]

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
              { id: 'priority', label: 'Priorité', title: 'Coût + récurrence de vos écarts de théorie : le gain à apprendre la ligne' },
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
          {worst && worst.priority > 0.5 && (
            <p className="mb-2 rounded-lg border border-rose-800/50 bg-rose-950/25 px-2.5 py-1.5 text-[11px] text-rose-200">
              Priorité : <strong>{frName(worst.label)}</strong> vous coûte {worst.impact.toFixed(1)} point
              {worst.impact >= 2 ? 's' : ''} ({worst.losses} défaite{worst.losses > 1 ? 's' : ''} sur {worst.total}{' '}
              parties)
              {worst.deviations > 0 &&
                `, et vous y quittez la théorie ${worst.deviations} fois de vous-même`}
              .
              {worst.focus ? (
                <>
                  {' '}
                  Un clic rejoue sur l’échiquier le coup qui vous coûte le plus cher : vous jouez{' '}
                  <strong>{worst.focus.san}</strong> ({worst.focus.count} fois, {worst.focus.losses} défaite
                  {worst.focus.losses > 1 ? 's' : ''})
                  {worst.focus.expected.length > 0 && ` au lieu de ${worst.focus.expected.join(', ')}`}.
                </>
              ) : (
                topDeviation && (
                  <>
                    {' '}
                    Erreur la plus fréquente : <strong>{topDeviation.san}</strong> après {frName(topDeviation.opening)} (
                    {topDeviation.count} fois
                    {topDeviation.expected.length > 0 && `, la théorie joue ${topDeviation.expected.join(', ')}`}).
                  </>
                )
              )}
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
                    title={
                      row.focus
                        ? `Rejouer ${row.focus.san} sur l’échiquier, là où vous quittez la théorie`
                        : 'Aller à cette ouverture'
                    }
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
                      <span className="flex min-w-0 flex-1 items-baseline gap-1 text-xs text-slate-200">
                        {row.eco && <span className="shrink-0 text-slate-500">{row.eco}</span>}
                        <OpeningName name={row.label} />
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-rose-400">−{row.losses}</span>
                    </span>
                    <span className="mt-0.5 flex items-baseline gap-2 text-[10px] text-slate-500">
                      <span>
                        {row.total} parties · {row.wins}G {row.draws}N {row.losses}P
                        {row.deviations > 0 && (
                          <span className="text-amber-500/90"> · {row.deviations} écart{row.deviations > 1 ? 's' : ''} de théorie</span>
                        )}
                      </span>
                      <span className="ml-auto shrink-0">
                        {sorting === 'priority' ? `priorité ${row.priority.toFixed(1)}` : `coût ${row.impact.toFixed(1)} pt`}
                      </span>
                    </span>
                    {row.focus && (
                      <span className="mt-0.5 flex min-w-0 items-baseline gap-1 text-[10px] text-amber-400/90">
                        <span className="shrink-0">↳ écart le plus coûteux :</span>
                        <span className="shrink-0 font-mono font-semibold text-amber-200">{row.focus.san}</span>
                        <span className="shrink-0">×{row.focus.count}</span>
                        {row.focus.expected.length > 0 && (
                          <span className="min-w-0 truncate text-slate-500">théorie : {row.focus.expected.join(', ')}</span>
                        )}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="mt-2 text-[10px] text-slate-600">
            Coût = nombre de parties × écart sous 50 %. Priorité = coût + {DEVIATION_WEIGHT} point par écart de théorie
            que vous commettez vous-même : une ligne souvent jouée, souvent perdue et où vous sortez de la théorie
            est celle qui rapportera le plus à apprendre.
          </p>
        </>
      )}

      {deviations.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1.5 text-xs font-semibold tracking-wide text-slate-400 uppercase">Erreurs récurrentes</h3>
          <p className="mb-2 text-[10px] text-slate-500">
            Coups par lesquels vous quittez la théorie à répétition. Un clic rejoue le coup fautif sur
            l’échiquier, avec son verdict ; les coups théoriques attendus sont dépliés dans l’arbre, et ◀
            ramène à la position théorique.
          </p>
          <ul className="space-y-1">
            {deviations.slice(0, 8).map((dev) => {
              const percent = Math.round(dev.score * 100)
              return (
                <li key={dev.key}>
                  <button
                    onClick={() => onSelect(`${dev.nodeId} ${dev.san}`.trim())}
                    title={`Rejouer ${dev.san} sur l’échiquier`}
                    className="w-full rounded-lg border border-amber-800/50 bg-amber-950/15 px-2.5 py-1.5 text-left transition-colors hover:bg-amber-950/35"
                  >
                    <span className="flex items-center gap-2">
                      <span className="shrink-0 rounded bg-amber-900/60 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-100">
                        {dev.san}
                      </span>
                      <span className="flex min-w-0 flex-1 items-baseline gap-1 text-xs text-slate-200">
                        {dev.eco && <span className="shrink-0 text-slate-500">{dev.eco}</span>}
                        <OpeningName name={dev.opening} />
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-amber-300">×{dev.count}</span>
                    </span>
                    <span className="mt-0.5 flex items-baseline gap-2 text-[10px] text-slate-500">
                      <span className="min-w-0 truncate">
                        {dev.expected.length > 0 ? `Théorie : ${dev.expected.join(', ')}` : 'Fin de la théorie répertoriée'}
                      </span>
                      <span className="ml-auto shrink-0">
                        {percent} % · {dev.wins}G {dev.draws}N {dev.losses}P
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
