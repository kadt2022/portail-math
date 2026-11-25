# Passation — Le Train des multiplications 3D

Note pour l'agent qui reprend ce chantier (Claude Code ou autre). À lire en premier, avec `README.md` (architecture,
gabarits, rendu) et `ORIGINES.md` (origine du code, licences).

## Qui et comment

- L'utilisateur se fait appeler **Capitaine Pi** : s'adresser à lui ainsi, avec respect, en français. L'agent est
  appelé « Monstre des mers ». Un relecteur, « le Sage » (ou « Sage Protecteur »), relaie parfois des consignes et des
  affirmations techniques : les vérifier à la source avant de s'y fier.
- **Aucun commit, push, PR ou fusion sans autorisation explicite du Capitaine Pi**, donnée pour chaque fois. Ne jamais
  fusionner une PR sans sa revue et son feu vert.
- Règles du dépôt : `AGENTS.md` (nouvelle évolution = nouvelle branche depuis `main` à jour). Pour ce jeu, le Capitaine
  a demandé de **continuer sur `feat/train-multiplications`**.
- Ne pas modifier les autres jeux, ni le lecteur standard `frontend/src/games/player/GamePlayer.tsx`.
- **Doctrine technologique (Yamba Studio)** : API modernes, stables, maintenues et documentées ; vérifier les
  affirmations techniques à la source (les déclarations installées dans `node_modules/@babylonjs/core` font foi) ;
  une technique ancienne se garde si elle a un avantage démontrable (simplicité, compatibilité, performances). Ne pas
  confondre modernité et performance garantie : mesurer.
- Le Capitaine valide lui-même visuellement et fonctionnellement : vérifications essentielles seulement, pas de
  cycles de captures à n'en plus finir.

## Périmètre fixé (TRAIN-MULT-01 à 05)

- **Seulement le système ferroviaire** : train, voies, aiguillage, ponts, tunnels, gares, signaux, marchandises,
  conduite, caméras.
- **Interdit pour l'instant** : végétation (arbres, forêts, fleurs, herbes), humains, animaux, villes et paysages
  décoratifs, missions pédagogiques. Le relief se limite à ce qu'exigent les ouvrages.
- Node Geometry et la génération organique sont réservés au futur **magasin de ressources 3D** (projet séparé). Ne
  pas migrer vers Babylon Lite.

## Le module

Paquet autonome `frontend/packages/train-multiplications` (`@mbuyamba/train-multiplications`) : Babylon.js 9.37
(imports modulaires), React 19, TypeScript, Vitest. Intégré au portail par la route `jeux/train-des-multiplications`
(`frontend/src/games/train-multiplications/`, catalogue, `embedded-games.ts`).

- `src/domain/` (TypeScript pur) : tracé à clothoïdes, rampes et dévers ; réseau de 2,8 km ; physique ; composition.
- `src/engine/geometry/` (TypeScript pur) : toute la géométrie procédurale ; `palette.ts` porte les couleurs **et la
  famille de matériau** de chaque couleur (béton, peinture, acier, laiton, bois, verre, mat, fruit).
- `src/engine/scene/` (Babylon seulement) : moteur, matériaux PBR (`materials.ts`), choix WebGPU/WebGL
  (`renderEngine.ts`), reflet du ciel (`environment.ts`), caméras (`cameraRig.ts`) et volumes à ne pas traverser
  (`clearance.ts`), fumée (`steam.ts`), train (`trainView.ts`).
- `src/world/anchors.ts` : points de placement du futur décor. `src/infrastructure.ts` : entrée réutilisable.
- Ateliers : `dev/train-views.html` (paramètres : `head`, `camera`, `route`, `frozen`, `quality`, `renderer`,
  `noclustered`, `nogpuparticles`, `diag`), `dev/stock-showroom.html`.
- `npm run verify:isolation` : le module se compile et se teste seul.

## État (tout est poussé, rien n'est fusionné)

Branche `feat/train-multiplications`, commit `a5eaa91` (TRAIN-MULT-01 à 05), plus cette passation.

1. **Réseau** : grand viaduc de pierre à deux étages, tunnel du mont Kibo (courbe, rampe), pont métallique sur la gorge
   à la sortie même de la montagne, tunnel de la Dent, halte du col, passage souterrain courbe, aiguillage (cœur et
   contre-rails), gare du village à deux voies.
2. **Identité visuelle** : infrastructures modernes (béton clair, acier bleu ardoise, garde-corps galvanisés, gares
   blanches à toits d'ardoise) ; train classique (rouge, noir, laiton). Les couleurs ne se règlent que dans
   `palette.ts`.
3. **Rendu moderne (MULT-04)** : PBR par famille (un sous-maillage par famille), reflet du ciel préfiltré
   (`HDRFiltering`, repli `realTimeFiltering`), WebGPU d'abord avec vrai repli WebGL (canevas neuf), 64 lampes de
   tunnel en `ClusteredLightContainer` (repli : flaques peintes), fumée en `GPUParticleSystem` (repli CPU).
4. **Tunnels élargis (MULT-05)** : gabarit calculé (`TUNNEL`, `GALLERY`, `TUNNEL_ENVELOPE` dans `structures.ts`,
   tableau dans le README, test « gabarit des tunnels ») ; 8,8 m entre parois, clé à 6,8 m, passages de service.
5. **Caméras** : derrière, cabine, latérale (plans de pont, plan « tube »), chargement, panorama ; bras à ressort.

## Points ouverts, à confirmer avec le Capitaine

- **WebGPU jamais vu à l'écran** : il démarre et dessine sans erreur dans le navigateur sans affichage, mais ce
  navigateur (SwiftShader) ne permet pas de photographier son image. À valider sur un vrai appareil (`?rendu=webgpu`).
- **Appels de dessin presque doublés** par le PBR (un par famille) : 76 → 147 sur le viaduc, 109 → 189 dans le tunnel.
  Piste : fusionner les pièces de chaque véhicule, ou un matériau à nœuds unique lisant la famille par sommet.
- **Poids** : moteur du jeu 311 Ko compressés (+72 Ko de WebGPU pour les seuls appareils compatibles).
- **Aucune mesure sur vrai téléphone.** Les mesures en rendu logiciel ne valent que pour comparer avant/après.
- Petites retouches signalées : viaduc un peu clair en plein soleil ; couvertines des murs inclinés très blanches ;
  vue de chargement sur la voie 2 en partie masquée par l'auvent du quai central ; fumée blanche dans les tunnels.

## Vérifications utiles

- `cd frontend/packages/train-multiplications && npx vitest run && npx tsc --noEmit -p tsconfig.json`
- `cd frontend && npx eslint packages/train-multiplications/src packages/train-multiplications/tests`
- Captures : serveur `cd frontend && npx vite --host 127.0.0.1 --port 5173`, puis
  `/app/packages/train-multiplications/dev/train-views.html?head=1400&camera=behind&frozen&renderer=webgl` dans Chrome
  avec `--use-angle=swiftshader`. Pour WebGPU : `--enable-unsafe-webgpu --enable-features=Vulkan`
  `--use-vulkan=swiftshader --use-webgpu-adapter=swiftshader` (démarre, mais l'image reste vide en capture).
