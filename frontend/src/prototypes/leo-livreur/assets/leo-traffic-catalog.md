# Catalogue du trafic Léo

Les sprites sont des PNG générés puis optimisés en WebP (largeur source 640 px,
fond transparent). Phaser les affiche avec les dimensions de jeu indiquées dans
`leoGeometry.ts`; ces dimensions visuelles ne servent pas de coordonnées
logiques pour la route.

| Profil | Fichier | Affichage Phaser | Vitesse monde |
| --- | --- | ---: | ---: |
| Familiale bleue | `leo-traffic-family-blue-v1.webp` | 128 × 58 | 110 |
| Compacte verte | `leo-traffic-compact-green-v1.webp` | 112 × 56 | 128 |
| Berline grise | `leo-traffic-sedan-gray-v1.webp` | 126 × 56 | 118 |
| Autobus urbain | `leo-traffic-city-bus-v1.webp` | 190 × 52 | 84 |
| Bus scolaire | `leo-traffic-school-bus-v1.webp` | 180 × 54 | 92 |
| Taxi | `leo-traffic-taxi-v1.webp` | 116 × 56 | 142 |
| Minibus | `leo-traffic-minibus-v1.webp` | 156 × 52 | 102 |

Tous les véhicules sont des profils orientés vers la gauche pour la circulation
opposée. Le centre de leur empreinte est positionné sur `ONCOMING_LANE_Y`;
aucun profil n'utilise la ligne jaune comme référence.
