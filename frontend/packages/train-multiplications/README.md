# Le Train des multiplications 3D

Module autonome de Yamba Academy (`@mbuyamba/train-multiplications`) : un vrai jeu ferroviaire en 3D avec Babylon.js.
Le joueur conduit une locomotive à vapeur et ses wagons de caisses de mangues sur une ligne de 2,8 km : grandes
courbes, rampes et pentes, un grand viaduc de pierre à deux étages au-dessus d'une vallée, un long tunnel en courbe
dans le mont Kibo, un pont métallique sur une gorge à la sortie même de la montagne, un second tunnel dans la
montagne d'en face, une halte au col, un passage souterrain en courbe, un aiguillage et trois gares.

Le périmètre est fixé par le Capitaine Pi (TRAIN-MULT-01 à 03) : le système ferroviaire seulement. Il n'y a ni nature
décorative, ni villes, ni personnages, ni animaux, ni missions pédagogiques ; le relief se limite à ce qu'exigent les
ouvrages (vallées sous les ponts, massifs percés par les tunnels, plateformes des gares).

## Architecture

```
src/domain/          TypeScript pur, testé sans 3D
  track.ts           tracé : courbes à raccordement progressif (clothoïdes), pentes, dévers, branches
  network.ts         réseau de la première ligne : itinéraires, gares, ouvrages, signaux, aiguillage
  consist.ts         composition du train ; pose de chaque véhicule par ses deux appuis sur la voie
  physics.ts         traction (adhérence, puissance), résistance de Davis, pente sous chaque véhicule, freinage
src/engine/geometry/ géométrie procédurale en TypeScript pur (aucun fichier téléchargé)
  rollingStock.ts    locomotive, tender, wagons, roues à rayons, bielles, attelages, caisses de mangues
  trackGeometry.ts   rails au vrai profil, traverses, selles, ballast, heurtoirs
  structures.ts      viaduc de pierre à arches, pont métallique en treillis, tunnel maçonné (luminaires, niches),
                     portails, galerie en béton
  stations.ts        quais, gare de départ, gare du village, halte, quai central
  signals.ts         signaux lumineux, levier d'aiguillage
  terrain.ts         relief déduit des ouvrages (vallées, gorge, massifs, plateau, plateformes), remblais, tranchées
src/world/
  anchors.ts         points de placement du futur décor, gabarit ferroviaire
src/infrastructure.ts  entrée publique des infrastructures réutilisables (sans Babylon.js)
src/engine/scene/    Babylon.js uniquement
  trainEngine.ts     assemblage du monde, boucle de jeu, gares, aiguillage, mesures, libération des ressources
  trainView.ts       véhicules, roues, bielles, crosses, attelages, passage de chaque véhicule sous terre
  cameraRig.ts       cinq caméras, leurs fondus, plans de pont et de tunnel
  clearance.ts       volumes que la caméra ne traverse jamais (relief, roche, poutres, bâtiments), bras à ressort
  lighting.ts        soleil, ciel, ombres qui suivent le train, éclairage du tunnel séparé
  steam.ts           vapeur des cylindres et du sifflet (le train ne fume pas)
src/engine/audio/    sons synthétisés (échappement, sifflet, freins, cloche)
src/adapters/        crochet React pour le lecteur standard de l'hôte
src/ui/              tableau de bord (compteur, commandes, caméras, prochaine gare, aiguillage)
```

## Rendu moderne (TRAIN-MULT-04)

Ce jeu sert de premier laboratoire de rendu moderne pour Yamba Studio. Chaque technique moderne a un repli
automatique, pour qu'aucun appareil ne soit exclu.

| Technique | Quand | Repli |
|---|---|---|
| WebGPU (`WebGPUEngine.IsSupportedAsync`, `initAsync`) | navigateur et appareil compatibles | WebGL 2, ou WebGL 1, sur un canevas neuf |
| Matériaux PBR par famille | toujours | — |
| Reflet du ciel (sonde de réflexion, `HDRFiltering`) | toujours | filtrage en temps réel par les matériaux |
| Vraies lampes des tunnels (`ClusteredLightContainer`) | WebGPU, ou WebGL 2 avec mélange de flottants | flaques de lumière peintes sur la voûte |
| Vapeur en particules GPU (`GPUParticleSystem`) | qualité haute et prise en charge | particules classiques, calculées par le processeur |

- **Familles de matériau.** Chaque couleur de la palette porte sa famille : béton et pierre, peinture, acier, laiton,
  bois, verre, mat, fruit. Le rendu regroupe les triangles par famille, en un sous-maillage et un matériau PBR chacun.
  La géométrie n'a pas changé.
- **Pour comparer sur un même appareil :** `…/jeux/train-des-multiplications?rendu=webgl` ou `?rendu=webgpu`. Avec
  `?mesures`, la ligne de mesures affiche le moteur de rendu réellement utilisé.
- **Ce qui est vérifié ici :** WebGL dans le navigateur sans affichage. WebGPU démarre et dessine sans erreur, mais ce
  navigateur ne permet pas de photographier son image. Le rendu visuel de WebGPU reste à juger sur un vrai appareil.

## Gabarit des tunnels (TRAIN-MULT-05)

Les dimensions des tunnels sont calculées à partir du train :

| Grandeur | Valeur |
|---|---|
| Demi-largeur du matériel (locomotive) | 1,42 m |
| Hauteur (cheminée) | 4,42 m |
| Débord en courbe, au rayon minimal souterrain (300 m) | 0,03 m |
| Inclinaison due au dévers (0,047 rad), en haut du véhicule | 0,21 m |
| Ballant | 0,15 m |
| Enveloppe cinématique | ±1,81 m sur 4,6 m |
| Marge de sécurité | 0,5 m |
| Passages de service (de chaque côté) | 1,3 m, dalle à 0,3 m au-dessus du rail |
| Tunnel : largeur entre piédroits | 8,8 m (au lieu de 5,9 m) |
| Tunnel : naissances / clé de voûte | 3,2 m / 6,8 m (au lieu de 2,3 m / 5,25 m) |
| Galerie couverte | 9 m de large, plafond à 6,4 m |

Le test « gabarit des tunnels » recalcule l'enveloppe de chaque véhicule, dans la courbe la plus serrée et au dévers le
plus fort de chaque ouvrage, et vérifie la marge jusqu'aux passages et jusqu'à la voûte. Les têtes, les tranchées
d'accès, les luminaires (au-dessus des passages, sous les naissances) et les caméras suivent ces dimensions.

## Identité visuelle

Le train reste classique : locomotive rouge et noire filetée d'or, wagons de bois brun à ferrures sombres. Les
infrastructures sont modernes, et toutes leurs couleurs sont réglées dans `engine/geometry/palette.ts` :

- **Viaduc :** béton architectonique clair, piles fuselées à joints de coffrage, poutres de rive à larmier, garde-corps
  galvanisés.
- **Pont métallique :** acier peint bleu ardoise, passerelles grises à liseré jaune, appuis en granit sombre.
- **Tunnels :**
  - à l'extérieur, têtes en béton à panneaux, anneau de granit et bandeau du nom ;
  - à l'intérieur, soubassement clair et voûte en béton projeté sous une lumière chaude.
- **Gares :** murs blancs, ferronneries vert profond, toits d'ardoise, pavillon de brique, quais de béton clair à
  bordure blanche et bande d'éveil jaune.

## Ce qui est simulé

- **Inertie et accélération progressive.** L'effort de traction est borné par l'adhérence au démarrage et par la
  puissance en vitesse ; le régulateur et le frein s'ouvrent progressivement.
- **Masse transportée.** Chaque caisse pèse 320 kg : un train chargé accélère moins vite et freine plus loin.
- **Pentes.** Chaque véhicule est retenu ou poussé selon la pente sous lui.
- **Freinage.** Frein de service (1,05 m/s²) et frein d'urgence (1,7 m/s²). La distance d'arrêt est proche de v²/2a.
- **Wagons dans les courbes.** Chaque véhicule est posé par ses deux appuis, exactement sur la voie. Il prend la corde
  de la courbe entre ses essieux et s'incline avec le dévers.
- **Roues.** Elles tournent de distance / rayon (sans glissement). Les manivelles gauche et droite sont décalées d'un
  quart de tour. La bielle motrice et la crosse suivent la manivelle.
- **Tunnels.** La caméra descend dans le tube. Des luminaires chauds, alternés tous les 12 m, éclairent la voûte et la
  voie ; chaque véhicule passe à son tour du jour à cette lumière, et le projecteur éclaire la voie devant la
  locomotive.
- **Caméras.** Aucune vue ne traverse le relief, la roche, les poutres des ponts ni les bâtiments : un bras à ressort
  rapproche l'œil du train. Sur les ponts, la vue latérale passe en plan large pris d'en bas, depuis la vallée.
- **Gares.** L'arrêt est réussi si l'avant de la locomotive est à moins de 6 m du repère STOP.
- **Aiguillage.** Il est manœuvrable tant que le train ne l'a pas atteint : voie 1 ou voie 2 du village. Les aiguilles
  et le signal suivent l'itinéraire choisi.

## Commandes

À l'écran : Accélérer et Freiner (tenus), Reculer, Arrêter le train, Siffler, cinq caméras (derrière, cabine,
latérale, chargement, panorama), aiguillage.

Au clavier :

| Touche | Action |
|---|---|
| ↑ / W | accélérer |
| ↓ / S | freiner |
| R | changer de sens |
| Espace | arrêter |
| H | siffler |
| C ou 1 à 5 | caméras |
| V | aiguillage |

## Préparé pour le magasin de ressources

Le futur magasin de ressources de Yamba Studio (nature, villes, bâtiments) habillera le monde sans toucher au train.

- **Logique et habillage séparés.** Le domaine (tracé, réseau, physique) est en TypeScript pur. Le relief se déduit
  des ouvrages, et rien dans la conduite ne dépend du paysage.
- **Infrastructures réutilisables.** `@mbuyamba/train-multiplications/infrastructure` exporte le tracé, le réseau, le
  relief, les constructeurs de voies, ponts, tunnels, gares, signaux et matériel roulant (géométrie pure : positions,
  normales, couleurs, indices), sans Babylon.js.
- **Points de placement.** `decor.anchors` liste les places prévues, avec leur rayon et leur orientation :
  - lits de rivière au fond des vallées ;
  - départs de cascades en haut des parois de la gorge ;
  - sommets et flancs des montagnes ;
  - abords des gares ;
  - abords de la voie.
  `decor.inClearance(x, z)` dit si un point est trop près d'une voie.
- **Matériaux remplaçables.** `decor.replaceMaterial(slot, matériau)` remplace un matériau partout où il est utilisé.
  Les emplacements sont `terrain`, `infrastructure` (maçonnerie, ferronnerie, voies, gares), `lamps` et `sky`. Les
  géométries gardent leurs couleurs par sommet, que l'on peut combiner avec des textures.
- **Modèles importés.** `decor.addModel(nœud, { anchor | position, heading, underground, shadows })` pose un modèle 3D
  ou une image : au grand air ou sous terre, avec ou sans ombre.

Les missions pédagogiques passeront par `onEvent` (arrivées en gare, aiguillage) et par `createConsist(wagons, caisses)`.

## Performances

- Toute la géométrie est procédurale : aucune image ni aucun modèle n'est téléchargé.
- Voie et terrain ont une version lointaine allégée.
- Roues, bielles et caisses sont des instances légères.
- La qualité s'adapte à l'appareil :
  - en qualité basse : carte d'ombre de 1 024 texels au lieu de 2 048, moitié moins de particules, densité de pixels
    plafonnée à 1,25 ;
  - en qualité haute : densité plafonnée à 1,75.
- Toutes les ressources Babylon.js sont libérées à la fermeture du jeu.

## Développement

Depuis `frontend/packages/train-multiplications` :

- `npx vitest run` : tests du module ;
- `npx tsc --noEmit -p tsconfig.json` : types ;
- `npm run verify:isolation` : le module se compile et se teste seul.

L'atelier tourne sur le serveur de développement du portail (`npx vite` dans `frontend`) :

- `/app/packages/train-multiplications/dev/train-views.html?head=850&camera=behind|cab|side|loading&frozen` : le vrai
  moteur, train posé à l'abscisse voulue (`window.trainHandle` pour le piloter) ;
- `/app/packages/train-multiplications/dev/stock-showroom.html?view=front|side|rear|cab|crates|wheels` : le matériel
  roulant de près.

Dans le portail, le jeu est à `/jeux/train-des-multiplications`. Ajouter `?mesures` affiche les images par seconde.
