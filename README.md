# Arbre des ouvertures d'échecs

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
  sur le dernier nœud théorique atteint, avec un bouton pour revenir dans la théorie.
- Sélecteur de promotion, retournement de l'échiquier, boutons début / reculer / avancer, flèches `←` `→`.

### Visualisation en branches
- Arbre préfixe de toutes les ouvertures : chaque nœud est un coup, chaque chemin une variante.
- Dépliage progressif branche par branche (bouton `+` / `–`), avec `+ N autres coups` pour les nœuds
  très ramifiés.
- Épaisseur des branches proportionnelle au nombre de variantes en aval ; code ECO et nom de variante
  affichés sur chaque nœud nommé.
- Pan / zoom à la souris, à la molette et au **pincement tactile**, boutons vue d'ensemble et recentrage.
- Recherche instantanée par nom d'ouverture, famille ou code ECO — la sélection déplie et centre la branche.

### Pourquoi ce coup ?
- Onglet **Idées** : commentaire théorique rédigé pour les lignes principales (une centaine de coups des
  grandes ouvertures) et **plan directeur** de la famille (sicilienne, française, nimzo-indienne…).
- Hors de ces lignes, une **analyse automatique de la position** repère les motifs classiques : occupation
  et contrôle du centre, développement, roque, fianchetto, prophylaxie (…a6 contre Bb5), clouages et
  enfilades, pièces attaquées, gain d'espace.
- Les deux sont clairement distingués : « Théorie » pour le texte rédigé, « Analyse de la position » pour
  ce qui est déduit automatiquement, afin de ne jamais faire passer une heuristique pour de la théorie.
- Lien direct vers la page **Wikibooks** correspondant exactement à la ligne affichée.

### Moteur Stockfish et barre d'évaluation
- **Barre d'évaluation** verticale collée à l'échiquier : avantage blanc / noir en temps réel, mat annoncé.
- **Stockfish 18** (WASM, GPL-3.0) tourne dans un Web Worker, **en local dans le navigateur** : aucune
  donnée n'est envoyée ailleurs. Variante *lite single-thread* (~7 Mo) : aucun en-tête COOP/COEP requis.
- Trois meilleures variantes affichées avec leur évaluation, cliquables pour être jouées.
- Dès que la ligne sort du répertoire, le moteur met en avant le meilleur coup de la position.
- Le moteur est désactivé par défaut et se charge à la demande (le choix est mémorisé).

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
- Vue **« Mon répertoire »** : l'arbre ne montre plus que les branches travaillées ou jouées.
- Barre de progression, liste du répertoire, export JSON, réinitialisation. Tout est conservé en local
  (`localStorage`), sans compte ni serveur.

### Import de parties (Lichess et Chess.com)
- **Lichess** : pseudo + API publique.
- **Chess.com** : pseudo + archives mensuelles publiques ; l'import **remonte tout l'historique**, du mois
  le plus récent au plus ancien, avec l'avancement affiché mois par mois.
- Quantité réglable : **100, 500, 2 000 ou 5 000 parties**. Les deux pseudos sont mémorisés séparément.
- **Depuis un PGN** : sélection de fichier, collage direct, ou **glisser-déposer** du `.pgn` n'importe où
  sur la page. Les parties depuis position personnalisée et les variantes non standard sont écartées.
- Chaque partie est rejouée et placée sur la branche théorique la plus profonde qu'elle atteint ;
  l'ouverture est identifiée automatiquement (code ECO + nom).
- Pastille violette sur les nœuds traversés par vos parties, bilan gains / nulles / défaites par branche.
- **Rejouer une partie hors théorie** : l'ouvrir place le curseur là où la théorie s'arrête et greffe
  toute la suite réellement jouée en pointillés ambre. `▶` avance coup par coup dans la partie, `⏭` va à
  la fin, et le compteur indique la position dans la partie. Jusqu'à 160 demi-coups conservés par partie.

### Statistiques Lichess
Pour la position courante, l'onglet *Lichess* interroge l'**Opening Explorer** (parties blitz / rapide /
classique, Elo 1600+) : répartition des résultats et coups les plus joués, cliquables pour naviguer dans l'arbre.

### Responsive
- **Bureau** : panneau latéral fixe (échiquier, liste de coups, onglets Étude / Parties / Lichess) et arbre plein cadre.
- **Mobile / tablette** : arbre en plein écran avec navigation par pincement, barre d'onglets inférieure
  (Arbre · Position · Étude · Parties), cibles tactiles ≥ 40 px.
- Navigation clavier : `←` remonte d'un coup, `→` descend dans la variante principale.
- Échiquier tactile : les pièces se déplacent au doigt, les cases restent carrées à toute largeur.

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
| `npm run smoke` | Rend les composants hors navigateur pour détecter toute erreur de rendu |

## Données

- **Ouvertures** : [`lichess-org/chess-openings`](https://github.com/lichess-org/chess-openings) (CC0),
  3 810 variantes de A00 à E99, jusqu'à 36 demi-coups. Les TSV sources sont conservés dans `data/raw/`
  et l'arbre compilé dans `public/openings.json` (1,2 Mo, ~180 Ko une fois compressé).
- **Statistiques et parties** : API publiques de [lichess.org](https://lichess.org/api), sans authentification.
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
publiques de lichess.org et api.chess.com, uniquement quand vous demandez un import ou les statistiques.
