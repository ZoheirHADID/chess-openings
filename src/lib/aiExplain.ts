import type { FaultExplanation } from './refutation'

/**
 * Explication d'une faute par une IA generative, via une API compatible
 * OpenAI (chat/completions). Fournisseurs gratuits proposes : Gemini (Google
 * AI Studio), Groq, OpenRouter (modeles « :free ») ou Ollama en local. La cle
 * reste dans le navigateur (localStorage) et n'est envoyee qu'au fournisseur.
 */
export type AiProvider = 'gemini' | 'groq' | 'openrouter' | 'ollama' | 'custom'

export interface AiSettings {
  provider: AiProvider
  baseUrl: string
  apiKey: string
  model: string
}

export interface AiPreset {
  label: string
  baseUrl: string
  model: string
  /** Ou obtenir une cle. */
  keyUrl?: string
  note: string
}

export const AI_PRESETS: Record<AiProvider, AiPreset> = {
  gemini: {
    label: 'Google Gemini (gratuit)',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: 'gemini-2.5-flash',
    keyUrl: 'https://aistudio.google.com/apikey',
    note: 'Clé gratuite sur Google AI Studio, quota journalier.',
  },
  groq: {
    label: 'Groq (gratuit)',
    baseUrl: 'https://api.groq.com/openai/v1',
    model: 'llama-3.3-70b-versatile',
    keyUrl: 'https://console.groq.com/keys',
    note: 'Clé gratuite, réponses très rapides.',
  },
  openrouter: {
    label: 'OpenRouter (modèles :free)',
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'meta-llama/llama-3.3-70b-instruct:free',
    keyUrl: 'https://openrouter.ai/keys',
    note: 'Clé gratuite ; choisir un modèle suffixé « :free ».',
  },
  ollama: {
    label: 'Ollama (local)',
    baseUrl: 'http://localhost:11434/v1',
    model: 'llama3.1',
    note: 'Sans clé. Lancer Ollama avec OLLAMA_ORIGINS=* pour autoriser le navigateur.',
  },
  custom: {
    label: 'Autre (compatible OpenAI)',
    baseUrl: '',
    model: '',
    note: 'Toute API exposant /chat/completions.',
  },
}

const KEY = 'chess-openings:ai:v1'

export function loadAiSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...defaultSettings('gemini'), ...(JSON.parse(raw) as Partial<AiSettings>) }
  } catch {
    /* reglages illisibles */
  }
  return defaultSettings('gemini')
}

export function saveAiSettings(settings: AiSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings))
  } catch {
    /* stockage indisponible */
  }
}

export function defaultSettings(provider: AiProvider): AiSettings {
  const preset = AI_PRESETS[provider]
  return { provider, baseUrl: preset.baseUrl, apiKey: '', model: preset.model }
}

export const needsKey = (provider: AiProvider) => provider !== 'ollama'

const SYSTEM_PROMPT = `Tu es un entraîneur d'échecs pédagogue. Tu expliques en français, à un joueur de club, pourquoi le coup qu'il vient de jouer est fautif et ce qu'il fallait jouer.
Règles :
- Appuie-toi UNIQUEMENT sur les données Stockfish fournies (évaluations, meilleur coup, variantes). N'invente aucun coup ni variante qui n'y figure pas.
- Explique l'idée concrète : quelle menace, quel gain de temps, quelle faiblesse, quelle pièce mal placée.
- 4 à 6 phrases, sans liste, sans titre, sans formule de politesse. Notation algébrique française acceptée (les coups fournis sont en notation anglaise : N = cavalier, B = fou, R = tour, Q = dame, K = roi).
- Termine par une phrase « À retenir : … » avec le principe général.`

export interface FaultPromptContext {
  fault: FaultExplanation
  /** Coups de la partie jusqu'au coup fautif, en SAN. */
  sans: string[]
  playedSan: string
  fenBefore: string
  fenAfter: string
  openingName?: string
  qualityLabel: string
}

/** Construit la requete utilisateur a partir des faits calcules par le moteur. */
export function buildFaultPrompt(ctx: FaultPromptContext): string {
  const lines = [
    `Ouverture : ${ctx.openingName ?? 'inconnue'}.`,
    `Coups joués : ${ctx.sans.join(' ') || '(position initiale)'}.`,
    `Position avant le coup (FEN) : ${ctx.fenBefore}`,
    `Coup joué : ${ctx.playedSan} — classé « ${ctx.qualityLabel} » par Stockfish.`,
    ctx.fault.swing ? `Évaluation : ${ctx.fault.swing}` : '',
    ctx.fault.better
      ? `Meilleur coup selon Stockfish : ${ctx.fault.better.san}, variante ${ctx.fault.better.line}.${
          ctx.fault.better.reasons.length ? ` Idées repérées : ${ctx.fault.better.reasons.join(' ')}` : ''
        }`
      : '',
    ctx.fault.punishment
      ? `Meilleure réponse adverse après le coup joué : ${ctx.fault.punishment.line}. Conséquences repérées : ${ctx.fault.punishment.points.join(' ')}`
      : '',
    ctx.fault.concedes.length ? `Faits constatés dans la position : ${ctx.fault.concedes.join(' ')}` : '',
    `Position après le coup (FEN) : ${ctx.fenAfter}`,
    'Explique pourquoi ce coup est fautif et ce qu’il fallait jouer.',
  ]
  return lines.filter(Boolean).join('\n')
}

const cache = new Map<string, string>()

/** Interroge le fournisseur ; la reponse est mise en cache par requete et modele. */
export async function askAi(settings: AiSettings, prompt: string, signal?: AbortSignal): Promise<string> {
  const cacheKey = `${settings.model}|${prompt}`
  const cached = cache.get(cacheKey)
  if (cached) return cached

  const base = settings.baseUrl.replace(/\/+$/, '')
  if (!base) throw new Error('Adresse de l’API manquante.')
  if (needsKey(settings.provider) && !settings.apiKey.trim()) throw new Error('Clé API manquante.')

  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (settings.apiKey.trim()) headers.Authorization = `Bearer ${settings.apiKey.trim()}`
  if (settings.provider === 'openrouter') headers['X-Title'] = 'Arbre des ouvertures'

  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers,
    signal,
    body: JSON.stringify({
      model: settings.model,
      temperature: 0.4,
      max_tokens: 600,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
    }),
  })
  if (!response.ok) {
    let detail = ''
    try {
      const body = (await response.json()) as { error?: { message?: string } }
      detail = body.error?.message ?? ''
    } catch {
      /* pas de corps JSON */
    }
    throw new Error(`${response.status} ${response.statusText}${detail ? ` — ${detail}` : ''}`)
  }
  const data = (await response.json()) as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Réponse vide du fournisseur.')
  cache.set(cacheKey, text)
  return text
}
