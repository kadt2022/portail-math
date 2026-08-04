# La Rivière des fractions — Cahier des charges et récits de développement

**Version :** 2.1  
**Projet :** Portail Math  
**Route cible :** `/primaire/jeux/riviere-des-fractions`  
**Public :** élèves du primaire, cycle 2–3, environ 7 à 10 ans  
**Stack imposée :** Spring Boot, Thymeleaf, HTML, CSS, JavaScript natif et Phaser pour la scène de jeu  
**Statut :** prêt à intégrer au backlog  

---

# 1. Thèse pédagogique centrale

> **Une fraction n’est pas seulement deux nombres l’un sur l’autre : c’est une partie visible d’un tout.**

Chaque exercice doit montrer cette réalité, jamais seulement la dire.

Toute question repose sur une représentation concrète :

- pizza ;
- tablette de chocolat ;
- disque ;
- bande colorée ;
- panier d’objets ;
- collection de fruits ;
- objets partagés en parts égales.

Les nombres seuls sont interdits dans les premières étapes du niveau 1. Ils apparaissent progressivement dans les niveaux suivants, mais restent toujours accompagnés d’un visuel ou d’une situation concrète.

---

# 2. Synopsis du jeu

L’enfant incarne un jeune explorateur noir portant un petit sac. Il commence sur la rive gauche d’une rivière africaine lumineuse et doit rejoindre une île au trésor ou un village scolaire situé sur l’autre rive.

Chaque bonne réponse :

1. valide une étape ;
2. fait apparaître une pierre, un nénuphar, une petite barque ou une planche ;
3. déclenche une animation de progression ;
4. rapproche l’enfant de l’autre rive.

Une mauvaise réponse :

- ne fait jamais tomber l’enfant ;
- n’entraîne aucune perte de point ;
- affiche un indice ciblé ;
- permet de recommencer immédiatement.

---

# 3. Principes pédagogiques obligatoires

Les trois récits doivent respecter les règles suivantes :

1. aucun chronomètre ;
2. aucun compte à rebours ;
3. aucune chute dans l’eau ;
4. aucune humiliation ;
5. aucune pénalité punitive ;
6. une erreur entraîne un indice adapté ;
7. l’enfant peut recommencer ;
8. les visuels précèdent les calculs abstraits ;
9. la réussite au premier essai et la persévérance sont mesurées séparément ;
10. aucun classement public ;
11. aucun achat intégré ;
12. aucune publicité ;
13. aucune collecte de données personnelles ;
14. le jeu reste entièrement jouable sans son ;
15. aucune information ne dépend uniquement d’une couleur.

---

# 4. Périmètre technique commun

## 4.1 Technologies autorisées

Le jeu doit s’intégrer à l’application existante avec :

```text
Spring Boot
Thymeleaf
HTML
CSS
JavaScript natif
Phaser
localStorage
```

Règle de partage des responsabilités :

```text
Framework graphique autorisé : Phaser
Framework d’interface autorisé : React
Vue et Angular restent interdits
Phaser ne gère que la scène interactive du jeu
React ne remplace pas Phaser dans les scènes de jeu
Thymeleaf reste responsable des pages non encore migrées
```

> **Amendement du 3 août 2026 — MIG-REACT-00.** React était interdit dans la
> version 2.1 de ce document. Le portail migre désormais vers React selon une
> stratégie progressive dite de l’étrangleur : React prend en charge le portail
> et les interfaces, Phaser demeure le moteur graphique des jeux, et Thymeleaf
> reste en service tant que toutes les pages n’ont pas leur équivalent React.
>
> Les magasins de progression (`fraction-river-store.js`,
> `multiplication-train-store.js`, `progress-store.js`) ne seront jamais
> réécrits. Leur portage vers des modules ES sera mécanique et conservera
> exactement les mêmes clés de stockage local, sous peine d’effacer la
> progression déjà enregistrée sur l’appareil de chaque élève. Un test
> verrouille ces trois clés.

Sont hors périmètre :

```text
Vue
Angular
Unity
Godot
application frontend séparée
nouveau backend séparé
nouvelle base de données
```

### Conséquences pratiques de cette règle

- Phaser est servi depuis `static/`, jamais depuis un CDN : le mode hors connexion et le déploiement OpenShift ne doivent dépendre d’aucun tiers.
- Puisque Thymeleaf reste responsable de la page, les questions, les options de réponse, la correction et les boutons de navigation restent des éléments HTML. La scène Phaser porte le décor, le personnage et les animations. Cela préserve le §4.7 : navigation clavier, focus visible et annonces `aria-live` ne fonctionnent pas à l’intérieur d’un canvas.
- Phaser n’applique pas `prefers-reduced-motion` de lui-même : tweens, particules et défilements doivent être coupés explicitement, conformément au §4.6.
- Le moteur pédagogique reste du JavaScript pur, sans dépendance à Phaser ni au DOM, afin de rester testable en Node comme l’exige le §7.9.

## 4.2 Routes

```http
GET /primaire/jeux
GET /primaire/jeux/riviere-des-fractions
```

La page `/primaire/jeux` doit afficher :

```text
🌊 La Rivière des fractions
Traverse le fleuve en choisissant les bonnes fractions.

[Jouer]
```

Les niveaux non encore développés apparaissent avec :

```text
Bientôt disponible
```

## 4.3 Arborescence indicative

```text
src/main/java/.../primaire/game/
└── FractionRiverPageController.java

src/main/resources/templates/primaire/games/
└── fraction-river.html

src/main/resources/static/css/
└── fraction-river.css

src/main/resources/static/js/
├── fraction-river.js
├── fraction-river-store.js
├── fraction-river-questions.js
└── fraction-river-visuals.js
```

Crochet peut adapter les packages exacts à la structure réelle du dépôt, sans créer une seconde architecture.

## 4.4 Stockage local

Clé unique :

```text
portailMath.games.fractionRiver.v1
```

Structure indicative :

```json
{
  "currentLevel": 1,
  "completedSteps": 5,
  "firstTryCorrect": 3,
  "correctedErrors": 2,
  "gamesPlayed": 4,
  "badges": ["EXPLORATEUR_DES_DEMIS"],
  "decorations": ["VOILE"],
  "soundEnabled": true,
  "recentQuestionIds": ["q12", "q18", "q27"],
  "lastPlayedAt": "2026-08-02T20:00:00Z"
}
```

Règles :

- ne jamais appeler `localStorage.clear()` ;
- ne lire, modifier ou supprimer que la clé du jeu ;
- un JSON absent ou corrompu doit produire un état par défaut valide ;
- une question ayant nécessité plusieurs tentatives ne compte qu’une seule fois dans `correctedErrors`.

## 4.5 Métriques

Les trois métriques sont distinctes :

```text
completedSteps
→ nombre d’étapes terminées

firstTryCorrect
→ nombre de questions réussies au premier essai

correctedErrors
→ nombre de questions ayant nécessité au moins une correction
```

Exemple de résultat :

```text
Traversée terminée : 5/5 étapes
Réussites au premier essai : 3/5
Erreurs corrigées : 2
```

Une question corrigée après plusieurs erreurs :

- augmente `completedSteps` ;
- augmente `correctedErrors` une seule fois ;
- n’augmente jamais `firstTryCorrect`.

## 4.6 Temporisation mobile

Après une bonne réponse sur mobile :

```text
correction visible
→ animation de progression
→ attente maximale de 3 secondes
→ passage automatique
```

Constante recommandée :

```javascript
const CORRECTION_PAUSE_MS = 3000;
```

Un bouton reste disponible :

```text
[Continuer maintenant]
```

Sur desktop, conserver un bouton explicite de continuation.

Avec `prefers-reduced-motion`, les animations et défilements deviennent immédiats ou très réduits, mais le texte de correction reste lisible.

## 4.7 Accessibilité

Le jeu doit respecter au minimum :

- largeur fonctionnelle dès 320 px ;
- aucune barre de défilement horizontale ;
- boutons tactiles d’au moins 44 × 44 px ;
- navigation clavier ;
- focus visible ;
- feedback annoncé via `aria-live` ;
- aucune information portée uniquement par le rouge ou le vert ;
- support de `prefers-reduced-motion` ;
- textes compréhensibles sans son ;
- contrastes suffisants.

## 4.8 Visuels et propriété intellectuelle

Tout le décor doit être original :

- rivière ;
- personnage ;
- pierres ;
- grenouille ;
- poisson ;
- plantes ;
- pont ;
- coffre ;
- village ou école.

Les visuels peuvent être construits avec :

```text
HTML
CSS
SVG originaux
```

Aucun personnage, logo, illustration ou univers protégé ne doit être repris.

---

# 5. Taxonomie commune des distracteurs

Chaque mauvaise réponse doit correspondre à une erreur pédagogique plausible.

## 5.1 Distracteurs de reconnaissance

```text
INVERTED
→ numérateur et dénominateur inversés

OFF_BY_ONE
→ une partie coloriée de trop ou de moins

WHOLE_CONFUSION
→ le nombre total de parts est choisi comme réponse

COLORED_CONFUSION
→ le nombre de parts coloriées est pris seul

DENOMINATOR_CONFUSION
→ mauvais nombre total de parts
```

Exemple :

```text
Visuel : 2 parts coloriées sur 4
Bonne réponse : 2/4

INVERTED : 4/2
OFF_BY_ONE : 1/4
WHOLE_CONFUSION : 4/4
```

## 5.2 Distracteurs d’équivalence

```text
EQUIVALENCE_CONFUSION
→ fraction proche mais non équivalente

SINGLE_SIDE_MULTIPLICATION
→ seul le numérateur ou le dénominateur est multiplié

WRONG_SCALE_FACTOR
→ mauvais facteur multiplicatif
```

Exemple :

```text
1/2 = ?/4

Bonne réponse : 2/4
EQUIVALENCE_CONFUSION : 3/4
SINGLE_SIDE_MULTIPLICATION : 1/4
```

## 5.3 Distracteurs du niveau 3

```text
ADD_BOTH_PARTS
→ addition du numérateur et du dénominateur

KEEP_FIRST_NUMERATOR
→ conservation erronée du premier numérateur

OFF_BY_ONE_SUM
→ résultat inférieur ou supérieur d’une unité

REMAINING_INSTEAD_OF_USED
→ quantité restante choisie à la place de la quantité utilisée

USED_INSTEAD_OF_REMAINING
→ quantité utilisée choisie à la place de la quantité restante
```

Exemple :

```text
1/8 + 3/8

Bonne réponse : 4/8
ADD_BOTH_PARTS : 4/16
KEEP_FIRST_NUMERATOR : 1/8
OFF_BY_ONE_SUM : 3/8
```

---

# 6. Stratégie de contenu

Chaque niveau doit comporter :

```text
10 scénarios pédagogiques validés
+
un générateur déterministe capable de produire au moins 30 variantes
```

Un scénario décrit :

- le type d’exercice ;
- les paramètres autorisés ;
- le type de visuel ;
- la bonne réponse ;
- les distracteurs compatibles ;
- l’indice ciblé ;
- l’explication finale.

Le générateur ne doit jamais :

- produire deux bonnes réponses ;
- produire deux choix identiques ;
- produire une fraction impossible par rapport au visuel ;
- réafficher trop rapidement la même question ;
- générer un distracteur sans sens pédagogique.

---

# 7. RÉCIT 1 — Le Gué des parts

## 7.1 Branche

```text
feature/fraction-river-level-1
```

Une seule branche pour ce récit.

## 7.2 Objectif utilisateur

En tant qu’enfant du primaire,

je veux reconnaître visuellement les premières fractions,

afin de comprendre le rôle du numérateur et du dénominateur avant de faire des calculs.

## 7.3 Périmètre

Le récit construit uniquement :

```text
Niveau 1 — Le Gué des parts
```

Les niveaux 2 et 3 sont visibles mais désactivés avec la mention :

```text
Bientôt disponible
```

## 7.4 Fractions autorisées

```text
1/2
1/3
1/4
2/3
2/4
3/4
```

## 7.5 Les cinq étapes

### Étape 1 — Identifier une fraction

Le jeu montre un visuel partagé en parts égales.

Question :

```text
Quelle fraction est représentée ?
```

### Étape 2 — Choisir le bon visuel

Le jeu affiche une fraction et trois représentations.

Question :

```text
Quel dessin représente 3/4 ?
```

### Étape 3 — Sélectionner les parties demandées

L’enfant clique sur les parties à colorier ou sélectionner.

Question :

```text
Sélectionne 2 parts sur 4.
```

### Étape 4 — Trouver le numérateur

Question :

```text
Trois parts sont coloriées sur quatre.
Quel est le nombre du haut ?
```

### Étape 5 — Trouver le dénominateur

Question :

```text
Deux parts sont coloriées et le tout contient quatre parts.
Quel est le nombre du bas ?
```

## 7.6 Climax — La passerelle des représentations

Le niveau 1 ne contient pas encore le pont des équivalences.

À la cinquième étape, l’enfant doit associer trois représentations à leurs fractions :

```text
dessin d’une moitié → 1/2
dessin d’un quart → 1/4
dessin de trois quarts → 3/4
```

Chaque association correcte pose une dalle de la passerelle.

Lorsque les trois dalles sont posées, l’enfant rejoint la rive opposée et ouvre le coffre.

## 7.7 Indices

Exemples :

```text
Le nombre du bas indique toutes les parts égales.

Le nombre du haut indique les parts coloriées.

Recompte seulement les parties coloriées.

Vérifie que toutes les parts du tout ont été comptées.
```

## 7.8 Récompenses

Badges possibles :

```text
Explorateur des demis
Maître des quarts
```

Attribution proposée :

```text
Explorateur des demis
→ traversée terminée

Maître des quarts
→ 5 réussites au premier essai
```

## 7.9 Tests JavaScript

Tester :

- création des cinq étapes dans l’ordre ;
- fractions limitées au niveau 1 ;
- bonne réponse unique ;
- distracteur pédagogique obligatoire ;
- absence de doublons ;
- calcul de `completedSteps` ;
- calcul de `firstTryCorrect` ;
- calcul de `correctedErrors` ;
- stockage local ;
- récupération après JSON corrompu ;
- passerelle terminée après les associations ;
- navigation mobile ;
- bouton « Continuer maintenant » ;
- préférence de réduction des mouvements.

## 7.10 Tests MVC

```text
GET /primaire/jeux
→ HTTP 200
→ affiche La Rivière des fractions

GET /primaire/jeux/riviere-des-fractions
→ HTTP 200
→ affiche Le Gué des parts

GET /primaire/jeux/riviere-des-fractions/inconnu
→ HTTP 404 propre
```

## 7.11 Critères d’acceptation

- CA-01 : le niveau 1 est jouable de bout en bout ;
- CA-02 : chaque exercice contient un visuel concret ;
- CA-03 : les cinq étapes sont celles définies dans le récit ;
- CA-04 : aucune équivalence ni addition n’est demandée ;
- CA-05 : les erreurs donnent un indice ciblé ;
- CA-06 : les trois métriques sont séparées ;
- CA-07 : la passerelle des représentations constitue le climax ;
- CA-08 : le jeu fonctionne à 320 px ;
- CA-09 : les données locales sont isolées ;
- CA-10 : tous les tests passent ;
- CA-11 : `clean test bootJar` réussit ;
- CA-12 : le pipeline OpenShift existant n’est pas modifié inutilement.

## 7.12 Définition de terminé

Le récit est terminé lorsque :

```text
Le Gué des parts est jouable
Les cinq étapes sont implémentées
La passerelle finale fonctionne
Les indices sont ciblés
Les métriques sont sauvegardées
Le mobile 320 px est fonctionnel
Les tests passent
Le JAR est produit
```

---

# 8. RÉCIT 2 — Les Nénuphars équivalents

## 8.1 Branche

```text
feature/fraction-river-level-2
```

Cette branche est créée depuis `main` après fusion du récit 1.

## 8.2 Objectif utilisateur

En tant qu’enfant ayant compris les parts d’un tout,

je veux comparer et reconnaître des fractions équivalentes,

afin de comprendre que des écritures différentes peuvent représenter la même quantité.

## 8.3 Périmètre

Le récit active :

```text
Niveau 2 — Les Nénuphars équivalents
```

Le niveau 1 reste disponible.

Le niveau 3 reste désactivé avec :

```text
Bientôt disponible
```

## 8.4 Compétences

```text
Comparer des fractions de même dénominateur
Comparer 1/2, 1/3 et 1/4 avec un support visuel
Compléter une fraction
Reconnaître une équivalence simple
Construire une chaîne d’équivalences
```

## 8.5 Les cinq étapes

### Étape 1 — Comparer avec le même dénominateur

```text
Quelle fraction est la plus grande ?
2/5 ou 4/5
```

Les deux fractions sont représentées par des bandes de même taille.

### Étape 2 — Comparer des fractions unitaires

```text
Quelle fraction est la plus grande ?
1/2, 1/3 ou 1/4
```

Les trois visuels doivent représenter le même tout.

### Étape 3 — Compléter une fraction

```text
Deux parts sur quatre sont coloriées.
2 / ?
```

### Étape 4 — Reconnaître une équivalence

```text
Quelle fraction représente la même quantité que 1/2 ?
```

### Étape 5 — Construire une équivalence

```text
1/2 = ?/4
```

## 8.6 Climax — Le pont des fractions équivalentes

La rivière s’élargit. Les pierres ne suffisent plus.

L’enfant complète :

```text
1/2 = 2/4 = 4/8
```

Chaque égalité correcte ajoute une planche.

Le pont doit être visuellement et rythmiquement distinct :

- nouveau décor ;
- squelette de pont ;
- planches ajoutées une par une ;
- marche finale du personnage ;
- ouverture du coffre.

## 8.7 Récompenses

```text
Gardien des fractions
Maître des nénuphars
```

Attribution proposée :

```text
Gardien des fractions
→ traversée terminée

Maître des nénuphars
→ pont construit sans erreur
```

## 8.8 Tests JavaScript

Tester :

- comparaison correcte avec le même tout ;
- visuels de même taille ;
- équivalences mathématiquement valides ;
- distracteurs d’équivalence ;
- ajout d’une planche par réponse correcte ;
- pont terminé uniquement après la chaîne complète ;
- sauvegarde du badge ;
- absence de régression sur le niveau 1.

## 8.9 Critères d’acceptation

- CA-01 : le niveau 2 est accessible après le niveau 1 ;
- CA-02 : les comparaisons utilisent des visuels comparables ;
- CA-03 : l’équivalence est montrée visuellement ;
- CA-04 : le pont est le climax ;
- CA-05 : une mauvaise réponse ne pose aucune planche ;
- CA-06 : les distracteurs sont ciblés ;
- CA-07 : le niveau 1 reste fonctionnel ;
- CA-08 : les tests passent ;
- CA-09 : `clean test bootJar` réussit.

## 8.10 Définition de terminé

```text
Le niveau 2 est jouable
Le pont des équivalences fonctionne
Les indices sont ciblés
Les badges sont sauvegardés
Le niveau 1 n’a pas régressé
Les tests passent
```

---

# 9. RÉCIT 3 — Les Rapides du calcul

## 9.1 Branche

```text
feature/fraction-river-level-3
```

Cette branche est créée depuis `main` après fusion du récit 2.

## 9.2 Objectif utilisateur

En tant qu’enfant maîtrisant les premières fractions,

je veux résoudre de petits calculs et problèmes concrets,

afin d’utiliser les fractions dans des situations réelles.

## 9.3 Périmètre

Le récit active :

```text
Niveau 3 — Les Rapides du calcul
```

Les niveaux 1 et 2 restent disponibles.

## 9.4 Compétences

```text
Fractions équivalentes plus complexes
Addition de fractions ayant le même dénominateur
Quantité utilisée
Quantité restante
Petits problèmes de partage
```

Aucune addition avec dénominateurs différents dans ce récit.

## 9.5 Les cinq étapes

### Étape 1 — Addition visuelle

```text
1/8 + 3/8 = ?
```

Une bande en huit parts montre les deux quantités.

### Étape 2 — Compléter une somme

```text
?/6 + 2/6 = 5/6
```

### Étape 3 — Quantité utilisée

```text
Une famille partage une papaye en 8 morceaux.
Elle en mange 3.
Quelle fraction a été mangée ?
```

### Étape 4 — Quantité restante

```text
Une tablette contient 10 carrés.
Quatre sont mangés.
Quelle fraction reste ?
```

### Étape 5 — Problème de synthèse

Une situation combine :

- lecture du visuel ;
- addition avec même dénominateur ;
- identification de la quantité finale.

## 9.6 Climax — Franchir les rapides

La dernière zone contient plusieurs rochers et courants.

Chaque calcul correct :

- calme une zone de rapides ;
- place une corde ou une passerelle ;
- rapproche l’enfant de la rive.

Le niveau se termine lorsque les trois zones sont sécurisées.

## 9.7 Distracteurs obligatoires

Utiliser notamment :

```text
ADD_BOTH_PARTS
KEEP_FIRST_NUMERATOR
OFF_BY_ONE_SUM
REMAINING_INSTEAD_OF_USED
USED_INSTEAD_OF_REMAINING
```

Chaque distracteur doit déclencher un indice correspondant.

Exemple :

```text
Tu as additionné les nombres du bas.
Quand les dénominateurs sont identiques, le nombre du bas reste le même.
```

## 9.8 Récompenses

```text
Courageux des rapides
Maître du partage
```

## 9.9 Tests JavaScript

Tester :

- additions avec même dénominateur ;
- dénominateur conservé ;
- distinction entre utilisé et restant ;
- distracteurs de calcul ;
- indices adaptés ;
- progression des rapides ;
- sauvegarde du niveau ;
- absence de régression sur les niveaux 1 et 2.

## 9.10 Critères d’acceptation

- CA-01 : seules les additions de même dénominateur sont proposées ;
- CA-02 : les problèmes sont accompagnés d’un visuel ;
- CA-03 : les distracteurs correspondent à des erreurs plausibles ;
- CA-04 : l’indice dépend de l’erreur ;
- CA-05 : les trois niveaux restent jouables ;
- CA-06 : les métriques restent cohérentes ;
- CA-07 : les tests passent ;
- CA-08 : `clean test bootJar` réussit.

## 9.11 Définition de terminé

```text
Le niveau 3 est jouable
Les calculs sont exacts
Les problèmes concrets sont visuels
Les distracteurs de niveau 3 sont implémentés
Les trois niveaux fonctionnent
Les tests passent
```

---

# 10. Tests communs finaux

À la fin des trois récits, vérifier :

```text
GET /primaire/jeux → 200
GET /primaire/jeux/riviere-des-fractions → 200
```

Tester également :

- chargement sans données locales ;
- récupération après stockage corrompu ;
- changement de niveau ;
- absence de répétition immédiate ;
- son activé et désactivé ;
- clavier ;
- lecteur d’écran de base ;
- `prefers-reduced-motion` ;
- largeur 320 px ;
- tablette ;
- desktop ;
- aucun débordement horizontal ;
- aucun asset protégé ;
- aucune dépendance frontend en dehors de Phaser, servi localement ;
- pipeline OpenShift inchangé sauf nécessité démontrée.

Commande finale :

```powershell
.\gradlew.bat clean test bootJar
```

---

# 11. Règles Git pour Crochet

Un seul document de référence est utilisé pour les trois récits.

Chaque récit possède sa propre branche :

```text
Récit 1
feature/fraction-river-level-1

Récit 2
feature/fraction-river-level-2

Récit 3
feature/fraction-river-level-3
```

Règles :

1. une branche par récit ;
2. une Pull Request par récit ;
3. ne pas commencer le récit suivant avant fusion du précédent ;
4. créer la branche suivante depuis `main` à jour ;
5. conserver les tests du niveau précédent ;
6. aucune fusion sans :
   - tests verts ;
   - revue du Sage ;
   - validation du Capitaine Pi.

> **Nulle voile ne se lève sans tests verts, nul sceau n’est posé sans revue.**
