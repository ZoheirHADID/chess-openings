import { useEffect, useState } from 'react'
import {
  EXPLORER_DB_LABEL,
  EXPLORER_DB_NOTE,
  fetchExplorer,
  formatCount,
  totalGames,
  type ExplorerDb,
  type ExplorerResult,
} from '../lib/explorer'

const DB_KEY = 'chess-openings:explorer-db'

interface Props {
  uci: string[]
  onPlayMove: (san: string) => void
  /** Coups presents dans l'arbre theorique depuis cette position. */
  knownSans: Set<string>
}

export default function ExplorerPanel({ uci, onPlayMove, knownSans }: Props) {
  const [data, setData] = useState<ExplorerResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [db, setDb] = useState<ExplorerDb>(() => (localStorage.getItem(DB_KEY) as ExplorerDb | null) ?? 'lichess')
  const chooseDb = (next: ExplorerDb) => {
    setDb(next)
    localStorage.setItem(DB_KEY, next)
  }

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const timer = setTimeout(() => {
      fetchExplorer(uci, db, controller.signal)
        .then((result) => setData(result))
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'AbortError') return
          setError(err instanceof Error ? err.message : 'Erreur réseau')
          setData(null)
        })
        .finally(() => setLoading(false))
    }, 220)
    return () => {
      controller.abort()
      clearTimeout(timer)
      setLoading(false)
    }
  }, [uci, db])

  const total = data ? totalGames(data) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Statistiques Lichess</h3>
        <div className="flex items-center gap-2">
          {data && <span className="text-xs text-slate-500">{formatCount(total)} parties</span>}
          <div className="flex rounded-md border border-slate-700 p-0.5" role="radiogroup" aria-label="Base de parties">
            {(Object.keys(EXPLORER_DB_LABEL) as ExplorerDb[]).map((id) => (
              <button
                key={id}
                role="radio"
                aria-checked={db === id}
                onClick={() => chooseDb(id)}
                title={EXPLORER_DB_NOTE[id]}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                  db === id ? 'bg-slate-700 text-slate-100' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {EXPLORER_DB_LABEL[id]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && !data && <p className="text-xs text-slate-500">Interrogation de l’explorateur Lichess…</p>}
      {error && (
        <p className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-2.5 py-2 text-xs text-amber-300">
          {error}
        </p>
      )}

      {data && total > 0 && (
        <>
          <div className="flex h-3 overflow-hidden rounded-full ring-1 ring-slate-700">
            <div
              className="bg-slate-100"
              style={{ width: `${(data.white / total) * 100}%` }}
              title={`Blancs ${Math.round((data.white / total) * 100)} %`}
            />
            <div className="bg-slate-500" style={{ width: `${(data.draws / total) * 100}%` }} />
            <div className="bg-slate-900" style={{ width: `${(data.black / total) * 100}%` }} />
          </div>
          <p className="text-[11px] text-slate-400">
            Blancs {Math.round((data.white / total) * 100)} % · Nulles {Math.round((data.draws / total) * 100)} % ·
            Noirs {Math.round((data.black / total) * 100)} %
          </p>

          <ul className="space-y-1">
            {data.moves.map((move) => {
              const moveTotal = totalGames(move)
              const known = knownSans.has(move.san)
              return (
                <li key={move.uci}>
                  <button
                    onClick={() => onPlayMove(move.san)}
                    title={known ? 'Jouer ce coup (branche répertoriée)' : 'Jouer ce coup (hors théorie)'}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-800"
                  >
                    <span className="flex w-14 shrink-0 items-center gap-1 font-mono text-sm text-slate-100">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: known ? '#22c55e' : '#475569' }}
                      />
                      {move.san}
                    </span>
                    <span className="w-12 shrink-0 text-[11px] text-slate-400">{formatCount(moveTotal)}</span>
                    <span className="flex h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-800">
                      <span className="bg-slate-100" style={{ width: `${(move.white / moveTotal) * 100}%` }} />
                      <span className="bg-slate-500" style={{ width: `${(move.draws / moveTotal) * 100}%` }} />
                      <span className="bg-slate-950" style={{ width: `${(move.black / moveTotal) * 100}%` }} />
                    </span>
                    <span className="w-9 shrink-0 text-right text-[11px] text-slate-500">
                      {Math.round((moveTotal / total) * 100)} %
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          <p className="text-[10px] text-slate-600">{EXPLORER_DB_NOTE[db]}</p>
        </>
      )}
    </div>
  )
}
