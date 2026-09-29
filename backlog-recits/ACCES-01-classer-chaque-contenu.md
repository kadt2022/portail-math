# ACCES-01 — Classer chaque contenu : libre, inscrit ou premium

**Lot :** [LOT-ACCES — Web et Android sous contrôle du serveur](LOT-ACCES-web-android-sous-controle.md)
**Statut :** PROPOSITION — relecture de Crochet, validation du Capitaine Pi
**Branche proposée :** `feat/acces-01-registre-des-contenus`
**Dépend de :** décision D1 (voir l'index du lot)

## Contexte

Mbuyamba n'a aujourd'hui aucune notion de niveau d'accès. Les contenus sont déclarés dans quatre catalogues distincts, et tous sont ouverts à tout le monde :

| Famille | Catalogue actuel | Exemples d'identifiants |
|---|---|---|
| Cours | `frontend/src/courses/primary-*/course-catalogue.ts` | `MATH-1P`, `MATH-2P`, `MATH-3P`, `MATH-4P` et leurs unités (`MATH-1P-U01` à `MATH-1P-U10`, etc.) |
| Livres | `frontend/src/library/library-catalogue.ts` | `math-primary-one`, `math-primary-two`, `math-primary-three` |
| Jeux | `frontend/src/games/game-catalogue.ts` | `multiplication-train`, `fraction-river`, `grille-magique`, `turbo-pulse`, `flux-forge` |
| Exetat | `src/main/resources/content/exetat/subjects.json` | `cercle`, `droite`, `derivees`, `integrales` |

Avant de protéger quoi que ce soit, le serveur doit savoir quel niveau d'accès exige chaque contenu. Sans ce registre, chaque récit suivant inventerait sa propre règle, et un contenu oublié resterait ouvert sans que personne ne s'en aperçoive.

Ce récit **ne bloque encore rien**. Il pose la règle, les récits ACCES-05 à ACCES-08 l'appliquent.

## User Story

En tant que Capitaine,
je veux décider en un seul endroit quel contenu est libre, réservé aux inscrits ou premium,
afin que le serveur applique partout la même règle.

En tant que mainteneur,
je veux qu'un contenu non classé soit détecté dès le démarrage ou dès les tests,
afin qu'aucun contenu ne devienne accessible par oubli.

## Les trois niveaux

| Niveau | Condition d'accès | Peut être embarqué dans le bundle web ou l'APK |
|---|---|---|
| `LIBRE` | Aucune | Oui |
| `INSCRIT` | Identité Takibo valide (ACCES-03) | Non |
| `PREMIUM` | Identité valide **et** droit actif (ACCES-05) | Non |

Un contenu `INSCRIT` n'est pas embarqué : s'il l'était, n'importe qui pourrait le lire sans compte en ouvrant le bundle.

## Proposition de classement (décision D1)

Cette table est une **proposition**. La colonne de droite est remplie par le Capitaine avant le début de la réalisation.

| Contenu | Proposition | Raison | Décision du Capitaine |
|---|---|---|---|
| Unité 1 de chaque cours (1re à 4e) | `LIBRE` | Vitrine : l'enfant, le parent et l'enseignant découvrent la méthode sans compte | |
| Unités 2 à 10 de chaque cours | `PREMIUM` | Cœur du programme. Elles sont encore « bientôt disponibles », donc elles naîtront directement protégées | |
| Train des multiplications, Rivière des fractions | `LIBRE` | Jeux historiques déjà diffusés | |
| Grille magique, Turbo Pulse, Flux Forge | `INSCRIT` | Donne une raison de créer un compte sans rien faire payer | |
| Livres de 1re, 2e et 3e | `PREMIUM` | Contenu le plus facile à copier et à redistribuer | |
| Exetat : `cercle` | `LIBRE` | Permet d'essayer le quiz corrigé | |
| Exetat : `droite`, `derivees`, `integrales` | `PREMIUM` | Préparation à l'examen, forte valeur | |

## Périmètre

- un **registre unique** côté serveur, sous `src/main/resources/content/acces/`. Le format JSON est recommandé, comme pour le catalogue Exetat ;
- granularité : **unité** pour les cours, **livre**, **jeu**, **matière** pour l'Exetat ;
- un identifiant stable et préfixé par famille : `cours:MATH-3P-U02`, `livre:math-primary-one`, `jeu:fraction-river`, `exetat:derivees` ;
- chargement et validation au démarrage, sur le modèle de `ExetatCatalogValidator` ;
- un point d'accès public en lecture : `GET /api/v1/acces/registre`, qui renvoie chaque identifiant avec son niveau ;
- un test automatisé qui vérifie que les catalogues du frontend sont entièrement couverts par le registre.

## Critères d'acceptation

### CA-01 — Source unique

Le niveau d'accès d'un contenu n'est écrit qu'à un seul endroit : le registre. Aucun niveau n'est codé en dur dans un contrôleur Java ou un composant React.

### CA-02 — Trois niveaux, pas un de plus

Le registre n'accepte que `LIBRE`, `INSCRIT` et `PREMIUM`.

### CA-03 — Démarrage refusé si le registre est incohérent

L'application refuse de démarrer, avec un message explicite, si :

- un identifiant est classé deux fois ;
- un niveau est inconnu ;
- un identifiant n'a pas de préfixe de famille valide ;
- une matière de `subjects.json` n'est pas classée.

### CA-04 — Catalogues du frontend couverts

Un test échoue si l'un de ces identifiants n'est pas classé :

- une unité déclarée dans un `course-catalogue.ts`, qu'elle soit publiée ou `coming-soon` ;
- un livre de `library-catalogue.ts` ;
- un jeu de `game-catalogue.ts` dont la disponibilité est `standalone` ou `react`.

### CA-05 — Pas de niveau par défaut permissif

Un identifiant absent du registre n'est jamais considéré comme `LIBRE`. Les récits suivants le traiteront comme non accessible.

### CA-06 — Aucun changement visible

Tous les contenus restent accessibles exactement comme avant ce récit.

### CA-07 — Qualité technique

Tests backend au minimum : registre valide chargé, doublon refusé, niveau inconnu refusé, matière Exetat non classée refusée, réponse du point d'accès.

Conformément aux règles d'équipe, aucun emoji n'est introduit dans le code et tout nouveau code est testé.

```text
npm run lint
npm run test
npm run build
./gradlew test
./gradlew bootJar
```

## Hors périmètre

- appliquer les niveaux (ACCES-05 à ACCES-08) ;
- afficher un cadenas dans l'interface ;
- droits, abonnements, paiement ;
- classement à la leçon plutôt qu'à l'unité.

## Consignes de réalisation

Avant de commencer :

1. vérifier que la décision D1 est inscrite dans ce récit ;
2. synchroniser `main` avec `origin/main` ;
3. créer la branche dédiée depuis ce `main` à jour.

À la fin, lorsque tous les critères sont satisfaits et les tests sont verts :

1. déplacer le récit vers `Terminé/` en ajoutant `TERMINÉ` à son nom ;
2. mettre à jour son statut dans l'index du lot ;
3. ouvrir une PR consacrée uniquement à ce récit. Revue de Crochet, fusion par le Capitaine Pi.

## Définition de terminé

Le récit est terminé lorsque chaque contenu de Mbuyamba possède un niveau d'accès unique dans un registre serveur validé au démarrage, qu'un test garantit qu'aucun contenu du frontend n'y échappe, que le registre est lisible par `GET /api/v1/acces/registre`, que rien n'a changé pour l'utilisateur, et que la CI est verte.
