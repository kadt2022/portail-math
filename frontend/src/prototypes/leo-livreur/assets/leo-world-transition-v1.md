# LEO-WORLD-02 — Transition campagne → pont → Grande Ville

Première livraison graphique uniquement. Aucune scène Phaser, règle de conduite,
véhicule, trafic ou livraison n'est modifié par cette branche.

## Inventaire

| Ressource | Dimensions | Poids | Fond | Rôle |
| --- | ---: | ---: | --- | --- |
| `leo-world-river-v1.webp` | 1024 × 341 | 95 690 o | opaque | Bande d'eau et berges, répétable horizontalement. |
| `leo-world-bridge-deck-v1.webp` | 1024 × 341 | 22 158 o | transparent | Chaussée/trottoirs du pont, répétable horizontalement. |
| `leo-world-bridge-rail-v1.webp` | 1024 × 341 | 95 454 o | transparent | Garde-corps et lampadaires, posé au premier plan. |
| `leo-world-us-suspension-bridge-v1.webp` | 2172 × 724 | 240 094 o | opaque | Panorama du pont suspendu américain, pylônes, câbles et piles dans l'eau. La chaussée réelle est dessinée par-dessus. |
| `leo-world-suspension-bridge-layer-v2.webp` | 2172 × 724 | 404 544 o | alpha | Quatre portiques de suspension (huit montants), câbles hauts, arches et piles. Bande transparente centrale réservée à la chaussée. |
| `leo-world-city-skyline-v1.webp` | 1024 × 341 | 67 250 o | transparent | Horizon urbain à placer en profondeur. |
| `leo-world-city-entrance-v1.webp` | 960 × 480 | 115 136 o | transparent | Arche, arbres et lampadaire ; le panneau bleu est vide pour localisation. |
| `leo-world-transition-mockup-v1.webp` | 1600 × 900 | 388 552 o | opaque | Maquette de validation seulement, jamais utilisée comme décor jouable. |

Toutes les ressources ont été générées en illustration cartoon 2,5D, puis
optimisées en WebP. Les modules transparents doivent être superposés ; ils ne
modifient pas les coordonnées logiques de la route.

## Raccordement attendu dans Phaser

Le Monstre conserve `ROAD_Y`, `ROAD_WIDTH`, les deux voies, les collisions, la
caméra et le trafic. Le raccordement graphique peut respecter cette séquence :

1. **Campagne** : conserver `leo-countryside-v1.webp`, arbres et restaurant.
2. **Approche du pont** : faire apparaître la skyline à faible opacité/distance.
3. **Pont** : utiliser `leo-world-suspension-bridge-layer-v2.webp` sur deux
   zones virtuelles. Répéter quatre fois son motif, sans étirer les proportions.
   La bande centrale transparente révèle la chaussée continue du jeu ; les câbles
   restent au-dessus, les piles et les arches sous la route. Le rendu est aligné
   sur `ROAD_Y` et la chaussée de niveau scène reste au premier plan.
   Le panorama n'altère ni la largeur, ni la couleur, ni le tracé de la route.
4. **Entrée de ville** : rapprocher/agrandir progressivement la skyline, puis
   afficher l'arche. Le texte localisé « Bienvenue dans la Grande Ville » doit
   être ajouté par Phaser/React sur le panneau bleu, pas peint dans l'image.
5. **Premier quartier** : utiliser la skyline comme profondeur et les futures
   façades comme plans intermédiaires, sans saut de caméra.

Les lignes de raccordement des modules sont horizontales. Les bandes doivent
être placées dans un ordre déterministe selon `x` afin qu'un retour arrière
retrouve le même décor. Aucun module ne couvre la carrosserie, les roues ou les
zones de circulation.

## Maquette

`leo-world-transition-mockup-v1.webp` présente la continuité visuelle demandée
— campagne, pont, ville lointaine, premier quartier — mais n'est pas une carte
ni un sprite de jeu. Elle sert à valider l'ambiance et le rythme de dévoilement
avant l'intégration technique.
