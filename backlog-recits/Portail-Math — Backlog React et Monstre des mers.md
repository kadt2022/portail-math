```text
STATUT : ARCHIVÉ

Ce backlog est remplacé par :
Portail-Math — Backlog React Dashboard et Monstre des mers.md

Ne pas créer de branche ou de récit à partir de ce document.
Les décisions techniques relatives au runtime React–Phaser ont été
reportées dans le nouveau backlog.
```

---

# Portail-Math — Backlog React et Monstre des mers

**Base technique :** branche `main`  
**Route cible du jeu :** `/app/jeux/monstre-des-mers`  
**Public cible proposé :** primaire, environ 7 à 9 ans  
**Compétence proposée pour le niveau 1 :** additions et soustractions de 0 à 20  
**Architecture :** React pour l’interface, Phaser pour la scène, Spring Boot pour la livraison  
**Stratégie :** migration progressive sans réécriture immédiate du Train ou de la Rivière

---

# REACT-GAME-01 — Transformer le socle React en portail navigable

## Intention

En tant qu’utilisateur du portail, je veux que les adresses sous `/app/**` correspondent à de véritables écrans React afin de pouvoir accéder directement à un jeu ou actualiser sa page sans revenir à l’écran technique.

## Branche proposée

```text
feature/react-game-01
```

## Périmètre

Ajouter une navigation React avec un `basename` fixé à `/app`.

Routes initiales :

```text
/app
/app/jeux
/app/jeux/monstre-des-mers
/app/*
```

Créer une structure minimale :

```text
frontend/src/
├── app/
│   ├── AppRouter.tsx
│   └── AppLayout.tsx
├── pages/
│   ├── PortalHomePage.tsx
│   ├── GamesPage.tsx
│   ├── SeaMonsterPage.tsx
│   └── NotFoundPage.tsx
└── main.tsx
```

L’écran `/app` ne doit plus être une page de preuve technique. Il devient une petite entrée vers les jeux, sans chercher à reproduire tout le portail Thymeleaf.

La page du Monstre des mers peut initialement afficher un écran d’attente :

```text
Le Monstre des mers
Le jeu est en préparation.
Retour aux jeux
```

## Critères d’acceptation

```text
[ ] /app affiche l’accueil React
[ ] /app/jeux affiche le catalogue React minimal
[ ] /app/jeux/monstre-des-mers affiche la page du futur jeu
[ ] une actualisation directe de chaque URL fonctionne
[ ] une route React inconnue affiche une page 404 React
[ ] /api/** ne retourne jamais l’index React
[ ] /actuator/** reste inchangé
[ ] les routes Thymeleaf existantes restent accessibles
[ ] les liens internes utilisent la navigation cliente
[ ] les liens vers Thymeleaf utilisent de vraies URL serveur
[ ] navigation au clavier vérifiée
[ ] focus visible sur tous les liens
```

## Hors périmètre

```text
migration de la page d’accueil historique
migration du Train
migration de la Rivière
scène Phaser
progression du Monstre des mers
```

---

# GAME-RUNTIME-01 — Créer le pont React–Phaser commun aux nouveaux jeux

## Intention

En tant que développeur de jeux, je veux monter une scène Phaser dans une page React avec un cycle de vie maîtrisé afin d’éviter les canvas dupliqués, les écouteurs orphelins et les pertes de progression.

## Branche proposée

```text
feature/game-runtime-01
```

## Composants

Créer :

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

Phaser ne doit pas entrer dans le bundle initial du portail.

La bibliothèque doit être chargée uniquement lorsque l’enfant ouvre un jeu Phaser, depuis la version locale déjà servie par Spring Boot.

Le chargeur doit :

- réutiliser un script déjà chargé ;
- éviter deux téléchargements concurrents ;
- signaler proprement un échec ;
- permettre à l’interface HTML de rester utilisable si Phaser échoue.

## Cycle de vie

React est exécuté sous `StrictMode`, qui peut monter, démonter puis remonter un composant en développement.

Le runtime doit donc garantir :

```text
montage
→ création d’un canvas

démontage
→ destruction de la scène
→ destruction du canvas
→ suppression des écouteurs

nouveau montage
→ création d’un seul nouveau canvas
```

`destroy()` doit être idempotent.

## Critères d’acceptation

```text
[ ] Phaser n’est pas inclus dans le bundle initial React
[ ] le script Phaser n’est chargé qu’à l’ouverture du jeu
[ ] un seul canvas existe après le montage
[ ] aucun canvas ne reste après le démontage
[ ] StrictMode ne laisse aucune duplication
[ ] trois ouvertures et fermetures successives restent stables
[ ] les écouteurs sont tous détachés
[ ] une exception Phaser ne bloque pas l’interface React
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

# MONSTRE-MERS-01 — Livrer une première tranche verticale jouable

## Intention

En tant qu’enfant, je veux répondre à une première question dans l’univers du Monstre des mers afin de comprendre immédiatement le principe du jeu.

## Branche proposée

```text
feature/monstre-mers-01
```

## Synopsis de la tranche

Une petite pirogue doit rejoindre un port sûr.

Un grand monstre marin amical garde le passage. Il n’attaque jamais l’enfant et ne punit jamais une mauvaise réponse. Il attend que l’enfant trouve la bonne solution.

La tranche contient :

```text
une scène illustrée
une pirogue
un monstre marin
un point de départ
un premier repère maritime
une question
trois réponses
une animation de réussite
un message final
```

## Architecture visuelle

```text
couche 1 : illustration 16/9
couche 2 : canvas Phaser transparent
couche 3 : interface React
```

L’illustration contient :

- la mer ;
- le ciel ;
- les îlots ;
- le port lointain ;
- les rochers ;
- la lumière.

Phaser contient :

- la pirogue ;
- le monstre ;
- les petits mouvements de l’eau ;
- l’animation de progression ;
- les effets de réussite.

React contient :

- la question ;
- les trois réponses ;
- l’indice ;
- le retour pédagogique ;
- le bouton Continuer ;
- les annonces accessibles.

Aucun texte pédagogique ne doit être peint dans l’image ou le canvas.

## Comportement

Bonne réponse :

```text
réponse validée
→ animation calme du monstre
→ la pirogue avance
→ le premier repère s’illumine
→ message de réussite
```

Mauvaise réponse :

```text
aucun déplacement
aucune perte de point
aucune attaque
indice court
nouvelle tentative immédiate
```

## Critères d’acceptation

```text
[ ] la route /app/jeux/monstre-des-mers ouvre le jeu
[ ] Phaser est chargé paresseusement
[ ] une question complète est jouable
[ ] trois réponses sont affichées en HTML
[ ] une erreur ne déplace pas la pirogue
[ ] une erreur ne rend pas le monstre menaçant
[ ] la bonne réponse déclenche la progression
[ ] la scène reste compréhensible sans son
[ ] tout le texte reste lisible sans canvas
[ ] aucun texte n’est dessiné par Phaser
[ ] un seul canvas est présent
[ ] le jeu fonctionne à la souris, au tactile et au clavier
```

## Hors périmètre

```text
cinq questions
sauvegarde
résultat détaillé
plein écran
animations finales
plusieurs niveaux
```

---

# MONSTRE-MERS-02 — Construire le moteur pédagogique du niveau 1

## Intention

En tant qu’enfant, je veux résoudre cinq défis de calcul mental avec des indices adaptés afin de progresser sans être puni lorsque je me trompe.

## Branche proposée

```text
feature/monstre-mers-02
```

## Compétence proposée

```text
additions de 0 à 20
soustractions sans résultat négatif
reconnaissance de l’opération adaptée
petits problèmes illustrés
```

## Moteur pur

Créer un moteur TypeScript indépendant de React, Phaser et du DOM :

```text
frontend/src/games/sea-monster/domain/
├── question.ts
├── generator.ts
├── distractors.ts
├── evaluator.ts
└── journey.ts
```

Contrat indicatif :

```typescript
export interface SeaMonsterQuestion {
  id: string;
  prompt: string;
  choices: Array<{
    id: string;
    label: string;
  }>;
  correctChoiceId: string;
  hint: string;
  explanation: string;
}
```

## Partie

Une partie contient cinq questions uniques.

Les distracteurs doivent représenter des erreurs plausibles :

```text
oubli d’une unité
confusion addition/soustraction
résultat voisin
mauvais comptage
inversion des nombres
```

Une question ne doit pas changer après une mauvaise tentative.

Aucun avancement automatique ne doit être déclenché par un chronomètre.

## Métriques

```text
completedSteps
firstTryCorrect
correctedErrors
gamesPlayed
```

## Stockage

Clé proposée :

```text
portailMath.games.seaMonster.v1
```

Structure minimale :

```json
{
  "completedSteps": 0,
  "firstTryCorrect": 0,
  "correctedErrors": 0,
  "gamesPlayed": 0,
  "soundEnabled": true,
  "recentQuestionIds": [],
  "lastPlayedAt": null
}
```

Le test de contrat Java des clés de stockage doit être étendu pour sceller cette nouvelle clé.

## Critères d’acceptation

```text
[ ] cinq questions uniques sont produites
[ ] le générateur peut être rendu déterministe par une graine
[ ] chaque question possède exactement une bonne réponse
[ ] les distracteurs restent plausibles
[ ] aucune soustraction n’a de résultat négatif
[ ] une erreur affiche l’indice de la même question
[ ] correctedErrors ne compte qu’une fois par question
[ ] firstTryCorrect ne compte que le premier essai
[ ] un stockage absent produit l’état par défaut
[ ] un JSON corrompu produit l’état par défaut
[ ] aucune autre clé localStorage n’est modifiée
[ ] localStorage.clear() reste interdit
[ ] le moteur possède des tests sans React ni Phaser
```

---

# MONSTRE-MERS-03 — Réaliser la progression visuelle complète

## Intention

En tant qu’enfant, je veux voir ma pirogue avancer à chaque réussite afin que ma progression mathématique produise une aventure visible.

## Branche proposée

```text
feature/monstre-mers-03
```

## Parcours

```text
départ
→ balise 1
→ balise 2
→ balise 3
→ balise 4
→ balise 5
→ port d’arrivée
```

Chaque position doit posséder un ancrage proportionnel :

```typescript
{
  xRatio: number;
  yRatio: number;
  scale: number;
}
```

Le point d’ancrage de la pirogue correspond au contact de sa coque avec l’eau. Celui du monstre correspond au point stable utilisé par ses animations.

## Direction artistique

Le monstre est :

- grand, mais rassurant ;
- expressif ;
- curieux ;
- jamais agressif ;
- clairement visible sur téléphone ;
- cohérent avec un dessin animé moderne destiné au primaire.

La scène doit évoquer un littoral africain tropical sans accumuler les détails.

## Eau

L’eau doit présenter :

- des courants longs ;
- quelques filets d’écume ;
- des reflets irréguliers ;
- plusieurs vitesses ;
- un déplacement cohérent ;
- un masque empêchant tout débordement sur les îlots.

Éviter :

- les grands anneaux permanents ;
- les ellipses autour de la pirogue ;
- les mouvements tous synchronisés ;
- les effets qui ressemblent à des boutons.

## Profondeurs

```text
illustration
poissons lointains
courants et reflets
pirogue
monstre
petites éclaboussures
oiseaux
interface React
```

## Mouvement réduit

Avec `prefers-reduced-motion` :

- la pirogue rejoint directement son ancrage ;
- les grands déplacements décoratifs sont figés ;
- les particules sont supprimées ;
- le jeu reste entièrement compréhensible.

## Budget des ressources

```text
illustration principale WebP : cible inférieure à 350 Ko
sprites et effets du jeu : cible inférieure à 450 Ko
aucune image de plusieurs mégapixels rendue minuscule
aucun asset chargé avant l’ouverture du jeu
```

## Critères d’acceptation

```text
[ ] les cinq étapes sont visibles ou compréhensibles
[ ] la pirogue termine entièrement dans le port
[ ] aucun ancrage final ne tombe dans l’eau libre
[ ] le monstre ne masque jamais la question
[ ] les courants restent dans la mer
[ ] les animations ne traversent pas les boutons
[ ] au moins deux éléments vivants sont visibles rapidement
[ ] la profondeur est explicitement définie
[ ] prefers-reduced-motion est respecté
[ ] les assets respectent le budget convenu
[ ] aucune duplication après trois nouvelles parties
```

## Captures obligatoires

```text
départ
étape 2
étape 5
arrivée au port
téléphone paysage
mouvement réduit
```

---

# MONSTRE-MERS-04 — Finaliser l’expérience mobile et publier le jeu

## Intention

En tant qu’enfant utilisant un téléphone, je veux jouer dans une interface large, stable et accessible afin de voir la scène et les réponses sans devoir zoomer.

## Branche proposée

```text
feature/monstre-mers-04
```

## Mode immersif React

La page du jeu doit proposer une disposition immersive.

Le mode ne dépend pas du succès de `requestFullscreen`.

Ordre :

```text
activer la disposition immersive React
→ demander le plein écran en bonus
→ tenter le verrouillage paysage en bonus
```

Sorties :

```text
bouton Quitter
touche Échap
sortie native du plein écran
passage de l’application en arrière-plan
```

## Garanties

```text
un seul canvas
aucune perte de question
aucune perte de progression
aucune recréation inutile de la scène
focus placé sur la question
focus restauré à la sortie
aucun défilement de la page derrière la console
bouton Quitter toujours visible
```

## Résultat final

Afficher :

```text
5 défis terminés
réussites au premier essai
erreurs corrigées
message d’encouragement
bouton Rejouer
retour aux jeux
```

Aucun classement public.

## Pont avec le catalogue existant

Ajouter au catalogue Thymeleaf une carte active :

```text
Le Monstre des mers
Résous les défis et guide la pirogue jusqu’au port.

[Jouer]
```

Le lien cible :

```text
/app/jeux/monstre-des-mers
```

Le catalogue React peut également afficher le jeu, mais il n’est pas nécessaire de migrer immédiatement les cartes du Train et de la Rivière.

## Tests et livraison

```text
[ ] test MVC de la carte Thymeleaf
[ ] test de la route React profonde
[ ] tests du parcours complet
[ ] test clavier
[ ] test prefers-reduced-motion
[ ] test trois entrées/sorties immersives
[ ] test nouvelle partie sans duplication
[ ] build React réussi
[ ] lint réussi
[ ] tests React réussis
[ ] tests JavaScript historiques réussis
[ ] tests Java réussis
[ ] un seul JAR exécutable produit
[ ] route vérifiée après déploiement OpenShift
```

## Hors périmètre

```text
migration React du Train
migration React de la Rivière
plusieurs niveaux
compte utilisateur
classement
multijoueur
achats ou publicité
```

---

# Ordre de réalisation

```text
1. REACT-GAME-01
2. GAME-RUNTIME-01
3. MONSTRE-MERS-01
4. MONSTRE-MERS-02
5. MONSTRE-MERS-03
6. MONSTRE-MERS-04
```

La première PR du Monstre des mers ne doit pas attendre que tout le portail soit migré. Elle s’appuie sur `/app/**`, tandis que le Train, la Rivière et le catalogue historique continuent de fonctionner sous Thymeleaf.