/**
 * Noms d'ouvertures en francais.
 *
 * Les 3 810 noms Lichess sont anglais et suivent une grammaire reguliere :
 * « Famille: Variante, Sous-variante ». Les familles courantes ont une
 * traduction consacree ; le reste est traduit mot a mot avec accord en genre
 * (variante / gambit / attaque / defense…), les noms propres restant tels quels.
 * Le nom anglais d'origine reste disponible a cote (icone « en »).
 */

type Gender = 'm' | 'f'

interface Head {
  fr: string
  gender: Gender
  /** Pluriel : « variantes fermées ». */
  plural?: boolean
}

/** Mot de tete d'un segment : nom du type de ligne. */
const HEADS: Record<string, Head> = {
  Variation: { fr: 'variante', gender: 'f' },
  Variations: { fr: 'variantes', gender: 'f', plural: true },
  Gambit: { fr: 'gambit', gender: 'm' },
  Defense: { fr: 'défense', gender: 'f' },
  Defence: { fr: 'défense', gender: 'f' },
  Attack: { fr: 'attaque', gender: 'f' },
  Line: { fr: 'ligne', gender: 'f' },
  Lines: { fr: 'lignes', gender: 'f', plural: true },
  System: { fr: 'système', gender: 'm' },
  Countergambit: { fr: 'contre-gambit', gender: 'm' },
  'Counter-Gambit': { fr: 'contre-gambit', gender: 'm' },
  Counterattack: { fr: 'contre-attaque', gender: 'f' },
  'Counter-Attack': { fr: 'contre-attaque', gender: 'f' },
  Formation: { fr: 'formation', gender: 'f' },
  Opening: { fr: 'ouverture', gender: 'f' },
  Game: { fr: 'partie', gender: 'f' },
  Trap: { fr: 'piège', gender: 'm' },
  Sacrifice: { fr: 'sacrifice', gender: 'm' },
  Bind: { fr: 'étau', gender: 'm' },
  Invitation: { fr: 'invitation', gender: 'f' },
  Transfer: { fr: 'transfert', gender: 'm' },
  Retreat: { fr: 'retraite', gender: 'f' },
  Hybrid: { fr: 'hybride', gender: 'm' },
  Check: { fr: 'échec', gender: 'm' },
  Pin: { fr: 'clouage', gender: 'm' },
  Endgame: { fr: 'finale', gender: 'f' },
  Complex: { fr: 'complexe', gender: 'm' },
  Structure: { fr: 'structure', gender: 'f' },
  Setup: { fr: 'dispositif', gender: 'm' },
  Fork: { fr: 'fourchette', gender: 'f' },
  Grab: { fr: 'prise', gender: 'f' },
  Plan: { fr: 'plan', gender: 'm' },
  Maneuver: { fr: 'manœuvre', gender: 'f' },
  Manoeuvre: { fr: 'manœuvre', gender: 'f' },
  Idea: { fr: 'idée', gender: 'f' },
  Move: { fr: 'coup', gender: 'm' },
  Order: { fr: 'ordre de coups', gender: 'm' },
}

/** Adjectifs : forme masculine / feminine (pluriel ajoute par accord). */
const ADJ: Record<string, [string, string]> = {
  Classical: ['classique', 'classique'],
  Modern: ['moderne', 'moderne'],
  Main: ['principal', 'principale'],
  Closed: ['fermé', 'fermée'],
  Open: ['ouvert', 'ouverte'],
  Normal: ['normal', 'normale'],
  Accepted: ['accepté', 'acceptée'],
  Declined: ['refusé', 'refusée'],
  Accelerated: ['accéléré', 'accélérée'],
  'Hyper-Accelerated': ['hyperaccéléré', 'hyperaccélérée'],
  Hyperaccelerated: ['hyperaccéléré', 'hyperaccélérée'],
  Reversed: ['inversé', 'inversée'],
  Deferred: ['différé', 'différée'],
  Delayed: ['retardé', 'retardée'],
  Symmetrical: ['symétrique', 'symétrique'],
  Orthodox: ['orthodoxe', 'orthodoxe'],
  Old: ['ancien', 'ancienne'],
  New: ['nouveau', 'nouvelle'],
  Quiet: ['tranquille', 'tranquille'],
  Traditional: ['traditionnel', 'traditionnelle'],
  Central: ['central', 'centrale'],
  Early: ['précoce', 'précoce'],
  Late: ['tardif', 'tardive'],
  Improved: ['amélioré', 'améliorée'],
  Extended: ['étendu', 'étendue'],
  Simplified: ['simplifié', 'simplifiée'],
  Sharp: ['tranchant', 'tranchante'],
  Solid: ['solide', 'solide'],
  Positional: ['positionnel', 'positionnelle'],
  Tactical: ['tactique', 'tactique'],
  Aggressive: ['agressif', 'agressive'],
  Passive: ['passif', 'passive'],
  Standard: ['standard', 'standard'],
  Rare: ['rare', 'rare'],
  Eastern: ['oriental', 'orientale'],
  Western: ['occidental', 'occidentale'],
  Northern: ['septentrional', 'septentrionale'],
  Southern: ['méridional', 'méridionale'],
  Fingerslip: ['du doigt qui glisse', 'du doigt qui glisse'],
  Dynamic: ['dynamique', 'dynamique'],
  Quick: ['rapide', 'rapide'],
  Fast: ['rapide', 'rapide'],
  Slow: ['lent', 'lente'],
  Simple: ['simple', 'simple'],
  Wild: ['sauvage', 'sauvage'],
  Safe: ['sûr', 'sûre'],
  Sound: ['solide', 'solide'],
  Direct: ['direct', 'directe'],
  Indirect: ['indirect', 'indirecte'],
  Immediate: ['immédiat', 'immédiate'],
  Full: ['complet', 'complète'],
  Alternative: ['alternatif', 'alternative'],
  Original: ['original', 'originale'],
  Correct: ['correct', 'correcte'],
  Refined: ['raffiné', 'raffinée'],
  Flexible: ['flexible', 'flexible'],
  Restrained: ['retenu', 'retenue'],
  Radical: ['radical', 'radicale'],
  Unusual: ['inhabituel', 'inhabituelle'],
  Irregular: ['irrégulier', 'irrégulière'],
  Regular: ['régulier', 'régulière'],
  Advanced: ['avancé', 'avancée'],
  Retarded: ['retardé', 'retardée'],
  Hanging: ['pendant', 'pendante'],
  Isolated: ['isolé', 'isolée'],
  Doubled: ['doublé', 'doublée'],
  Mutual: ['mutuel', 'mutuelle'],
  Anti: ['anti', 'anti'],
  // Nationalites et villes en adjectif
  English: ['anglais', 'anglaise'],
  Spanish: ['espagnol', 'espagnole'],
  Scotch: ['écossais', 'écossaise'],
  Scottish: ['écossais', 'écossaise'],
  French: ['français', 'française'],
  Russian: ['russe', 'russe'],
  Italian: ['italien', 'italienne'],
  Austrian: ['autrichien', 'autrichienne'],
  Czech: ['tchèque', 'tchèque'],
  Dutch: ['hollandais', 'hollandaise'],
  Hungarian: ['hongrois', 'hongroise'],
  Polish: ['polonais', 'polonaise'],
  Portuguese: ['portugais', 'portugaise'],
  Norwegian: ['norvégien', 'norvégienne'],
  Swedish: ['suédois', 'suédoise'],
  Danish: ['danois', 'danoise'],
  Scandinavian: ['scandinave', 'scandinave'],
  Sicilian: ['sicilien', 'sicilienne'],
  Indian: ['indien', 'indienne'],
  'Anglo-Indian': ['anglo-indien', 'anglo-indienne'],
  'Nimzo-Indian': ['nimzo-indien', 'nimzo-indienne'],
  'Bogo-Indian': ['bogo-indien', 'bogo-indienne'],
  'Neo-Indian': ['néo-indien', 'néo-indienne'],
  'Old Indian': ['vieille-indien', 'vieille-indienne'],
  Yugoslav: ['yougoslave', 'yougoslave'],
  Berlin: ['berlinois', 'berlinoise'],
  Vienna: ['viennois', 'viennoise'],
  Viennese: ['viennois', 'viennoise'],
  Baltic: ['balte', 'balte'],
  American: ['américain', 'américaine'],
  Argentine: ['argentin', 'argentine'],
  Australian: ['australien', 'australienne'],
  Belgian: ['belge', 'belge'],
  Bulgarian: ['bulgare', 'bulgare'],
  Canadian: ['canadien', 'canadienne'],
  Catalan: ['catalan', 'catalane'],
  Chinese: ['chinois', 'chinoise'],
  Cuban: ['cubain', 'cubaine'],
  Finnish: ['finlandais', 'finlandaise'],
  German: ['allemand', 'allemande'],
  Greek: ['grec', 'grecque'],
  Icelandic: ['islandais', 'islandaise'],
  Irish: ['irlandais', 'irlandaise'],
  Israeli: ['israélien', 'israélienne'],
  Latvian: ['letton', 'lettonne'],
  Lithuanian: ['lituanien', 'lituanienne'],
  Mexican: ['mexicain', 'mexicaine'],
  Romanian: ['roumain', 'roumaine'],
  Slav: ['slave', 'slave'],
  'Semi-Slav': ['semi-slave', 'semi-slave'],
  Swiss: ['suisse', 'suisse'],
  Ukrainian: ['ukrainien', 'ukrainienne'],
  Uruguayan: ['uruguayen', 'uruguayenne'],
  Venezuelan: ['vénézuélien', 'vénézuélienne'],
  Welsh: ['gallois', 'galloise'],
  Prussian: ['prussien', 'prussienne'],
  Saxon: ['saxon', 'saxonne'],
  Bavarian: ['bavarois', 'bavaroise'],
  Siberian: ['sibérien', 'sibérienne'],
  Balkan: ['balkanique', 'balkanique'],
  Nordic: ['nordique', 'nordique'],
  Alpine: ['alpin', 'alpine'],
  Basque: ['basque', 'basque'],
}

/** Adjectifs places avant le nom en francais. */
const PRE_ADJ = new Set(['Double', 'Pseudo', 'Semi', 'Grand', 'Great', 'Triple', 'False', 'Little', 'Big', 'Mini'])
const PRE_ADJ_FR: Record<string, [string, string]> = {
  Double: ['double', 'double'],
  Pseudo: ['pseudo-', 'pseudo-'],
  Semi: ['semi-', 'semi-'],
  Grand: ['grand', 'grande'],
  Great: ['grand', 'grande'],
  Triple: ['triple', 'triple'],
  False: ['faux', 'fausse'],
  Little: ['petit', 'petite'],
  Big: ['grand', 'grande'],
  Mini: ['mini-', 'mini-'],
}

/**
 * Complements (« du cavalier », « de l'aile »…) : expressions anglaises, les plus
 * longues d'abord, vers leur complement francais.
 */
const COMPLEMENTS: [string, string][] = [
  ['Poisoned Pawn', 'du pion empoisonné'],
  ['Two Knights', 'des deux cavaliers'],
  ['Three Knights', 'des trois cavaliers'],
  ['Four Knights', 'des quatre cavaliers'],
  ['Two Pawns', 'des deux pions'],
  ['Three Pawns', 'des trois pions'],
  ['Four Pawns', 'des quatre pions'],
  ['Five Pawns', 'des cinq pions'],
  ['Two Bishops', 'des deux fous'],
  ['Pawn Grab', 'de la prise de pion'],
  ['Pawn Push', 'de la poussée de pion'],
  ['Pawn Sacrifice', 'du sacrifice de pion'],
  ['Exchange Sacrifice', 'du sacrifice de qualité'],
  ['Queen Sacrifice', 'du sacrifice de dame'],
  ['Bishop Sacrifice', 'du sacrifice de fou'],
  ['Knight Sacrifice', 'du sacrifice de cavalier'],
  ['Rook Sacrifice', 'du sacrifice de tour'],
  ['Piece Sacrifice', 'du sacrifice de pièce'],
  ["King's Knight", 'du cavalier roi'],
  ["Queen's Knight", 'du cavalier dame'],
  ["King's Bishop", 'du fou roi'],
  ["Queen's Bishop", 'du fou dame'],
  ["King's Pawn", 'du pion roi'],
  ["Queen's Pawn", 'du pion dame'],
  ["King's Rook", 'de la tour roi'],
  ["Queen's Rook", 'de la tour dame'],
  ["King's English", 'anglaise du roi'],
  ["King's", 'du roi'],
  ["Queen's", 'de la dame'],
  ["Bishop's", 'du fou'],
  ["Knight's", 'du cavalier'],
  ["Rook's", 'de la tour'],
  ['Kingside', 'de l’aile roi'],
  ['Queenside', 'de l’aile dame'],
  ['Wing', 'de l’aile'],
  ['Center', 'du centre'],
  ['Centre', 'du centre'],
  ['Knight', 'du cavalier'],
  ['Knights', 'des cavaliers'],
  ['Bishop', 'du fou'],
  ['Bishops', 'des fous'],
  ['Queen', 'de la dame'],
  ['King', 'du roi'],
  ['Rook', 'de la tour'],
  ['Pawn', 'du pion'],
  ['Pawns', 'des pions'],
  ['Exchange', 'd’échange'],
  ['Advance', 'd’avance'],
  ['Fianchetto', 'du fianchetto'],
  ['Dragon', 'du dragon'],
  ['Hedgehog', 'du hérisson'],
  ['Stonewall', 'Stonewall'],
  ['Fried Liver', 'Fegatello'],
  ['Bayonet', 'à la baïonnette'],
  ['Spike', 'de la pointe'],
  ['Hook', 'du crochet'],
  ['Fork', 'de la fourchette'],
  ['Trap', 'du piège'],
  ['Mate', 'du mat'],
  ['Moscow', 'de Moscou'],
  ['Leningrad', 'de Leningrad'],
  ['London', 'de Londres'],
  ['Paris', 'de Paris'],
  ['Venice', 'de Venise'],
  ['Carlsbad', 'de Carlsbad'],
  ['Meran', 'de Merano'],
  ['Petersburg', 'de Saint-Pétersbourg'],
  ['St. Petersburg', 'de Saint-Pétersbourg'],
  ['Brooklyn', 'de Brooklyn'],
  ['Budapest', 'de Budapest'],
  ['Prague', 'de Prague'],
  ['Munich', 'de Munich'],
  ['Hamburg', 'de Hambourg'],
  ['Amsterdam', 'd’Amsterdam'],
  ['Rotterdam', 'de Rotterdam'],
  ['Copenhagen', 'de Copenhague'],
  ['Stockholm', 'de Stockholm'],
  ['Warsaw', 'de Varsovie'],
  ['Zurich', 'de Zurich'],
  ['Geneva', 'de Genève'],
  ['Milan', 'de Milan'],
  ['Rome', 'de Rome'],
  ['Naples', 'de Naples'],
  ['Madrid', 'de Madrid'],
  ['Barcelona', 'de Barcelone'],
  ['Lisbon', 'de Lisbonne'],
  ['Havana', 'de La Havane'],
  ['Mexico', 'de Mexico'],
  ['Montevideo', 'de Montevideo'],
  ['Buenos Aires', 'de Buenos Aires'],
  ['Cambridge Springs', 'Cambridge Springs'],
  ['Mar del Plata', 'Mar del Plata'],
  ['Wiesbaden', 'de Wiesbaden'],
  ['Dresden', 'de Dresde'],
  ['Breslau', 'de Breslau'],
  ['Barmen', 'de Barmen'],
  ['Karlsbad', 'de Carlsbad'],
  ['Marienbad', 'de Marienbad'],
  ['Kecskemet', 'de Kecskemét'],
  ['Saragossa', 'de Saragosse'],
  ['Valencia', 'de Valence'],
  ['Zaire', 'du Zaïre'],
  ['Zagreb', 'de Zagreb'],
  ['Belgrade', 'de Belgrade'],
  ['Sofia', 'de Sofia'],
  ['Tbilisi', 'de Tbilissi'],
  ['Riga', 'de Riga'],
  ['Kiev', 'de Kiev'],
  ['Odessa', 'd’Odessa'],
  ['Newcastle', 'de Newcastle'],
  ['Manchester', 'de Manchester'],
  ['Liverpool', 'de Liverpool'],
  ['Birmingham', 'de Birmingham'],
  ['Hastings', 'de Hastings'],
  ['Agincourt', 'd’Azincourt'],
  ['Waterloo', 'de Waterloo'],
  ['Elephant', 'de l’éléphant'],
  ['Lion', 'du lion'],
  ['Rat', 'du rat'],
  ['Vulture', 'du vautour'],
  ['Kangaroo', 'du kangourou'],
  ['Hippopotamus', 'de l’hippopotame'],
  ['Pterodactyl', 'du ptérodactyle'],
  ['Pteranodon', 'du ptéranodon'],
  ['Rhamphorhynchus', 'du rhamphorhynque'],
  ['Orangutan', 'de l’orang-outan'],
  ['Lemming', 'du lemming'],
  ['Cobra', 'du cobra'],
  ['Scorpion', 'du scorpion'],
  ['Snake', 'du serpent'],
  ['Amazon', 'de l’amazone'],
  ['Sodium', 'du sodium'],
  ['Paleface', 'du visage pâle'],
  ['Creepy Crawly', 'de la bestiole'],
  ['Fried Fox', 'du renard frit'],
  ['Bongcloud', 'Bongcloud'],
  ['Hammerschlag', 'Hammerschlag'],
  ['Simul Special', 'spéciale simultanée'],
  ['Halloween', 'd’Halloween'],
  ['Christmas', 'de Noël'],
  ['Monkey', 'du singe'],
  ['Crab', 'du crabe'],
  ['Tumbleweed', 'de la boule d’herbe'],
  ['Wayward Queen', 'de la dame vagabonde'],
  ['Parham', 'Parham'],
  ['Danvers', 'Danvers'],
  ['Patzer', 'du patzer'],
]

/** Mots invariables conserves tels quels (noms de figures, mots etrangers). */
const KEEP = new Set([
  'Giuoco',
  'Piano',
  'Pianissimo',
  'Ruy',
  'Lopez',
  'Max',
  'Lange',
  'Benoni',
  'Grünfeld',
  'Grunfeld',
  'Najdorf',
  'Scheveningen',
  'Sveshnikov',
  'Taimanov',
  'Kan',
  'Paulsen',
  'Rossolimo',
  'Alapin',
  'Sozin',
  'Richter-Rauzer',
  'Rauzer',
  'Boleslavsky',
  'Winawer',
  'Tarrasch',
  'Rubinstein',
  'Steinitz',
  'Panov',
  'Botvinnik',
  'Marshall',
  'Morphy',
  'Chigorin',
  'Breyer',
  'Zaitsev',
  'Smyslov',
  'Schliemann',
  'Evans',
  'Traxler',
  'Kieseritzky',
  'Muzio',
  'Falkbeer',
  'Cunningham',
  'Tartakower',
  'Lasker',
  'Ragozin',
  'Sämisch',
  'Averbakh',
  'Petrosian',
  'Colle',
  'Torre',
  'Trompowsky',
  'Réti',
  'Reti',
  'Zukertort',
  'Larsen',
  'Nimzowitsch',
  'Philidor',
  'Pirc',
  'Alekhine',
  'Caro-Kann',
  'Owen',
  'Bird',
  'Grob',
  'Sokolsky',
  'Albin',
  'Blumenfeld',
  'Benko',
  'Blackmar-Diemer',
  'Englund',
  'Budapest',
  'Fajarowicz',
  'Stonewall',
  'Hedgehog',
  'Maroczy',
  'Löwenthal',
  'Lowenthal',
  'Kalashnikov',
  'Pelikan',
  'Lasker-Pelikan',
  'Moscow',
  'Chekhover',
  'Nimzo-English',
  'Anti-Grünfeld',
  'Anti-Sicilian',
  'Anti-Marshall',
  'Anti-Berlin',
  'Anti-Nimzo-Indian',
  'Anti-Meran',
  'Anti-Moscow',
])

const cache = new Map<string, string>()

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

/** Familles courantes : traduction consacree (nom francais usuel). */
const FAMILY_FR: Record<string, string> = {
  "King's Pawn Game": 'Partie du pion roi',
  "King's Pawn Opening": 'Ouverture du pion roi',
  "King's Knight Opening": 'Ouverture du cavalier roi',
  "Queen's Pawn Game": 'Partie du pion dame',
  "Queen's Pawn": 'Pion dame',
  'Italian Game': 'Partie italienne',
  'Ruy Lopez': 'Partie espagnole',
  'Scotch Game': 'Partie écossaise',
  'Vienna Game': 'Partie viennoise',
  'Vienna Gambit, with Max Lange Defense': 'Gambit viennois, avec défense Max Lange',
  'Center Game': 'Partie du centre',
  'Center Game Accepted': 'Partie du centre acceptée',
  'Four Knights Game': 'Partie des quatre cavaliers',
  'Three Knights Opening': 'Partie des trois cavaliers',
  "Bishop's Opening": 'Partie du fou',
  "King's Gambit": 'Gambit du roi',
  "King's Gambit Accepted": 'Gambit du roi accepté',
  "King's Gambit Declined": 'Gambit du roi refusé',
  'Danish Gambit': 'Gambit danois',
  'Danish Gambit Accepted': 'Gambit danois accepté',
  'Danish Gambit Declined': 'Gambit danois refusé',
  'Ponziani Opening': 'Ouverture Ponziani',
  "Petrov's Defense": 'Défense russe (Petrov)',
  'Russian Game': 'Défense russe (Petrov)',
  'Philidor Defense': 'Défense Philidor',
  'Sicilian Defense': 'Défense sicilienne',
  'French Defense': 'Défense française',
  'Caro-Kann Defense': 'Défense Caro-Kann',
  'Scandinavian Defense': 'Défense scandinave',
  'Alekhine Defense': 'Défense Alekhine',
  'Pirc Defense': 'Défense Pirc',
  'Modern Defense': 'Défense moderne',
  'Robatsch Defense': 'Défense Robatsch',
  'Owen Defense': 'Défense Owen',
  'St. George Defense': 'Défense Saint-Georges',
  'Nimzowitsch Defense': 'Défense Nimzowitsch',
  'Elephant Gambit': 'Gambit de l’éléphant',
  'Latvian Gambit': 'Gambit letton',
  'Latvian Gambit Accepted': 'Gambit letton accepté',
  'Portuguese Opening': 'Ouverture portugaise',
  'Hungarian Opening': 'Ouverture hongroise',
  "Queen's Gambit": 'Gambit dame',
  "Queen's Gambit Declined": 'Gambit dame refusé',
  "Queen's Gambit Accepted": 'Gambit dame accepté',
  'Slav Defense': 'Défense slave',
  'Semi-Slav Defense': 'Défense semi-slave',
  'Semi-Slav Defense Accepted': 'Défense semi-slave acceptée',
  'Slav Indian': 'Slave-indienne',
  'Tarrasch Defense': 'Défense Tarrasch',
  'Albin Countergambit': 'Contre-gambit Albin',
  'London System': 'Système de Londres',
  'London System, with Bd3': 'Système de Londres, avec Fd3',
  'London System, with Be2': 'Système de Londres, avec Fe2',
  'Colle System': 'Système Colle',
  'Torre Attack': 'Attaque Torre',
  'Trompowsky Attack': 'Attaque Trompowsky',
  'Richter-Veresov Attack': 'Attaque Richter-Veresov',
  'Rapport-Jobava System': 'Système Rapport-Jobava',
  'Rapport-Jobava System, with e6': 'Système Rapport-Jobava, avec e6',
  'Nimzo-Indian Defense': 'Défense nimzo-indienne',
  "King's Indian Defense": 'Défense est-indienne',
  "King's Indian Attack": 'Attaque est-indienne',
  "King's Indian Attack, with Bf5": 'Attaque est-indienne, avec Ff5',
  "King's Indian Attack, with e6": 'Attaque est-indienne, avec e6',
  'Grünfeld Defense': 'Défense Grünfeld',
  'Neo-Grünfeld Defense': 'Défense néo-Grünfeld',
  "Queen's Indian Defense": 'Défense ouest-indienne',
  "Queen's Indian Defense, with e3": 'Défense ouest-indienne, avec e3',
  "Queen's Indian Defense, with e3, Bb4+ Line": 'Défense ouest-indienne, avec e3, ligne Fb4+',
  "Queen's Indian Accelerated": 'Ouest-indienne accélérée',
  "Pseudo Queen's Indian Defense": 'Pseudo-défense ouest-indienne',
  'Bogo-Indian Defense': 'Défense bogo-indienne',
  'Old Indian Defense': 'Défense vieille-indienne',
  'East Indian Defense': 'Défense est-indienne (ordre de coups)',
  'Indian Defense': 'Défense indienne',
  'Benoni Defense': 'Défense Benoni',
  'Benko Gambit': 'Gambit Benko',
  'Benko Gambit Accepted': 'Gambit Benko accepté',
  'Benko Gambit Declined': 'Gambit Benko refusé',
  'Blumenfeld Countergambit': 'Contre-gambit Blumenfeld',
  'Blumenfeld Countergambit Accepted': 'Contre-gambit Blumenfeld accepté',
  'Catalan Opening': 'Ouverture catalane',
  'Dutch Defense': 'Défense hollandaise',
  'Budapest Defense': 'Gambit de Budapest',
  'Englund Gambit': 'Gambit Englund',
  'Englund Gambit Declined': 'Gambit Englund refusé',
  'Blackmar-Diemer Gambit': 'Gambit Blackmar-Diemer',
  'Blackmar-Diemer Gambit Accepted': 'Gambit Blackmar-Diemer accepté',
  'Blackmar-Diemer Gambit Declined': 'Gambit Blackmar-Diemer refusé',
  'English Opening': 'Ouverture anglaise',
  'English Defense': 'Défense anglaise',
  'English Orangutan': 'Orang-outan anglais',
  'Réti Opening': 'Ouverture Réti',
  'Zukertort Opening': 'Ouverture Zukertort',
  'Zukertort Defense': 'Défense Zukertort',
  'Bird Opening': 'Ouverture Bird',
  'Nimzo-Larsen Attack': 'Attaque Nimzo-Larsen',
  'Polish Opening': 'Ouverture polonaise (Sokolsky)',
  'Polish Opening, with d5': 'Ouverture polonaise, avec d5',
  'Polish Defense': 'Défense polonaise',
  'Grob Opening': 'Ouverture Grob',
  "Van't Kruijs Opening": 'Ouverture Van’t Kruijs',
  'Van Geet Opening': 'Ouverture Van Geet',
  "Anderssen's Opening": 'Ouverture Anderssen',
  'Ware Opening': 'Ouverture Ware',
  'Ware Defense': 'Défense Ware',
  'Barnes Opening': 'Ouverture Barnes',
  'Barnes Defense': 'Défense Barnes',
  'Amar Opening': 'Ouverture Amar',
  'Clemenz Opening': 'Ouverture Clemenz',
  'Mieses Opening': 'Ouverture Mieses',
  'Saragossa Opening': 'Ouverture de Saragosse',
  'Valencia Opening': 'Ouverture de Valence',
  'Dresden Opening': 'Ouverture de Dresde',
  'Global Opening': 'Ouverture globale',
  'Kádas Opening': 'Ouverture Kádas',
  'Canard Opening': 'Ouverture du canard',
  'Basque Opening': 'Ouverture basque',
  'Rubinstein Opening': 'Ouverture Rubinstein',
  'Marienbad System': 'Système de Marienbad',
  'Yusupov-Rubinstein System': 'Système Yusupov-Rubinstein',
  'Formation': 'Formation',
  'Creepy Crawly Formation': 'Formation de la bestiole',
  'Amazon Attack': 'Attaque de l’amazone',
  'Amsterdam Attack': 'Attaque d’Amsterdam',
  'Bongcloud Attack': 'Attaque Bongcloud',
  'Paleface Attack': 'Attaque du visage pâle',
  'Sodium Attack': 'Attaque du sodium',
  'Australian Defense': 'Défense australienne',
  'Borg Defense': 'Défense Borg',
  'Carr Defense': 'Défense Carr',
  'Czech Defense': 'Défense tchèque',
  'Döry Defense': 'Défense Döry',
  'Fried Fox Defense': 'Défense du renard frit',
  'Goldsmith Defense': 'Défense Goldsmith',
  'Gunderam Defense': 'Défense Gunderam',
  'Hippopotamus Defense': 'Défense hippopotame',
  'Horwitz Defense': 'Défense Horwitz',
  'Kangaroo Defense': 'Défense du kangourou',
  'Lemming Defense': 'Défense du lemming',
  'Lion Defense': 'Défense du lion',
  'Mexican Defense': 'Défense mexicaine',
  'Mikenas Defense': 'Défense Mikenas',
  'Montevideo Defense': 'Défense de Montevideo',
  'Pterodactyl Defense': 'Défense du ptérodactyle',
  'Rat Defense': 'Défense du rat',
  'Vulture Defense': 'Défense du vautour',
  'Wade Defense': 'Défense Wade',
  'Zaire Defense': 'Défense du Zaïre',
  'Duras Gambit': 'Gambit Duras',
  'Irish Gambit': 'Gambit irlandais',
  'Lasker Simul Special': 'Spéciale simultanée Lasker',
  'Alapin Opening': 'Ouverture Alapin',
}

type Token =
  | { kind: 'head'; head: Head }
  | { kind: 'adj'; forms: [string, string] }
  | { kind: 'pre'; forms: [string, string] }
  | { kind: 'comp'; fr: string }
  | { kind: 'proper'; fr: string }

const normalizeApostrophes = (text: string) => text.replace(/[’‘]/g, "'")

/** Decoupe un segment en jetons, expressions longues d'abord. */
function tokenize(segment: string): Token[] {
  const words = segment.split(/\s+/).filter(Boolean)
  const tokens: Token[] = []
  let i = 0
  while (i < words.length) {
    let matched = false
    for (let len = Math.min(3, words.length - i); len >= 1 && !matched; len--) {
      const phrase = words.slice(i, i + len).join(' ')
      const complement = COMPLEMENTS.find(([en]) => en === phrase)
      if (complement) {
        tokens.push({ kind: 'comp', fr: complement[1] })
        i += len
        matched = true
      } else if (len === 2 && ADJ[phrase]) {
        tokens.push({ kind: 'adj', forms: ADJ[phrase] })
        i += len
        matched = true
      }
    }
    if (matched) continue
    const word = words[i]
    const prefixed = /^(Pseudo|Anti|Neo|Semi|Hyper|Nimzo|Super|Ultra)-(.+)$/.exec(word)
    if (HEADS[word]) tokens.push({ kind: 'head', head: HEADS[word] })
    else if (PRE_ADJ.has(word)) tokens.push({ kind: 'pre', forms: PRE_ADJ_FR[word] })
    else if (ADJ[word]) tokens.push({ kind: 'adj', forms: ADJ[word] })
    else if (KEEP.has(word)) tokens.push({ kind: 'proper', fr: word })
    else if (prefixed && ADJ[prefixed[2]]) {
      // « Pseudo-Scandinavian » → « pseudo-scandinave », « Nimzo-English » → « nimzo-anglaise »
      const prefix = PREFIX_FR[prefixed[1]]
      const forms = ADJ[prefixed[2]]
      tokens.push({ kind: 'adj', forms: [`${prefix}-${forms[0]}`, `${prefix}-${forms[1]}`] })
    } else if (prefixed) tokens.push({ kind: 'proper', fr: `${PREFIX_FR[prefixed[1]]}-${prefixed[2]}` })
    else tokens.push({ kind: 'proper', fr: word.replace(/'s$/, '') })
    i++
  }
  return tokens
}

const PREFIX_FR: Record<string, string> = {
  Pseudo: 'pseudo',
  Anti: 'anti',
  Neo: 'néo',
  Semi: 'semi',
  Hyper: 'hyper',
  Nimzo: 'nimzo',
  Super: 'super',
  Ultra: 'ultra',
}

/** Nationalites et lieux : places avant les autres adjectifs (« sicilienne inversée »). */
const NATIONALITY = new Set(
  Object.keys(ADJ).filter((key) => /^[A-Z]/.test(key) && !['Classical', 'Modern', 'Main', 'Closed', 'Open', 'Normal', 'Accepted', 'Declined', 'Accelerated', 'Hyper-Accelerated', 'Hyperaccelerated', 'Reversed', 'Deferred', 'Delayed', 'Symmetrical', 'Orthodox', 'Old', 'New', 'Quiet', 'Traditional', 'Central', 'Early', 'Late', 'Improved', 'Extended', 'Simplified', 'Sharp', 'Solid', 'Positional', 'Tactical', 'Aggressive', 'Passive', 'Standard', 'Rare', 'Eastern', 'Western', 'Northern', 'Southern', 'Fingerslip', 'Dynamic', 'Quick', 'Fast', 'Slow', 'Simple', 'Wild', 'Safe', 'Sound', 'Direct', 'Indirect', 'Immediate', 'Full', 'Alternative', 'Original', 'Correct', 'Refined', 'Flexible', 'Restrained', 'Radical', 'Unusual', 'Irregular', 'Regular', 'Advanced', 'Retarded', 'Hanging', 'Isolated', 'Doubled', 'Mutual', 'Anti'].includes(key)),
)

/** Rang d'un adjectif apres le nom : « principale » colle au nom, puis nationalites, puis le reste. */
const adjRank = (forms: [string, string]) => (forms[0] === 'principal' ? 0 : NATIONALITY_FORMS.has(forms[0]) ? 1 : 2)
const NATIONALITY_FORMS = new Set([...NATIONALITY].map((key) => ADJ[key][0]))

/** « du dragon » → nom « dragon », genre masculin ; « de la dame » → feminin. */
function nounOfComplement(comp: string): { noun: string; gender: Gender | null } {
  const m = /^(du|de la|de l’|des|d’|à la)\s?(.+)$/.exec(comp)
  if (!m) return { noun: comp, gender: null }
  const gender: Gender | null = m[1] === 'du' ? 'm' : m[1] === 'de la' || m[1] === 'à la' ? 'f' : null
  return { noun: m[2], gender }
}

/** Complement forme a partir d'un nom de tete secondaire (« Check » dans « Bishop Check Line »). */
const ofHead = (head: Head) =>
  /^[aeiouéè]/i.test(head.fr) ? `de l’${head.fr}` : head.gender === 'f' ? `de la ${head.fr}` : `du ${head.fr}`

const agree = (forms: [string, string], gender: Gender, plural = false) => {
  const base = gender === 'f' ? forms[1] : forms[0]
  if (!plural || base.endsWith('-')) return base
  return base.endsWith('s') || base.endsWith('x') ? base : `${base}s`
}

/** Traduit un segment (« Najdorf Variation » → « variante Najdorf »). */
function translateSegment(segment: string, previous: Gender): { text: string; gender: Gender } {
  const trimmed = segment.trim()
  if (/^with\s/i.test(trimmed)) {
    // « with f4 », « with Bf5 » : coups en notation anglaise, conserves tels quels
    return { text: `avec ${trimmed.slice(5)}`, gender: previous }
  }
  const tokens = tokenize(trimmed)
  const headIndex = tokens.map((t) => t.kind).lastIndexOf('head')
  const sortedAdjs = (list: Token[], gender: Gender, plural = false) =>
    list
      .map((t, i) => ({ t: t as { forms: [string, string] }, i }))
      .sort((a, b) => adjRank(a.t.forms) - adjRank(b.t.forms) || a.i - b.i)
      .map(({ t }) => agree(t.forms, gender, plural))

  if (headIndex === -1) {
    // Qualificatif seul (« Closed », « Accelerated Dragon », « Reversed Sicilian ») :
    // le complement devient le nom (« dragon accéléré »), sinon accord avec ce qui precede
    const compIndex = tokens.findIndex((t) => t.kind === 'comp')
    let gender = previous
    let noun: string | null = null
    if (compIndex !== -1) {
      const parsed = nounOfComplement((tokens[compIndex] as { fr: string }).fr)
      noun = parsed.noun
      if (parsed.gender) gender = parsed.gender
    }
    const rest = tokens.filter((_, i) => i !== compIndex)
    const pre = rest.filter((t) => t.kind === 'pre').map((t) => agree((t as { forms: [string, string] }).forms, gender))
    const propers = rest.filter((t) => t.kind === 'proper' || t.kind === 'head').map((t) => (t.kind === 'head' ? t.head.fr : (t as { fr: string }).fr))
    const adjs = sortedAdjs(rest.filter((t) => t.kind === 'adj'), gender)
    const text = [...pre, ...(noun ? [noun] : []), ...propers, ...adjs].join(' ').replace(/- /g, '-')
    return { text, gender }
  }
  const head = (tokens[headIndex] as { kind: 'head'; head: Head }).head
  const others = tokens.filter((_, i) => i !== headIndex)
  const pre = others.filter((t) => t.kind === 'pre').map((t) => agree((t as { forms: [string, string] }).forms, head.gender))
  const propers = others.filter((t) => t.kind === 'proper').map((t) => (t as { fr: string }).fr)
  // Un second nom de tete devient un complement : « Bishop Check Line » → « ligne de l’échec du fou »
  const comps = others
    .filter((t) => t.kind === 'comp' || t.kind === 'head')
    .map((t) => (t.kind === 'head' ? ofHead(t.head) : (t as { fr: string }).fr))
  const adjs = sortedAdjs(
    others.filter((t) => t.kind === 'adj'),
    head.gender,
    head.plural,
  )
  const parts = [...pre, head.fr, ...propers, ...comps, ...adjs]
  // « pseudo- » et « semi- » se soudent au mot suivant
  const text = parts.join(' ').replace(/- /g, '-')
  return { text, gender: head.gender }
}

/** Nom francais d'une ouverture Lichess ; le nom d'origine si rien ne change. */
export function frName(name: string | undefined | null): string {
  if (!name) return ''
  const cached = cache.get(name)
  if (cached !== undefined) return cached

  const clean = normalizeApostrophes(name)
  const colon = clean.indexOf(':')
  const familyEn = (colon === -1 ? clean : clean.slice(0, colon)).trim()
  const rest = colon === -1 ? '' : clean.slice(colon + 1)

  let family: string
  let gender: Gender = 'f'
  const known = FAMILY_FR[familyEn]
  if (known) {
    family = known
    gender = /^(gambit|système|contre-gambit|pion|orang)/i.test(known) ? 'm' : 'f'
  } else {
    const translated = translateSegment(familyEn, 'f')
    family = capitalize(translated.text)
    gender = translated.gender
  }

  const segments = rest
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((segment) => {
      const result = translateSegment(segment, gender)
      gender = result.gender
      return result.text
    })

  const out = segments.length > 0 ? `${family} : ${segments.join(', ')}` : family
  cache.set(name, out)
  return out
}

/** Le nom francais differe-t-il du nom anglais ? */
export const isTranslated = (name: string | undefined | null) => !!name && frName(name) !== name
