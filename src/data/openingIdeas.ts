/**
 * Commentaires theoriques rediges pour les coups d'ouverture les plus joues.
 *
 * MOVE_NOTES : la cle est le chemin SAN complet, la valeur explique le DERNIER
 * coup de ce chemin. En dehors de ces lignes, l'application produit une analyse
 * automatique de la position (voir src/lib/explain.ts).
 *
 * FAMILY_PLANS : idee directrice d'une famille d'ouvertures, cle = nom de famille
 * du jeu de donnees Lichess.
 */

export const MOVE_NOTES: Record<string, string> = {
  // --- Premiers coups ---
  e4: "Occupe le centre et libère d'un coup la dame et le fou f1 : c'est le coup le plus direct pour prendre l'initiative. En contrepartie, le pion e4 n'est plus défendu par un autre pion et devient une cible.",
  d4: "Occupe le centre en étant d'emblée soutenu par la dame, ce qui donne des positions plus fermées et plus durables que 1.e4. Libère le fou c1.",
  Nf3: "Développement souple : contrôle e5 et d4 sans engager la structure de pions. Permet de transposer vers l'anglaise, le gambit dame ou le système Réti selon la réponse.",
  c4: "L'anglaise : conteste d5 depuis l'aile dame plutôt que d'occuper le centre. Souvent un jeu de manœuvres où le centre se fixe plus tard.",
  g3: "Prépare le fianchetto Bg2, qui contrôle la grande diagonale a8-h1 et le centre à distance, sans exposer de pion.",
  f4: "Le début Bird : contrôle e5 mais affaiblit la diagonale e1-h4 et la case e3, ce qui laisse au trait adverse des ressources tactiques immédiates.",
  b3: "Fianchetto du fou dame (Bb2) : pression à distance sur e5 et le grand diagonal, au prix d'un développement lent.",

  // --- 1.e4 : les réponses ---
  'e4 e5': 'La réponse symétrique : les noirs revendiquent leur part du centre et bloquent la poussée e5. Le pion e5 étant défendu uniquement par la dame et le fou, il devient la cible immédiate de la théorie ouverte.',
  'e4 c5': "La sicilienne : les noirs échangent un pion d'aile contre le pion central d4 des blancs. La structure devient asymétrique, ce qui donne les positions les plus déséquilibrées et les meilleurs résultats statistiques pour les noirs.",
  'e4 e6': 'La française : prépare ...d5 en soutenant le pion à l’avance. Le prix est le fou c8, enfermé derrière sa chaîne de pions, qu’il faudra activer plus tard.',
  'e4 c6': 'La Caro-Kann : prépare ...d5 comme la française, mais en gardant la diagonale c8-h3 libre pour le fou dame. Structure plus saine, jeu plus lent.',
  'e4 d5': 'La scandinave : conteste immédiatement e4. Après l’échange, la dame noire sort tôt et perdra un temps face au développement des blancs, mais la structure noire reste solide.',
  'e4 Nf6': 'La défense Alekhine : provoque la poussée des pions blancs pour les attaquer ensuite. Stratégie hypermoderne : céder le centre pour mieux le miner.',
  'e4 d6': 'Prépare ...Nf6 et ...g6 (Pirc) ou ...e5 (Philidor) : les noirs cèdent l’espace pour construire une position compacte et contre-attaquer le centre.',
  'e4 g6': 'La moderne : fianchetto immédiat. Les noirs laissent les blancs prendre le centre et le pressent à distance depuis g7.',
  'e4 Nc6': 'La Nimzowitsch : développe en visant d4 et e5, en gardant la possibilité de ...e5 ou ...d5 selon la réaction blanche.',

  // --- Ouvertures ouvertes ---
  'e4 e5 Nf3': 'Attaque e5 tout en développant : c’est le coup le plus naturel, qui pose immédiatement un problème concret aux noirs.',
  'e4 e5 Nf3 Nc6': 'Défend e5 en développant. Le cavalier prend aussi le contrôle de d4, la case où les blancs voudraient pousser.',
  'e4 e5 Nf3 Nc6 Bb5': 'L’espagnole : le fou attaque le défenseur du pion e5 plutôt que le pion lui-même. La menace Bxc6 suivie de Nxe5 n’est encore qu’apparente, mais la pression sur c6 structure toute la partie.',
  'e4 e5 Nf3 Nc6 Bb5 a6': 'Le coup Morphy : les noirs demandent au fou de s’expliquer. Après Ba4, le fou reste sur la diagonale mais ...b5 devient toujours disponible pour le chasser.',
  'e4 e5 Nf3 Nc6 Bb5 a6 Ba4': 'Le fou conserve la pression sur c6 tout en se réservant la retraite b3, où il visera f7 dans les positions ouvertes.',
  'e4 e5 Nf3 Nc6 Bb5 a6 Bxc6': "L'échange : les blancs abîment la structure noire en échange de la paire de fous cédée. Le plan est un finale favorable grâce à la majorité saine sur l'aile roi.",
  'e4 e5 Nf3 Nc6 Bb5 Nf6': 'La défense berlinoise : contre-attaque e4 au lieu de défendre. Elle mène à un finale réputé très solide après l’échange des dames.',
  'e4 e5 Nf3 Nc6 Bc4': 'La partie italienne : le fou vise directement f7, le point le plus faible de la position noire tant que le roi n’a pas roqué.',
  'e4 e5 Nf3 Nc6 Bc4 Bc5': 'La Giuoco Piano : développement symétrique. Le jeu se décide sur le rythme de la poussée c3-d4 des blancs.',
  'e4 e5 Nf3 Nc6 Bc4 Nf6': 'La défense des deux cavaliers : les noirs ignorent la menace sur f7 et jouent pour l’initiative, notamment après Ng5 d5.',
  'e4 e5 Nf3 Nc6 d4': 'La partie écossaise : ouvre le centre immédiatement. Les blancs obtiennent un développement rapide, mais l’échange des pions centraux réduit leur avantage d’espace.',
  'e4 e5 Nf3 Nf6': 'La russe (Petrov) : contre-attaque symétrique. Les noirs visent l’égalité par l’échange plutôt que par la défense passive de e5.',
  'e4 e5 Nf3 d6': 'La Philidor : défend e5 par un pion mais enferme le fou f8. Position compacte, jugée passive mais difficile à casser.',
  'e4 e5 f4': "Le gambit du roi : offre un pion pour détourner e5 et ouvrir la colonne f. Très tranchant, aujourd'hui rare au haut niveau car les noirs disposent de plusieurs égalisations connues.",
  'e4 e5 Nc3': "La viennoise : prépare f4 dans de meilleures conditions que le gambit du roi immédiat, ou d'une transposition vers la partie des quatre cavaliers.",
  'e4 e5 Bc4': "Le début du fou : vise f7 sans engager le cavalier, en gardant la possibilité de f4 ou de Nc3.",

  // --- Sicilienne ---
  'e4 c5 Nf3': 'Prépare d4 : la poussée qui donne aux blancs leur avantage de développement en échange du pion c contre le pion d.',
  'e4 c5 Nf3 d6': 'Le coup le plus souple : contrôle e5 et prépare ...Nf6, en laissant ouvert le choix entre Najdorf, dragon et Scheveningen.',
  'e4 c5 Nf3 Nc6': 'Développement actif visant d4 ; mène aux variantes Sveshnikov, Rossolimo ou classique.',
  'e4 c5 Nf3 e6': 'Prépare ...d5 en un coup et garde la structure flexible : voie des variantes Taimanov et Kan.',
  'e4 c5 Nf3 d6 d4': 'Ouvre le centre au moment favorable : les blancs récupéreront le pion avec un développement en avance.',
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6': 'Attaque e4 et force Nc3, ce qui prive les blancs de la poussée c4 : c’est le coup qui définit la structure sicilienne classique.',
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6': "La Najdorf : ...a6 empêche Bb5+ et Nb5, et prépare ...e5 ou ...e6 sans concession. Coup discret, mais qui conditionne toute la position.",
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 g6': 'La variante du dragon : fianchetto en g7 pour presser la grande diagonale et la colonne c après ...Rc8. Course d’attaques sur ailes opposées.',
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 e6': 'La Scheveningen : petit centre ...d6/...e6 très solide, qui laisse aux noirs le contre-jeu sur la colonne c et la poussée ...b5.',
  'e4 c5 Nf3 Nc6 Bb5': 'La Rossolimo : évite la théorie sicilienne ouverte ; les blancs jouent sur la structure après Bxc6.',
  'e4 c5 c3': 'La variante Alapin : prépare d4 avec un soutien de pion, pour obtenir un vrai centre plutôt qu’un jeu de pièces.',
  'e4 c5 Nc3': 'La sicilienne fermée : les blancs renoncent à d4 et jouent une attaque lente sur l’aile roi (g3, Bg2, f4).',
  'e4 c5 d4': 'Le gambit Smith-Morra : un pion pour un développement rapide et la pression sur les colonnes c et d.',

  // --- Française et Caro-Kann ---
  'e4 e6 d4 d5': 'Le point de tension caractéristique : les blancs doivent choisir entre avancer (e5), échanger (exd5) ou soutenir (Nc3/Nd2).',
  'e4 e6 d4 d5 Nc3': 'Défend e4 en développant, mais permet le clouage ...Bb4 (variante Winawer) qui met la structure blanche sous pression.',
  'e4 e6 d4 d5 Nd2': 'La Tarrasch : évite ...Bb4, au prix d’un cavalier moins actif et d’une gêne temporaire pour le fou c1.',
  'e4 e6 d4 d5 e5': 'La variante d’avance : fixe la chaîne de pions. Les blancs jouent sur l’aile roi, les noirs attaquent la base d4 par ...c5 et ...Nc6.',
  'e4 e6 d4 d5 exd5': 'La variante d’échange : structure symétrique, jeu simplifié et réputé nul, mais qui prive aussi les noirs de contre-jeu.',
  'e4 c6 d4 d5': 'Conteste le centre après avoir préparé la case de retraite du fou c8, principal atout de la Caro-Kann sur la française.',
  'e4 c6 d4 d5 Nc3': 'Variante classique : les blancs acceptent l’échange sur e4 pour développer vite et jouer sur l’espace.',
  'e4 c6 d4 d5 e5': 'Variante d’avance : gagne de l’espace, mais permet aux noirs de sortir leur fou par ...Bf5 avant de le refermer.',
  'e4 c6 d4 d5 exd5': 'Après ...cxd5, la structure Caro devient un jeu de pion dame classique ; l’attaque Panov (c4) transforme la partie en position isolée.',

  // --- 1.d4 ---
  'd4 d5': 'Réponse symétrique : les noirs bloquent la poussée e4 et obtiennent une part égale du centre.',
  'd4 Nf6': 'Contrôle e4 avant tout : c’est le coup qui empêche les blancs de construire le centre idéal e4+d4.',
  'd4 f5': 'La hollandaise : conteste e4 par un coup de pion d’aile, ce qui affaiblit la diagonale a2-g8 et le roi noir.',
  'd4 d5 c4': "Le gambit dame : les blancs proposent un pion d'aile pour détourner le pion d5 et obtenir le centre. Le pion c4 est récupérable dans presque toutes les lignes.",
  'd4 d5 c4 e6': 'Le gambit dame refusé : structure très solide, mais le fou c8 reste momentanément enfermé — le thème stratégique de toute la variante.',
  'd4 d5 c4 c6': 'La slave : soutient d5 en gardant la diagonale c8-h3 ouverte pour le fou, ce qui corrige le principal défaut du GDR.',
  'd4 d5 c4 dxc4': 'Le gambit dame accepté : les noirs cèdent le centre pour un temps de développement et le coup ...c5 ; ils ne cherchent pas à garder le pion.',
  'd4 d5 Bf4': 'Le système de Londres : développement méthodique sans théorie lourde. Le fou sort avant e3, mais laisse b2 sans surveillance.',
  'd4 Nf6 c4': 'Prépare Nc3 et e4 : les blancs jouent pour le centre complet, ce que toute la théorie indienne cherche à empêcher.',
  'd4 Nf6 c4 e6': 'Coup souple qui prépare ...Bb4 (nimzo-indienne), ...b6 (ouest-indienne) ou ...d5 (gambit dame).',
  'd4 Nf6 c4 g6': 'Prépare le fianchetto : les noirs laissent le centre aux blancs pour le contre-attaquer par ...d5 (Grünfeld) ou ...e5 (est-indienne).',
  'd4 Nf6 c4 e6 Nc3 Bb4': "La nimzo-indienne : le clouage empêche e4 et menace de doubler les pions blancs par ...Bxc3. Les noirs échangent leur fou contre une concession structurelle durable.",
  'd4 Nf6 c4 e6 Nf3 b6': 'L’ouest-indienne : le fou b7 combat e4 à distance ; les blancs répondent en général par g3 pour lui opposer un fou.',
  'd4 Nf6 c4 g6 Nc3 d5': 'La Grünfeld : les noirs frappent le centre avant de le laisser se former. Après cxd5 Nxd5, ils viseront d4 par ...c5 et ...Bg7.',
  'd4 Nf6 c4 g6 Nc3 Bg7 e4 d6': "L'est-indienne : les noirs concèdent le centre et l'espace, puis frappent par ...e5 pour lancer une attaque sur l'aile roi.",
  'd4 Nf6 c4 c5': 'La Benoni : provoque d5, ce qui fige le centre et donne aux noirs la colonne e et la poussée ...b5 pour contre-jeu.',
  'd4 Nf6 c4 e6 g3': 'Le catalan : combine le gambit dame et le fianchetto ; le fou g2 pèse sur d5 et sur toute la diagonale jusqu’à l’aile dame noire.',
  'd4 Nf6 Bg5': 'Le Trompowsky : évite la théorie indienne dès le second coup, en menaçant de doubler les pions par Bxf6.',

  // --- Anglaise et Réti ---
  'c4 e5': 'L’anglaise inversée : les noirs prennent le centre, la position revient à une sicilienne avec un temps de plus pour les blancs.',
  'c4 c5': 'L’anglaise symétrique : jeu de manœuvres où le premier à rompre au centre prend un risque structurel.',
  'c4 Nf6': 'Garde toutes les transpositions ouvertes vers les défenses indiennes.',
  'Nf3 d5': 'Les noirs prennent le centre ; les blancs jouent en général c4 ou g3 pour l’attaquer de flanc (système Réti).',
}

export const FAMILY_PLANS: Record<string, string> = {
  "King's Pawn Game": 'Ouverture du pion roi : développement rapide, roque tôt et lutte immédiate pour le centre.',
  'Sicilian Defense':
    'Structure asymétrique : les blancs attaquent sur l’aile roi (souvent par f4-g4 ou une attaque anglaise Be3/f3/Qd2), les noirs contre-attaquent sur la colonne c et l’aile dame par ...b5 et ...Rc8.',
  'French Defense':
    'La chaîne de pions décide : les noirs frappent la base d4 par ...c5, les blancs jouent sur l’espace et l’aile roi. Tout tourne autour de l’activation du fou c8.',
  'Caro-Kann Defense':
    'Structure saine et fou dame actif. Les noirs acceptent moins d’espace en échange d’un finale confortable ; les blancs cherchent à exploiter leur avance de développement rapidement.',
  'Ruy Lopez':
    'Pression durable sur e5 via c6. Les blancs manœuvrent (Re1, c3, d4, Nbd2-f1-g3), les noirs choisissent entre la défense solide ...d6 et le contre-jeu ...b5, ...Na5 ou ...d5.',
  'Italian Game':
    'Le fou c4 vise f7. Le jeu moderne est lent (c3, d3, Nbd2, Re1) et se transforme en attaque à l’aile roi si les noirs tardent.',
  'Scotch Game': 'Centre ouvert et pièces actives dès le début ; les blancs jouent le développement rapide plutôt que la pression à long terme.',
  "King's Gambit": 'Sacrifice de pion pour la colonne f et le centre. Jeu direct, où chaque tempo compte.',
  'Scandinavian Defense': 'Les noirs simplifient tôt ; la dame noire doit trouver une case sûre pendant que les blancs développent avec tempo.',
  'Alekhine Defense': 'Provocation assumée : le cavalier noir invite les pions blancs à avancer pour devenir des faiblesses.',
  'Pirc Defense': 'Position compacte et fianchetto : les noirs frappent le centre par ...e5 ou ...c5 une fois le développement achevé.',
  'Modern Defense': 'Même idée que la Pirc, en gardant le cavalier g8 flexible pour choisir plus tard la structure.',
  "Queen's Gambit": 'Lutte pour d5 : les blancs cherchent la poussée e4 ou une minorité de pions à l’aile dame ; les noirs doivent résoudre le problème du fou c8.',
  "Queen's Gambit Declined": 'Solidité maximale. Le plan classique blanc est l’attaque de minorité b4-b5 sur l’aile dame.',
  'Slav Defense': 'Le fou c8 respire. Les noirs peuvent prendre en c4 et tenir le pion par ...b5, ce qui donne des positions très concrètes.',
  'Nimzo-Indian Defense':
    'Le fou contre le cavalier c3 : les noirs échangent la paire de fous contre une structure blanche affaiblie, puis bloquent le centre par ...d5 ou ...c5.',
  "King's Indian Defense":
    'Les noirs ferment le centre par ...e5-e4 et lancent ...f5-f4-g5 sur le roi blanc, pendant que les blancs percent par c4-c5 à l’aile dame. Course de vitesse.',
  'Grunfeld Defense': 'Hypermodernisme pur : le centre blanc est imposant mais devient une cible pour ...c5, ...Bg7 et la pression sur d4.',
  'Benoni Defense': 'Déséquilibre assumé : majorité de pions noire à l’aile dame contre espace blanc au centre et à l’aile roi.',
  'Catalan Opening': 'Le fou g2 est l’âme de l’ouverture : pression permanente sur d5 et c6, souvent pour un pion temporairement sacrifié.',
  'English Opening': 'Jeu de flanc : les blancs contrôlent d5 et gardent la possibilité de transposer vers presque toutes les ouvertures fermées.',
  'Reti Opening': 'Le centre est attaqué à distance ; les blancs choisissent leur structure une fois celle des noirs révélée.',
  'Dutch Defense': 'Les noirs jouent pour l’attaque sur l’aile roi (Stonewall, Leningrad) au prix d’un affaiblissement durable de e5 et de la diagonale a2-g8.',
  'London System': 'Développement automatique et sûr ; le plan est Ne5, f4 et une attaque lente sur l’aile roi.',
  'Petrov Defense': 'Symétrie et échanges : les noirs neutralisent l’initiative blanche plutôt que de la contrer.',
  "Russian Game": 'Symétrie et échanges : les noirs neutralisent l’initiative blanche plutôt que de la contrer.',
  'Vienna Game': 'Nc3 avant Nf3 : les blancs gardent la poussée f4 en réserve.',
  "Bishop's Opening": 'Développement rapide du fou vers f7, souvent pour transposer vers la viennoise ou l’italienne.',
  'Philidor Defense': 'Position dense et sans faiblesse, mais peu d’espace : les noirs doivent trouver le bon moment pour ...d5 ou ...f5.',
  'Four Knights Game': 'Symétrie complète ; les blancs cherchent à rompre par d4 ou Nd5 pour créer un déséquilibre.',
  'Queen’s Indian Defense': 'Contrôle de e4 par le fou b7 et le cavalier f6 ; jeu de manœuvres à faible risque.',
  "Queen's Indian Defense": 'Contrôle de e4 par le fou b7 et le cavalier f6 ; jeu de manœuvres à faible risque.',
  'Trompowsky Attack': 'Coup de fou précoce pour imposer une structure inhabituelle et éviter la théorie préparée.',
  'Bird Opening': 'Contrôle de e5 dès le premier coup, avec un jeu de type hollandaise inversée.',
  'Zukertort Opening': 'Développement neutre : les blancs choisissent leur plan après avoir vu la réponse noire.',
}

/** URL de la page Wikibooks correspondant a une ligne (theorie detaillee, CC BY-SA). */
export function wikibooksUrl(sans: string[]): string {
  const base = 'https://en.wikibooks.org/wiki/Chess_Opening_Theory'
  const segments = sans.map((san, index) =>
    index % 2 === 0 ? `${index / 2 + 1}._${san}` : `${(index + 1) / 2}...${san}`,
  )
  return segments.length === 0 ? base : `${base}/${segments.join('/')}`
}
