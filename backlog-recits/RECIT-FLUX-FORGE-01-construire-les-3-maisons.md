# RECIT-FLUX-FORGE-01 — Niveau 1 : Construire les 3 maisons

## Contexte

Flux Forge est un jeu éducatif de Mbuyamba dans lequel l'enfant devient un petit ingénieur.
Le jeu est organisé en niveaux.

Ce récit concerne uniquement :

**NIVEAU 1 — CONSTRUIRE LE VILLAGE**

L'enfant doit construire trois maisons :

- Maison A
- Maison B
- Maison C

Chaque maison est construite progressivement.

Ne pas développer dans ce récit :

- puits ;
- pompe ;
- réservoir fonctionnel ;
- tuyaux ;
- distribution d'eau ;
- consommation.

Ces éléments appartiendront aux niveaux suivants.

## Objectifs pédagogiques du niveau 1

Le niveau doit permettre à l'enfant de pratiquer :

- la mesure ;
- les longueurs ;
- les surfaces ;
- les volumes ;
- les unités ;
- les conversions simples ;
- la relation entre un calcul et un objet réellement construit.

La boucle fondamentale est :

```text
observer
→ mesurer
→ calculer
→ valider
→ construire
```

Une bonne réponse doit produire une conséquence visible dans le monde du jeu.

## Technologie retenue

### Interface

Utiliser :

```text
React
TypeScript
CSS Modules
```

React gère :

- interface du jeu ;
- panneaux ;
- progression ;
- exercices ;
- boutons ;
- feedback ;
- état du niveau ;
- responsive téléphone/tablette/PC.

### Scène 3D

Utiliser :

```text
Babylon.js
```

Babylon.js gère :

- terrain ;
- maisons ;
- murs ;
- portes ;
- toits ;
- cubes ;
- pavés droits ;
- volumes ;
- caméra ;
- sélection des objets ;
- drag & drop ;
- animations ;
- mesures visuelles dans l'espace 3D.

La scène 3D doit rester limitée à la zone centrale du jeu.
Ne pas utiliser Babylon.js pour construire toute l'interface HTML.

### Pourquoi Babylon.js dès le niveau 1

Le niveau 1 contient déjà :

```text
surface
volume
longueur
largeur
hauteur
```

L'enfant devra pouvoir comprendre visuellement la différence entre :

```text
m
m²
m³
```

Le moteur 3D doit permettre de montrer clairement :

- une longueur ;
- une hauteur ;
- une profondeur ;
- une face ;
- un solide.

Le choix de Babylon.js prépare aussi les niveaux suivants sans changer de moteur.

## Interaction : clic OU drag & drop

Les deux interactions doivent être supportées.
L'enfant ne doit jamais être obligé de savoir utiliser uniquement le drag & drop.

### Mode 1 — clic / touch

Exemple :

```text
1. l'enfant touche le mur fantôme
2. le mur devient sélectionné
3. il touche l'emplacement de construction
4. le mur se positionne
```

Sur téléphone, cette interaction est prioritaire.

### Mode 2 — drag & drop

Exemple :

```text
palette
[ MUR ]

     ↓ drag

emplacement transparent
```

Pendant le déplacement :

- afficher l'objet semi-transparent ;
- montrer la destination ;
- utiliser un effet d'aimantation ;
- empêcher les placements incorrects.

Quand l'objet arrive près de sa destination :

```text
snap
```

L'objet s'aligne automatiquement.

### Règle d'ergonomie

Le même exercice doit pouvoir être réalisé avec :

```text
clic
OU
drag & drop
```

Ne pas créer deux jeux différents.
Les deux interactions déclenchent la même logique métier.

## État initial

Au lancement :

- terrain du village visible ;
- trois emplacements de maisons suffisamment espacés ;
- Maison A active ;
- Maisons B et C réservées mais discrètes.

Ne pas afficher de maisons déjà terminées.
La Maison A commence par un emplacement de mur transparent.

## Maison A

### Étape A1 — Mur

Afficher un mur fantôme 3D.

Exemple :

```text
longueur : 4 m
hauteur : 2 m
```

L'enfant peut :

```text
cliquer le mur
```

ou :

```text
faire glisser le mur
```

vers sa position.

Après sélection, proposer l'exercice :

```text
Quelle est la surface du mur ?

4 × 2 = ?
```

Réponse :

```text
8 m²
```

Bonne réponse :

```text
mur fantôme
→ animation
→ mur construit
```

Mauvaise réponse :

- mur non construit ;
- feedback ;
- nouvelle tentative.

### Étape A2 — Porte

Après construction du mur :

- afficher l'emplacement fantôme de la porte ;
- permettre clic ou drag & drop.

Exemple :

```text
largeur : 1 m
hauteur : 2 m
```

Question :

```text
Surface de la porte ?
```

Réponse :

```text
2 m²
```

Bonne réponse :

```text
porte construite
```

### Étape A3 — Toit

Afficher ensuite le toit fantôme.

Exemple :

```text
5 m × 3 m
```

Question :

```text
Quelle surface faut-il couvrir ?
```

Réponse :

```text
15 m²
```

Bonne réponse :

```text
toit transparent
→ toit réel
```

Maison A terminée.

### Étape A4 — Volume

Ajouter un petit objet volumique associé à la maison.

Pour le MVP :

```text
caisse de stockage
```

ou :

```text
bloc de construction
```

Utiliser un pavé droit.

Exemple :

```text
longueur : 2 m
largeur  : 2 m
hauteur  : 1 m
```

Question :

```text
Quel est son volume ?
```

Réponse :

```text
2 × 2 × 1 = 4 m³
```

Babylon.js doit montrer clairement les trois dimensions.

### Étape A5 — Conversion

Après calcul du volume, proposer une conversion simple.

Exemple :

```text
4 m³ = ? litres
```

Rappel :

```text
1 m³ = 1000 L
```

Réponse :

```text
4000 L
```

Cette étape ne signifie pas encore que le système d'eau fonctionne.
Il s'agit uniquement d'un exercice de conversion.

## Maison B

Reprendre la même structure :

```text
mur
→ porte
→ toit
→ volume
→ conversion
```

Mais avec d'autres dimensions.

Exemple :

```text
mur : 5 × 2
porte : 1 × 2
toit : 6 × 3
volume : 3 × 2 × 1
```

## Maison C

Même mécanique.

Exemple :

```text
mur : 6 × 2
porte : 1 × 2
toit : 7 × 3
volume : 3 × 2 × 2
```

## Banque d'exercices

Les valeurs ne doivent pas être codées directement dans les composants React.
Créer une structure dédiée.

Exemple :

```typescript
type Exercise = {
  type:
    | "surface"
    | "volume"
    | "conversion";

  objectType:
    | "wall"
    | "door"
    | "roof"
    | "block";

  dimensions: {
    length?: number;
    width?: number;
    height?: number;
  };

  expectedAnswer: number;
  unit: "m²" | "m³" | "L";
};
```

Prévoir plusieurs exercices par catégorie.
Le niveau pioche un exercice compatible avec l'élément courant.

## État du niveau

Prévoir un état explicite.

Exemple :

```typescript
type HousePart =
  | "wall"
  | "door"
  | "roof"
  | "volume"
  | "conversion";

type Status =
  | "locked"
  | "active"
  | "completed";
```

Exemple d'état :

```typescript
{
  currentHouse: 0,
  currentPart: "wall",

  houses: [
    {
      wall: "active",
      door: "locked",
      roof: "locked",
      volume: "locked",
      conversion: "locked"
    }
  ]
}
```

## Règle de progression

L'ordre doit être strict :

```text
Maison A complète
→ Maison B complète
→ Maison C complète
```

Pour chaque maison :

```text
mur
→ porte
→ toit
→ volume
→ conversion
```

Aucune étape ne doit être sautée.

## Interaction Babylon.js

Chaque pièce manipulable doit disposer :

- d'un identifiant ;
- d'un emplacement cible ;
- d'une zone de sélection ;
- d'un état ;
- d'un comportement de snap.

Exemple conceptuel :

```typescript
{
  id: "house-a-wall",
  target: "house-a-wall-slot",
  draggable: true,
  clickable: true,
  status: "active"
}
```

### Drag & drop

Pendant un drag :

- conserver l'objet visible ;
- afficher sa transparence ;
- éviter qu'il parte hors scène ;
- ne pas permettre un placement arbitraire ;
- utiliser un snap sur l'emplacement correct.

Si l'enfant lâche ailleurs :

```text
objet
→ retourne doucement à sa position initiale
```

### Clic / touch

Sur clic :

1. sélectionner l'objet ;
2. lui ajouter un contour lumineux ;
3. afficher les destinations possibles ;
4. clic sur la destination ;
5. déplacer automatiquement la pièce.

Cette méthode doit être pleinement utilisable sur téléphone.

## Caméra

Pour le niveau 1 :

- caméra 3D légèrement inclinée ;
- rotation très limitée ;
- zoom limité ;
- éviter que l'enfant perde la maison hors écran.

Pas de caméra libre type logiciel 3D professionnel.

## Mesures visuelles

Quand l'enfant utilise la règle :
Babylon.js doit pouvoir afficher des lignes de mesure.

Exemple :

```text
●────────────●
      4 m
```

Pour un volume :

```text
longueur : 2 m
largeur : 2 m
hauteur : 1 m
```

Les trois axes doivent être visuellement distinguables.

## Responsive

Le niveau doit fonctionner :

- ordinateur ;
- tablette ;
- téléphone.

Sur téléphone :

- scène 3D prioritaire ;
- panneaux secondaires rétractables ;
- gros boutons tactiles ;
- clic/touch prioritaire ;
- drag & drop conservé mais non obligatoire.

## Feedback

Bonne réponse :

- validation verte courte ;
- petite animation ;
- son positif optionnel ;
- construction de l'élément.

Mauvaise réponse :

- aucun élément construit ;
- feedback court ;
- pas d'écran rouge agressif ;
- nouvelle tentative immédiate.

## Fin du niveau 1

Une fois les trois maisons terminées :

Afficher le village complet.
Les trois maisons doivent être espacées et visibles.

Afficher :

```text
NIVEAU 1 TERMINÉ

Ton village est construit !
```

Puis débloquer :

```text
NIVEAU 2
```

Ne pas lancer automatiquement le niveau 2.

## Critères d'acceptation

- Niveau 1 contient uniquement la construction.
- Trois maisons doivent être construites.
- Maison A est terminée avant Maison B.
- Maison B est terminée avant Maison C.
- Chaque maison contient mur, porte et toit.
- Chaque maison contient au moins un exercice de volume.
- Le niveau comporte des conversions.
- Le mur commence sous forme transparente.
- La porte commence sous forme transparente.
- Le toit commence sous forme transparente.
- Les objets peuvent être sélectionnés par clic/touch.
- Les objets peuvent être déplacés par drag & drop.
- Le clic et le drag déclenchent la même logique.
- Les objets utilisent un snap vers leur emplacement.
- Une mauvaise réponse ne construit rien.
- Une bonne réponse construit réellement l'élément.
- Babylon.js est utilisé pour la scène 3D.
- React/TypeScript gèrent l'interface et la progression.
- Les exercices sont séparés de la logique graphique.
- L'interface fonctionne sur téléphone.
- Aucun système hydraulique actif n'est développé dans ce récit.
- À la fin, les trois maisons restent visibles.
- Le niveau 2 est débloqué mais non démarré.

## Définition de terminé

Le récit est terminé lorsque l'enfant peut construire :

```text
Maison A
Maison B
Maison C
```

en répétant :

```text
mur
→ porte
→ toit
→ volume
→ conversion
```

et en utilisant indifféremment :

```text
clic/touch
OU
drag & drop
```

avec une vraie scène 3D Babylon.js.

Le niveau se termine uniquement lorsque les trois maisons sont complètement construites.
