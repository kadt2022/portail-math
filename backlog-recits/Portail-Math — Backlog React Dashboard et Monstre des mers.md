# Portail-Math — Backlog React Dashboard et Monstre des mers

**Statut :** OFFICIEL — remplace `Portail-Math — Backlog React et Monstre des mers.md` (archivé) et absorbe `REACT-DASHBOARD-01 — Créer le tableau de bord moderne de Portail-Math.md`.

**Base technique :** branche `main`
**Route cible du jeu :** `/app/jeux/monstre-des-mers`
**Public cible proposé :** primaire, environ 7 à 9 ans
**Compétence proposée pour le niveau 1 du Monstre des mers :** additions et soustractions de 0 à 20
**Architecture :** React pour l'interface, Phaser pour la scène, Spring Boot pour la livraison
**Stratégie :** le Dashboard React devient la nouvelle porte d'entrée, construit en petites PR successives ; le Train et la Rivière continuent de fonctionner sous Thymeleaf pendant toute la migration.

## Personnalité du Monstre des mers

Ce n'est pas un monstre qui poursuit la pirogue. C'est le **gardien joyeux des passages maritimes** : il aime tellement les mathématiques qu'il arrête gentiment les voyageurs pour leur poser une énigme avant de les laisser passer. Grand, spectaculaire, théâtral — jamais menaçant. Il applaudit une bonne réponse et donne un indice sur une mauvaise, mais ne punit jamais et ne fait jamais perdre de point.

---

# Ordre officiel

```text
1. REACT-DASHBOARD-01 — Coquille moderne (fusionné, PR #13)
2. REACT-I18N-01 — Dashboard bilingue français–anglais
3. REACT-DASHBOARD-02 — Progression réelle
4. REACT-CATALOGUE-01 — Catalogue React
5. GAME-RUNTIME-01 — Pont React–Phaser
6. MONSTRE-MERS-01 — Le monstre pose sa première question
7. MONSTRE-MERS-02 — Cinq énigmes et moteur pédagogique
8. MONSTRE-MERS-03 — Parcours de la pirogue
9. MONSTRE-MERS-04 — Sauvegarde et résultats
10. MONSTRE-MERS-05 — Immersif et validation mobile
```

`REACT-I18N-01` est intercalé avant la suite : le récit doit être en place avant que les textes des nouveaux écrans et jeux ne se multiplient dans les composants React.

Chaque récit correspond à une branche et une PR distincte. Aucune ne doit mélanger la portée d'une autre : c'est précisément ce qui rendait l'ancien `REACT-DASHBOARD-01` trop gros pour une seule PR.

---

# REACT-DASHBOARD-01 — Coquille et identité visuelle

## Intention

En tant qu'élève, je veux arriver sur une nouvelle page d'accueil moderne, claire et agréable afin de sentir que le portail a une vraie identité visuelle.

En tant que mainteneur, je veux poser le routeur et le style avant de brancher la moindre donnée, afin que les erreurs d'affichage et les erreurs de données ne se mélangent jamais dans une même revue.

## Branche proposée

```text
feature/react-dashboard-01
```

## Périmètre

```text
react-router-dom
le layout général (AppLayout)
la navigation responsive
le nouveau style visuel
la page /app
les cartes statiques des jeux
les routes React
le responsive de 320 px jusqu'aux écrans géants
l'accessibilité de base
```

**Aucun accès à `localStorage` dans ce récit.** Toutes les données affichées (progression, "Continuer à jouer") sont statiques ou absentes à ce stade — `REACT-DASHBOARD-02` les branche.

Cette PR remplace la page technique actuelle (`App.tsx` de MIG-REACT-00) par une vraie maison moderne, visuellement complète, mais dont les données ne sont pas encore réelles.

## 1. Direction artistique

### Style recherché

Le tableau de bord doit ressembler à une application éducative moderne des années 2020, pas à une page administrative ancienne. Il doit être :

- accueillant ;
- lumineux ;
- calme ;
- illustré sans être encombré ;
- adapté aux enfants du primaire ;
- clairement ancré dans un contexte africain contemporain ;
- lisible sans dépendre d'effets décoratifs ;
- cohérent avec les futurs jeux.

La page ne doit pas utiliser une accumulation de petits cadres blancs identiques. Les sections doivent être reconnaissables par leur composition, leur espace, leur typographie et leur contenu — pas par un cadre générique répété.

### Principes visuels

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

Hiérarchie visuelle attendue (les zones 1 et 3 restent des emplacements réservés dans cette PR — leur contenu réel arrive dans `REACT-DASHBOARD-02`) :

```text
1. ce que l'enfant peut continuer
2. les jeux disponibles
3. sa progression
4. les futures aventures
```

## 2. Adaptation aux écrans

Le design répond à la largeur réelle du viewport, jamais à la taille physique supposée de l'écran.

### Très petit écran (dès ~320 px CSS)

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

### Téléphone

```text
une colonne principale
zone « Continuer » visible rapidement (emplacement réservé dans cette PR)
cartes tactiles larges
cibles interactives d'au moins 44 × 44 pixels
menu accessible au pouce
```

### Tablette

```text
deux colonnes lorsque l'espace le permet
navigation complète ou compacte selon la largeur
cartes de jeux plus illustrées
```

### Laptop et écran de bureau

```text
navigation latérale ou supérieure complète
grille de deux à quatre cartes selon la largeur
zone centrale limitée pour rester lisible
```

### Grand et très grand écran

```text
max-width : entre 1440 et 1680 pixels
```

Au-delà : le contenu reste centré, les cartes ne deviennent pas gigantesques, les lignes de texte ne deviennent pas interminables, l'espace supplémentaire sert de respiration.

## 3. Routes React

```text
/app
/app/jeux
/app/jeux/monstre-des-mers
/app/progression
/app/*
```

```text
/app                        → tableau de bord
/app/jeux                   → catalogue React (contenu réel dans REACT-CATALOGUE-01)
/app/jeux/monstre-des-mers  → page de préparation du futur jeu
/app/progression            → détail de la progression locale (contenu réel dans REACT-DASHBOARD-02)
route inconnue              → page React « Page introuvable »
```

Une actualisation directe de chacune de ces routes doit fonctionner. Restent hors du routeur React : `/api/**`, `/actuator/**`, `/primaire/**`, `/exetat/**`.

## 4. Structure du tableau de bord (contenu statique)

### 4.1 En-tête

```text
Portail-Math
Apprendre, jouer et progresser
```

Prévoir : bouton de navigation mobile, accès au tableau de bord, accès aux jeux, accès à la progression, retour vers les pages historiques encore nécessaires. Ne pas afficher de faux compte utilisateur si aucune authentification n'existe.

### 4.2 Message d'accueil

```text
Bonjour, explorateur !

Choisis une aventure ou continue celle que tu as déjà commencée.
```

Le message ne doit pas inventer le nom de l'enfant.

### 4.3 Zone « Continuer » (emplacement réservé)

Dans cette PR, afficher un état neutre du type « Choisis ta première aventure » — le contenu dynamique réel (Rivière en cours, derniers résultats du Train) arrive dans `REACT-DASHBOARD-02`.

### 4.4 Jeux disponibles (cartes statiques)

**Le Train des multiplications**
```text
Apprends les tables de 2 et 5 en faisant avancer ton train.

[Jouer]
```
Lien temporaire vers la route Thymeleaf existante.

**La Rivière des fractions**
```text
Traverse la rivière en reconnaissant les bonnes fractions.

[Jouer]
```
Lien temporaire vers la route Thymeleaf existante.

**Le Monstre des mers**
```text
Résous les défis et guide la pirogue jusqu'au port.

[Nouvelle aventure]
```
Lien vers `/app/jeux/monstre-des-mers`. Tant que le jeu n'est pas développé, afficher clairement « En préparation ». Le bouton ne doit jamais prétendre lancer une partie inexistante.

### 4.5 Progression (emplacement réservé)

Zone présente visuellement, contenu réel dans `REACT-DASHBOARD-02`.

### 4.6 Futures aventures

```text
Le Marché des nombres
Le Constructeur de formes
Le Monstre des mers, si son développement n'est pas encore commencé
```

Les cartes à venir doivent être visuellement distinctes des jeux jouables.

## 5. Composants proposés

```text
frontend/src/
├── app/
│   ├── AppRouter.tsx
│   ├── AppLayout.tsx
│   └── navigation.ts
├── dashboard/
│   ├── DashboardPage.tsx
│   ├── WelcomeHero.tsx
│   ├── ContinuePlaying.tsx      (état neutre dans cette PR)
│   ├── ProgressSummary.tsx      (état neutre dans cette PR)
│   └── UpcomingGames.tsx
├── games/
│   ├── GamesCataloguePage.tsx   (contenu réel dans REACT-CATALOGUE-01)
│   ├── GameCard.tsx
│   ├── game-catalogue.ts
│   └── sea-monster/
│       └── SeaMonsterComingSoonPage.tsx
└── styles/
```

Éviter un unique `App.tsx` contenant toute la page.

## 6. Accessibilité (socle)

```text
un seul h1 par page
hiérarchie correcte des titres
lien d'évitement vers le contenu
navigation utilisable au clavier
focus toujours visible
aucune information portée seulement par une couleur
textes alternatifs utiles
illustrations décoratives masquées aux lecteurs d'écran
zones tactiles suffisamment grandes
contrastes lisibles
respect de prefers-reduced-motion
```

Le menu mobile doit annoncer son état ouvert/fermé, être refermable avec Échap, rendre correctement le focus, et ne pas laisser la page arrière défiler.

## 7. Performance

Le tableau de bord ne doit pas charger Phaser. Il ne charge que React, les composants de navigation, les petites illustrations nécessaires.

```text
JavaScript initial gzip : inférieur à 120 Ko
illustrations visibles immédiatement : inférieur à 500 Ko au total
aucune image source surdimensionnée
formats WebP, AVIF ou SVG adaptés
```

## 8. Compatibilité avec Thymeleaf

Les liens React peuvent temporairement ouvrir les anciennes routes Thymeleaf. Aucune ancienne route n'est supprimée dans ce récit. Le tableau de bord historique ne sera décommissionné qu'après validation complète du nouveau tableau de bord React.

## Critères d'acceptation

```text
[ ] /app affiche un véritable tableau de bord (visuel complet, données statiques)
[ ] le texte technique MIG-REACT-00 a disparu de l'interface
[ ] le tableau de bord contient une navigation complète
[ ] les jeux disponibles sont affichés avec leurs cartes
[ ] le Train ouvre encore sa route Thymeleaf existante
[ ] la Rivière ouvre encore sa route Thymeleaf existante
[ ] le Monstre des mers possède une page React dédiée « en préparation »
[ ] une route React inconnue affiche une page 404 React
[ ] /api/** et /actuator/** restent inchangés
[ ] aucun débordement horizontal à 320 px
[ ] le tableau de bord est utilisable en portrait et en paysage
[ ] la grille s'adapte sur tablette
[ ] les cartes ne deviennent pas trop larges sur laptop
[ ] le contenu reste centré sur écran géant
[ ] les cibles tactiles respectent au moins 44 × 44 px
[ ] npm run lint réussit
[ ] npm run test réussit
[ ] npm run build réussit
[ ] les tests Java et JavaScript historiques réussissent
[ ] un seul JAR exécutable est produit
[ ] Phaser n'est pas présent dans le bundle du dashboard
[ ] aucun appel à localStorage dans ce récit
```

## Hors périmètre

```text
lecture de la progression réelle
catalogue React fonctionnel (Train/Rivière restent liés vers Thymeleaf)
runtime Phaser
Monstre des mers jouable
```

---

# REACT-I18N-01 — Rendre le Dashboard React bilingue français–anglais

**Statut :** prêt pour développement
**Base :** `main` après fusion de `REACT-DASHBOARD-01`

## Branche proposée

```text
feature/react-i18n-01
```

## Intention

En tant qu'élève francophone ou anglophone, je veux utiliser le même Dashboard React dans ma langue afin de comprendre la navigation, les activités et les messages sans changer d'application.

En tant que mainteneur, je veux une infrastructure de traduction centralisée afin d'éviter de dupliquer les pages React et de disperser les textes directement dans les composants.

## Décision d'architecture

Portail-Math reste **une seule application React bilingue** :

```text
une base de code
un Dashboard
un catalogue
une progression
deux langues : français et anglais
```

Il ne faut pas créer :

```text
une application française
une application anglaise
deux builds Vite
deux ensembles de composants
deux arbres de routes
```

Les routes restent techniques et indépendantes de la langue :

```text
/app
/app/games
/app/progress
/app/library
/app/courses
/app/settings
```

Aucune route `/fr/**` ou `/en/**` n'est créée dans ce récit.

**Note d'implémentation :** les routes ci-dessus reprennent la nomenclature du récit original ; `REACT-DASHBOARD-01` a livré `/app`, `/app/jeux`, `/app/jeux/nouveau-jeu-react` et `/app/progression` (en français). Ce récit ne renomme aucune route existante — seuls les libellés affichés changent avec la langue.

## Technologies

Ajouter :

```text
i18next
react-i18next
```

La détection et la persistance de la langue restent implémentées dans le projet, sans dépendance supplémentaire obligatoire.

## Sélection de la langue

Ordre de résolution :

```text
1. préférence déjà enregistrée
2. langue préférée du navigateur
3. français comme langue de repli
```

Règles :

```text
préférence enregistrée = fr
→ français

préférence enregistrée = en
→ anglais

aucune préférence et navigateur anglais
→ anglais

toute autre situation
→ français
```

Clé de stockage :

```text
portailMath.preferences.language
```

Valeurs autorisées :

```text
fr
en
```

Une valeur inconnue ou corrompue doit être ignorée. Ne jamais appeler `localStorage.clear()`.

## Sélecteur de langue

Ajouter un sélecteur visible dans la barre supérieure :

```text
FR | EN
```

Sur laptop et grand écran : sélecteur visible dans l'en-tête.
Sur tablette et téléphone : sélecteur accessible dans le menu de navigation, ou conservé dans l'en-tête compact.

Le changement de langue doit être immédiat :

```text
aucun rechargement complet
aucune perte de progression
aucun changement de route
aucune recréation des données métier
```

Le bouton actif doit exposer son état aux technologies d'assistance.

## Organisation proposée

```text
frontend/src/
├── i18n/
│   ├── i18n.ts
│   ├── language-storage.ts
│   ├── supported-languages.ts
│   └── locales/
│       ├── fr/
│       │   ├── common.json
│       │   ├── dashboard.json
│       │   ├── games.json
│       │   └── progress.json
│       └── en/
│           ├── common.json
│           ├── dashboard.json
│           ├── games.json
│           └── progress.json
└── components/
    └── LanguageSwitcher.tsx
```

Langues supportées :

```typescript
export const SUPPORTED_LANGUAGES = ["fr", "en"] as const;
export type SupportedLanguage =
  (typeof SUPPORTED_LANGUAGES)[number];
```

## Textes à migrer dans ce récit

### Identité

| Français                       | Anglais              |
| ------------------------------- | --------------------- |
| Portail-Math                   | Portail-Math          |
| Apprendre, jouer et progresser | Learn, play and grow  |

### Navigation

| Français           | Anglais       |
| ------------------- | ------------- |
| Tableau de bord    | Dashboard     |
| Jeux               | Games         |
| Progression        | Progress      |
| Bibliothèque       | Library       |
| Cours              | Courses       |
| Récompenses        | Rewards       |
| Paramètres         | Settings      |
| Portail historique | Legacy portal |

### Accueil

| Français                                                 | Anglais                                           |
| --------------------------------------------------------- | --------------------------------------------------- |
| Bonjour, explorateur !                                   | Welcome, explorer!                                |
| Continue ton parcours ou choisis une nouvelle aventure.  | Continue your journey or choose a new adventure.  |
| Voir les jeux                                            | Explore games                                     |
| Continuer                                                | Continue                                          |

### Sections

| Français              | Anglais                 |
| ---------------------- | ------------------------ |
| Continue ton aventure | Continue your adventure |
| Choisis un jeu        | Choose a game           |
| À découvrir bientôt   | Coming soon              |
| Ma progression        | My progress             |
| Ma prochaine étape    | My next step            |

### Actions

| Français                  | Anglais           |
| --------------------------- | ------------------- |
| Jouer                     | Play               |
| Rejouer                   | Play again         |
| Bientôt disponible        | Coming soon        |
| Retour au tableau de bord | Back to dashboard  |
| Retour aux jeux           | Back to games      |

### Accessibilité

| Français                   | Anglais              |
| ---------------------------- | ---------------------- |
| Aller au contenu principal | Skip to main content  |
| Navigation principale      | Main navigation       |
| Ouvrir le menu             | Open menu             |
| Fermer le menu             | Close menu            |
| Page actuelle              | Current page          |

**Note d'implémentation :** cette table reprend les libellés du récit original. Certains ne correspondent pas encore à un composant livré par `REACT-DASHBOARD-01` (Bibliothèque, Cours, Récompenses, Paramètres) — les clés de traduction sont créées quand même, prêtes pour ces écrans futurs, mais aucun composant n'est ajouté dans ce récit pour les porter.

## Utilisation dans les composants

Les textes visibles ne doivent plus être codés directement :

```tsx
<h1>Bonjour, explorateur !</h1>
```

Utiliser les clés de traduction :

```tsx
const { t } = useTranslation("dashboard");
<h1>{t("welcome.title")}</h1>
<p>{t("welcome.description")}</p>
```

Exemple français :

```json
{
  "welcome": {
    "title": "Bonjour, explorateur !",
    "description": "Continue ton parcours ou choisis une nouvelle aventure.",
    "exploreGames": "Voir les jeux"
  }
}
```

Exemple anglais :

```json
{
  "welcome": {
    "title": "Welcome, explorer!",
    "description": "Continue your journey or choose a new adventure.",
    "exploreGames": "Explore games"
  }
}
```

## Données et progression

Le changement de langue ne doit modifier aucune donnée métier. Les clés existantes restent identiques :

```text
portailMath.games.fractionRiver.v1
portailMath.games.multiplicationTrain.v1
portailMath.exetat.progress.v1
```

Les données suivantes restent indépendantes de la langue :

```text
identifiants de jeux
identifiants de questions
scores
niveaux
étapes
codes de badges
dates
état de progression
```

Exemple :

```text
code interne : FRACTION_RIVER
fr : La Rivière des fractions
en : Fraction River
```

Le code interne ne change jamais lorsque la langue change.

## Contraintes pour les futurs jeux

Les questions pédagogiques doivent utiliser des phrases complètes traduisibles.

À éviter :

```typescript
t("whatIs") + " " + a + " + " + b;
```

À utiliser :

```typescript
t("questions.addition.prompt", { a, b });
```

Français :

```json
{
  "questions": {
    "addition": {
      "prompt": "Combien font {{a}} + {{b}} ?"
    }
  }
}
```

Anglais :

```json
{
  "questions": {
    "addition": {
      "prompt": "What is {{a}} + {{b}}?"
    }
  }
}
```

Les illustrations et les scènes Phaser ne doivent contenir aucun texte peint.

## Responsive

Les deux langues doivent rester lisibles sur toutes les tailles prévues. Le CSS doit accepter :

```text
libellés sur deux lignes
boutons de largeur variable
titres anglais ou français plus longs
menu vertical sans texte coupé
menu mobile sans débordement
```

Interdictions :

```text
largeur fixe calculée pour une seule langue
texte tronqué sans nécessité
font-size réduit pour faire tenir une traduction
position absolue dépendant de la longueur du texte
```

## Accessibilité

Le sélecteur doit :

```text
indiquer la langue active
être utilisable au clavier
avoir un focus visible
avoir un nom accessible
annoncer clairement Français et English
```

L'attribut de langue du document doit être synchronisé : `<html lang="fr">` ou `<html lang="en">`.

Le titre de la page doit également être traduit.

## Critères d'acceptation

```text
[ ] une seule application React sert le français et l'anglais
[ ] le sélecteur FR/EN est disponible
[ ] le changement de langue est immédiat
[ ] la préférence survit au rechargement
[ ] le français est la langue de repli
[ ] la langue du navigateur est prise en compte à la première visite
[ ] toutes les chaînes du Dashboard viennent des fichiers de traduction
[ ] aucun composant du Dashboard ne contient de texte métier codé en dur
[ ] les routes sont identiques dans les deux langues
[ ] les données de progression sont partagées
[ ] les clés localStorage métier restent inchangées
[ ] document.documentElement.lang reflète la langue active
[ ] les deux langues fonctionnent dès 320 px
[ ] les deux langues fonctionnent sur tablette, laptop et grand écran
[ ] le bundle ne charge pas Phaser
[ ] npm run lint réussit
[ ] npm run test réussit
[ ] npm run build réussit
[ ] les tests Java réussissent
[ ] les tests JavaScript historiques réussissent
[ ] /api/** reste inchangé
[ ] /actuator/** reste inchangé
[ ] aucun appel à localStorage.clear()
```

## Hors périmètre

```text
traduction complète des pages Thymeleaf
traduction des anciens jeux
traduction du contenu Exetat
ajout d'une troisième langue
traduction automatique
gestion des traductions depuis le backend
routes localisées /fr/** et /en/**
```

---

# REACT-DASHBOARD-02 — Progression réelle

## Intention

En tant qu'élève, je veux que le tableau de bord reflète ma progression déjà enregistrée sur mon appareil afin de reprendre naturellement là où je m'étais arrêté.

## Branche proposée

```text
feature/react-dashboard-02
```

## Dépendance

Commence après validation de `REACT-DASHBOARD-01` (le layout et les emplacements réservés existent déjà).

## Périmètre

```text
l'adaptateur de la Rivière
l'adaptateur du Train
la tolérance au JSON absent ou corrompu
la zone « Continuer la Rivière »
la zone « Meilleur score du Train »
la synthèse de progression
les tests de compatibilité avec les formats existants
```

## Données existantes et règle de lecture

Les clés `localStorage` existantes ne sont **jamais renommées ni réécrites** dans ce récit :

```text
portailMath.games.fractionRiver.v1
portailMath.games.multiplicationTrain.v1
portailMath.exetat.progress.v1
```

**Règle non négociable :** les adaptateurs du Dashboard ne doivent **pas** appeler directement les fonctions globales historiques (`fraction-river-store.js`, `multiplication-train-store.js`, chargées par les pages Thymeleaf). Ils lisent `localStorage` en lecture seule avec leur propre normalisation tolérante en TypeScript. Cela évite de coupler React à des scripts globaux qui ne sont pas garantis chargés sur `/app`, et cela découple le comportement du Dashboard (qui doit toujours retourner un état par défaut sûr) de celui des stores historiques (dont `multiplication-train-store.js` lève une exception dans `normalizeProgress()` — `load()` l'intercepte côté Thymeleaf, mais rien ne garantit qu'un futur changement conserve ce filet, donc React ne doit pas en dépendre).

### La Rivière des fractions — organisée par niveau

```javascript
{
  currentLevel: 1,
  levels: {
    "1": {
      completedSteps: 0,
      firstTryCorrect: 0,
      correctedErrors: 0
    }
  }
}
```

Le Dashboard doit lire :

```typescript
const level = String(progress.currentLevel);
const completedSteps = progress.levels[level]?.completedSteps ?? 0;
```

et surtout **pas** `progress.completedSteps` (ce champ n'existe pas à la racine).

### Le Train des multiplications — pas d'état « en cours »

Le Train ne sauvegarde pas de partie interrompue. Il conserve seulement :

```text
bestScore
gamesPlayed
totalCorrectAnswers
unlockedLevels
lastPlayedAt
soundEnabled
```

Il ne possède ni `currentStep` ni `stationIndex`. Le Dashboard ne doit donc jamais écrire :

```text
Continuer le Train — gare 4 sur 5
```

mais plutôt :

```text
Le Train des multiplications
Meilleur résultat : 4/5

[Rejouer]
```

**Conséquence sur la structure des zones :** la zone « Continuer à jouer » peut contenir la Rivière si son niveau courant est incomplet. Le Train, lui, apparaît dans une zone distincte — **« Tes derniers résultats »** ou **« Rejouer une aventure »** — jamais dans « Continuer », puisqu'il n'y a rien à reprendre.

## Adaptateurs proposés

```text
frontend/src/progress/
├── progress-types.ts
├── fraction-river-progress.ts
├── multiplication-train-progress.ts
└── dashboard-progress.ts
```

Règles pour chaque adaptateur :

- ne jamais appeler `localStorage.clear()` ;
- ne jamais modifier une autre clé ;
- accepter l'absence de données ;
- accepter un JSON corrompu ;
- produire un état par défaut sûr ;
- ne pas réécrire les magasins historiques dans ce récit.

## Structure mise à jour du Dashboard

```text
4.3 Continuer à jouer       → Rivière si niveau courant incomplet ; sinon message neutre
4.3bis Tes derniers résultats / Rejouer une aventure → Train (meilleur score)
4.5 Progression             → synthèse : jeux commencés, défis terminés,
                               réussites au premier essai, erreurs corrigées
```

Ne jamais afficher de pourcentages artificiels lorsque les données ne permettent pas de les calculer correctement. Ne jamais créer de classement public.

## Critères d'acceptation

```text
[ ] la progression locale existante est lue (Rivière et Train)
[ ] un stockage absent ne produit aucune erreur
[ ] un stockage corrompu ne produit aucune erreur
[ ] aucune clé de progression n'est renommée ni réécrite
[ ] l'adaptateur de la Rivière lit levels[currentLevel], pas completedSteps racine
[ ] le Train affiche un meilleur score, jamais une fausse reprise de partie
[ ] les adaptateurs n'appellent aucune fonction globale des scripts Thymeleaf
[ ] la zone Continuer affiche la Rivière quand son niveau courant est incomplet
[ ] la zone Continuer affiche un état neutre quand rien n'a commencé
[ ] la synthèse de progression n'affiche aucun pourcentage inventé
[ ] tests de compatibilité avec les formats de stockage existants (Rivière et Train)
[ ] npm run test réussit
```

## Hors périmètre

```text
réécriture des magasins historiques
migration des jeux existants
classement
compte utilisateur
```

---

# REACT-CATALOGUE-01 — Nouvelle entrée des jeux

## Intention

En tant qu'élève, je veux que `/app/jeux` devienne le catalogue officiel afin de trouver tous les jeux, migrés ou non, au même endroit.

## Branche proposée

```text
feature/react-catalogue-01
```

## Périmètre

```text
Train  → lien vers l'ancienne route Thymeleaf
Rivière → lien vers l'ancienne route Thymeleaf
Monstre des mers → nouvelle route React (/app/jeux/monstre-des-mers)
```

L'ancien catalogue Thymeleaf (`/primaire/jeux`) reste accessible durant toute la transition. Seuls les nouveaux liens du Dashboard pointent désormais vers le catalogue React.

## Critères d'acceptation

```text
[ ] /app/jeux affiche les trois jeux avec un statut clair (migré / lien externe)
[ ] les liens Train et Rivière ouvrent les routes Thymeleaf existantes, inchangées
[ ] le lien Monstre des mers ouvre la route React dédiée
[ ] /primaire/jeux reste fonctionnel et inchangé
[ ] navigation clavier vérifiée
[ ] focus visible sur chaque carte
```

## Hors périmètre

```text
migration React du Train
migration React de la Rivière
suppression du catalogue Thymeleaf
```

---

# GAME-RUNTIME-01 — Créer le pont React–Phaser commun aux nouveaux jeux

*(Reporté depuis l'ancien backlog archivé — décisions techniques inchangées.)*

## Intention

En tant que développeur de jeux, je veux monter une scène Phaser dans une page React avec un cycle de vie maîtrisé afin d'éviter les canvas dupliqués, les écouteurs orphelins et les pertes de progression.

## Branche proposée

```text
feature/game-runtime-01
```

## Composants

```text
frontend/src/games/runtime/
├── GameSceneHost.tsx
├── GameEventBus.ts
├── GameSceneController.ts
├── loadPhaser.ts
└── useReducedMotion.ts
```

Contrat minimal :

```typescript
export interface GameSceneController {
  resize(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
```

Événements communs :

```typescript
export type GameEvent =
  | { type: "journey-started" }
  | { type: "question-rendered"; questionId: string }
  | { type: "answer-correct"; questionId: string }
  | { type: "answer-incorrect"; questionId: string }
  | { type: "step-completed"; completedSteps: number }
  | { type: "journey-completed" };
```

## Chargement de Phaser

Phaser ne doit pas entrer dans le bundle initial du portail. La bibliothèque doit être chargée uniquement lorsque l'enfant ouvre un jeu Phaser, depuis la version locale déjà servie par Spring Boot (`/js/vendor/phaser-3.90.0.min.js`).

Le chargeur doit :

- réutiliser un script déjà chargé ;
- éviter deux téléchargements concurrents ;
- signaler proprement un échec ;
- permettre à l'interface HTML de rester utilisable si Phaser échoue.

## Cycle de vie

React est exécuté sous `StrictMode`, qui peut monter, démonter puis remonter un composant en développement. Le runtime doit garantir :

```text
montage        → création d'un canvas
démontage       → destruction de la scène, du canvas, suppression des écouteurs
nouveau montage → création d'un seul nouveau canvas
```

`destroy()` doit être idempotent.

## Critères d'acceptation

```text
[ ] Phaser n'est pas inclus dans le bundle initial React
[ ] le script Phaser n'est chargé qu'à l'ouverture du jeu
[ ] un seul canvas existe après le montage
[ ] aucun canvas ne reste après le démontage
[ ] StrictMode ne laisse aucune duplication
[ ] trois ouvertures et fermetures successives restent stables
[ ] les écouteurs sont tous détachés
[ ] une exception Phaser ne bloque pas l'interface React
[ ] prefers-reduced-motion est transmis à la scène
[ ] le runtime possède des tests unitaires
```

## Hors périmètre

```text
décor du Monstre des mers
questions mathématiques
sauvegarde
mode plein écran
```

---

# MONSTRE-MERS-01 — Le monstre pose sa première question

## Intention

En tant qu'enfant, je veux répondre à la première énigme du Monstre des mers afin de comprendre immédiatement le principe du jeu et de découvrir un personnage attachant.

## Dépendance

Commence après `GAME-RUNTIME-01` (pont React–Phaser disponible) et suppose `REACT-CATALOGUE-01` pour être atteint depuis le catalogue.

## Branche proposée

```text
feature/monstre-mers-01
```

## Synopsis

Une petite pirogue veut rejoindre le port. Le Monstre des mers est le gardien joyeux des passages maritimes : il aime tellement les mathématiques qu'il arrête gentiment les voyageurs pour leur poser une énigme.

Il surgit de l'eau et annonce, par exemple :

> « Halte-là ! Pour ouvrir le passage, réponds à mon énigme ! »

Le texte reste entièrement dans React, jamais peint dans le décor ni dans le canvas Phaser.

Le monstre :

- est grand et spectaculaire ;
- possède une personnalité drôle ;
- se réjouit quand l'enfant répond ;
- donne un indice en cas d'erreur ;
- ne menace jamais la pirogue ;
- ne fait jamais perdre de point ;
- ne devient jamais effrayant.

### Mauvaise réponse

```text
Le monstre réfléchit.
Il donne un indice.
La pirogue reste en sécurité.
La même question reste affichée.
L'enfant peut réessayer.
```

Exemple : « Presque ! Regarde bien les deux groupes de poissons. Combien y en a-t-il en tout ? »

### Bonne réponse

```text
Le monstre applaudit avec ses tentacules.
Une balise maritime s'allume.
La pirogue avance.
Le passage suivant s'ouvre.
```

Exemple : « Exact ! Tu peux passer jusqu'à la prochaine balise ! »

## Première tranche jouable

```text
écran de lancement
une scène maritime
le monstre
la pirogue
une question mathématique
trois réponses HTML
un indice
une animation de réussite
un écran de fin court
```

Pas encore cinq questions, pas encore de sauvegarde, pas encore de grand parcours — ça vient dans `MONSTRE-MERS-02` et `-03`.

## Architecture visuelle

```text
React      → question, réponses, indice, progression du dialogue, accessibilité
Phaser     → pirogue, monstre, eau, animations
illustration → ciel, mer, îlots, port
```

Aucun texte pédagogique n'est peint dans le décor ou dans le canvas.

## Critères d'acceptation

```text
[ ] le jeu est accessible depuis le tableau de bord et le catalogue React
[ ] la route /app/jeux/monstre-des-mers fonctionne après actualisation directe
[ ] Phaser est chargé uniquement à l'ouverture du jeu
[ ] un seul canvas est créé
[ ] la question est affichée en HTML, jamais peinte
[ ] les trois réponses sont accessibles au clavier
[ ] une erreur ne punit pas l'enfant (pas de recul, pas de perte de point)
[ ] une erreur affiche un indice court et garde la même question
[ ] la bonne réponse fait avancer la pirogue et allume la balise
[ ] le monstre ne devient jamais menaçant, dans aucun état
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

# MONSTRE-MERS-02 — Cinq énigmes et moteur pédagogique

*(Détail à définir dans un récit dédié.)* Reprend l'esprit du moteur pur déjà validé pour la Rivière : un module TypeScript indépendant de React/Phaser/DOM, cinq questions uniques par partie, distracteurs plausibles (oubli d'unité, confusion addition/soustraction, résultat voisin, mauvais comptage, inversion des nombres), aucune soustraction à résultat négatif, une question inchangée après une erreur.

---

# MONSTRE-MERS-03 — Parcours de la pirogue

*(Détail à définir dans un récit dédié.)* Cinq balises + port d'arrivée, ancrages proportionnels (`xRatio`, `yRatio`, `scale`) sur le modèle déjà éprouvé par `anchors.js` de la Rivière, direction artistique du monstre et de l'eau, budget d'assets (illustration < 350 Ko, sprites < 450 Ko), respect de `prefers-reduced-motion`.

---

# MONSTRE-MERS-04 — Sauvegarde et résultats

*(Détail à définir dans un récit dédié.)* Clé de stockage dédiée (proposition : `portailMath.games.seaMonster.v1`), métriques (`completedSteps`, `firstTryCorrect`, `correctedErrors`, `gamesPlayed`), écran de résultat final, extension du test de contrat Java des clés de stockage (`LocalStorageKeysContractTests.java`) pour sceller la nouvelle clé — y compris côté `frontend/src/**/*.ts(x)`, que ce test ne couvre pas encore aujourd'hui.

---

# MONSTRE-MERS-05 — Immersif et validation mobile

*(Détail à définir dans un récit dédié.)* Mode immersif propre à React (pas de réutilisation directe de `game-console.js`, pensé dès `MONSTRE-MERS-01` comme une réécriture volontaire), plein écran et verrouillage paysage en bonus non bloquants, garanties de cycle de vie (un seul canvas, aucune perte de progression), carte active dans le catalogue Thymeleaf historique, suite complète de tests avant publication OpenShift.
