# Passation — La Rivière des Fractions 3D

Note pour l'agent qui reprend ce chantier (Claude Code ou autre). À lire en premier.

## Qui et comment

- L'utilisateur se fait appeler **Capitaine Pi** : s'adresser à lui ainsi, avec respect, en français.
- L'agent est appelé « Monstre des mers ». Un relecteur, « le Sage », envoie parfois des consignes (codes SP-007,
  YAMBA-RIVER-…) : ce sont des consignes du Capitaine.
- **Aucun commit, push, PR ou fusion sans autorisation explicite et distincte du Capitaine Pi.** Ne jamais fusionner
  une PR sans revue et feu vert.
- Ne pas modifier sans demande : le lecteur standard (`frontend/src/games/player/GamePlayer.tsx`), la rivière et ses
  embranchements, le bateau, la caméra, les questions et règles, les autres jeux.
- Un chantier à la fois ; montrer avant/après (mêmes caméras) et des mesures avant de généraliser.

## Le module

Paquet autonome `frontend/packages/riviere-fractions` (`@mbuyamba/riviere-fractions`) : Babylon.js 9 en imports
modulaires, React 19, TypeScript, Vitest. `engine/geometry`, `engine/navigation` et `engine/audio` sont du TypeScript
pur ; `engine/scene` n'importe que `@babylonjs/core`. `npm run verify:isolation` vérifie qu'il se compile et se teste
seul. Origine du code et licences : `ORIGINES.md`.

## État des chantiers (non validés sauf mention)

1. **Bateau à moteur (RIVER-BOAT-01)** — livré, attend validation. `src/engine/geometry/boat/`,
   `src/engine/scene/playerBoat.ts`, atelier `dev/boat-showroom.html`.
2. **Éclairage** — livré, attend décision (garder, retoucher, ou mesurer sur téléphone avec `?mesures`).
   `src/engine/scene/lighting.ts` : soleil, ciel, ombres statiques régionales (recentrées tous les 40 m), étalonnage
   dans les matériaux (pas de post-traitement), brume. Coût mesuré en rendu logiciel : environ −26 % d'images/s.
3. **Arbre stylisé** — validé. `src/engine/geometry/trees/stylizedTree.ts` : 4 niveaux de détail
   (7 100 · 1 460 · 502 · 216 triangles). Le 4ᵉ (très lointain) a été ajouté pour la forêt : **à faire valider**.
4. **Forêt d'essai (YAMBA-RIVER-FOREST-02)** — livrée sur un seul tronçon (410 à 590 m), **active dans le jeu sur ce tronçon seulement** (`FOREST_TRIAL` dans `src/adapters/useRiverFractions.tsx`).
   - `geometry/trees/forest.ts` : 8 teintes mêlées, 3 étages, massifs et clairières jusqu'à 72 m de l'axe, lignes
     de vue des panneaux protégées, sol de sous-bois.
   - `geometry/trees/undergrowth.ts` : arbustes, plantes à larges feuilles, herbes.
   - `scene/forest.ts` : instances légères, un maillage par modèle et par niveau, tri par distance et champ de vue.
   - Option `forest: { from, to }` du moteur et de `buildLandscape` ; sans elle, rien ne change.
   - Mesures (même vue, rendu logiciel) : 182 k → 380 k triangles, 51 → 84 appels de dessin, +3,5 Mo graphiques,
     temps d'image ×1,6 à ×1,9. **Aucune mesure sur vrai téléphone encore.**
   - En attente du Capitaine : avis sur la forêt, le 4ᵉ niveau, et une éventuelle adresse d'essai dans le jeu pour
     mesurer sur téléphone (cela touche au branchement du jeu : demander d'abord).
   - Hors périmètre pour l'instant : montagnes, villages, autres éléments du paysage.

## Commandes

Depuis `frontend/packages/riviere-fractions` :

- tests du module : `npx vitest run` (126 tests) ; types : `npx tsc --noEmit -p tsconfig.json` ;
  isolation : `npm run verify:isolation`.
- lint (depuis `frontend`) : `npx eslint packages/riviere-fractions/src packages/riviere-fractions/dev packages/riviere-fractions/tests`.

Atelier (depuis `frontend`, `npx vite --host 127.0.0.1 --port 5173`, base `/app/`) :

- `/app/packages/riviere-fractions/dev/river-views.html?s=430&time=12&forest=410:590` — vue du bateau figée ;
  `wide=500:42:-95` vue aérienne, `cam=x,y,z,tx,ty,tz` caméra libre, `far=0` / `under=0` sans très lointain /
  sans sous-bois, `shadows=0`, `grading=0`. Expose `window.riverStats()`.
- `/app/packages/riviere-fractions/dev/tree-showroom.html?view=lods&lods`, `?view=palettes&palettes`,
  `?view=sizes&sizes`.
