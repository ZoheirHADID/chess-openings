import { useEffect, useState } from 'react'
import { fetchExplorer, formatCount, totalGames, type ExplorerResult } from '../lib/explorer'

interface Props {
  uci: string[]
  onPlayMove: (san: string) => void
  playableSans: Set<string>
}

export default function ExplorerPanel({ uci, onPlayMove, playableSans }: Props) {
  const [data, setData] = useState<ExplorerResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    const timer = setTimeout(() => {
      fetchExplorer(uci, controller.signal)
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
  }, [uci])

  const total = data ? totalGames(data) : 0

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Statistiques Lichess</h3>
        {data && <span className="text-xs text-slate-500">{formatCount(total)} parties</span>}
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
              const known = playableSans.has(move.san)
              return (
                <li key={move.uci}>
                  <button
                    onClick={() => onPlayMove(move.san)}
                    disabled={!known}
                    title={known ? 'Aller à ce coup dans l’arbre' : 'Coup absent de l’arbre théorique'}
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-800 disabled:cursor-default disabled:opacity-50"
                  >
                    <span className="w-14 shrink-0 font-mono text-sm text-slate-100">{move.san}</span>
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
          <p className="text-[10px] text-slate-600">
            Parties classées blitz / rapide / classique, Elo 1600+, source lichess.org.
          </p>
        </>
      )}
    </div>
  )
}
