# Arbre des ouvertures d'échecs

Application web qui affiche les **3 810 ouvertures répertoriées par Lichess** sous forme d'arbre de
branches interactif, permet de **suivre sa progression** (exploré / à l'étude / acquis) et d'**importer
ses propres parties** pour les voir se poser automatiquement sur la branche jouée.

## Fonctionnalités

### Visualisation en branches
- Arbre préfixe de toutes les ouvertures : chaque nœud est un coup, chaque chemin une variante.
- Dépliage progressif branche par branche (bouton `+` / `–`), avec `+ N autres coups` pour les nœuds
  très ramifiés.
- Épaisseur des branches proportionnelle au nombre de variantes en aval ; code ECO et nom de variante
  affichés sur chaque nœud nommé.
- Pan / zoom à la souris, à la molette et au **pincement tactile**, boutons vue d'ensemble et recentrage.
- Recherche instantanée par nom d'ouverture, famille ou code ECO — la sélection déplie et centre la branche.

### Suivi de progression
- Toute branche visitée est automatiquement marquée **explorée** (le chemin parcouru reste visible en couleur).
- L'utilisateur valide lui-même le statut d'une branche : **à l'étude** ou **acquise**.
- Le statut se propage visuellement : une branche repliée se colore selon la variante la plus avancée
  qu'elle contient.
- Vue **« Mon répertoire »** : l'arbre ne montre plus que les branches travaillées ou jouées.
- Barre de progression, liste du répertoire, export JSON, réinitialisation. Tout est conservé en local
  (`localStorage`), sans compte ni serveur.

### Import de parties
- **Depuis Lichess** : saisir un pseudo, l'application récupère les 60 dernières parties via l'API publique.
- **Depuis un PGN** : bouton de sélection de fichier, collage direct, ou **glisser-déposer** du `.pgn`
  n'importe où sur la page.
- Chaque partie est rejouée et placée sur la branche théorique la plus profonde qu'elle atteint ;
  l'ouverture est identifiée automatiquement (code ECO + nom).
- Pastille violette sur les nœuds traversés par vos parties, bilan gains / nulles / défaites par branche,
  et clic sur une partie pour ouvrir sa branche avec la suite jouée hors théorie.

### Statistiques Lichess
Pour la position courante, l'onglet *Lichess* interroge l'**Opening Explorer** (parties blitz / rapide /
classique, Elo 1600+) : répartition des résultats et coups les plus joués, cliquables pour naviguer dans l'arbre.

### Responsive
- **Bureau** : panneau latéral fixe (échiquier, liste de coups, onglets Étude / Parties / Lichess) et arbre plein cadre.
- **Mobile / tablette** : arbre en plein écran avec navigation par pincement, barre d'onglets inférieure
  (Arbre · Position · Étude · Parties), cibles tactiles ≥ 40 px.
- Navigation clavier : `←` remonte d'un coup, `→` descend dans la variante principale.

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
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Vérification TypeScript + build de production |
| `npm run verify` | Contrôle la légalité des 8 652 coups de l'arbre et le placement d'une partie |
| `npm run smoke` | Rend les composants hors navigateur pour détecter toute erreur de rendu |

## Données

- **Ouvertures** : [`lichess-org/chess-openings`](https://github.com/lichess-org/chess-openings) (CC0),
  3 810 variantes de A00 à E99, jusqu'à 36 demi-coups. Les TSV sources sont conservés dans `data/raw/`
  et l'arbre compilé dans `public/openings.json` (1,2 Mo, ~180 Ko une fois compressé).
- **Statistiques et parties** : API publiques de [lichess.org](https://lichess.org/api), sans authentification.

## Architecture

```
scripts/build-openings.mjs   Construction de l'arbre préfixe depuis les TSV Lichess
scripts/verify.mjs           Contrôles de cohérence des données
scripts/smoke.tsx            Rendu hors navigateur des composants
src/lib/tree.ts              Arbre enrichi, recherche, navigation
src/lib/chess.ts             Rejeu des coups, position, notation (chess.js)
src/lib/progress.ts          Statuts d'étude, propagation aux branches, persistance
src/lib/games.ts             Parsing PGN, import Lichess, placement dans l'arbre
src/lib/explorer.ts          Opening Explorer Lichess
src/components/OpeningTree   Visualisation SVG (d3-hierarchy) + pan/zoom tactile
```

Stack : React 19, TypeScript, Vite 7, Tailwind CSS 4, chess.js, d3-hierarchy.
