# Arbre des ouvertures d'échecs

**Application en ligne : https://zoheirhadid.github.io/chess-openings/**

Application web qui affiche les **3 810 ouvertures répertoriées par Lichess** sous forme d'arbre de
branches interactif : échiquier jouable, suivi de progression (exploré / à l'étude / acquis), import de
vos parties **Lichess et Chess.com**, explication théorique de chaque coup, coloration des branches selon
les résultats réels, et analyse **Stockfish** dès que la partie sort de la théorie.

## Fonctionnalités

### Échiquier jouable
- Pièces déplaçables au **glisser-déposer** ou en **deux clics**, sur un échiquier de facture classique
  (palette verte type chess.com, cases strictement carrées, pièces vectorielles Cburnett).
- Les destinations légales s'affichent en points : **vert** si le coup existe dans l'arbre théorique,
  gris sinon. L'arbre suit chaque coup joué et recentre la branche correspondante.
- Un coup hors répertoire ne bloque rien : la ligne se poursuit et vient se **greffer en pointillés ambre**
  sur le dernier nœud théorique atteint, avec un bouton pour revenir dans la théorie. Le coup hors
  théorie affiché sur l'échiquier est surligné en **rouge** dans l'arbre (bleu pour un coup de théorie),
  et reste toujours visible, même au-delà de « + N autres coups ».
- Sélecteur de promotion, retournement de l'échiquier, boutons début / reculer / avancer, flèches `←` `→`.

### Visualisation en branches
- Arbre préfixe de toutes les ouvertures : chaque nœud est un coup, chaque chemin une variante.
- Dépliage progressif branche par branche (bouton `+` / `–`), avec `+ N autres coups` pour les nœuds
  très ramifiés.
- Épaisseur des branches proportionnelle au nombre de variantes en aval ; code ECO et nom de variante
  affichés sur chaque nœud nommé. Les chiffres d'un nœud sont distingués : pastille grise avec icône de
  ramification = **variantes théoriques en aval** (catalogue), pastille blanche / noire étiquetée
  **« moi »** = **vos parties importées** (blancs / noirs), pourcentage coloré = **score des blancs sur
  Lichess** (mode Résultats). Une légende permanente le rappelle en haut de l'arbre.
- Pan / zoom à la souris, à la molette et au **pincement tactile**, boutons vue d'ensemble et recentrage.
- **Noms d'ouvertures en français** partout (arbre, échiquier, recherche, parties, étude) : les familles
  courantes ont leur nom consacré (partie espagnole, défense est-indienne, gambit dame refusé…), les
  variantes sont traduites avec accord (variante Najdorf, attaque anglaise, contre-gambit Falkbeer…). Une
  icône sobre `en` à côté du nom donne l'anglais d'origine au survol et le bascule d'une touche.
- Recherche instantanée par nom d'ouverture (français ou anglais), famille ou code ECO — la sélection déplie
  et centre la branche.
- À chaque coup joué sur l'échiquier, partie ouverte ou chemin choisi, la vue **zoome sur la branche** :
  le **dernier coup joué** est cadré avec le **coup suivant le plus joué** (bilan Lichess, à défaut la
  variante principale), signalé par une étoile bleue, pour que les deux restent visibles. Si l'on a
  déplacé la vue entre-temps, l'arrivée tardive des statistiques ne la recentre plus.

### Pourquoi ce coup ?
- Une **pastille minuscule** se pose sur la case où la dernière pièce s'est arrêtée. Elle affiche la
  **classification du coup** dès que le moteur a tranché (`!!` brillant, `!` excellent, `★` meilleur,
  `✓` bon, `?!` imprécision, `?` erreur, `✗` occasion manquée, `??` gaffe). Un **livre marron** signale
  un coup de théorie, comme sur chess.com : il prime sur les bonnes notes, seules les fautes relevées par
  le moteur restent visibles. Le classement est **systématique** : moteur éteint, un coup de théorie
  porte d'office le livre et un coup hors théorie est évalué en tâche de fond ; la pastille ne reste
  « i » que le temps du calcul. Au **survol** (ou d'une touche sur mobile), une bulle donne l'idée du coup sans
  quitter l'échiquier.
- Commentaire théorique rédigé pour les lignes principales (une centaine de coups des
  grandes ouvertures) et **plan directeur** de la famille (sicilienne, française, nimzo-indienne…).
- **Le coup est aussi critiqué**, pas seulement décrit. Deux niveaux :
  - *Ce que le coup concède* : pièce attaquée et non défendue, capture avantageuse laissée à
    l'adversaire, sortie précoce de la dame, pion avancé devant le roi roqué, cavalier au bord, droit de
    roque perdu, même pièce déplacée trois fois pendant le développement.
  - *Verdict du moteur* (si Stockfish est activé) : **Brillant / Excellent / Meilleur coup / Très bon /
    Bon / Théorie / Imprécision / Erreur / Occasion manquée / Gaffe**, avec la perte en pions et le coup
    que le moteur aurait joué. Le classement suit les critères de Lichess et chess.com : perte en
    **pourcentage de victoire** (< 2 très bon, < 5 bon, < 10 imprécision, < 20 erreur, au-delà gaffe),
    « brillant » pour un sacrifice sain qui est le meilleur coup, « excellent » pour le seul bon coup
    (la seconde variante du moteur perd nettement plus), « occasion manquée » quand un gain net s'évapore,
    « théorie » pour tout coup de l'arbre qui n'est pas une faute.
    L'évaluation de la position précédente est calculée en tâche de fond pour permettre cette
    comparaison, et le verdict n'est rendu qu'à partir d'une profondeur suffisante (10 demi-coups) pour ne
    pas juger avant que le moteur ait vu la réfutation.
  - *Pourquoi c'est une faute* : pour une imprécision, une erreur, une occasion manquée ou une gaffe,
    les motifs positifs génériques disparaissent au profit d'une explication construite sur Stockfish :
    **bascule d'évaluation** avant / après (en pions et en % de chances de gain), **ce que le coup
    concède** (pièce en prise, roque perdu, idée que la réponse adverse obtient : développement avec
    tempo, espace, centre…), **le coup qu'il fallait jouer** avec sa variante et ses idées, et
    **comment l'adversaire en profite** (mat forcé, capture avec échec, fourchette, pièce menacée,
    matériel perdu au bout de la variante). Disponible moteur éteint aussi, grâce aux évaluations
    d'arrière-plan.
  - *Expliquer avec l'IA* : un bouton demande à une **IA générative gratuite** une explication en
    français à partir de ces faits Stockfish (sans inventer de variantes). Fournisseurs proposés :
    Google Gemini, Groq, OpenRouter (modèles `:free`) ou Ollama en local, via leur API compatible
    OpenAI ; la clé, saisie une fois, reste dans le navigateur.
- Hors de ces lignes, une **analyse automatique de la position** repère les motifs classiques : occupation
  et contrôle du centre, développement, roque, fianchetto, prophylaxie (…a6 contre Bb5), clouages et
  enfilades, pièces attaquées, gain d'espace.
- Les deux sont clairement distingués : « Théorie » pour le texte rédigé, « Analyse de la position » pour
  ce qui est déduit automatiquement, afin de ne jamais faire passer une heuristique pour de la théorie.
- Lien direct vers la page **Wikibooks** correspondant exactement à la ligne affichée.
- **Vidéo francophone** : le nom de l'ouverture sous l'échiquier est cliquable. Il ouvre une vidéo
  YouTube en français repérée pour cette famille (italienne, espagnole, sicilienne, française,
  Caro-Kann, écossaise, Philidor, système de Londres) ou, à défaut, une recherche YouTube construite
  avec le nom français de l'ouverture. Le marqueur ▶ est rouge pour une vidéo précise, gris pour une
  recherche. Table dans `src/data/openingVideos.ts`.

### Moteur Stockfish et barre d'évaluation
- **Barre d'évaluation** verticale collée à l'échiquier : avantage blanc / noir en temps réel, mat annoncé.
- **Stockfish 18** (WASM, GPL-3.0) tourne dans un Web Worker, **en local dans le navigateur** : aucune
  donnée n'est envoyée ailleurs. Variante *lite single-thread* (~7 Mo) : aucun en-tête COOP/COEP requis.
- **Flèche verte** tracée sur l'échiquier vers le meilleur coup, et bouton dédié dans les commandes.
- Trois meilleures variantes affichées avec leur évaluation, cliquables pour être jouées.
- Dès que la ligne sort du répertoire, le moteur met en avant le meilleur coup de la position.
- Le moteur est désactivé par défaut et se charge à la demande (le choix est mémorisé).
- **Cloud Lichess** : pour toute position connue de lichess.org, l'évaluation cloud (souvent 40 à 60
  demi-coups de profondeur, calculée par les serveurs Lichess) est récupérée instantanément et affichée
  sous les variantes locales. Moteur éteint, elle alimente la barre d'évaluation ; elle sert aussi de
  référence au jugement des coups.
- **Jugement cohérent** : le coup joué est comparé sur deux évaluations de même origine (cloud des deux
  côtés si possible, sinon Stockfish local des deux côtés) pour ne pas mélanger profondeurs et versions de
  moteur. Le bandeau de verdict indique l'origine (⚙ local, ☁ cloud) et la profondeur.
- **Criticité de la position** : écart de chances de gain entre le meilleur coup et le second (sur
  l'analyse la plus profonde disponible) : *position critique* (un seul coup tient), *tranchante* ou
  *souple*.
- **Revue de toute la ligne** : chaque coup de la liste est jugé (les évaluations cloud de toutes les
  positions de la ligne sont demandées en cascade, les positions inconnues du cloud sont confiées au
  moteur local s'il est allumé). Les coups remarquables portent leur glyphe dans la liste (`!!`, `!`,
  `?!`, `?`, `✗`, `??`) et chaque camp reçoit une **précision** (moyenne des précisions par coup,
  formule Lichess : 100 % pour le meilleur coup, ~60 % pour une erreur, ~10 % pour une gaffe) avec le
  détail des fautes.
- **Transpositions** : l'arbre est un trie de coups, mais la même position peut être atteinte par
  plusieurs ordres (1.Nf3 Nf6 2.c4 e6 3.d4 = 1.d4 Nf6 2.c4 e6 3.Nf3). Un index position → nœuds
  (construit en arrière-plan au chargement, ~8 700 nœuds, 570 positions à ordres multiples) repère
  ces cas : hors théorie, « vous êtes en fait dans la théorie » avec un bouton *Rejoindre* qui bascule
  sur la ligne répertoriée ; en théorie, les autres ordres de coups sont listés.

### Couleur des branches : progression ou résultats
Un sélecteur en en-tête choisit ce que la couleur traduit :
- **Ma progression** : bleu (exploré), ambre (à l'étude), vert (acquis), avec propagation aux branches parentes.
- **Résultats** : chaque branche est colorée selon le **score réel des blancs** sur Lichess — bleu clair
  quand les blancs marquent mieux, rouge quand ce sont les noirs, gris à l'équilibre. L'épaisseur reflète
  la popularité et la teinte s'atténue quand l'échantillon est faible. Le pourcentage s'affiche sur le nœud.
  Une seule requête par position déplie tout un étage de branches ; les résultats sont mis en cache.

### Suivi de progression
- Toute branche visitée est automatiquement marquée **explorée** (le chemin parcouru reste visible en couleur).
- L'utilisateur valide lui-même le statut d'une branche : **à l'étude** ou **acquise**.
- Le statut se propage visuellement : une branche repliée se colore selon la variante la plus avancée
  qu'elle contient.
- Vue **« Mon répertoire »** : l'arbre ne montre plus que les branches travaillées ou jouées. Les branches
  s'y ouvrent seules, mais sous deux garde-fous — profondeur de 8 demi-coups et budget de 120 nœuds —
  sinon un répertoire nourri par des milliers de parties déplierait tout d'un coup. Un bandeau prévient
  quand l'affichage atteint la limite de 500 branches ; le bouton `+`/`–` fonctionne dans les deux modes
  et une branche repliée le reste jusqu'à ce qu'on y navigue.
- **Votre score contre la référence** : sur la branche affichée, l'onglet Étude compare votre pourcentage
  de points à celui des parties Lichess pour le même coup, avec l'écart en points.
- **« À travailler en priorité »** : les ouvertures à apprendre pour améliorer statistiquement votre score,
  classées par **priorité** = coût (parties × écart sous 50 %) + récurrence de vos propres **écarts de
  théorie** (une demi-partie par écart) ; tris alternatifs par coût, défaites ou score, regroupement par
  ouverture ou par branche, filtre par couleur. Un clic **rejoue directement sur l'échiquier le coup par
  lequel vous quittez la théorie le plus cher et le plus souvent** dans cette ligne (coup joué, occurrences
  et coups théoriques attendus affichés sur la ligne), avec son verdict et son explication ; `◀` ramène à la
  position théorique, où l'arbre montre les coups attendus. À défaut d'écart, le clic mène au nœud de
  l'ouverture. Le bandeau résume la ligne prioritaire et cet écart. Sur l'échiquier, la **bulle du dernier
  coup** explique alors où se situe le problème (« Dans N de vos parties, vous jouez X ici, N défaites »)
  et donne le **coup théorique préconisé** (le plus joué sur Lichess, avec le nom de sa variante) et les
  autres coups théoriques, chacun jouable d'un clic à la place de l'écart. Le même bloc apparaît pour tout
  coup qui quitte la théorie, même hors étude.
- **« Erreurs récurrentes »** : les coups par lesquels vous quittez la théorie à répétition (position, coup
  joué, coups théoriques attendus, nombre d'occurrences et score obtenu ensuite). Un clic rejoue le coup
  fautif sur l'échiquier, d'où l'on peut revenir dans la théorie et lancer « Jouer la théorie ».
- Barre de progression, liste du répertoire, export JSON, réinitialisation. Tout est conservé en local
  (`localStorage`), sans compte ni serveur.

### Jouer la théorie contre l'ordinateur
- Le bouton **🤖 Jouer la théorie** de l'en-tête lance une partie d'entraînement : vous jouez la couleur
  de l'échiquier (ou celle du filtre de couleur), l'ordinateur répond par **un coup de l'arbre tiré au
  sort**, pondéré par la richesse de la branche (les grandes lignes reviennent souvent, les lignes rares
  finissent par sortir). À force de parties, toutes les ouvertures défilent.
- Toute l'interface reste active : le nom de l'ouverture et son code ECO se mettent à jour sous
  l'échiquier à chaque coup, l'arbre suit la partie, le moteur et les explications restent disponibles.
- Pendant votre tour, l'arbre **ne déplie pas les suites** du nœud courant et n'étoile pas le coup le plus
  joué, pour ne pas souffler la réponse ; le bouton `💡 Indice` liste les coups théoriques possibles avec
  le nom de leur variante.
- **Réponse de l'ordinateur configurable** : *Aléatoire* (tirage pondéré, pour tout voir), *La plus
  jouée* (variante la plus fréquente sur Lichess, à défaut la variante principale) ou *Favorable pour
  moi* (variante qui vous réussit le mieux d'après les résultats Lichess, à défaut la plus jouée). Le
  choix est mémorisé.
- Un coup hors théorie est compté ✗ et les coups attendus sont affichés, avec `↶ Reprendre` pour revenir
  au dernier nœud théorique ; un coup théorique est compté ✓. Quand la théorie répertoriée s'arrête, la
  partie est gagnée : `🔁 Nouvelle partie` relance, `⇅ Changer de couleur` inverse les rôles.

### Import de parties (Lichess et Chess.com)
- **Lichess** : pseudo + API publique.
- **Chess.com** : pseudo + archives mensuelles publiques ; l'import **remonte tout l'historique**, du mois
  le plus récent au plus ancien, avec l'avancement affiché mois par mois.
- **Nombre de dernières parties libre** (champ numérique, 500 par défaut, mémorisé) : l'import remonte
  l'historique des plus récentes aux plus anciennes jusqu'à ce nombre. Les deux pseudos sont mémorisés
  séparément.
- **Depuis un PGN** : sélection de fichier, collage direct, ou **glisser-déposer** du `.pgn` n'importe où
  sur la page. Les parties depuis position personnalisée et les variantes non standard sont écartées.
- Chaque partie est rejouée et placée sur la branche théorique la plus profonde qu'elle atteint ;
  l'ouverture est identifiée automatiquement (code ECO + nom).
- Sur chaque branche, une **pastille indique combien de parties vous y avez jouées et avec quelle
  couleur** : compte des blancs à gauche sur fond clair, des noirs à droite sur fond sombre. Un clic
  ouvre la liste des parties qui passent par cette branche, avec leur **identifiant**, la couleur jouée,
  l'adversaire et le résultat — pour choisir laquelle suivre, en théorie comme hors théorie.
- **Vos coups réellement joués apparaissent dans l'arbre**, même hors théorie : les continuations de
  toutes les parties importées sont greffées en pointillés ambre sur le nœud où le répertoire s'arrête,
  fusionnées entre elles (une branche commune, puis les divergences), jusqu'à 14 demi-coups. Elles sont
  affichées **avant** les enfants théoriques pour rester visibles, et portent la pastille indiquant
  **combien de fois vous avez joué cette branche**.
- **Rejouer une partie hors théorie** : l'ouvrir place le curseur là où la théorie s'arrête, `▶` avance
  coup par coup dans la partie, `⏭` va à la fin, et le compteur indique la position dans la partie.
  Jusqu'à 160 demi-coups conservés par partie.
- **Choisir une partie à étudier** : dans l'onglet *Parties*, un clic sur une partie la met en évidence
  (« étudiée »), la place dans l'arbre des variantes et **retourne l'échiquier dans le sens où vous avez
  joué**. Si le pseudo n'a pas été reconnu à l'import (PGN sans nom saisi), la couleur est déduite du
  joueur présent dans la majorité des parties, puis des pseudos Lichess / Chess.com saisis ; à défaut,
  deux boutons `○` / `●` sur la ligne de la partie choisissent le camp à étudier, et ce choix est
  mémorisé. Sur mobile, un rappel de la partie suivie s'affiche sous l'échiquier.

### Onglet Analyse : moteur, statistiques, sources et IA
L'onglet *Analyse* rassemble tout ce que l'application sait du dernier coup joué.
- **Explication complète** du coup (commentaire théorique, verdict du moteur, pourquoi c'est une faute,
  ce que le coup apporte et concède, plan de l'ouverture, écart de théorie).
- **Score pratique (Lichess)** : ce que les humains tirent réellement du coup (points marqués sur les
  parties Lichess, popularité et rang parmi les coups de la position) confronté aux chances de gain
  attendues par le moteur. Un écart d'au moins 8 points révèle un **coup piégeux** (les humains font bien
  mieux que le moteur ne l'annonce : l'adversaire se trompe souvent) ou un **coup ingrat** (correct pour
  le moteur, difficile à jouer). En dessous de 50 parties, le bilan est signalé comme trop mince.
- **Expliquer ce coup avec l'IA** : pour tout coup (pas seulement les fautes), la requête envoyée au
  fournisseur d'IA est ancrée sur toutes les sources disponibles : commentaire théorique, motifs, verdict,
  variantes du cloud Lichess (à défaut du moteur local, une fois l'analyse terminée), score pratique et
  extrait Wikibooks. Le modèle n'est autorisé à citer que des coups présents dans ces données.
- **Sources documentaires** : l'article **Wikibooks « Chess Opening Theory »** de la position exacte
  (anglais, CC BY-SA, nettoyé du balisage et tronqué à ~1 400 caractères) avec un bouton *Traduire et
  résumer avec l'IA*, et le résumé de l'article **Wikipédia en français** de l'ouverture (retrouvé par
  son nom français, avec vignette). Les deux sont mis en cache dans le navigateur.
- **Opening Explorer** : répartition des résultats et coups les plus joués, cliquables pour naviguer
  dans l'arbre, sur deux bases au choix : **Amateurs** (parties Lichess blitz / rapide / classique,
  Elo 1600+) ou **Maîtres** (parties de tournoi, Elo 2200+). Le choix est mémorisé.

### Responsive
- **Bureau** : panneau latéral fixe (échiquier, liste de coups, onglets Étude / Parties / Lichess) et arbre plein cadre.
- **Mobile / tablette** : l'**échiquier est toujours affiché en tête de page**, quel que soit l'onglet
  (avec barre d'évaluation, nom de l'ouverture, boutons de navigation, liste de coups et panneau
  « jouer la théorie »). Dans l'onglet Arbre, l'arbre s'affiche en dessous ; la page défile et le bouton
  « Arbre en plein écran » fait descendre l'écran sur l'arbre, qui occupe alors toute la hauteur
  (« Revenir à l'échiquier » remonte). Le contenu ne dépasse jamais la largeur de l'écran.
- Barre d'onglets inférieure (Arbre · Étude · Lichess · Parties), cibles tactiles ≥ 44 px, zone sûre iOS
  respectée, zoom initial de l'arbre adapté aux petits écrans, hauteur en `100dvh` pour ne pas être rogné
  par la barre d'URL, et champs à 16 px pour éviter le zoom automatique d'iOS.
- Navigation clavier : `←` remonte d'un coup, `→` descend dans la variante principale.
- Échiquier tactile : les pièces se déplacent au doigt, les cases restent carrées à toute largeur.

## Déploiement

Le site est publié sur GitHub Pages par le workflow `.github/workflows/deploy.yml`, déclenché à chaque
poussée sur `main` : installation, `npm run verify`, `npm run smoke`, build, mise en ligne. Le moteur
Stockfish n'est pas versionné — le hook `prebuild` le copie depuis `node_modules` au moment du build.

## Démarrage

```bash
npm install
npm run data     # télécharge et construit public/openings.json (déjà versionné)
npm run dev      # http://localhost:5173
```

Build de production :

```bash
npm run build
npm run preview
```

## Scripts

| Script | Rôle |
| --- | --- |
| `npm run data` | Reconstruit l'arbre depuis les TSV Lichess (`--refresh` pour re-télécharger) |
| `npm run pieces` | Régénère le sprite SVG des pièces depuis `data/pieces/` |
| `npm run engine` | Copie Stockfish depuis `node_modules` vers `public/engine/` (automatique avant `dev`/`build`) |
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Vérification TypeScript + build de production |
| `npm run verify` | Contrôle la légalité des 8 652 coups de l'arbre et le placement d'une partie |
| `npm run smoke` | Rend les composants hors navigateur et vérifie les analyses (greffes, critiques, couleurs) |
| `npm run account -- chesscom <pseudo> [n]` | Importe et analyse un compte en ligne de commande : ouvertures jouées, branches faibles, suites hors théorie |

## Données

- **Ouvertures** : [`lichess-org/chess-openings`](https://github.com/lichess-org/chess-openings) (CC0),
  3 810 variantes de A00 à E99, jusqu'à 36 demi-coups. Les TSV sources sont conservés dans `data/raw/`
  et l'arbre compilé dans `public/openings.json` (1,2 Mo, ~180 Ko une fois compressé).
- **Statistiques, évaluations cloud et parties** : API publiques de [lichess.org](https://lichess.org/api)
  (Opening Explorer amateurs et maîtres, cloud-eval), sans authentification.
- **Sources documentaires** : [Wikibooks Chess Opening Theory](https://en.wikibooks.org/wiki/Chess_Opening_Theory)
  et [Wikipédia en français](https://fr.wikipedia.org) (CC BY-SA), via les API MediaWiki.
- **Pièces** : jeu Cburnett ([CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)), repris de
  `lichess-org/lila`. Sources dans `data/pieces/`, compilées en sprite SVG.
- **Moteur** : [Stockfish.js 18](https://github.com/nmrugg/stockfish.js) (GPL-3.0), copié depuis
  `node_modules` vers `public/engine/` (non versionné, ~7 Mo).
- **Commentaires théoriques** : rédigés pour ce projet, dans `src/data/openingIdeas.ts`.

## Architecture

```
scripts/build-openings.mjs   Construction de l'arbre préfixe depuis les TSV Lichess
scripts/build-pieces.mjs     Sprite SVG des 12 pièces
scripts/verify.mjs           Contrôles de cohérence des données
scripts/smoke.tsx            Rendu hors navigateur des composants
src/lib/tree.ts              Arbre enrichi, recherche, navigation
src/lib/chess.ts             Rejeu des coups, position, notation (chess.js)
src/lib/progress.ts          Statuts d'étude, propagation aux branches, persistance
src/lib/games.ts             Parsing PGN, import Lichess, placement dans l'arbre
src/lib/explorer.ts          Opening Explorer Lichess
src/lib/moveStats.ts         Score des blancs par coup (cache + file d'attente)
src/lib/engine.ts            Pilotage UCI de Stockfish dans un Web Worker
src/lib/explain.ts           Analyse automatique d'un coup (centre, clouage, roque…)
src/data/openingIdeas.ts     Commentaires théoriques et plans par famille
src/components/OpeningTree   Visualisation SVG (d3-hierarchy) + pan/zoom tactile
src/components/Chessboard    Échiquier jouable (glisser-déposer, deux clics, promotion)
```

Stack : React 19, TypeScript, Vite 7, Tailwind CSS 4, chess.js, d3-hierarchy, Stockfish 18 (WASM).

## Vie privée

Aucun compte, aucun serveur applicatif : progression, parties importées et réglages restent dans le
`localStorage` du navigateur. Le moteur tourne localement. Les seuls appels réseau sortants sont les API
publiques de lichess.org (statistiques, évaluations cloud) et api.chess.com (import), ainsi que les API de
Wikibooks et Wikipédia pour les sources documentaires. Aucune donnée personnelle n'y transite : seules la
position (FEN ou coups) et le nom de l'ouverture sont envoyés. L'IA générative n'est sollicitée que sur
demande, avec votre propre clé.
