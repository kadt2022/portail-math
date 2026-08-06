```text
STATUT : ARCHIVÉ

Ce document est remplacé par :
Portail-Math — Backlog React Dashboard et Monstre des mers.md

Le récit REACT-DASHBOARD-01 y a été redécoupé en plusieurs PR
(REACT-DASHBOARD-01, REACT-DASHBOARD-02, REACT-CATALOGUE-01) et le
récit MONSTRE-MERS-01 y a été réécrit avec le ton définitif du
personnage (le gardien joyeux des passages, pas un poursuivant).

Ne pas créer de branche ou de récit à partir de ce document.
```

---

# REACT-DASHBOARD-01 — Créer le tableau de bord moderne de Portail-Math

## Intention

En tant qu’élève, je veux arriver sur un tableau de bord moderne, clair et agréable afin de retrouver immédiatement mes jeux, ma progression et l’activité que je peux continuer.

En tant que mainteneur, je veux que ce tableau de bord devienne progressivement la nouvelle porte d’entrée du portail afin de pouvoir décommissionner l’ancienne interface Thymeleaf sans interrompre les jeux existants.

---

## Contexte

Le socle React existe déjà sous :

```text
/app
```

Il est construit par Gradle, intégré dans le JAR Spring Boot et servi par le même déploiement OpenShift.

Cependant, la page React actuelle est uniquement une preuve technique. Elle ne possède encore :

- ni navigation ;
- ni tableau de bord réel ;
- ni catalogue des jeux ;
- ni affichage de progression ;
- ni route fonctionnelle pour Le Monstre des mers.

Le nouveau tableau de bord ne doit pas être une simple copie de l’interface Thymeleaf existante.

Il doit établir la nouvelle identité visuelle de Portail-Math.

---

# 1. Direction artistique

## Style recherché

Le tableau de bord doit ressembler à une application éducative moderne des années 2020 et non à une page administrative ancienne.

Il doit être :

- accueillant ;
- lumineux ;
- calme ;
- illustré sans être encombré ;
- adapté aux enfants du primaire ;
- clairement ancré dans un contexte africain contemporain ;
- lisible sans dépendre d’effets décoratifs ;
- cohérent avec les futurs jeux.

La page ne doit pas utiliser une accumulation de petits cadres blancs identiques.

Les sections doivent être reconnaissables par leur composition, leur espace, leur typographie et leur contenu.

## Principes visuels

```text
grands titres lisibles
cartes de jeux généreuses
illustrations fortes
peu de texte par carte
boutons immédiatement identifiables
espaces respirants
coins arrondis modernes
ombres très légères
couleurs cohérentes
aucune surcharge arc-en-ciel
```

Les cartes ne doivent pas donner l’impression d’un tableau Excel décoré.

Le tableau de bord doit créer une hiérarchie claire :

```text
1. ce que l’enfant peut continuer
2. les jeux disponibles
3. sa progression
4. les futures aventures
```

---

# 2. Adaptation aux écrans

Le design ne doit pas dépendre de la taille physique de l’écran en pouces.

Il doit répondre à la largeur réelle du viewport.

## Très petit écran

À partir d’environ 320 pixels CSS :

```text
une seule colonne
navigation compacte
aucun défilement horizontal
boutons sur toute la largeur si nécessaire
texte jamais inférieur à la taille lisible
cartes empilées
illustrations recadrées proprement
```

Aucun élément important ne doit être masqué pour faire rentrer la page.

## Téléphone

```text
une colonne principale
zone « Continuer » visible rapidement
cartes tactiles larges
cibles interactives d’au moins 44 × 44 pixels
menu accessible au pouce
```

## Tablette

```text
deux colonnes lorsque l’espace le permet
navigation complète ou compacte selon la largeur
cartes de jeux plus illustrées
progression affichée sans surcharger
```

## Laptop et écran de bureau

```text
navigation latérale ou supérieure complète
grille de deux à quatre cartes selon la largeur
zone centrale limitée pour rester lisible
```

## Grand et très grand écran

Sur un écran géant, le contenu ne doit pas s’étirer jusqu’aux bords.

Utiliser une largeur maximale cohérente, par exemple :

```text
max-width : entre 1440 et 1680 pixels
```

Au-delà :

- le contenu reste centré ;
- les cartes ne deviennent pas gigantesques ;
- les lignes de texte ne deviennent pas interminables ;
- l’espace supplémentaire sert de respiration.

Sur l’écran imaginaire de 1000 pouces, le portail reste donc beau au centre au lieu de devenir un désert avec quatre boutons éloignés de plusieurs mètres.

---

# 3. Routes React

Mettre en place une navigation cliente sous `/app`.

Routes initiales :

```text
/app
/app/jeux
/app/jeux/monstre-des-mers
/app/progression
/app/*
```

Comportement :

```text
/app
→ tableau de bord

/app/jeux
→ catalogue React

/app/jeux/monstre-des-mers
→ page de préparation du futur jeu

/app/progression
→ détail de la progression locale

route inconnue
→ page React « Page introuvable »
```

Une actualisation directe de chacune de ces routes doit fonctionner.

Les routes suivantes restent hors du routeur React :

```text
/api/**
/actuator/**
/primaire/**
/exetat/**
```

---

# 4. Structure du tableau de bord

## 4.1 En-tête

Afficher :

```text
Portail-Math
Apprendre, jouer et progresser
```

Prévoir :

- un bouton de navigation mobile ;
- un accès au tableau de bord ;
- un accès aux jeux ;
- un accès à la progression ;
- un retour vers les pages historiques encore nécessaires.

Ne pas afficher de faux compte utilisateur si aucune authentification n’existe.

## 4.2 Message d’accueil

Exemple de contenu :

```text
Bonjour, explorateur !

Choisis une aventure ou continue celle que tu as déjà commencée.
```

Le message ne doit pas inventer le nom de l’enfant.

## 4.3 Continuer à jouer

Cette zone doit être l’élément principal si une progression locale existe.

Exemples :

```text
Continuer La Rivière des fractions
3 pierres sur 5

Continuer Le Train des multiplications
4 gares sur 5
```

Si aucune partie n’a commencé :

```text
Choisis ta première aventure
```

## 4.4 Jeux disponibles

Afficher au minimum :

### Le Train des multiplications

```text
Apprends les tables de 2 et 5 en faisant avancer ton train.

[Jouer]
```

Lien temporaire vers la route Thymeleaf existante.

### La Rivière des fractions

```text
Traverse la rivière en reconnaissant les bonnes fractions.

[Jouer]
```

Lien temporaire vers la route Thymeleaf existante.

### Le Monstre des mers

```text
Résous les défis et guide la pirogue jusqu’au port.

[Nouvelle aventure]
```

Lien vers :

```text
/app/jeux/monstre-des-mers
```

Tant que le jeu n’est pas encore développé, afficher clairement :

```text
En préparation
```

Le bouton ne doit pas prétendre lancer une partie inexistante.

## 4.5 Progression

Afficher une synthèse simple :

```text
Jeux commencés
Défis terminés
Réussites au premier essai
Erreurs corrigées
```

Ne pas afficher de pourcentages artificiels lorsque les données ne permettent pas de les calculer correctement.

Ne pas créer de classement public.

## 4.6 Futures aventures

Afficher quelques jeux annoncés sans faux bouton actif :

```text
Le Marché des nombres
Le Constructeur de formes
Le Monstre des mers, si son développement n’est pas encore commencé
```

Les cartes à venir doivent être visuellement distinctes des jeux jouables.

---

# 5. Progression existante

Le tableau de bord doit lire les clés existantes sans les renommer :

```text
portailMath.games.fractionRiver.v1
portailMath.games.multiplicationTrain.v1
portailMath.exetat.progress.v1
```

Créer des adaptateurs TypeScript en lecture seule.

Exemple :

```text
frontend/src/progress/
├── progress-types.ts
├── fraction-river-progress.ts
├── multiplication-train-progress.ts
└── dashboard-progress.ts
```

Règles :

- ne jamais appeler `localStorage.clear()` ;
- ne jamais modifier une autre clé ;
- accepter l’absence de données ;
- accepter un JSON corrompu ;
- produire un état par défaut sûr ;
- ne pas réécrire les magasins historiques dans ce récit.

---

# 6. Composants proposés

```text
frontend/src/
├── app/
│   ├── AppRouter.tsx
│   ├── AppLayout.tsx
│   └── navigation.ts
├── dashboard/
│   ├── DashboardPage.tsx
│   ├── WelcomeHero.tsx
│   ├── ContinuePlaying.tsx
│   ├── ProgressSummary.tsx
│   └── UpcomingGames.tsx
├── games/
│   ├── GamesCataloguePage.tsx
│   ├── GameCard.tsx
│   ├── game-catalogue.ts
│   └── sea-monster/
│       └── SeaMonsterComingSoonPage.tsx
├── progress/
└── styles/
```

Éviter un unique `App.tsx` contenant toute la page.

---

# 7. Accessibilité

Le tableau de bord doit respecter au minimum :

```text
un seul h1 par page
hiérarchie correcte des titres
lien d’évitement vers le contenu
navigation utilisable au clavier
focus toujours visible
aucune information portée seulement par une couleur
textes alternatifs utiles
illustrations décoratives masquées aux lecteurs d’écran
zones tactiles suffisamment grandes
contrastes lisibles
respect de prefers-reduced-motion
```

Le menu mobile doit :

- annoncer son état ouvert ou fermé ;
- être refermable avec Échap ;
- rendre correctement le focus ;
- ne pas laisser la page arrière défiler.

---

# 8. Performance

Le nouveau tableau de bord ne doit pas charger Phaser.

Phaser doit rester absent du bundle initial.

Le tableau de bord ne doit charger que :

- React ;
- les composants de navigation ;
- les petites illustrations nécessaires ;
- les données locales.

Objectifs proposés :

```text
JavaScript initial gzip : inférieur à 120 Ko
illustrations visibles immédiatement : inférieur à 500 Ko au total
aucune image source surdimensionnée
formats WebP, AVIF ou SVG adaptés
```

Les ressources du Monstre des mers ne doivent pas être chargées depuis le tableau de bord.

---

# 9. Compatibilité avec Thymeleaf

Pendant la migration :

```text
React
→ nouvelle porte d’entrée et nouveau catalogue

Thymeleaf
→ anciennes pages et anciens jeux
```

Les liens React peuvent temporairement ouvrir les anciennes routes Thymeleaf.

Aucune ancienne route ne doit être supprimée dans ce récit.

Le tableau de bord historique ne sera décommissionné qu’après validation du nouveau tableau de bord React.

---

# 10. Critères d’acceptation

## Fonctionnels

```text
[ ] /app affiche un véritable tableau de bord
[ ] le texte technique MIG-REACT-00 a disparu de l’interface
[ ] le tableau de bord contient une navigation
[ ] les jeux disponibles sont affichés
[ ] le Train ouvre encore sa route existante
[ ] la Rivière ouvre encore sa route existante
[ ] le Monstre des mers possède une page React dédiée
[ ] la progression locale existante est lue
[ ] un stockage absent ne produit aucune erreur
[ ] un stockage corrompu ne produit aucune erreur
[ ] une route React inconnue affiche une page 404 React
[ ] /api/** et /actuator/** restent inchangés
```

## Responsive

```text
[ ] aucun débordement horizontal à 320 px
[ ] le tableau de bord est utilisable en portrait
[ ] le tableau de bord est utilisable en paysage
[ ] la grille s’adapte sur tablette
[ ] les cartes ne deviennent pas trop larges sur laptop
[ ] le contenu reste centré sur écran géant
[ ] les lignes de texte gardent une largeur lisible
[ ] les cibles tactiles respectent au moins 44 × 44 px
```

## Qualité

```text
[ ] npm run lint réussit
[ ] npm run test réussit
[ ] npm run build réussit
[ ] les tests Java historiques réussissent
[ ] les tests JavaScript historiques réussissent
[ ] le JAR contient le portail React
[ ] un seul JAR exécutable est produit
[ ] aucune clé de progression n’est renommée
[ ] Phaser n’est pas présent dans le bundle du dashboard
```

---

# MONSTRE-MERS-01 — Préparer la première aventure React

## Intention

En tant qu’enfant, je veux ouvrir Le Monstre des mers depuis le nouveau tableau de bord afin de découvrir une aventure mathématique construite directement dans la nouvelle architecture React.

## Dépendance

Ce récit commence après validation de `REACT-DASHBOARD-01`.

## Route

```text
/app/jeux/monstre-des-mers
```

## Première tranche

La première version doit contenir :

```text
un écran de lancement
une illustration de la mer
une pirogue
un monstre marin amical
une seule question
trois réponses HTML
une animation de réussite
un message de fin
un retour au tableau de bord
```

Le monstre ne doit jamais attaquer l’enfant.

Une mauvaise réponse :

```text
ne fait pas avancer la pirogue
ne fait perdre aucun point
ne déclenche aucune animation menaçante
affiche un indice
permet de recommencer
```

Une bonne réponse :

```text
valide le défi
fait réagir joyeusement le monstre
fait avancer la pirogue
affiche un encouragement
```

## Architecture

```text
React
→ question, réponses, progression, accessibilité

Phaser
→ pirogue, monstre, eau et animations

illustration
→ ciel, mer, îlots et port
```

Aucun texte pédagogique ne doit être peint dans le décor ou dans le canvas.

## Critères d’acceptation

```text
[ ] le jeu est accessible depuis le tableau de bord React
[ ] la route profonde fonctionne après actualisation
[ ] Phaser est chargé uniquement à l’ouverture du jeu
[ ] un seul canvas est créé
[ ] la question est affichée en HTML
[ ] les réponses sont accessibles au clavier
[ ] une erreur ne punit pas l’enfant
[ ] la bonne réponse fait avancer la pirogue
[ ] le jeu reste compréhensible sans son
[ ] prefers-reduced-motion est respecté
[ ] quitter le jeu retourne au tableau de bord
```

## Hors périmètre

```text
cinq questions
plusieurs niveaux
sauvegarde complète
classement
authentification
multijoueur
migration de la Rivière
migration du Train
```

---

# Ordre retenu

```text
1. REACT-DASHBOARD-01
2. MONSTRE-MERS-01
3. GAME-RUNTIME-01 ou intégration du runtime dans MONSTRE-MERS-01
4. MONSTRE-MERS-02 — Parcours complet
5. MONSTRE-MERS-03 — Sauvegarde et progression
6. MONSTRE-MERS-04 — Mode immersif mobile
```

Le tableau de bord devient donc la maison moderne du portail, et Le Monstre des mers devient la première grande aventure conçue directement pour cette nouvelle maison.