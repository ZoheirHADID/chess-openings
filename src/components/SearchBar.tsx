import { useEffect, useMemo, useRef, useState } from 'react'
import OpeningName from './OpeningName'
import type { OpeningsData } from '../lib/types'
import { searchOpenings } from '../lib/tree'

interface Props {
  data: OpeningsData
  onSelect: (path: string) => void
}

export default function SearchBar({ data, onSelect }: Props) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [cursor, setCursor] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  const hits = useMemo(() => searchOpenings(data, query, 30), [data, query])

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const choose = (path: string) => {
    onSelect(path)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setCursor(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setCursor((c) => Math.min(c + 1, hits.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setCursor((c) => Math.max(c - 1, 0))
          } else if (e.key === 'Enter' && hits[cursor]) {
            choose(hits[cursor].path)
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
        placeholder="Rechercher une ouverture, une variante ou un code ECO…"
        className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/40 focus:outline-none"
        aria-label="Rechercher une ouverture"
      />
      {open && hits.length > 0 && (
        <ul className="animate-fade-in absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-2xl shadow-black/60">
          {hits.map((hit, index) => (
            <li key={`${hit.eco}-${hit.path}`}>
              <button
                onMouseEnter={() => setCursor(index)}
                onClick={() => choose(hit.path)}
                className={`flex w-full items-baseline gap-2 px-3 py-1.5 text-left ${
                  index === cursor ? 'bg-slate-800' : ''
                }`}
              >
                <span className="w-9 shrink-0 font-mono text-[11px] text-blue-400">{hit.eco}</span>
                <span className="min-w-0 flex-1">
                  <OpeningName name={hit.name} className="flex text-sm text-slate-100" />
                  <span className="block truncate font-mono text-[10px] text-slate-500">{hit.path}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
