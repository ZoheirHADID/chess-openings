import { useMemo, useRef, useState } from 'react'
import type { ImportedGame } from '../lib/types'
import type { GameNodeStats } from '../lib/games'
import { fetchChessComGames, fetchLichessGames, parsePgn } from '../lib/games'

export type Platform = 'lichess' | 'chesscom'

const PLATFORMS: { id: Platform; label: string; hint: string }[] = [
  { id: 'lichess', label: 'Lichess', hint: 'Vos 60 dernières parties via l’API publique Lichess.' },
  {
    id: 'chesscom',
    label: 'Chess.com',
    hint: 'Vos 60 dernières parties via les archives mensuelles publiques Chess.com.',
  },
]

const SOURCE_LABEL: Record<ImportedGame['source'], string> = {
  lichess: 'Lichess',
  chesscom: 'Chess.com',
  pgn: 'PGN',
}

interface Props {
  games: ImportedGame[]
  nodeId: string
  nodeStats?: GameNodeStats
  usernames: Record<Platform, string>
  onUsernameChange: (platform: Platform, value: string) => void
  onImport: (games: ImportedGame[]) => void
  onSelectGame: (game: ImportedGame) => void
  onClear: () => void
}

/** Identifiant court affichable : numero de partie Lichess / Chess.com. */
const shortId = (game: ImportedGame): string => {
  if (game.url) {
    const last = game.url.split('/').filter(Boolean).pop()
    if (last) return `#${last.slice(-10)}`
  }
  return `#${game.id.split('|').slice(-1)[0].slice(0, 8)}`
}

const COLOR_MARK: Record<'white' | 'black', string> = { white: '○', black: '●' }

const resultBadge = (game: ImportedGame) => {
  if (game.result === '1/2-1/2') return { label: 'Nulle', color: 'bg-slate-600' }
  if (!game.color) return { label: game.result, color: 'bg-slate-700' }
  const won = (game.result === '1-0' && game.color === 'white') || (game.result === '0-1' && game.color === 'black')
  return won ? { label: 'Gain', color: 'bg-emerald-600' } : { label: 'Perte', color: 'bg-rose-600' }
}

export default function GamesPanel({
  games,
  nodeId,
  nodeStats,
  usernames,
  onUsernameChange,
  onImport,
  onSelectGame,
  onClear,
}: Props) {
  const [platform, setPlatform] = useState<Platform>('lichess')
  const [limit, setLimit] = useState(500)
  const [pgnText, setPgnText] = useState('')
  const [loading, setLoading] = useState(false)
  const [progressLabel, setProgressLabel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [scope, setScope] = useState<'branch' | 'all'>('branch')
  const fileRef = useRef<HTMLInputElement>(null)

  // Une partie appartient a la branche si ses coups commencent par ce chemin,
  // que le noeud soit theorique ou greffe hors theorie.
  const onBranch = useMemo(() => {
    if (!nodeId) return games
    return games.filter((g) => {
      const path = g.sans.join(' ')
      return path === nodeId || path.startsWith(`${nodeId} `)
    })
  }, [games, nodeId])
  const listed = scope === 'branch' ? onBranch : games

  const runImport = async (fn: () => Promise<ImportedGame[]> | ImportedGame[]) => {
    setLoading(true)
    setError(null)
    setNotice(null)
    setProgressLabel(null)
    try {
      const result = await fn()
      onImport(result)
      setNotice(`${result.length} partie(s) analysée(s) et placée(s) dans l’arbre`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import impossible')
    } finally {
      setLoading(false)
      setProgressLabel(null)
    }
  }

  const onProgress = (info: { fetched: number; label: string }) => setProgressLabel(info.label)

  const allNames = [usernames.lichess, usernames.chesscom]
  const username = usernames[platform]
  const active = PLATFORMS.find((p) => p.id === platform)!

  const handleFile = async (file: File) => {
    const text = await file.text()
    await runImport(() => parsePgn(text, allNames))
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Importer mes parties</h3>
        <div className="flex rounded-lg border border-slate-700 p-0.5">
          {PLATFORMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setPlatform(item.id)}
              className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                platform === item.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          <input
            value={username}
            onChange={(e) => onUsernameChange(platform, e.target.value)}
            placeholder={`Pseudo ${active.label}`}
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-1.5 py-1.5 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
            aria-label="Nombre de parties à importer"
          >
            {[100, 500, 2000, 5000].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <button
            onClick={() =>
              runImport(() =>
                platform === 'lichess'
                  ? fetchLichessGames(username, limit, onProgress)
                  : fetchChessComGames(username, limit, onProgress),
              )
            }
            disabled={loading || !username.trim()}
            className="shrink-0 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-40"
          >
            {loading ? '…' : 'Charger'}
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          {active.hint} L’import remonte tout l’historique jusqu’au nombre de parties choisi, et chaque partie est
          replacée automatiquement sur la branche d’ouverture jouée.
        </p>
        {progressLabel && (
          <p className="flex items-center gap-2 text-[11px] text-blue-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
            {progressLabel}
          </p>
        )}

        <div className="flex gap-1.5">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800"
          >
            Fichier PGN…
          </button>
          <button
            onClick={() => runImport(() => parsePgn(pgnText, allNames))}
            disabled={!pgnText.trim()}
            className="flex-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40"
          >
            Analyser le PGN collé
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".pgn,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
            e.target.value = ''
          }}
        />
        <textarea
          value={pgnText}
          onChange={(e) => setPgnText(e.target.value)}
          placeholder="Collez ici un PGN (une ou plusieurs parties)…"
          rows={3}
          className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 font-mono text-[11px] text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
        />
        {error && <p className="text-xs text-rose-400">{error}</p>}
        {notice && <p className="text-xs text-emerald-400">{notice}</p>}
      </section>

      {nodeStats && (
        <section className="rounded-lg border border-slate-700/70 bg-slate-900/60 p-3">
          <h4 className="text-xs font-semibold text-slate-300">Mon bilan sur cette branche</h4>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="bg-emerald-500" style={{ width: `${(nodeStats.wins / nodeStats.total) * 100}%` }} />
            <div className="bg-slate-500" style={{ width: `${(nodeStats.draws / nodeStats.total) * 100}%` }} />
            <div className="bg-rose-500" style={{ width: `${(nodeStats.losses / nodeStats.total) * 100}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            {nodeStats.total} partie(s) · <span className="text-emerald-400">{nodeStats.wins} G</span> ·{' '}
            <span className="text-slate-300">{nodeStats.draws} N</span> ·{' '}
            <span className="text-rose-400">{nodeStats.losses} P</span>
          </p>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wide text-slate-400 uppercase">Parties</h3>
          <div className="flex gap-1 text-[11px]">
            <button
              onClick={() => setScope('branch')}
              className={`rounded px-2 py-0.5 ${scope === 'branch' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
            >
              Cette branche ({onBranch.length})
            </button>
            <button
              onClick={() => setScope('all')}
              className={`rounded px-2 py-0.5 ${scope === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
            >
              Toutes ({games.length})
            </button>
          </div>
        </div>

        {nodeId && scope === 'branch' && (
          <p className="mb-1.5 truncate font-mono text-[10px] text-slate-500" title={nodeId}>
            Branche suivie : {nodeId}
          </p>
        )}

        {listed.length === 0 ? (
          <p className="text-xs text-slate-500">
            {games.length === 0
              ? 'Aucune partie importée. Vous pouvez aussi déposer un fichier .pgn directement sur la page.'
              : 'Aucune partie ne passe par cette branche.'}
          </p>
        ) : (
          <ul className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {listed.slice(0, 100).map((game) => {
              const badge = resultBadge(game)
              return (
                <li key={game.id}>
                  <button
                    onClick={() => onSelectGame(game)}
                    className="w-full rounded-lg border border-slate-700/70 bg-slate-900/50 px-2.5 py-1.5 text-left transition-colors hover:bg-slate-800"
                  >
                    <span className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${badge.color}`}>
                        {badge.label}
                      </span>
                      {game.color && (
                        <span
                          className="shrink-0 text-[11px] leading-none text-slate-300"
                          title={game.color === 'white' ? 'Vous jouiez les blancs' : 'Vous jouiez les noirs'}
                        >
                          {COLOR_MARK[game.color]} {game.color === 'white' ? 'Blancs' : 'Noirs'}
                        </span>
                      )}
                      <span className="truncate text-xs text-slate-200">
                        vs {game.color === 'white' ? game.black : game.white}
                      </span>
                      {game.date && <span className="ml-auto shrink-0 text-[10px] text-slate-500">{game.date}</span>}
                    </span>
                    <span className="mt-0.5 flex items-baseline gap-1.5 text-[11px] text-slate-400">
                      <span className="truncate">
                        {game.openingEco && <span className="text-slate-500">{game.openingEco} </span>}
                        {game.openingName ?? 'Hors théorie répertoriée'}
                      </span>
                      <span className="ml-auto shrink-0 font-mono text-[10px] text-slate-600">{shortId(game)}</span>
                      <span className="shrink-0 text-[10px] text-slate-600">{SOURCE_LABEL[game.source]}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
        {games.length > 0 && (
          <button onClick={onClear} className="mt-3 text-xs text-slate-500 hover:text-red-400">
            Supprimer les parties importées
          </button>
        )}
      </section>
    </div>
  )
}
