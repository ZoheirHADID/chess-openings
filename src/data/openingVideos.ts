/**
 * Ressources video francophones par famille d'ouvertures.
 *
 * FAMILY_FR sert a construire une recherche YouTube pertinente pour n'importe
 * quelle ouverture ; FAMILY_VIDEOS pointe vers une video reperee pour les
 * familles les plus courantes. Les liens directs peuvent vieillir : le lien de
 * recherche reste le repli universel.
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
}

/** Lien video pour une ouverture : video reperee, sinon recherche YouTube en francais. */
export function videoLinkFor(family: string | undefined, name: string | undefined): VideoLink | null {
  if (!family && !name) return null

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
