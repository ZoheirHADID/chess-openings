import { useMemo, useState } from 'react'
import type { OpeningIndexEntry, OpeningsData, ProgressMap, StudyStatus } from '../lib/types'
import { searchOpenings } from '../lib/tree'
import { frName } from '../lib/frenchNames'
import { STATUS_COLOR, STATUS_LABEL } from '../lib/progress'
import OpeningName from './OpeningName'

interface Props {
  data: OpeningsData
  progress: ProgressMap
  /** Ligne affichee (chemin SAN). */
  currentId: string
  /** Affiche la ligne sans changer son statut. */
  onSelect: (path: string) => void
  /** Affiche la ligne et la marque « à l'étude ». */
  onStudy: (path: string) => void
}

interface Family {
  name: string
  fr: string
  ecoRange: string
  entries: OpeningIndexEntry[]
}

/** Regroupe l'index Lichess par famille, triee par nom francais. */
function groupFamilies(data: OpeningsData): Family[] {
  const map = new Map<string, OpeningIndexEntry[]>()
  for (const entry of data.index) {
    const list = map.get(entry.family)
    if (list) list.push(entry)
    else map.set(entry.family, [entry])
  }
  const families = [...map.entries()].map(([name, entries]) => {
    const codes = entries.map((e) => e.eco).sort()
    const ecoRange = codes[0] === codes[codes.length - 1] ? codes[0] : `${codes[0]}–${codes[codes.length - 1]}`
    return { name, fr: frName(name), ecoRange, entries: entries.sort((a, b) => a.path.length - b.path.length) }
  })
  return families.sort((a, b) => a.fr.localeCompare(b.fr, 'fr'))
}

function StatusDot({ status }: { status: StudyStatus | undefined }) {
  if (!status) return null
  return (
    <span
      className="h-2 w-2 shrink-0 rounded-full"
      style={{ background: STATUS_COLOR[status] }}
      title={STATUS_LABEL[status]}
      aria-label={STATUS_LABEL[status]}
    />
  )
}

/**
 * Catalogue des ouvertures : toutes les familles et variantes du referentiel
 * Lichess, avec recherche, pour choisir d'un clic une ligne a etudier.
 */
export default function OpeningCatalog({ data, progress, currentId, onSelect, onStudy }: Props) {
  const [query, setQuery] = useState('')
  const [browsing, setBrowsing] = useState(false)
  const [openFamilies, setOpenFamilies] = useState<Set<string>>(() => new Set())

  const families = useMemo(() => groupFamilies(data), [data])
  const hits = useMemo(() => searchOpenings(data, query, 60), [data, query])
  const searching = query.trim().length >= 2

  const toggleFamily = (name: string) =>
    setOpenFamilies((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  const renderEntry = (entry: OpeningIndexEntry, showFamily = false) => {
    const status = progress[entry.path]?.status
    const active = entry.path === currentId
    return (
      <li key={`${entry.eco}-${entry.path}`} className="flex items-center gap-1.5">
        <button
          onClick={() => onSelect(entry.path)}
          className={`flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-slate-800 ${
            active ? 'bg-slate-800 ring-1 ring-blue-500/60' : ''
          }`}
          title={`Afficher ${entry.path}`}
        >
          <StatusDot status={status} />
          <span className="w-8 shrink-0 font-mono text-[10px] text-blue-400">{entry.eco}</span>
          <span className="min-w-0 flex-1">
            <OpeningName name={showFamily ? entry.name : entry.name.replace(`${entry.family}: `, '')} className="flex text-xs text-slate-200" />
            <span className="block truncate font-mono text-[10px] text-slate-500">{entry.path}</span>
          </span>
        </button>
        <button
          onClick={() => onStudy(entry.path)}
          disabled={status === 'studying'}
          className="shrink-0 rounded-md border border-amber-600/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-200 transition-colors hover:bg-amber-900/40 disabled:cursor-default disabled:border-transparent disabled:text-amber-400/70"
          title={status === 'studying' ? 'Déjà à l’étude' : 'Afficher et marquer « à l’étude »'}
        >
          {status === 'studying' ? 'À l’étude' : 'Étudier'}
        </button>
      </li>
    )
  }

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Choisir une ouverture à étudier</h3>
        <span className="text-[10px] text-slate-500">
          {families.length} familles · {data.index.length.toLocaleString('fr-FR')} variantes
        </span>
      </div>
      <div className="flex gap-1.5">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom, variante ou code ECO…"
          className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          aria-label="Rechercher une ouverture à étudier"
        />
        <button
          onClick={() => setBrowsing((b) => !b)}
          className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
            browsing ? 'border-blue-500 bg-blue-600/20 text-blue-200' : 'border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
          aria-expanded={browsing || searching}
        >
          {browsing ? 'Fermer' : 'Parcourir'}
        </button>
      </div>

      {searching && (
        <ul className="max-h-80 space-y-0.5 overflow-y-auto pr-1">
          {hits.length === 0 && <li className="px-1.5 text-xs text-slate-500">Aucune ouverture ne correspond.</li>}
          {hits.map((hit) => renderEntry(hit, true))}
        </ul>
      )}

      {!searching && browsing && (
        <ul className="max-h-96 space-y-0.5 overflow-y-auto pr-1">
          {families.map((family) => {
            const open = openFamilies.has(family.name)
            const tracked = family.entries.filter((e) => {
              const s = progress[e.path]?.status
              return s === 'studying' || s === 'mastered'
            }).length
            return (
              <li key={family.name}>
                <button
                  onClick={() => toggleFamily(family.name)}
                  className="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-slate-800"
                  aria-expanded={open}
                >
                  <span className="w-3 shrink-0 text-[10px] text-slate-500">{open ? '▾' : '▸'}</span>
                  <span className="w-14 shrink-0 font-mono text-[10px] text-blue-400">{family.ecoRange}</span>
                  <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-200">{family.fr}</span>
                  {tracked > 0 && (
                    <span className="shrink-0 rounded-full bg-amber-900/50 px-1.5 text-[10px] text-amber-200" title="Variantes à l’étude ou acquises">
                      {tracked}
                    </span>
                  )}
                  <span className="shrink-0 text-[10px] text-slate-500">{family.entries.length}</span>
                </button>
                {open && (
                  <ul className="mt-0.5 mb-1 ml-3 space-y-0.5 border-l border-slate-800 pl-1.5">
                    {family.entries.map((entry) => renderEntry(entry))}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
