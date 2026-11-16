# LEO-INTERSECTION-03 — géométrie des virages et gestion réaliste du carrefour

## Diagnostic (état avant correction)

| Constat du Capitaine Pi | Cause dans le code | Fichier, fonction |
| --- | --- | --- |
| Véhicules dans la voie de Léo | Le trafic perpendiculaire tirait au hasard parmi `["right", "left"]` ; le virage à gauche avait pour cible la voie de Léo (`"same"`). | `leoCrossTraffic.ts` constructeur (`movements ?? ["right","left"]`), `leoIntersection.ts` `crossGeometry()` (`left: buildPath("left", …, "same", 1)`) |
| Voie de sortie « approximative » | La voie cible était une chaîne (`"same"` / `"oncoming"`) posée à la main dans `crossGeometry()` ; aucune table de voies, aucune connexion, aucun plan de manœuvre. | `leoIntersection.ts` `crossGeometry()`, `leoCrossTraffic.ts` `extras()` (voie déduite de `y < ROAD_Y`) |
| Trajectoire peu cohérente | Une seule courbe pour tous les véhicules (poignées 0,45 × corde, ouverture fixe), cap calculé par différences finies, rayon jamais vérifié ; l'avant d'un long véhicule pouvait mordre la voie voisine. | `leoIntersection.ts` `buildPath()` |
| Vitesses incohérentes | `CROSS_SPEED_RANGE = [110, 160]`, propre à ce trafic, au lieu des profils existants ; aucune limite liée à la courbure ; `cruise: Math.max(cruise, 150)` au passage de relais. | `leoCrossTraffic.ts` `spawn()`, `handOff()` |
| Graphismes improvisés | `CrossViews.createPlaceholder()` dessinait des silhouettes au canevas pour les vues de face/dos. | `leoCrossView.ts` |
| Cycle trop rapide | Le cycle était dérivé du feu d'origine : vert de la rue de 3,5 s seulement ; durées figées dans une fonction pure du temps, rouge intégral impossible à prolonger. | `leoIntersection.ts` `cycleFromMain()`, `intersectionStateAt()` |
| Entrée dans le carrefour | Fenêtres d'insertion fixes ; la voie de sortie n'était vérifiée que sur une fenêtre approximative, sans tenir compte de la longueur du véhicule ; arrêt d'urgence possible si la voie se bouchait au dernier moment. | `leoCrossTraffic.ts` `turnClear()` |
| Véhicules déjà engagés | Terminaient bien leur virage, mais rien ne retenait le feu tant qu'ils n'avaient pas fini. | `Game` (feux calés sur le temps) |

## Ce qui est en place

- **Voies** (`leoLanes.ts`) : `MAIN_EAST` (voie de Léo), `MAIN_WEST` (voie parallèle), `AVENUE_SOUTH`, `AVENUE_NORTH`,
  chacune avec identifiant, direction, largeur, axe, connexions. `AVENUE_SOUTH` n'a qu'une connexion : `RIGHT` →
  `MAIN_WEST`. Aucune connexion vers `MAIN_EAST` : jamais de virage à gauche, jamais dans la voie de Léo.
- **Plan de manœuvre** (`TurnPlan`) : voie d'entrée, mouvement, voie de sortie, trajectoire, fixés avant de tourner.
- **Trajectoire** (`leoIntersection.ts`) : Bézier cubique P0..P3, tangente analytique `B'(t)` pour le cap, courbure
  `κ(t) = |x'y'' − y'x''| / (x'² + y'²)^(3/2)`, avancement à la longueur d'arc. Réglages choisis par véhicule pour que
  l'empreinte entière reste dans la voie parallèle (autocar : le virage commence 108 px plus tôt, rayon 367 px ;
  berline : 155 px). Rayon minimal ≥ 0,5 × longueur.
- **Vitesse en virage** : `v_max = √(a_lat / κ)` (a_lat = 240 px/s², paramètre de jeu), limite de l'avenue 180 px/s,
  freinage préparatoire confortable. Vitesse de croisière : profils existants (`SPEED_PROFILES`).
- **Feux** : cycle 20 / 4 / 2 / 15 / 4 / 2 s ; le contrôleur prolonge le rouge intégral (8 s au plus) tant qu'un
  mouvement incompatible occupe la zone de conflit.
- **États** : `CRUISING`, `APPROACHING`, `WAITING`, `TURNING`, `MERGING`, `EXITING`.
- **Insertion** : feu vert, voie de sortie libre sur toute la longueur du véhicule plus marge, une seule trajectoire
  dans la zone de virage à la fois ; une fois la voie libre à l'instant décisif, la manœuvre est engagée et ne freine
  plus d'urgence ; passage de relais au trafic principal (même place, même vitesse, mêmes roues).

## Sprites utilisés (illustrations fournies)

| Véhicule | Fichier | Taille | Longueur / Léo | Orientation d'origine |
| --- | --- | ---: | ---: | --- |
| Limousine noire | `leo-cross-limousine-v1.webp` | 640 × 213 (29 Ko) | 1,95 | droite |
| Autocar noir et or (chauffeur, passagers) | `leo-cross-bus-v1.webp` | 640 × 213 (57 Ko) | 2,90 | droite |
| SUV noir | `leo-cross-suv-v1.webp` | 640 × 213 (42 Ko) | 1,55 | droite |
| Coupé sport (conducteur) | `leo-cross-sport-v1.webp` | 640 × 213 (47 Ko) | 1,40 | droite |
| Berline noire (conducteur) | `leo-cross-sedan-v1.webp` | 640 × 213 (42 Ko) | 1,60 | droite |

Les originaux (2000 × 667) ont seulement été réduits à 640 px de large (comme les autres véhicules) ; roues mesurées
sur les originaux. On les retourne (miroir) pour rouler vers l'ouest.

## Vues manquantes à demander à Crochet

Un profil n'est utilisé qu'à ±30° de l'horizontale. Pendant la descente de l'avenue (cap ≈ 135°), il faut une vue
**trois-quarts avant gauche** (le nez vers le bas et la gauche, on voit la face et le flanc droit), **une seule par
véhicule** pour ce scénario : limousine, autocar, SUV, coupé, berline. Fond transparent, pneus posés sur le bord bas
de l'image, mêmes proportions, mêmes occupants. Jusqu'à leur livraison, ces véhicules ne sont PAS dessinés pendant
cette phase (aucun dessin improvisé) : ils apparaissent en fondu quand leur profil devient utilisable ; en mode
diagnostic (`?debug`, développement), un rectangle jaune marque leur position.

## Limites

- Pas de virage à gauche (par décision), pas de traversée (le carrefour est un T), pas de remontée vers l'avenue.
- Le profil d'un très long véhicule en virage est incliné de 30° au plus : c'est la limite des vues de profil.
