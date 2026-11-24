# Origine du code et des ressources

## Écrit pour Yamba

Tout le jeu a été écrit pour Yamba Academy :

- le tracé, le réseau, la composition du train, la physique ;
- tous les modèles procéduraux : locomotive, tender, wagons, roues, bielles, caisses, rails, ouvrages, gares, signaux,
  relief ;
- les caméras, la fumée, les sons synthétisés, le tableau de bord.

## Repris de la Rivière des fractions

Ces fichiers viennent de la Rivière des fractions, même projet, également écrite pour Yamba :

- l'atelier de géométrie `engine/geometry/kit.ts`, sans la coque de bateau, avec en plus le balayage le long d'un
  chemin et les cylindres couchés ;
- le bruit `engine/geometry/noise.ts` ;
- le générateur `domain/seeded.ts` ;
- le principe de l'éclairage : soleil, ciel, brume, étalonnage dans les matériaux ;
- la forme du contrat avec le lecteur standard et du chargeur du moteur ;
- le script `scripts/verify-isolation.mjs`.

Aucun composant de végétation n'est repris, conformément au périmètre de TRAIN-MULT-01.

## Bibliothèques

| Élément | Origine | Licence |
|---|---|---|
| Babylon.js (`@babylonjs/core`) : moteur, StandardMaterial, lumières, ShadowGenerator (PCF), ParticleSystem, DynamicTexture, instances légères, niveaux de détail | Babylon.js | Apache 2.0 |
| React | Meta | MIT |

## Algorithmes et constantes

| Élément | Origine | Licence | Fichier |
|---|---|---|---|
| Générateur pseudo-aléatoire mulberry32 | Tommy Ettinger (2017) | Domaine public | `domain/seeded.ts` |
| Constantes 374761393 et 668265263 du hachage du bruit | Nombres premiers de xxHash (Yann Collet) ; la fonction de mélange est écrite pour Yamba | xxHash : BSD 2 clauses ; des constantes numériques ne sont pas protégées | `engine/geometry/noise.ts` |
| Formule de Davis (résistance à l'avancement A + B·v + C·v²), clothoïde de raccordement, distance d'arrêt v²/2a | Connaissances classiques du génie ferroviaire | — | `domain/physics.ts`, `domain/track.ts` |

## Ressources

Aucune image, aucun modèle 3D et aucun son ne sont téléchargés :

- les textes des panneaux sont dessinés à la volée dans une petite texture ;
- la bouffée de fumée est un dégradé dessiné à la volée ;
- les sons sont synthétisés avec la Web Audio API.

Les maquettes du Capitaine Pi ont servi d'inspiration (couleurs de la locomotive, wagons de bois, gare jaune aux toits
de tuiles). Elles ne sont pas incluses dans le module.
