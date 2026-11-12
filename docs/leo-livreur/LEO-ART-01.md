# LEO-ART-01 — Première série graphique

Cette première livraison fournit une base visuelle indépendante du moteur de conduite. Elle est destinée à être validée artistiquement avant la production des environnements montagne et village.

## Ressources

Toutes les ressources sont sous `frontend/public/assets/leo-livreur/` et sont réutilisables depuis Phaser ou React par URL publique.

| Fichier | Dimensions | Poids | Rôle |
| --- | ---: | ---: | --- |
| `backgrounds/countryside-v1.webp` | 2172 × 724 | 87.6 Ko | arrière-plan campagne, sans route |
| `roads/road-straight-v1.png` | 1536 × 500 | 648.0 Ko | bande routière horizontale transparente, accotements et ligne centrale |
| `houses/house-turquoise.webp` | 720 × 480 | 52.4 Ko | maison de livraison réutilisable |
| `restaurant/leo-pizza-restaurant.webp` | 720 × 480 | 52.4 Ko | point de départ Léo Pizza |
| `scenery/tree-v1.png` | 512 × 482 | 239.5 Ko | arbre de premier plan détouré |
| `traffic-lights/traffic-lights-v1.png` | 768 × 256 | 145.3 Ko | spritesheet horizontal rouge/orange/vert |
| `vehicles/leo-car-side.webp` | 720 × 480 | 37.5 Ko | ressource existante, profil trois-quarts |
| `vehicles/leo-car-right.webp` | 502 × 364 | 24.0 Ko | ressource existante, profil droit |
| `vehicles/leo-car-left.webp` | 505 × 364 | 22.9 Ko | ressource existante, profil gauche |
| `vehicles/leo-car-front.webp` | 324 × 362 | 17.1 Ko | ressource existante, vue avant |
| `vehicles/leo-car-back.webp` | 326 × 362 | 14.7 Ko | ressource existante, vue arrière |

Poids total de la série : **1.36 Mo**.

## Contraintes d’intégration

- Les illustrations opaques sont en WebP. Les trois éléments transparents générés (route, arbre, feu) sont conservés en PNG redimensionné afin de préserver des contours propres sans halo de compression.
- `traffic-lights-v1.png` est une bande de trois cellules de 256 × 256 : cellule 0 rouge, cellule 1 orange, cellule 2 verte. Le moteur peut afficher un état avec un crop Phaser sans animation intégrée.
- La route est un habillage visuel modulaire. Sa géométrie ne remplace pas les axes, voies ou collisions définis par le Monstre des mers.
- Le nom et la commande d’une maison doivent rester des calques React/Phaser ; aucun texte de livraison n’est incrusté dans l’image.
- Le fond de campagne est une couche lointaine. L’arbre et la maison sont des éléments proches à faire défiler séparément pour l’effet 2,5D.
- La voiture n’est pas modifiée par cette branche : les profils existants sont seulement inventoriés et recopiés dans l’espace visuel indépendant.

## Maquette assemblée

Ouvrir [leo-livreur-art-preview.html](../../frontend/public/leo-livreur-art-preview.html) après démarrage du serveur statique ou du portail. Cette maquette ne branche aucun comportement et ne modifie pas le prototype de conduite.

## Validation proposée

Cette première série couvre le restaurant, la campagne, la chaussée, une maison, un arbre et un feu à états séparés. Après validation du Capitaine Pi, les prochaines séries pourront ajouter les montagnes, la rivière et le pont, puis le village voisin et les quatre maisons supplémentaires.
