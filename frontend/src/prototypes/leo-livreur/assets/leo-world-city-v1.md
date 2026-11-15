# LEO-WORLD-03 — Zone 3 : entrée de ville (première livraison)

Référence graphique : l'illustration validée par le Capitaine Pi (1920 × 819). Elle n'est pas collée
telle quelle derrière la scène : la chaussée du jeu (tablier, deux voies, ligne jaune, marquages) est
conservée, seule la décoration est reprise. Aucun véhicule n'est extrait de l'illustration.

## Ressources produites

| Ressource | Source | Dimensions | Poids | Contenu |
| --- | --- | ---: | ---: | --- |
| `leo-world-city-top-v1.webp` | rangées 0 à 470 | 1920 × 471 | 284 492 o | Immeubles, commerces, arbres, avenue secondaire, passage piéton, panneaux « Av. du Savoir », « Rue des Jardins », panneau directionnel, tête de feu (état à redessiner), lampadaires. |
| `leo-world-city-bottom-v1.webp` | rangées 651 à 818 | 1920 × 168 | 107 192 o | Trottoir de premier plan : massifs de fleurs, banc, corbeille, panneau de vitesse. |

Total ajouté : 391 684 o (≈ 383 Ko) ; mémoire GPU décompressée ≈ 4,9 Mo (1920 × 471 × 4 + 1920 × 168 × 4).
La chaussée de l'illustration (rangées 471 à 650, perspective à voies inégales) est volontairement ignorée.

## Mesures de l'illustration utilisées

- Bord nord de la chaussée : ligne blanche aux rangées 471-475 ; bord sud : 642-649 ; double ligne jaune : 535-550.
- Bouche de l'avenue secondaire sur la chaussée : x = 505 à 1055.
- Tête du feu : x = 803 à 851, y = 74 à 179 ; lampes en (827 ; 97,5 / 127,5 / 157,5), rayon 11.

## Mise en page dans le jeu (`leoCityLayout.ts`)

- Échelle 1,1 ; le haut s'arrête sur la rangée 127 du tablier (trottoir arrière), le bas commence sous la
  ligne blanche avant du tablier : une seule chaussée visible.
- Le panneau commence 300 px **avant** la fin du pont et s'y fond (430 px de fondu à chaque bord) : jamais de
  bande vide entre les zones. Un ciel plein protège la transition.
- Lignes d'arrêt : 70 px avant la bouche (voie de Léo, vers l'est) et 70 px après (voie opposée).
- Caméra : décalage et zoom se composent en douceur (campagne, pont, ville) et se défont en reculant.

## Feu tricolore (`leoTrafficLight.ts`)

- États `GREEN`, `YELLOW`, `RED`, cycle configurable (par défaut 9 s, 2,5 s, 7 s), avec décalage.
- Le feu ne commande rien à distance. Léo reste maître de ses commandes : le jeu le félicite s'il s'arrête devant
  la ligne au rouge, l'avertit s'il franchit la ligne au rouge, le prévient à l'orange. Aucune sanction mécanique,
  aucune téléportation : il peut reculer derrière la ligne pour recommencer, ou attendre le vert.
- Chaque véhicule du trafic décide seul : le feu agit comme un obstacle posé sur la ligne d'arrêt pour ce véhicule.
  Un véhicule déjà trop près pour s'arrêter passe, les autres freinent progressivement.

## Mémoire

Le décor d'une zone est créé et détruit avec la fenêtre de zones (précédente, actuelle, suivante) ; chaque zone ne
dessine que sa part du panneau, donc rien n'est dupliqué ni coupé quand une zone voisine est libérée. Les textures
restent en cache, les objets Phaser de décor expirent avec leur zone, le trafic reste indépendant.

## Visibilité du feu (caméra à anticipation)

- **Distance à voir** (`leoSightline.ts`) : mesurée avec le vrai modèle de conduite. Réaction d'enfant de 1,2 s avec Avancer
  encore enfoncé (la voiture accélère), puis freinage à fond depuis la vitesse atteinte, plus 100 px de marge. À vitesse
  maximale (520) : environ 1 000 px du pare-chocs avant à la ligne d'arrêt.
- **Cadrage** : Léo à 30 % de l'écran quand il avance, à 70 % en marche arrière, jamais de rotation, coordonnées du monde
  intactes. Si la distance ne tient pas, Léo est repoussé jusqu'à 15 % puis le champ s'élargit (zoom ≥ 0,7). Lissage exponentiel.
- **Zones** : les zones chargées sont celles que la vue réelle peut montrer (plus une marge), pas seulement celles autour de Léo.
- **Indicateur** : une puce discrète, distance en unités du monde (comme le compteur), « Feu à N m », puis « Feu rouge —
  prépare-toi à freiner ! » (ou orange). Voyant dessiné en CSS.
