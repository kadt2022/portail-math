# Unités physiques de Léo le livreur — v1

## Référence

| | |
| --- | --- |
| Voiture de référence | Fiat 500 1.2 69 ch (génération 312, restylée 2015) |
| Longueur | 3,571 m |
| 0 à 100 km/h | 12,9 s |
| Vitesse maximale | 160 km/h |
| Masse à vide | 865 kg (865 à 960 kg selon la finition) |
| Sources | auto-data.net, L'argus, La Centrale (fiches tierces, pas de document constructeur) |

Échelle : voiture de Léo = 132 px, donc **1 m = 36,96 px** (`PX_PER_METER`, `leoUnits.ts`).

## Vérification de l'échelle (indépendante du sprite de Léo)

| Élément | px du monde | mètres | Réel | Verdict |
| --- | ---: | ---: | --- | --- |
| Compacte, taxi | 158 | 4,3 | 3,6 à 4,1 m | un peu long (+5 à 15 %) |
| Familiale | 185 | 5,0 | 4,4 à 4,7 m | un peu long |
| Berline grise | 198 | 5,4 | 4,5 à 4,9 m | long (+10 %) |
| Berline de la rue des Jardins | 163 | 4,4 | 4,4 à 4,8 m | cohérent |
| Minibus | 238 | 6,4 | 5 à 7 m | cohérent |
| Bus scolaire | 317 | 8,6 | 7 à 9 m (petit modèle) | cohérent |
| Autobus urbain | 396 | 10,7 | 10,5 à 12 m | cohérent |
| Voie | 100 | 2,7 | 2,75 à 3,5 m en ville | étroite (rue de quartier) |
| Chaussée (2 voies) | 200 | 5,4 | | petite rue |
| Pont | 4 800 | 130 | | pont urbain plausible |
| Maison | 230 × 153 | 6,2 × 4,1 | | petite maison de plain-pied |
| Maisons 1 à 4 | 300 d'écart | 8,1 | | très serrées (maisons en bande) |
| Maisons 5 et suivantes | 1 300 d'écart | 35 | | plausible |
| Porte de la boulangerie (décor) | ≈ 94 | ≈ 2,5 | 2,1 à 2,2 m | stylisé |
| Lampadaire (décor) | ≈ 400 | ≈ 10,8 | 4 à 6 m | stylisé (trop haut) |
| Chaise de café (décor) | ≈ 50 | ≈ 1,35 | 0,9 m | stylisé |

Conclusion : les sept véhicules (les seuls objets dessinés pour rouler à la même échelle que Léo) confirment
37 px/m à ±15 % près. La chaussée est étroite mais plausible. Le décor de la ville est stylisé (porte, lampadaires,
mobilier jusqu'à 2 fois trop grands) : il ne sert pas à la calibration physique. Aucune position (maisons, pont,
carrefour, feux) n'a été déplacée ; seules leurs distances sont désormais affichées en vrais mètres.

## Avant / après

| Grandeur | Avant | Après |
| --- | --- | --- |
| Vitesse limite de la route (panneau) | non modélisée | 50 km/h (règle, pas une limite de la voiture) |
| Vitesse maximale de la voiture | 520 px/s = 50,6 km/h | 120 km/h (0 → 120 km/h en ≈ 18,2 s) |
| 10 s à 50 km/h constants | 140,7 m (à 50,6 km/h) | **138,89 m** |
| 10 s à 120 km/h | — | 333,33 m |
| 0 → 50 km/h | 2,8 s (8,1 m/s² au départ) | 4,9 s (A0 = 3,38 m/s², calé sur 0-100 en 12,9 s) |
| Freinage à fond | 11,9 m/s² (au-delà de l'adhérence) | 0,8 g = 7,85 m/s² |
| Arrêt depuis 50 km/h | 1,05 s, 7,9 m | 1,8 s, 13,4 m |
| Pied levé à 50 km/h | ≈ 3 m/s² | ≈ 0,9 m/s² |
| Marche arrière | 13,6 km/h, 4,6 m/s² | 10 km/h, 1,5 m/s² |
| Distance à voir avant un feu à 50 km/h (réaction 1,2 s, Avancer encore enfoncé) | 27,5 m | ≈ 39,5 m |
| Distance à voir avant un feu à 120 km/h | — | > 100 m (l’écran ne peut pas la montrer ; l’indicateur prévient) |
| Dézoom maximal de la caméra | 0,7 | 0,5 (mobile étroit, à 50 km/h) |
| Compteur de vitesse | 520 (px/s affichés tels quels) | km/h |
| Distances affichées | px affichés comme des mètres (« 11 097 m ») | vrais mètres |

## Limites

- Le 0-100 km/h donne une accélération moyenne ; la forme de la courbe (linéaire décroissante) est un modèle simple.
- Pied levé : ordre de grandeur (frein moteur, roulement, air), pas une mesure.
- Le trafic autonome roule selon la limite de chaque zone (voir `leoSpeedLimits.ts`) : village 50, pont 70, ville 50,
  école 30 km/h ; chaque conducteur vise 80 à 108 % de la limite selon son profil et ralentit (1,2 m/s²) avant une zone
  plus lente. Son accélération (≈ 4,5 m/s²) et son freinage de suivi restent à recaler.
- La rue des Jardins en perspective suit la même échelle au facteur de perspective k près.
