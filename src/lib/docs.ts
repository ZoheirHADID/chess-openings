import { useEffect, useState } from 'react'
import { wikibooksUrl } from '../data/openingIdeas'

/**
 * Sources documentaires libres, interrogees a la volee :
 * - Wikibooks « Chess Opening Theory » (en, CC BY-SA) : un article par ligne,
 *   avec l'idee du coup, les plans et les reponses usuelles ;
 * - Wikipédia en français : article de l'ouverture (histoire, idees, variantes).
 * Les deux API MediaWiki acceptent les requetes du navigateur (origin=*).
 */
export interface DocExcerpt {
  title: string
  text: string
  url: string
  /** Langue du texte. */
  lang: 'en' | 'fr'
  license: string
  thumbnail?: string
}

const STORE_KEY = 'chess-openings:docs:v2'
const MAX_ENTRIES = 400
const MAX_CHARS = 1400
const WIKIBOOKS_API = 'https://en.wikibooks.org/w/api.php'
const WIKIPEDIA_API = 'https://fr.wikipedia.org/w/api.php'
const WIKIPEDIA_SUMMARY = 'https://fr.wikipedia.org/api/rest_v1/page/summary/'

const memory = new Map<string, DocExcerpt | null>()
const pending = new Map<string, Promise<DocExcerpt | null>>()
let loaded = false

function load() {
  if (loaded) return
  loaded = true
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (!raw) return
    for (const [key, value] of Object.entries(JSON.parse(raw) as Record<string, DocExcerpt | null>)) {
      memory.set(key, value)
    }
  } catch {
    /* cache illisible */
  }
}

function persist() {
  try {
    const entries = [...memory.entries()].slice(-MAX_ENTRIES)
    localStorage.setItem(STORE_KEY, JSON.stringify(Object.fromEntries(entries)))
  } catch {
    /* quota depasse : le cache reste en memoire */
  }
}

/** Supprime les modeles {{…}} imbriques. */
function stripTemplates(text: string): string {
  let out = ''
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    if (text.startsWith('{{', i)) {
      depth++
      i++
      continue
    }
    if (text.startsWith('}}', i) && depth > 0) {
      depth--
      i++
      continue
    }
    if (depth === 0) out += text[i]
  }
  return out
}

/** Wikitexte -> texte brut lisible : liens, gras, references, tableaux, titres. */
export function cleanWikitext(wikitext: string): string {
  let text = stripTemplates(wikitext)
  text = text.replace(/\{\|[\s\S]*?\|\}/g, ' ')
  text = text.replace(/<ref[^>]*\/>/gi, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, '')
  text = text.replace(/<!--[\s\S]*?-->/g, '')
  text = text.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
  text = text.replace(/^=+\s*.*?\s*=+\s*$/gm, '')
  text = text.replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, (_m, label: string) =>
    label.replace(/^(\.\.\/|\/)+/, '').replace(/\/$/, ''),
  )
  text = text.replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1').replace(/\[https?:\/\/\S+\]/g, '')
  text = text.replace(/'''''|'''|''/g, '')
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8230;/g, '…')
  text = text.replace(/^[*#]+\s*/gm, '• ').replace(/^:+\s*/gm, '')

  const paragraphs = text
    .split(/\n\s*\n|\n(?=• )/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length >= 12 && !/^(when contributing|references|theory table)/i.test(p))

  let out = ''
  for (const paragraph of paragraphs) {
    if (out.length + paragraph.length > MAX_CHARS) {
      if (!out) out = `${paragraph.slice(0, MAX_CHARS)}…`
      break
    }
    out += (out ? '\n\n' : '') + paragraph
  }
  return out
}

/** Titre de la page Wikibooks d'une ligne (« Chess Opening Theory/1. e4/1...e5 »). */
export function wikibooksTitle(sans: string[]): string {
  return decodeURIComponent(wikibooksUrl(sans).replace('https://en.wikibooks.org/wiki/', '')).replace(/_/g, ' ')
}

function remember(key: string, task: () => Promise<DocExcerpt | null>): Promise<DocExcerpt | null> {
  load()
  const cached = memory.get(key)
  if (cached !== undefined) return Promise.resolve(cached)
  const inFlight = pending.get(key)
  if (inFlight) return inFlight
  const request = task()
    .then((result) => {
      memory.set(key, result)
      persist()
      return result
    })
    .catch(() => null as DocExcerpt | null)
    .finally(() => pending.delete(key))
  pending.set(key, request)
  return request
}

/** Article Wikibooks de la ligne courante ; `null` si la page n'existe pas. */
export function fetchWikibooks(sans: string[]): Promise<DocExcerpt | null> {
  const title = wikibooksTitle(sans)
  return remember(`wb:${title}`, async () => {
    const params = new URLSearchParams({
      action: 'parse',
      page: title,
      prop: 'wikitext',
      format: 'json',
      formatversion: '2',
      origin: '*',
    })
    const res = await fetch(`${WIKIBOOKS_API}?${params}`)
    if (!res.ok) throw new Error(`wikibooks ${res.status}`)
    const json = (await res.json()) as { parse?: { title: string; wikitext: string }; error?: unknown }
    if (!json.parse) return null
    const text = cleanWikitext(json.parse.wikitext)
    if (!text) return null
    return { title: json.parse.title, text, url: wikibooksUrl(sans), lang: 'en', license: 'CC BY-SA' }
  })
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Article Wikipédia (fr) de l'ouverture, retrouve par son nom francais. */
export function fetchWikipedia(name: string): Promise<DocExcerpt | null> {
  return remember(`wp:${name}`, async () => {
    const search = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: `${name} échecs ouverture`,
      srlimit: '5',
      format: 'json',
      origin: '*',
    })
    const res = await fetch(`${WIKIPEDIA_API}?${search}`)
    if (!res.ok) throw new Error(`wikipedia ${res.status}`)
    const json = (await res.json()) as { query?: { search: { title: string }[] } }
    const hits = json.query?.search ?? []
    if (hits.length === 0) return null
    // Le titre doit reprendre un mot significatif du nom (« sicilienne », « espagnole »…)
    const words = fold(name)
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 5)
    const hit = hits.find((h) => words.some((w) => fold(h.title).includes(w))) ?? hits[0]
    if (!words.some((w) => fold(hit.title).includes(w))) return null

    const summary = await fetch(`${WIKIPEDIA_SUMMARY}${encodeURIComponent(hit.title)}`)
    if (!summary.ok) return null
    const page = (await summary.json()) as {
      title: string
      extract?: string
      content_urls?: { desktop?: { page?: string } }
      thumbnail?: { source?: string }
    }
    if (!page.extract) return null
    return {
      title: page.title,
      text: page.extract.length > MAX_CHARS ? `${page.extract.slice(0, MAX_CHARS)}…` : page.extract,
      url: page.content_urls?.desktop?.page ?? `https://fr.wikipedia.org/wiki/${encodeURIComponent(hit.title)}`,
      lang: 'fr',
      license: 'CC BY-SA',
      thumbnail: page.thumbnail?.source,
    }
  })
}

export interface Docs {
  /** `undefined` = en cours, `null` = pas d'article. */
  wikibooks?: DocExcerpt | null
  wikipedia?: DocExcerpt | null
}

/**
 * Sources documentaires de la ligne courante : Wikibooks pour la position
 * exacte, Wikipédia pour la famille d'ouverture (nom francais).
 */
export function useDocs(sans: string[], familyName: string | undefined): Docs {
  const path = sans.join(' ')
  const [wikibooks, setWikibooks] = useState<DocExcerpt | null | undefined>(undefined)
  const [wikipedia, setWikipedia] = useState<DocExcerpt | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    setWikibooks(undefined)
    const timer = setTimeout(() => {
      void fetchWikibooks(path ? path.split(' ') : []).then((doc) => active && setWikibooks(doc))
    }, 350)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [path])

  useEffect(() => {
    let active = true
    if (!familyName) {
      setWikipedia(null)
      return
    }
    setWikipedia(undefined)
    void fetchWikipedia(familyName).then((doc) => active && setWikipedia(doc))
    return () => {
      active = false
    }
  }, [familyName])

  return { wikibooks, wikipedia }
}
