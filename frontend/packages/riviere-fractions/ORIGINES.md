# Origine du code et licences — La Rivière des Fractions 3D

Ce document dit, pour chaque partie du module, ce qui a été écrit pour Yamba, ce qui reprend une technique
classique (une méthode connue, réécrite ici), et ce qui vient d'une bibliothèque ou d'un exemple externe.

Le module ne contient aucune image, aucun son, aucun modèle 3D ni aucune police téléchargés : tout est généré par
le code au chargement. Le texte des panneaux utilise la police système de l'appareil.

## Bibliothèques

| Bibliothèque | Licence | Utilisation |
| --- | --- | --- |
| Babylon.js (`@babylonjs/core`) | Apache 2.0 | Moteur 3D : rendu WebGL, caméra, maillages, matériaux, lumières, ombres, étalonnage |
| React, React DOM | MIT (dépendances de pair, fournies par l'hôte) | Interface du jeu |

La documentation de Babylon.js est, elle aussi, sous Apache 2.0 (y compris ses extraits de code, selon l'équipe
Babylon). Aucun code de la documentation, de la Playground ni des démos n'est recopié dans le module : le chantier
d'éclairage utilise uniquement les classes de la bibliothèque, à travers leur API publique.

## Composants Babylon.js utilisés pour l'éclairage

Choisis après l'étude des pages « Shadows », « Cascaded Shadow Maps » et des démos officielles :

- `DirectionalLight` : le soleil.
- `HemisphericLight` : la lumière du ciel et celle renvoyée par le sol.
- `ShadowGenerator`, avec filtrage PCF (repli Poisson en WebGL 1), biais et biais normal, atténuation en bord de
  carte.
- `StandardMaterial` : éclairage, ombres reçues, brume et étalonnage du terrain et des décors.
- `ImageProcessingConfiguration`, `ColorCurves` : exposition, contraste et saturation du paysage.

Écartés pour le niveau 1 :

- Les ombres en cascade (CSM) : elles demandent WebGL 2 et redessinent les ombres à chaque image, plusieurs fois.
- Les ombres douces PCSS : la documentation les destine aux ordinateurs.
- L'éclairage global, l'éclairage volumétrique et l'atmosphère physique : trop coûteux pour un téléphone.
- Le post-traitement plein écran : il ajouterait une passe à chaque image et ferait perdre l'anticrénelage.

## Écrit pour Yamba

- **Tracé de la rivière** (`geometry/layout.ts`) : coordonnées de rivière (s, d). Le cap est intégré pas à pas, avec
  des virages en cosinus entre les embranchements. Il y a sept embranchements à trois voies, des îlots et des
  villages.
- **Terrain, eau, paysage, modèles** (`geometry/terrain.ts`, `water.ts`, `landscape.ts`, `models.ts`, `kit.ts`) :
  maillages construits en code, couleurs par sommet, placement reproductible des décors.
- **Bateau du joueur** (`geometry/boat/`, `scene/playerBoat.ts`, `scene/boatShaders.ts`) : coque, moteur, toit,
  poste de pilotage, accessoires, pilote, et la décoration peinte calculée dans le matériau.
- **Navigation et animation** (`navigation/boat.ts`, `boatMotion.ts`, `traffic.ts`) : avance assistée, direction,
  bords doux, ligne de décision, autres bateaux, et l'animation du bateau par ressorts amortis.
- **Scène** (`scene/riverEngine.ts`) : chargement par étapes, découpage en morceaux, panneaux, barrages, fête
  d'arrivée.
- **Éclairage** (`scene/lighting.ts`) : réglage de la lumière, et carte d'ombre régionale calée sur sa grille de
  texels, redessinée seulement quand le bateau a avancé de 40 m. On choisit aussi qui projette une ombre : les
  décors oui, le terrain non. Nos matériaux appliquent le même étalonnage que Babylon.
- **Arbre stylisé et forêt d'essai** (`geometry/trees/stylizedTree.ts`, `forest.ts`, `undergrowth.ts`,
  `geometry/terrain.ts` pour la hauteur de la plaine, `scene/forest.ts`) : l'arbre et ses quatre niveaux de détail,
  les huit teintes, les massifs, le sous-bois, le sol de sous-bois, les lignes de vue des panneaux et le tri des
  plantes par distance. Le dessin passe par les instances légères (« thin instances ») de Babylon.js.
- **Panneaux et sons** (`scene/signDrawing.ts`, `audio/riverAudio.ts`) : dessin sur canevas, sons synthétisés avec
  Web Audio.
- **Domaine, application, interface** : règles des défis, fractions exactes, session, composants React.

## Techniques classiques adaptées (réécrites, sans copie d'un code précis)

- Bruit de valeur lissé et somme d'octaves (fBm), en TypeScript et en GLSL.
- Somme d'ondes directionnelles pour les vagues, avec la relation de dispersion des ondes de gravité (vitesse en √(g·k)).
- Approximation de Schlick pour le reflet de Fresnel, reflet du ciel en dégradé, éclat spéculaire de Blinn-Phong.
- Brouillard exponentiel carré (la même formule que celle de Babylon), éclairage hémisphérique.
- Superellipsoïde (coussins, capot du moteur), tubes à repère transporté le long d'un chemin, tores.
- Courbes de Catmull-Rom, spirale de Fibonacci (angle d'or), rotation de Rodrigues (inclinaison des arbres).
- Ressorts amortis à intégration semi-implicite pour l'animation.
- Étoile du médaillon : distance au bord d'une branche après repli de l'angle (réécrite pour Yamba, voir plus bas).

## Extraits repris, et leurs licences

| Extrait | Origine | Licence | Où |
| --- | --- | --- | --- |
| Générateur pseudo-aléatoire mulberry32 | Tommy Ettinger (2017), forme JavaScript courante (proche de celle publiée par bryc) | Domaine public, déclaré par les deux auteurs | `navigation/seeded.ts` |
| Constantes 374761393 et 668265263 du hachage du bruit | Nombres premiers de xxHash (Yann Collet) ; la fonction de mélange est écrite pour Yamba | xxHash : BSD 2 clauses ; des constantes numériques ne sont pas protégées | `geometry/noise.ts` |
| Idiome `fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453)` | Ligne très répandue dans les shaders (Shadertoy, The Book of Shaders) ; auteur d'origine incertain | Non déterminée ; une ligne d'usage courant | `scene/shaders.ts` (bruit de l'eau et des nuages) |

**Corrigé pendant cette revue :** la première version du matériau du bateau adaptait la fonction `sdStar5`
d'Inigo Quilez (article « 2D distance functions »), sans licence vérifiée de façon certaine. Elle est remplacée par
une fonction écrite pour Yamba (`star5` dans `scene/boatShaders.ts`).

**Point ouvert :** l'idiome de hachage GLSL est une ligne d'usage commun, mais son auteur d'origine est incertain. Si
le Capitaine préfère une origine entièrement documentée, on peut le remplacer par un hachage entier écrit pour Yamba,
sans changement visible.
