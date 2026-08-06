# Direction artistique — La Rivière des fractions

Ce dossier fixe **comment le décor du jeu est produit**, et pourquoi il n’est
plus dessiné par le code.

---

## 1. La décision

La scène était construite avec des primitives Phaser : ellipses pour les
frondaisons, rectangles pour les berges, triangles pour les toits. Cette
approche a atteint sa limite — non parce que Phaser en est incapable, mais
parce qu’une composition peinte ne se code pas.

La comparaison avec les jeux d’Alloprof a tranché la question. Leur qualité
visuelle ne vient d’aucune technique avancée : **une illustration peinte en
fond, des sprites animés par-dessus, une interface soignée**. Pas de 3D, pas de
caméra, pas de physique, pas une forme générée par le code.

L’architecture retenue est donc à trois couches :

```text
couche 3   question et réponses          HTML
couche 2   héros, pierres, effets        canvas Phaser transparent
couche 1   décor complet                 une illustration 16/9
```

### Partage des rôles

| | autorité sur |
|---|---|
| l’illustration | tout le visuel : rivière, village, pont, végétation, lumière |
| `v2/anchors.js` | tout l’interactif : où le héros marche, où les pierres émergent |
| le HTML | tout le texte : question, réponses, indices, progression |

Les deux premières sont alignées par des **pourcentages**, jamais par des
pixels : le même jeu tourne sur 640 px de large et sur 1600, et seule une
proportion survit à cet écart.

**Conséquence à ne pas oublier :** recadrer, déplacer ou remplacer
l’illustration invalide les ancrages. Il faut alors refaire le calibrage
décrit au §4.

---

## 2. Pourquoi le texte ne doit jamais être peint

Les maquettes de travail portent « DÉPART », « ARRIVÉE », « Défi 1/5 » et les
trois réponses. Rien de tout cela ne doit survivre dans l’illustration finale :

- un texte peint n’est pas traduisible ;
- il n’est pas lu par un lecteur d’écran ;
- il n’est pas atteignable au clavier ;
- il se désynchronise dès l’étape 2 ;
- il flouterait à chaque redimensionnement.

Le panneau de droite est donc **peint vide** : un cadre de parchemin, et rien
dedans. Le HTML vient se poser exactement dessus.

---

## 3. Le brief de génération — `river-scene.webp`

```text
FORMAT
1600 x 900 pixels, exactement 16/9. WebP, qualité 80.
Cible de poids : moins de 300 Ko.
Repère : le seul explorer-boy.png pèse 750 Ko aujourd'hui.

CE QUE L'IMAGE CONTIENT
Une illustration continue, d'un seul tenant, en deux zones :
  - de 0 % à 70 % de la largeur : le décor de la rivière ;
  - de 71 % à 99 % : un panneau de parchemin VIDE, encadré de bois et de
    feuillage, prêt à recevoir du texte HTML par-dessus.

CE QUE L'IMAGE NE CONTIENT PAS
  - aucun texte, aucun chiffre, aucun mot ;
  - aucun personnage : ni garçon, ni grenouille ;
  - aucun bouton : ni pause, ni maison, ni étoiles ;
  - aucun disque de fraction.

COMPOSITION
Vue de trois quarts en plongée. La rivière remonte du coin bas-gauche vers le
village, en haut au centre. Le regard va du bas-gauche vers le haut-droit.

  berge de départ, à gauche   plateau herbeux, un pontonnet de bois nu
  rivière                     large, bleue, courants et remous visibles
  cinq pierres IMMERGÉES      voir la grille d'ancrage ci-dessous
  petite cascade              en bas au centre, sous la première pierre
  berge droite                chemin de terre montant vers le village
  pont de bois                vers 50 % / 26 %, franchissant la rivière
  village africain            cases à toit de chaume, 55-70 % / 3-18 %
  montagnes et ciel           fond lointain, en haut à gauche
  végétation tropicale        palmiers, fougères, fleurs, en cadre

GRILLE D'ANCRAGE — en pourcentage de l'image entière
Guide de composition, pas contrainte au pixel : l'image est générée librement,
puis anchors.js est recalé sur ce qui sort (voir §4).

    pierre 1   25,5 %  x  81,0 %     la plus grosse, premier plan
    pierre 2   29,0 %  x  67,0 %
    pierre 3   34,5 %  x  54,0 %
    pierre 4   42,0 %  x  43,0 %
    pierre 5   49,5 %  x  33,5 %     la plus petite, lointaine

    départ du héros (ses pieds)   10,0 %  x  76,0 %
    entrée du pont                50,0 %  x  26,0 %
    sortie du pont / coffre       57,0 %  x  21,0 %

Les pierres rétrécissent avec l'éloignement : la première fait environ 8 % de
la largeur de l'image, la cinquième environ 6,5 %.

ZONE À LAISSER RESPIRER
La bande qui relie ces huit points est le trajet du héros. Aucun feuillage,
aucun rocher, aucune branche ne doit y entrer : le héros y passera, et le
décor ne doit jamais le masquer.

STYLE
Dessin animé moderne, contours souples, couleurs saturées sans être criardes.
Lumière venant du haut-gauche, ombres portées douces et cohérentes partout.
Même niveau de détail sur tout le décor. Lisible à 640 px de large sur un
téléphone. Contexte africain. Adapté au primaire : aucun élément inquiétant.
```

### Pourquoi les pierres doivent être peintes, mais immergées

C’est la leçon de la première capture en primitives. Les pierres n’existent
qu’une fois l’étape gagnée : à l’étape 1 sur 5, l’enfant voyait de l’eau et un
pont qui commençait dans le vide. Aucun trajet à lire.

Il faut donc **cinq pierres sous la surface** — sombres, avec un remous,
visiblement pas encore praticables. Phaser pose la pierre solide par-dessus à
la bonne réponse. On garde la récompense visuelle *et* le trajet se lit en une
seconde.

---

## 4. Procédure de calibrage

L’illustration est produite librement, puis les ancrages sont recalés sur elle.

```text
1. générer l'image en suivant le brief comme guide de composition
2. choisir la meilleure composition visuelle
3. geler définitivement cette image
4. ouvrir /primaire/jeux/riviere-des-fractions/prototype-v2
5. lire sur la grille le centre réel de chaque pierre
6. recopier les valeurs dans v2/anchors.js, au demi-pourcent
7. relancer node src/test/js/fraction-river-anchors.test.js
```

La grille affiche des lignes tous les 5 %, chiffrées tous les 10 %. On lit la
bonne valeur dessus, on ne fait pas que constater l’erreur.

Ce que les tests savent faire, et ce qu’ils ne savent pas :

- ils vérifient la **cohérence** de la grille — proportions, monotonie du
  trajet, respect du panneau, taille du héros à l’écran ;
- ils ne vérifient **pas** que les ancrages tombent sur les pierres peintes.
  Aucun test ne lit une image. Cette correspondance se contrôle à l’œil.

C’est une leçon payée cher : la scène en primitives avait été validée par un
aperçu SVG écrit depuis les mêmes nombres que le code. Il ne pouvait que donner
raison au code. Un aperçu tiré de la source qu’il doit vérifier ne vérifie
rien.

---

## 5. Maquettes de travail

`images/pmi01.png` et `images/pmi02.png` sont les maquettes qui ont fixé la
composition. Elles contiennent le texte, le personnage et les pierres : elles
ne peuvent donc **pas** servir de fond de production.

`pmi02.png` est copiée dans
`src/main/resources/static/images/games/fraction-river/prototype/` pour être
servie au prototype de calibrage. Ce dossier est ignoré par git : ce sont des
images de travail, lourdes et destinées au remplacement.

---

## 6. Le personnage : un chien, pas un enfant

Décision prise après la première intégration : le personnage est un **chien**.
Il traverse les pierres à la place de l’enfant.

Et c’est une décision de sécurité autant que de style. **Le chien ne tombe
jamais à l’eau.** Une mauvaise réponse ne déclenche aucun déplacement : il
attend, assis, et respire jusqu’à la tentative suivante. Aucun enfant ne verra
un personnage sauter dans une rivière parce qu’il s’est trompé.

### État du sprite

Le chien est pour l’instant **dessiné par le code** dans `v2/PlayScene.js`
(`buildDogTexture`). C’est un placeholder : un dessin au code n’atteindra jamais
le niveau du décor peint. Les cinq poses existent déjà comme états — `repos`,
`pret`, `air`, `atterrit`, `celebre` — obtenus par déformation d’une seule
image. Le jour où les vraies images arrivent, seule `setPose()` change.

À produire, fond transparent, WebP :

```text
chien-repos.webp        assis, il attend
chien-pret.webp         ramassé, prêt à bondir
chien-air.webp          en l'air, pattes tendues
chien-atterrit.webp     réception, pattes fléchies
chien-celebre.webp      il fête la réussite
```

Taille utile : environ **160 x 120 px** par pose. À l’écran, le chien fait
58 x 43 px sur un téléphone en paysage ; deux fois cette taille suffit à rester
net, et rien de plus n’est utile.

---

## 7. L’ancien décor est supprimé

C’est fait. Ont disparu du dépôt :

```text
scenes/RiverScene.js          la scène et ses ~250 lignes de primitives
scenes/BootScene.js           et son miroitement de la moitié basse du héros
objects/Explorer.js
objects/Frog.js
objects/FractionStone.js
layouts.js                    remplacé par v2/anchors.js
src/test/js/fraction-river-layouts.test.js
```

`fraction-river-game.js` amorce désormais `v2/PlayScene` sur un canvas
transparent posé devant l’illustration. `setLayoutMode()` survit avec sa
signature d’origine, mais ne fait plus qu’un recadrage : il n’y a plus deux
géométries à choisir, l’illustration est unique.

La progression, les questions, les visuels de fractions et les sauvegardes
n’ont pas été touchés.

---

## 8. Deux dettes ouvertes, chiffrées

**Le poids.** `river-scene.png` pèse **2,55 Mo**. C’est inacceptable en
production : le mode hors connexion et les connexions facturées au mégaoctet
l’interdisent, et Phaser à lui seul coûte déjà 1,14 Mo. Converti en **WebP
qualité 80**, ce fichier doit tomber autour de **250 à 400 Ko**. Aucun outil de
conversion n’est installé sur la machine — ni ImageMagick, ni ffmpeg, ni
`cwebp`, ni Pillow. C’est le premier geste à faire avant tout déploiement.

**La largeur du parchemin.** Mesuré sur l’illustration, l’intérieur du
parchemin fait **18,9 % de la largeur** de l’image. Sur un téléphone en paysage
en mode immersif, cela donne une question de **121 x 183 px**. C’est jouable sur
un écran de bureau, très serré sur un téléphone.

Les jeux d’Alloprof ne mettent pas la question sur le côté : dans leur course
aux lapins, l’énoncé est un **bandeau en haut** et les réponses une **rangée en
bas**. Si la lisibilité sur téléphone devient bloquante, c’est cette disposition
qu’il faudra adopter — et donc déplacer le parchemin dans une prochaine
illustration.
