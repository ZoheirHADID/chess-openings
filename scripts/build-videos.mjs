#!/usr/bin/env node
/**
 * Associe les videos YouTube de Julien Song et Marc Quenehen aux familles
 * (et variantes) d'ouvertures du referentiel Lichess.
 *
 * Entree : data/raw/videos-<chaine>.txt, une video par ligne au format
 *   id ||| titre ||| duree_s ||| vues
 * produit par :
 *   python -m yt_dlp --flat-playlist --extractor-args "youtube:lang=fr" \
 *     --print "%(id)s ||| %(title)s ||| %(duration)s ||| %(view_count)s" \
 *     https://www.youtube.com/@JulienSong/videos > data/raw/videos-juliensong.txt
 * Sortie : src/data/creatorVideos.json
 *
 * Usage : node scripts/build-videos.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'src', 'data', 'creatorVideos.json')

const CHANNELS = [
  { id: 'juliensong', name: 'Julien Song', handle: '@JulienSong', file: 'videos-juliensong.txt' },
  { id: 'marcquenehen', name: 'Marc Quenehen', handle: '@MarcQuenehen', file: 'videos-marcquenehen.txt' },
]

const fold = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’‘`]/g, "'")

/**
 * Regles d'association. `families` : familles Lichess concernees ; `name` :
 * regex optionnelle sur le nom complet de la variante (la regle ne vaut alors
 * que pour ces variantes) ; `title` : regex sur le titre normalise ; `exclude` :
 * regex qui ecarte un titre (homonymes : joueurs, villes, federation…).
 */
const RULES = [
  // 1.e4 e5
  { families: ['Italian Game'], title: /italien|giuoco/ },
  { families: ['Italian Game'], name: /Evans/, title: /gambit evans|evans/ },
  { families: ['Italian Game'], name: /Two Knights|Traxler|Fried Liver/, title: /deux cavaliers|two knights|fried liver|traxler/ },
  { families: ['Italian Game'], name: /Rousseau|Blackburne/, title: /rousseau|blackburne/, exclude: /mort noire/ },
  { families: ['Ruy Lopez'], title: /espagnol|ruy lopez/, exclude: /gm espagnol|grand ma[iî]tre espagnol|pretre espagnol/ },
  { families: ['Ruy Lopez'], name: /Marshall/, title: /marshall/ },
  { families: ['Ruy Lopez'], name: /Berlin/, title: /berlin/ },
  { families: ['Scotch Game'], title: /ecossais/ },
  { families: ['Four Knights Game', 'Three Knights Opening'], title: /quatre cavaliers|4 cavaliers|trois cavaliers|halloween/ },
  { families: ['Four Knights Game'], name: /Halloween/, title: /halloween/ },
  { families: ['Vienna Game', 'Vienna Gambit, with Max Lange Defense'], title: /viennois|gambit de vienne/ },
  { families: ["Bishop's Opening"], title: /ouverture du fou/ },
  { families: ["King's Gambit", "King's Gambit Accepted", "King's Gambit Declined"], title: /gambit (du )?roi/ },
  { families: ['Center Game', 'Center Game Accepted'], title: /partie du centre/ },
  { families: ['Danish Gambit', 'Danish Gambit Accepted', 'Danish Gambit Declined', 'Center Game'], title: /danois/ },
  { families: ['Ponziani Opening'], title: /ponziani/ },
  { families: ["Petrov's Defense"], title: /petrov|defense russe/ },
  { families: ['Philidor Defense'], title: /philidor/ },
  { families: ['Elephant Gambit'], title: /elephant/ },
  { families: ['Latvian Gambit', 'Latvian Gambit Accepted'], title: /letton/ },
  // 1.e4 autres
  {
    families: ['Sicilian Defense'],
    title: /sicilien|sicilian|najdorf|sveshnikov|dragon|alapin|morra|rossolimo|taimanov|scheveningen|maroczy/,
    exclude: /dent du dragon|tueurs de dragons|dragon roti/,
  },
  { families: ['Sicilian Defense'], name: /Najdorf/, title: /najdorf/ },
  { families: ['Sicilian Defense'], name: /Dragon/, title: /dragon/, exclude: /dent du dragon|tueurs de dragons|dragon roti/ },
  { families: ['Sicilian Defense'], name: /Accelerated Dragon/, title: /dragon accel/ },
  { families: ['Sicilian Defense'], name: /Sveshnikov|Lasker-Pelikan/, title: /sveshnikov/ },
  { families: ['Sicilian Defense'], name: /Alapin/, title: /alapin/ },
  { families: ['Sicilian Defense'], name: /Smith-Morra/, title: /morra/ },
  { families: ['Sicilian Defense'], name: /Rossolimo|Nyezhmetdinov-Rossolimo/, title: /rossolimo/ },
  { families: ['Sicilian Defense'], name: /Taimanov/, title: /taimanov/ },
  { families: ['Sicilian Defense'], name: /Maroczy/, title: /maroczy/ },
  { families: ['Sicilian Defense'], name: /Grand Prix/, title: /grand prix/ },
  {
    families: ['French Defense'],
    title: /defense francaise|la francaise\b|(contre|de|dans|sur|vs|anti-?) ?la francaise|anti-francaise|joueurs de francaise/,
    exclude: /federation|numero 1|cette francaise|francaises|championnat/,
  },
  { families: ['French Defense'], name: /Advance/, title: /variante d'avance|avance de la (defense )?francaise/ },
  { families: ['French Defense'], name: /Winawer/, title: /winawer/ },
  { families: ['Caro-Kann Defense'], title: /caro[- ]?kann/ },
  { families: ['Caro-Kann Defense'], name: /Fantasy|Maroczy/, title: /fantasy/ },
  { families: ['Scandinavian Defense'], title: /scandinav/ },
  { families: ['Alekhine Defense'], title: /alekhine/, exclude: /chevauchee|alekhine (vs|contre|bat)/ },
  { families: ['Pirc Defense'], title: /pirc/ },
  { families: ['Modern Defense', 'Pterodactyl Defense'], title: /defense moderne/ },
  { families: ['Nimzowitsch Defense'], title: /defense nimzowitsch/ },
  { families: ['Owen Defense'], title: /owen/ },
  { families: ['St. George Defense'], title: /saint[- ]georges|st[- ]georges/ },
  { families: ['Hippopotamus Defense', 'Modern Defense'], title: /hippo/ },
  { families: ['Lion Defense', 'Philidor Defense'], title: /black lion|lion system|defense (du )?lion/ },
  // 1.d4
  {
    families: ["Queen's Gambit", "Queen's Gambit Declined", "Queen's Gambit Accepted", 'Tarrasch Defense', 'Slav Defense', 'Semi-Slav Defense'],
    title: /gambit (de la )?dame|queen'?s gambit/,
  },
  { families: ["Queen's Gambit Accepted"], title: /gambit dame accept/ },
  { families: ["Queen's Gambit Declined"], name: /Albin/, title: /albin/ },
  { families: ['Slav Defense', 'Semi-Slav Defense', 'Slav Indian'], title: /\bslave\b/ },
  { families: ['Semi-Slav Defense', 'Semi-Slav Defense Accepted'], title: /semi[- ]slave/ },
  { families: ['Tarrasch Defense'], title: /tarrasch/, exclude: /panache|coup de genie/ },
  {
    families: ['London System', 'London System, with Be2', 'London System, with Bd3'],
    title: /londres|london/,
  },
  { families: ["Queen's Pawn Game", 'Indian Defense'], name: /London/, title: /londres|london/ },
  { families: ['Rapport-Jobava System', 'Rapport-Jobava System, with e6'], title: /jobava/ },
  { families: ["Queen's Pawn Game"], name: /Jobava|Rapport/, title: /jobava/ },
  { families: ['Colle System'], title: /\bcolle\b/, exclude: /colle serre/ },
  { families: ["Queen's Pawn Game"], name: /Colle|Zukertort/, title: /\bcolle\b/, exclude: /colle serre/ },
  { families: ['Torre Attack'], title: /\btorre\b/ },
  { families: ['Trompowsky Attack'], title: /trompowsky/ },
  { families: ['Richter-Veresov Attack'], title: /veresov/ },
  { families: ['Blackmar-Diemer Gambit', 'Blackmar-Diemer Gambit Accepted', 'Blackmar-Diemer Gambit Declined'], title: /blackmar/ },
  { families: ['Englund Gambit', 'Englund Gambit Declined'], title: /englund/ },
  { families: ['Budapest Defense'], title: /gambit budapest|budapest gambit/ },
  { families: ['Nimzo-Indian Defense'], title: /nimzo[- ]?indienne/ },
  { families: ["King's Indian Defense"], title: /(defense )?est[- ]indienne/, exclude: /attaque est/ },
  { families: ["King's Indian Attack", "King's Indian Attack, with Bf5", "King's Indian Attack, with e6"], title: /attaque est[- ]indienne/ },
  { families: ["Queen's Indian Defense", "Queen's Indian Defense, with e3"], title: /ouest[- ]indienne/ },
  { families: ['Bogo-Indian Defense'], title: /bogo/ },
  { families: ['Grünfeld Defense', 'Neo-Grünfeld Defense'], title: /gr[uü]nfeld/, exclude: /invers/ },
  { families: ['Benoni Defense'], title: /benoni/ },
  { families: ['Benko Gambit', 'Benko Gambit Accepted', 'Benko Gambit Declined'], title: /benko|volga/ },
  { families: ['Catalan Opening'], title: /catalan/ },
  { families: ['Dutch Defense'], title: /hollandais|stonewall|leningrad/ },
  { families: ['Dutch Defense'], name: /Stonewall/, title: /stonewall/ },
  { families: ['Old Indian Defense'], title: /ancienne indienne/ },
  { families: ['Indian Defense'], title: /defense indienne/ },
  // Flanc
  { families: ['English Opening'], title: /\banglaise\b/ },
  { families: ['Réti Opening', 'Zukertort Opening'], title: /\breti\b/ },
  { families: ['Bird Opening'], title: /\bbird\b/ },
  { families: ['Nimzo-Larsen Attack'], title: /larsen/ },
  { families: ['Polish Opening', 'Polish Opening, with d5', 'English Orangutan'], title: /orang|polonaise|sokolsky/ },
  { families: ['Grob Opening'], title: /\bgrob\b|g4 au 1er coup/ },
  { families: ['Hungarian Opening'], title: /hongrois/ },
  { families: ['Van Geet Opening'], title: /van geet|dunst/ },
  { families: ["Van't Kruijs Opening"], title: /kruijs/ },
  { families: ['Sodium Attack'], title: /durkin|sodium/ },
  { families: ['Bongcloud Attack'], title: /bongcloud/ },
  { families: ['Kádas Opening'], title: /kadas/ },
  { families: ['Mieses Opening'], title: /mieses/ },
]

/** Marqueurs d'une video de cours (plutot qu'une simple partie commentee). */
const LESSON = /pedagogique|repertoire|le plan|plan a connaitre|comment|apprendre|progressez|maitrise|secrets|expliqu|principe|guide|battre|contrer|riposter|arme|refutation|piege|variante|systeme|introduction|en \d+ ?min/
/** Marqueurs d'une partie de tournoi ou d'un simple recit. */
const GAME = /ronde \d|speedrun|\bvs\b|\d{3,4} elo|face a|affronte|championnat/

function loadChannel(channel) {
  const text = readFileSync(join(ROOT, 'data', 'raw', channel.file), 'utf8')
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [id, title, duration, views] = line.split(' ||| ')
      return {
        id,
        title: title.replace(/\s+/g, ' ').trim(),
        duration: Number(duration) || 0,
        views: Number(views) || 0,
        channel: channel.name,
      }
    })
    .filter((v) => v.id && v.title && v.duration >= 240) // pas de shorts
}

function score(video) {
  const t = fold(video.title)
  let s = 1
  if (LESSON.test(t)) s += 2
  if (GAME.test(t)) s -= 0.5
  if (video.duration >= 600) s += 0.5
  if (video.duration >= 1200) s += 0.5
  s += Math.log10(video.views + 1) / 4
  return s
}

function main() {
  const videos = CHANNELS.flatMap(loadChannel)
  console.log(`${videos.length} videos chargees (${CHANNELS.map((c) => c.name).join(', ')})`)

  const entries = []
  let used = new Set()
  for (const rule of RULES) {
    const matched = videos.filter((v) => {
      const t = fold(v.title)
      return rule.title.test(t) && !(rule.exclude && rule.exclude.test(t))
    })
    if (matched.length === 0) continue
    const ranked = matched
      .map((v) => ({ ...v, score: Number(score(v).toFixed(2)) }))
      .sort((a, b) => b.score - a.score || b.views - a.views)
    // Au plus 3 videos par chaine et par regle
    const perChannel = new Map()
    const kept = []
    for (const v of ranked) {
      const n = perChannel.get(v.channel) ?? 0
      if (n >= 3) continue
      perChannel.set(v.channel, n + 1)
      kept.push(v)
      used.add(v.id)
    }
    entries.push({
      families: rule.families,
      name: rule.name ? rule.name.source : undefined,
      videos: kept.map(({ id, title, channel, duration, views, score }) => ({ id, title, channel, duration, views, score })),
    })
  }

  const families = new Set(entries.flatMap((e) => e.families))
  console.log(`${entries.length} regles avec resultat, ${families.size} familles couvertes, ${used.size} videos retenues`)
  for (const entry of entries) {
    console.log(`\n${entry.families[0]}${entry.name ? ` [${entry.name}]` : ''}`)
    for (const v of entry.videos) console.log(`  ${v.score.toFixed(1)}  ${v.channel.padEnd(14)} ${v.title}`)
  }

  writeFileSync(
    OUT,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString().slice(0, 10),
        channels: CHANNELS.map(({ id, name, handle }) => ({ id, name, handle })),
        entries,
      },
      null,
      1,
    ) + '\n',
  )
  console.log(`\n-> ${OUT}`)
}

main()
