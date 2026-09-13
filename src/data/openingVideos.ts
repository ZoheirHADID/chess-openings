import creatorVideos from './creatorVideos.json'

/**
 * Ressources video francophones par famille d'ouvertures.
 *
 * Priorite aux videos de Julien Song et Marc Quenehen quand ils ont traite
 * l'ouverture (CREATOR_VIDEOS, genere par scripts/build-videos.mjs a partir
 * des listes de leurs chaines), puis FAMILY_VIDEOS (videos reperees a la main),
 * enfin une recherche YouTube construite avec FAMILY_FR. Les liens directs
 * peuvent vieillir : le lien de recherche reste le repli universel.
 */

export const FAMILY_FR: Record<string, string> = {
  // 1.e4
  "King's Pawn Game": 'ouverture du pion roi',
  'Italian Game': 'partie italienne',
  'Ruy Lopez': 'ouverture espagnole Ruy Lopez',
  'Scotch Game': 'partie écossaise',
  'Four Knights Game': 'partie des quatre cavaliers',
  'Three Knights Opening': 'partie des trois cavaliers',
  'Vienna Game': 'partie viennoise',
  "Bishop's Opening": 'ouverture du fou',
  "King's Gambit": 'gambit du roi',
  "King's Gambit Accepted": 'gambit du roi accepté',
  "King's Gambit Declined": 'gambit du roi refusé',
  'Center Game': 'partie du centre',
  'Danish Gambit': 'gambit danois',
  'Ponziani Opening': 'ouverture Ponziani',
  'Petrov Defense': 'défense russe Petrov',
  "Petrov's Defense": 'défense russe Petrov',
  'Indian Defense': 'défense indienne',
  'Grünfeld Defense': 'défense Grünfeld',
  'Neo-Grünfeld Defense': 'défense néo-Grünfeld',
  'Réti Opening': 'ouverture Réti',
  "King's Indian Attack": 'attaque est-indienne',
  'Tarrasch Defense': 'défense Tarrasch',
  'Rapport-Jobava System': 'système Jobava Londres',
  'Blackmar-Diemer Gambit': 'gambit Blackmar-Diemer',
  'Englund Gambit': 'gambit Englund',
  'Latvian Gambit': 'gambit letton',
  'Elephant Gambit': 'gambit éléphant',
  'Hippopotamus Defense': 'défense hippopotame',
  'Pterodactyl Defense': 'défense ptérodactyle',
  'Van Geet Opening': 'ouverture Van Geet',
  'Richter-Veresov Attack': 'attaque Veresov',
  'Russian Game': 'défense russe Petrov',
  'Philidor Defense': 'défense Philidor',
  'Sicilian Defense': 'défense sicilienne',
  'French Defense': 'défense française',
  'Caro-Kann Defense': 'défense Caro-Kann',
  'Scandinavian Defense': 'défense scandinave',
  'Alekhine Defense': 'défense Alekhine',
  'Pirc Defense': 'défense Pirc',
  'Modern Defense': 'défense moderne',
  'Owen Defense': 'défense Owen',
  'St. George Defense': 'défense Saint-Georges',
  'Nimzowitsch Defense': 'défense Nimzowitsch',
  'Alapin Opening': 'ouverture Alapin',

  // 1.d4
  "Queen's Pawn Game": 'ouverture du pion dame',
  "Queen's Gambit": 'gambit dame',
  "Queen's Gambit Declined": 'gambit dame refusé',
  "Queen's Gambit Accepted": 'gambit dame accepté',
  'Slav Defense': 'défense slave',
  'Semi-Slav Defense': 'défense semi-slave',
  'London System': 'système de Londres',
  'Colle System': 'système Colle',
  'Torre Attack': 'attaque Torre',
  'Trompowsky Attack': 'attaque Trompowsky',
  'Nimzo-Indian Defense': 'défense nimzo-indienne',
  "King's Indian Defense": 'défense est-indienne',
  'Grunfeld Defense': 'défense Grünfeld',
  "Queen's Indian Defense": 'défense ouest-indienne',
  'Bogo-Indian Defense': 'défense Bogo-indienne',
  'Benoni Defense': 'défense Benoni',
  'Benko Gambit': 'gambit Benko',
  'Catalan Opening': 'ouverture catalane',
  'Dutch Defense': 'défense hollandaise',
  'Budapest Defense': 'gambit de Budapest',
  'Old Indian Defense': 'ancienne indienne',
  'Indian Game': 'défense indienne',

  // Flanc
  'English Opening': 'ouverture anglaise',
  'Reti Opening': 'ouverture Réti',
  'Zukertort Opening': 'ouverture Zukertort Réti',
  'Bird Opening': "ouverture Bird",
  'Nimzo-Larsen Attack': 'attaque Nimzo-Larsen',
  'Hungarian Opening': 'ouverture hongroise',
  "Van't Kruijs Opening": "ouverture Van't Kruijs",
  'Anderssen Opening': 'ouverture Anderssen',
  'Polish Opening': 'ouverture polonaise Orang-outan',
  'Grob Opening': 'ouverture Grob',
}

export interface OpeningVideo {
  url: string
  title: string
}

/**
 * Videos francophones reperees pour les familles les plus jouees.
 * Selection etablie par recherche YouTube ; a completer au fil du temps.
 */
export const FAMILY_VIDEOS: Record<string, OpeningVideo> = {
  'Caro-Kann Defense': {
    url: 'https://www.youtube.com/watch?v=jga9ukGdM1w',
    title: 'La Caro-Kann : simple, solide et parfaite pour débuter',
  },
  'Italian Game': {
    url: 'https://www.youtube.com/watch?v=gfxAZIX8hC4',
    title: "Devenez un pro de l'ouverture italienne",
  },
  'Scotch Game': {
    url: 'https://www.youtube.com/watch?v=Zj3SeQiiibo',
    title: "Apprendre facilement l'ouverture écossaise en 30 minutes",
  },
  'Sicilian Defense': {
    url: 'https://www.youtube.com/watch?v=-XGxa9BXlw4',
    title: 'Introduction à la défense sicilienne et ses variantes',
  },
  'French Defense': {
    url: 'https://www.youtube.com/watch?v=sIQjKy-Y4jg',
    title: 'Un répertoire complet sur la française en 10 minutes',
  },
  'Ruy Lopez': {
    url: 'https://www.youtube.com/watch?v=PQozh6fMCLI',
    title: "L'ouverture espagnole (Ruy Lopez) : idées, principes et variantes",
  },
  'Philidor Defense': {
    url: 'https://www.youtube.com/watch?v=tlNZ9Eurb3k',
    title: 'La défense Philidor expliquée',
  },
  'London System': {
    url: 'https://www.youtube.com/watch?v=EDuF9Jqyyyg',
    title: 'Le système de Londres pour débutants',
  },
}

export interface VideoLink {
  url: string
  /** Titre de la video quand elle est identifiee, sinon libelle de recherche. */
  label: string
  /** Vrai si le lien pointe vers une video precise, faux si c'est une recherche. */
  direct: boolean
  /** Chaine YouTube quand la video vient d'un createur suivi. */
  channel?: string
}

export interface CreatorVideo {
  id: string
  title: string
  channel: string
  /** Duree en secondes. */
  duration: number
  views: number
  score: number
  url: string
  /** Vrai si la video vise precisement la variante (et pas seulement la famille). */
  specific: boolean
}

interface CreatorEntry {
  families: string[]
  name?: string
  videos: { id: string; title: string; channel: string; duration: number; views: number; score: number }[]
}

const CREATOR_ENTRIES = (creatorVideos as { entries: CreatorEntry[] }).entries
export const CREATOR_CHANNELS = (creatorVideos as { channels: { name: string; handle: string }[] }).channels

/**
 * Videos de Julien Song et Marc Quenehen pour une ouverture : celles qui
 * visent la variante exacte d'abord, puis celles de la famille, sans doublon,
 * classees par pertinence (cours avant parties commentees, puis audience).
 */
export function videosFor(family: string | undefined, name: string | undefined, limit = 6): CreatorVideo[] {
  if (!family) return []
  const seen = new Set<string>()
  const out: CreatorVideo[] = []
  const applicable = CREATOR_ENTRIES.filter(
    (entry) => entry.families.includes(family) && (entry.name === undefined || (!!name && new RegExp(entry.name).test(name))),
  )
  // Les regles ciblant la variante passent d'abord : leurs videos gardent le badge « variante »
  applicable.sort((a, b) => Number(b.name !== undefined) - Number(a.name !== undefined))
  for (const entry of applicable) {
    const specific = entry.name !== undefined
    for (const video of entry.videos) {
      if (seen.has(video.id)) continue
      seen.add(video.id)
      out.push({ ...video, url: `https://www.youtube.com/watch?v=${video.id}`, specific })
    }
  }
  return out.sort((a, b) => Number(b.specific) - Number(a.specific) || b.score - a.score).slice(0, limit)
}

/**
 * Lien video pour une ouverture : video de Julien Song ou Marc Quenehen si l'un
 * d'eux a traite le sujet, sinon video reperee, sinon recherche YouTube en francais.
 */
export function videoLinkFor(family: string | undefined, name: string | undefined): VideoLink | null {
  if (!family && !name) return null

  const [creator] = videosFor(family, name, 1)
  if (creator) return { url: creator.url, label: creator.title, direct: true, channel: creator.channel }

  const known = family ? FAMILY_VIDEOS[family] : undefined
  if (known) return { url: known.url, label: known.title, direct: true }

  const french = (family && FAMILY_FR[family]) ?? family ?? name ?? ''
  const query = `${french} échecs ouverture`
  return {
    url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
    label: `Chercher « ${french} » sur YouTube`,
    direct: false,
  }
}
