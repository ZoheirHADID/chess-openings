import type { FaultExplanation } from './refutation'
import type { PracticalNote } from './practical'

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

export const FAULT_SYSTEM_PROMPT = `Tu es un entraîneur d'échecs pédagogue. Tu expliques en français, à un joueur de club, pourquoi le coup qu'il vient de jouer est fautif et ce qu'il fallait jouer.
Règles :
- Appuie-toi UNIQUEMENT sur les données Stockfish fournies (évaluations, meilleur coup, variantes). N'invente aucun coup ni variante qui n'y figure pas.
- Explique l'idée concrète : quelle menace, quel gain de temps, quelle faiblesse, quelle pièce mal placée.
- 4 à 6 phrases, sans liste, sans titre, sans formule de politesse. Notation algébrique française acceptée (les coups fournis sont en notation anglaise : N = cavalier, B = fou, R = tour, Q = dame, K = roi).
- Termine par une phrase « À retenir : … » avec le principe général.`

export const MOVE_SYSTEM_PROMPT = `Tu es un entraîneur d'échecs pédagogue. Tu expliques en français, à un joueur de club, l'idée du coup d'ouverture qu'il vient de jouer.
Règles :
- Appuie-toi UNIQUEMENT sur les données fournies : commentaire théorique, extrait Wikibooks, statistiques Lichess, variantes du moteur. Ne cite aucun coup ni variante qui n'y figure pas.
- Explique l'idée concrète du coup (centre, développement, pression, structure), le plan qui en découle pour les deux camps, et la ou les réponses habituelles.
- Si les statistiques révèlent un coup piégeux ou ingrat, dis-le et explique pourquoi.
- 5 à 7 phrases, sans liste, sans titre, sans formule de politesse. Les coups fournis sont en notation anglaise (N = cavalier, B = fou, R = tour, Q = dame, K = roi).
- Termine par une phrase « À retenir : … » avec le principe général.`

export const DOCS_SYSTEM_PROMPT = `Tu es un traducteur spécialisé en échecs. On te fournit un extrait en anglais de l'encyclopédie Wikibooks « Chess Opening Theory ».
Règles :
- Traduis-le et résume-le fidèlement en français, en 3 à 5 phrases, sans rien ajouter ni inventer.
- Garde les coups en notation anglaise telle quelle (N = cavalier, B = fou, R = tour, Q = dame, K = roi).
- Pas de liste, pas de titre, pas de formule de politesse.`

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

export interface MovePromptContext {
  openingName?: string
  /** Coups joues, dernier compris. */
  sans: string[]
  numbered: string
  fenAfter: string
  theoryNote?: string
  plan?: string
  points: string[]
  warnings: string[]
  /** Verdict du moteur sur le coup (« Théorie », « Bon coup »…) et son meilleur coup. */
  verdict?: { label: string; best?: string }
  /** Variantes du moteur depuis la position obtenue : « e5 (+0,2) : e5 Nf3 Nc6 … ». */
  engineLines?: { source: string; depth: number; lines: string[] }
  practical?: PracticalNote | null
  /** Extrait Wikibooks (anglais) de la position. */
  wikibooks?: string
}

/** Requete d'explication d'un coup quelconque, ancree sur toutes les sources disponibles. */
export function buildMovePrompt(ctx: MovePromptContext): string {
  const lines = [
    `Ouverture : ${ctx.openingName ?? 'inconnue'}.`,
    `Coups joués : ${ctx.sans.join(' ')}. Coup à expliquer : ${ctx.numbered}.`,
    `Position obtenue (FEN) : ${ctx.fenAfter}`,
    ctx.verdict ? `Verdict du moteur : « ${ctx.verdict.label} »${ctx.verdict.best ? ` (meilleur coup : ${ctx.verdict.best})` : ''}.` : '',
    ctx.theoryNote ? `Commentaire théorique : ${ctx.theoryNote}` : '',
    ctx.plan ? `Plan de la famille : ${ctx.plan}` : '',
    ctx.points.length ? `Motifs repérés dans la position : ${ctx.points.join(' ')}` : '',
    ctx.warnings.length ? `Concessions repérées : ${ctx.warnings.join(' ')}` : '',
    ctx.engineLines && ctx.engineLines.lines.length
      ? `Variantes du moteur (${ctx.engineLines.source}, profondeur ${ctx.engineLines.depth}) depuis la position obtenue : ${ctx.engineLines.lines.join(' | ')}`
      : '',
    ctx.practical
      ? `Statistiques Lichess : ${ctx.practical.headline}. ${ctx.practical.detail}`
      : '',
    ctx.wikibooks ? `Extrait Wikibooks (anglais) : ${ctx.wikibooks}` : '',
    'Explique l’idée de ce coup, le plan qui en découle et les réponses habituelles.',
  ]
  return lines.filter(Boolean).join('\n')
}

/** Requete de traduction / resume d'un extrait Wikibooks. */
export function buildDocsPrompt(excerpt: string, title: string): string {
  return `Article : ${title}\nExtrait : ${excerpt}\nTraduis et résume cet extrait en français.`
}

const cache = new Map<string, string>()

/** Interroge le fournisseur ; la reponse est mise en cache par requete, consigne et modele. */
export async function askAi(
  settings: AiSettings,
  prompt: string,
  signal?: AbortSignal,
  system: string = FAULT_SYSTEM_PROMPT,
): Promise<string> {
  const cacheKey = `${settings.model}|${system.length}|${prompt}`
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
        { role: 'system', content: system },
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
