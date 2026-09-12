import { useEffect, useState } from 'react'
import {
  AI_PRESETS,
  askAi,
  defaultSettings,
  loadAiSettings,
  needsKey,
  saveAiSettings,
  type AiProvider,
  type AiSettings,
} from '../lib/aiExplain'

interface Props {
  /** Requete construite a partir des faits Stockfish. */
  prompt: string
  compact?: boolean
}

/**
 * Explication d'une faute par une IA generative gratuite (cle fournie par
 * l'utilisateur, conservee dans le navigateur). Le texte est genere a la
 * demande et mis en cache pour la position.
 */
export default function AiExplain({ prompt, compact }: Props) {
  const [settings, setSettings] = useState<AiSettings>(loadAiSettings)
  const [configOpen, setConfigOpen] = useState(false)
  const [text, setText] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setText(null)
    setError(null)
  }, [prompt])

  const configured = !needsKey(settings.provider) || settings.apiKey.trim().length > 0
  const preset = AI_PRESETS[settings.provider]
  const small = compact ? 'text-[10px]' : 'text-[11px]'

  const run = async () => {
    if (!configured) {
      setConfigOpen(true)
      return
    }
    setLoading(true)
    setError(null)
    try {
      setText(await askAi(settings, prompt))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de la requête')
    } finally {
      setLoading(false)
    }
  }

  const update = (patch: Partial<AiSettings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveAiSettings(next)
  }
  const changeProvider = (provider: AiProvider) => {
    const next = { ...defaultSettings(provider), apiKey: settings.provider === provider ? settings.apiKey : '' }
    setSettings(next)
    saveAiSettings(next)
  }

  return (
    <section className={`rounded-lg border border-indigo-800/60 bg-indigo-950/20 ${compact ? 'p-2' : 'p-2.5'}`}>
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => void run()}
          disabled={loading}
          className={`rounded-md border border-indigo-600/70 px-2 py-1 font-medium text-indigo-100 hover:bg-indigo-900/40 disabled:opacity-50 ${small}`}
          title={configured ? `Demander une explication à ${preset.label}` : 'Configurer un fournisseur d’IA gratuit'}
        >
          {loading ? '✨ Analyse en cours…' : text ? '✨ Regénérer' : '✨ Expliquer avec l’IA'}
        </button>
        <button
          onClick={() => setConfigOpen((open) => !open)}
          className={`rounded-md px-1.5 py-1 text-indigo-300 hover:text-white ${small}`}
          title="Fournisseur d’IA et clé"
          aria-expanded={configOpen}
        >
          ⚙ {configured ? preset.label : 'Configurer'}
        </button>
      </div>

      {configOpen && (
        <div className={`mt-2 space-y-1.5 ${small}`}>
          <label className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-indigo-300">Fournisseur</span>
            <select
              value={settings.provider}
              onChange={(e) => changeProvider(e.target.value as AiProvider)}
              className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 text-slate-200"
            >
              {(Object.keys(AI_PRESETS) as AiProvider[]).map((id) => (
                <option key={id} value={id}>
                  {AI_PRESETS[id].label}
                </option>
              ))}
            </select>
          </label>
          {needsKey(settings.provider) && (
            <label className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-indigo-300">Clé API</span>
              <input
                type="password"
                value={settings.apiKey}
                onChange={(e) => update({ apiKey: e.target.value })}
                placeholder="Collez votre clé"
                autoComplete="off"
                className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 font-mono text-slate-200"
              />
            </label>
          )}
          <label className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-indigo-300">Modèle</span>
            <input
              value={settings.model}
              onChange={(e) => update({ model: e.target.value })}
              className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 font-mono text-slate-200"
            />
          </label>
          {settings.provider === 'custom' && (
            <label className="flex items-center gap-2">
              <span className="w-20 shrink-0 text-indigo-300">Adresse</span>
              <input
                value={settings.baseUrl}
                onChange={(e) => update({ baseUrl: e.target.value })}
                placeholder="https://…/v1"
                className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-900 px-1.5 py-1 font-mono text-slate-200"
              />
            </label>
          )}
          <p className="text-indigo-300/80">
            {preset.note}
            {preset.keyUrl && (
              <>
                {' '}
                <a href={preset.keyUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline">
                  Obtenir une clé ↗
                </a>
              </>
            )}{' '}
            La clé reste dans ce navigateur et n’est envoyée qu’au fournisseur choisi.
          </p>
        </div>
      )}

      {error && <p className={`mt-1.5 text-rose-300 ${small}`}>Échec : {error}</p>}

      {text && (
        <div className={`mt-2 space-y-1.5 leading-relaxed text-slate-100 ${compact ? 'text-[11px]' : 'text-xs'}`}>
          {text
            .split(/\n{2,}|\n(?=À retenir)/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean)
            .map((paragraph, index) => (
              <p key={index} className={paragraph.startsWith('À retenir') ? 'font-semibold text-indigo-200' : ''}>
                {paragraph}
              </p>
            ))}
          <p className="text-[9px] text-indigo-300/70">Généré par {settings.model} à partir des données Stockfish — à vérifier.</p>
        </div>
      )}
    </section>
  )
}
