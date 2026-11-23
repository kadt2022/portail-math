# @mbuyamba/riviere-fractions — La Rivière des Fractions 3D

Jeu de navigation et de fractions de Yamba Academy, livré comme un module autonome. L'enfant pilote un bateau sur une
rivière en 3D : à chacun des sept embranchements du niveau 1, la voie empruntée est sa réponse.

Le module ne connaît pas le portail. Il fournit sa scène et ce qu'un lecteur de jeux attend. L'hôte, lui, apporte son
lecteur, son écran de chargement et la langue choisie.

## Contenu

| Dossier | Responsabilité | Dépend de |
| --- | --- | --- |
| `src/domain/` | Fractions exactes, sept familles de défis, tentatives, questions à retravailler, niveau | rien |
| `src/application/` | Session de la traversée : relie le domaine, la scène (par un port) et la vue | `domain/` |
| `src/i18n/` | Textes du jeu en français et en anglais | rien |
| `src/engine/geometry/`, `src/engine/navigation/`, `src/engine/audio/` | Tracé, terrain, modèles, bateau du joueur (`geometry/boat/`), physique et animation du bateau, autres bateaux, sons (TypeScript pur) | rien |
| `src/engine/scene/` | Scène Babylon.js : rendu, caméra, panneaux, verdicts | `engine/`, `@babylonjs/core` |
| `src/ui/` | Composants React de la scène : question, commandes ◀ ▶, messages | `application/`, `i18n/` (types du domaine seulement) |
| `src/adapters/` | Liaison React et lecteur standard, chargement à la demande du moteur 3D | tout le module |
| `tests/` | Tests du module, exécutables hors du portail | |

Ces frontières sont vérifiées par `tests/architecture/boundaries.test.ts`. Le moteur ne connaît pas les règles. Le
domaine ne connaît ni React ni Babylon.js. L'interface ne calcule rien et ne charge jamais Babylon.js. Aucun import ne
sort du dossier du module.

## Contrat public (`src/index.ts`)

```ts
import { preloadRiverFractionsEngine, toRiverLocale, useRiverFractions } from "@mbuyamba/riviere-fractions";

const game = useRiverFractions({ locale: "fr", active: true, onEvent: (event) => save(event) });
// game.stage   : la scène, à placer dans le lecteur
// game.player  : titre, compteurs, paused/onPlay/onPause, onRestart, onHint, howTo… pour le lecteur standard
// game.loading : progress, ready, failed, unsupported, retry()
// game.sound   : on, toggle(), label
```

- **Charger à la demande** : le moteur 3D (Babylon.js) est un morceau à part, demandé par `preloadRiverFractionsEngine()`
  ou à l'ouverture du jeu, jamais avant.
- **Monter et démonter** : le jeu vit avec le composant React qui appelle `useRiverFractions`. En le retirant, la
  boucle de rendu s'arrête, la scène, le moteur et le son sont libérés, et le canevas est retiré.
- **Démarrer, mettre en pause, reprendre, recommencer** : `player.onPlay`, `player.onPause`, `player.onRestart`, et
  `active: false` quand le jeu n'est plus visible.
- **Paramètres autorisés** : `locale`, `active`, `onEvent`, `seed` (tests), `showPerformance`, `maxPixelRatio`,
  `loadEngine` (chargeur remplaçable).
- **Événements** (`RiverGameEvent`) : `attempt-started`, `challenge-answered`, `attempt-failed`, `level-completed`. C'est
  le point d'extension prévu pour les futurs comptes et la sauvegarde de progression (rien n'est stocké aujourd'hui).

## Dépendances

- `@babylonjs/core` (Apache 2.0), en imports modulaires : seul le chemin WebGL est téléchargé.
- `react` et `react-dom` 19, en dépendances de pair : l'hôte les fournit.
- Le bundler de l'hôte doit accepter les modules CSS (`*.module.css`) et les imports dynamiques. Vite le fait.

Le module ne télécharge aucune image ni aucun son : la rivière, le paysage, les bateaux et les sons sont générés au
chargement.

## Vérifier

Depuis `frontend/packages/riviere-fractions` :

```sh
npm run typecheck          # compilation stricte du module
npm test                   # tests du module, avec sa propre configuration
npm run verify:isolation   # assemblage isolé : copie hors du portail, dépendances déclarées seules, tsc + tests
```

`verify:isolation` copie le module dans un dossier temporaire et n'y relie que les paquets de son `package.json`. Il le
compile et y exécute tous ses tests. Un import vers le portail, vers un autre jeu ou vers un paquet non déclaré le fait
échouer.

## Extraire le module dans son propre dépôt

1. Copier `frontend/packages/riviere-fractions/` à la racine d'un nouveau dépôt.
2. `npm install` : le `package.json` du module déclare tout ce qu'il utilise.
3. `npm run typecheck && npm test` : le module se compile et se teste seul.
4. Publier le paquet (registre npm privé, ou dépendance git).

## Réimporter le module dans Yamba Academy (ou une autre application React)

1. Remplacer dans `frontend/package.json` la ligne `"@mbuyamba/riviere-fractions": "file:packages/riviere-fractions"`
   par la version publiée, puis `npm install`.
2. Garder l'hôte du portail tel quel : `frontend/src/games/riviere-fractions/RiviereFractionsPlayer.tsx` (lecteur
   standard, écran de chargement, bouton Son) et la page `/jeux/riviere-des-fractions`.
3. Dans une autre application, écrire un hôte équivalent : appeler `useRiverFractions`, afficher `game.stage` dans son
   propre cadre, et brancher `game.player` et `game.sound` sur ses propres commandes.

## Le bateau du joueur

Le bateau à moteur du joueur a son propre atelier, séparé du reste du paysage. Chaque composant a une seule
responsabilité :

| Fichier | Composant |
| --- | --- |
| `src/engine/geometry/boat/dimensions.ts` | Plan de formes (coque, plat-bord, bouchain) et cotes partagées (poste, volant, toit, moteur) |
| `src/engine/geometry/boat/hull.ts` | Coque : carène, flancs peints, tableau arrière, blocs de poupe, ponts, cockpit, plateformes, liston |
| `src/engine/geometry/boat/outboard.ts` | Moteur hors-bord (support fixe, capot, jambe, embase) et hélice |
| `src/engine/geometry/boat/canopy.ts` | Toit rigide, montants, LED bleues, projecteurs, gyrophare, radôme, antenne |
| `src/engine/geometry/boat/cockpit.ts` | Poste de pilotage : pare-brise, consoles, tableau de bord, volant, sièges |
| `src/engine/geometry/boat/accessories.ts` | Balcon et mains courantes, lanternes, bouée, glacière, cordage, feux de navigation |
| `src/engine/geometry/boat/pilot.ts` | Le jeune pilote, assis, mains sur le volant |
| `src/engine/navigation/boatMotion.ts` | Animation (TypeScript pur) : tangage, gîte, balancement, hélice, braquage du moteur |
| `src/engine/scene/playerBoat.ts`, `boatShaders.ts` | Assemblage Babylon.js : trois maillages, un seul matériau, décoration peinte sans texture |

L'animation ne modifie jamais la navigation : vitesse, cap et voie restent ceux de `navigation/boat.ts`.

L'atelier `dev/boat-showroom.html` montre le bateau seul, sous plusieurs angles, pour les réglages de finition. Il
n'est pas inclus dans le jeu. Avec le serveur de développement du portail :
`/app/packages/riviere-fractions/dev/boat-showroom.html?view=reference` (vues : `front`, `side`, `rear`,
`three-quarter`, `reference`, `cockpit`, `motor`, `top`, `game` ; options `speed`, `steer`, `frames`, `animate`).

## Éclairage

`src/engine/scene/lighting.ts` règle la lumière du niveau. Le soleil projette des ombres douces, le ciel éclaire
les faces à l'ombre, une brume légère couvre les lointains, et un étalonnage règle l'exposition, le contraste et la
saturation. La carte d'ombre couvre la région autour et devant le bateau ; elle n'est redessinée que lorsqu'il a
avancé de 40 m.

L'atelier `dev/river-views.html?s=150` montre la vraie scène, le bateau amarré à l'abscisse `s` et le temps figé. Les
mêmes adresses donnent les mêmes images, pour comparer un avant et un après. On peut ajouter `shadows=0` (sans ombres)
ou `grading=0` (sans étalonnage).

L'origine du code et les licences sont détaillées dans `ORIGINES.md`.

## Forêt d'essai (pas encore dans le jeu)

Sur un tronçon donné, `src/engine/geometry/trees/forest.ts` remplace les anciens feuillus, cerisiers, bambous et
buissons (faits de boules et de volumes empilés) par une forêt faite d'un seul arbre, l'arbre stylisé :

- huit teintes mêlées arbre par arbre : vert profond, forêt, émeraude, clair, jaune lumineux, olive, et quelques
  touches dorées et cuivrées ;
- trois étages : canopée, étage moyen, jeunes arbres sous les couronnes ; tailles, largeurs, orientations et
  inclinaisons variées ;
- des massifs denses, des zones moyennes et des clairières, jusqu'à 72 m de l'axe, en suivant le relief ;
- un sous-bois tiré des mêmes feuilles (`undergrowth.ts` : arbustes, plantes à larges feuilles, herbes) et un sol
  de sous-bois assombri sous les couronnes ;
- les lignes de vue vers les panneaux des portiques restent dégagées.

`src/engine/scene/forest.ts` dessine tout en instances : au plus un maillage par modèle et par niveau de détail. Les
distances de bascule sont 15, 32 et 62 m pour l'arbre, au-delà de quoi vient le niveau très lointain (216
triangles) ; les plantes hors du champ de la caméra ne sont pas dessinées.

Le jeu ne plante pas encore cette forêt. On la voit dans l'atelier : `dev/river-views.html?s=430&forest=410:590`,
avec `wide=500:42:-95` pour une vue aérienne, ou `far=0` et `under=0` pour mesurer sans le niveau très lointain ou
sans le sous-bois. `dev/tree-showroom.html?view=palettes&palettes` et `?view=sizes&sizes` montrent les teintes et
les tailles.

## Mesures

`showPerformance: true` (dans le portail : ajouter `?mesures` à l'adresse) affiche les images par seconde, les maillages
actifs, les triangles et le temps de préparation de la scène. Cela permet de relever les performances sur un vrai
téléphone.
