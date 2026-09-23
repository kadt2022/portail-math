# ACCES-07 — Servir les unités de cours protégées par l'API

**Lot :** [LOT-ACCES — Web et Android sous contrôle du serveur](LOT-ACCES-web-android-sous-controle.md)
**Statut :** PROPOSITION — relecture de Crochet, validation du Capitaine Pi
**Branche proposée :** `feat/acces-07-cours-par-api`
**Dépend de :** ACCES-05. Décisions D0 et D1.

## Contexte

Tout le contenu des cours est aujourd'hui **compilé dans le bundle** servi sous `/app/`. N'importe quel visiteur le télécharge en ouvrant le portail, et une coquille Android l'embarquerait tout entier.

- **3e et 4e primaire** : le moteur est piloté par les données. La structure des leçons est dans `frontend/src/courses/primary-three/content/` (`unit-01.ts`, `lesson-content.ts`), de même pour `primary-four`. Les textes sont dans `frontend/src/i18n/locales/{fr,en}/primaryThree.json` et `primaryFour.json` ;
- **1re et 2e primaire** : les leçons sont écrites directement en composants, par exemple `PrimaryTwoLessonActivities.tsx`. Données et affichage n'y sont pas séparés ;
- **unités 2 à 10** : déclarées `coming-soon`, pas encore écrites.

C'est une chance : le moteur 3e et 4e sait déjà afficher une leçon à partir de données. Changer **l'origine** de ces données ne demande pas de réécrire le moteur.

**Principe :** le code du moteur (widgets, rendu, navigation) peut rester public. Les **données d'une unité non `LIBRE`** ne le sont pas.

**Dépôt public (D0) :** si les données d'une unité protégée sont versées dans `kadt2022/portail-math`, elles sont lisibles sur GitHub, quelle que soit la protection de l'API.

## User Story

En tant qu'élève autorisé,
je veux ouvrir une unité premium et la suivre exactement comme une unité gratuite,
afin que la protection soit invisible pour moi.

En tant que Capitaine,
je veux qu'une unité premium n'existe que sur le serveur,
afin que ni le site ni l'APK ne la contiennent.

## Périmètre

- un **format d'échange versionné** (`v1`) pour une unité : la structure actuelle des fichiers `unit-0X.ts` (types de `exercises/exercise-types.ts`) et ses textes en français et en anglais, sérialisables en JSON ;
- un stockage serveur des unités protégées, **hors du bundle et hors du dépôt public** (D0) ;
- `GET /api/v1/cours/{coursId}/unites/{uniteId}?langue=fr|en`, soumis à la décision d'ACCES-05 sur `cours:{uniteId}` ;
- validation du contenu au démarrage, sur le modèle de `ExetatCatalogValidator` ;
- frontend (3e et 4e) : une unité `LIBRE` se charge depuis le bundle, une unité non `LIBRE` depuis l'API, avec des états de chargement, d'erreur réseau et de refus (cadenas et raison) ;
- les clés i18n propres aux unités protégées quittent `primaryThree.json` et `primaryFour.json` ;
- si D1 ne classe encore aucune unité **déjà écrite** en non `LIBRE`, la chaîne est prouvée avec une unité de démonstration présente uniquement dans les tests.

## Critères d'acceptation

### CA-01 — Rien de protégé dans le build

Une vérification automatisée de la CI échoue si un identifiant ou une clé i18n d'une unité non `LIBRE` apparaît dans `frontend/dist`.

### CA-02 — Contrôle d'accès

Sans jeton : `401`. Jeton sans droit suffisant : `403` avec la raison. Droit suffisant : `200` et l'unité complète.

### CA-03 — Même expérience

Une unité servie par l'API se parcourt, se valide et fait progresser l'élève exactement comme une unité embarquée. Les tests de parcours existants de la 3e et de la 4e passent sur les deux origines.

### CA-04 — Contenu validé au démarrage

Une unité mal formée, ou dont une langue manque, empêche le démarrage avec un message explicite.

### CA-05 — Progression inchangée

La progression continue de passer par `useCourseProgress`. Ce récit ne modifie pas le stockage de progression, qui relève d'ACCES-09.

### CA-06 — Réseau absent

Sans réseau, une unité non `LIBRE` non disponible affiche un message clair, jamais un écran blanc. La lecture hors ligne relève d'ACCES-10.

### CA-07 — Qualité technique

Conformément aux règles d'équipe, aucun emoji n'est introduit dans le code et tout nouveau code est testé.

```text
npm run lint
npm run test
npm run build
./gradlew test
./gradlew bootJar
```

## Limite assumée

Les exercices des leçons se corrigent dans le navigateur. Un élève autorisé reçoit donc les réponses attendues avec les données de l'unité. C'est acceptable pour l'entraînement. Les **évaluations qui comptent** (bulletins, certificats) devront être corrigées sur le serveur, comme l'Exetat. C'est une suite prévue du lot, hors de ce récit.

## Hors périmètre

- conversion en données des leçons de 1re et 2e, qui fera l'objet d'un récit dédié si D1 classe leurs unités en non `LIBRE` ;
- correction serveur des évaluations de cours ;
- rédaction des unités 2 à 10 ;
- lecture hors ligne (ACCES-10).

## Consignes de réalisation

Avant de commencer :

1. vérifier qu'ACCES-05 est fusionné et que D0 et D1 sont tranchées ;
2. synchroniser `main` avec `origin/main` ;
3. créer la branche dédiée depuis ce `main` à jour.

À la fin, lorsque tous les critères sont satisfaits et les tests sont verts :

1. déplacer le récit vers `Terminé/` en ajoutant `TERMINÉ` à son nom ;
2. mettre à jour son statut dans l'index du lot ;
3. ouvrir une PR consacrée uniquement à ce récit. Revue de Crochet, fusion par le Capitaine Pi.

## Définition de terminé

Le récit est terminé lorsqu'une unité de cours non `LIBRE` n'existe plus que sur le serveur, hors du bundle et du dépôt public, qu'elle n'est livrée qu'à un élève autorisé, qu'elle se parcourt comme une unité embarquée, qu'une vérification de la CI garantit son absence du build, et que la CI est verte.
