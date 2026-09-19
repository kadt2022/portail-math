# Préparation Android — reprendre le contrôle du contenu

## Objectif

Avant de produire l'application Android, Mbuyamba Education doit éviter d'embarquer tout son contenu pédagogique dans le frontend ou dans l'APK.

L'application doit principalement contenir :

- l'interface React ;
- les composants interactifs ;
- Phaser et les moteurs de jeu ;
- les illustrations et assets génériques ;
- Yamba ;
- le client API.

Le contenu pédagogique doit progressivement être servi par le backend.

EXETAT constitue le modèle de référence actuel : contenu et validation côté serveur.

---

# Récit 1 — CONTENT-API-01

## Branche

`feat/content-api-foundation`

## Objectif

Créer la fondation backend permettant d'exposer du contenu pédagogique sans encore migrer tous les cours.

## À faire

Créer côté Spring Boot un modèle simple pour représenter :

- cours ;
- module ;
- leçon ;
- activité ;
- exercice.

Ajouter un emplacement serveur :

```text
src/main/resources/content/courses/
```

Créer une première API de lecture :

```text
GET /api/v1/courses
GET /api/v1/courses/{courseId}
GET /api/v1/courses/{courseId}/modules/{moduleId}
GET /api/v1/courses/{courseId}/lessons/{lessonId}
```

Les réponses correctes ne doivent jamais être exposées dans les DTO publics.

## Responsabilités techniques

Le backend ne doit pas reproduire le moteur d’exercices TypeScript. Il est responsable du stockage, du catalogue et de la distribution contrôlée du contenu.

Le frontend reste responsable de l’interprétation des types d’exercices et de l’expérience interactive. Le contrat backend d’un exercice doit donc rester générique : un identifiant, un type et des données publiques destinées au composant frontend. Les données réservées au serveur, notamment celles nécessaires à une future validation, ne doivent jamais être incluses dans le DTO public.

## Critère de fin

Le backend peut charger et exposer un cours de démonstration sans dépendre du frontend.

---

# Récit 2 — CONTENT-MIGRATION-02

## Branche

`feat/course-content-backend-migration`

## Objectif

Migrer un premier vrai parcours vers le backend.

Commencer par la **4e primaire**.

## À faire

Déplacer hors de :

```text
frontend/src/courses/primary-four/content/
```

les contenus pédagogiques aujourd'hui codés dans le TypeScript.

Le frontend doit récupérer les leçons depuis l'API créée dans le récit 1.

Les composants React existants doivent être conservés autant que possible.

## Critère de fin

La 4e primaire fonctionne normalement alors que ses contenus pédagogiques ne sont plus présents dans le bundle frontend.

---

# Récit 3 — ASSESSMENT-API-03

## Branche

`feat/server-side-exercise-validation`

## Objectif

Ne plus laisser le frontend décider si une réponse est correcte.

## À faire

Créer une API de validation :

```text
POST /api/v1/exercises/{exerciseId}/answers
```

Le frontend envoie par exemple :

```json
{
  "answer": 3000
}
```

Le backend répond avec un résultat du type :

```json
{
  "correct": true
}
```

Le frontend ne doit pas recevoir la réponse correcte avant la tentative.

S'inspirer du fonctionnement déjà présent dans EXETAT.

## Critère de fin

Pour les exercices migrés, la bonne réponse n'existe plus dans le JavaScript frontend.

---

# Récit 4 — CONTENT-DELIVERY-04

## Branche

`feat/controlled-content-delivery`

## Objectif

Retirer progressivement les autres contenus pédagogiques directement embarqués dans le frontend.

## À faire

Traiter en priorité :

- les banques de questions des jeux ;
- les PDF actuellement dans `frontend/public/books`.

Créer un catalogue backend permettant au frontend de connaître les ressources disponibles.

Ne pas refaire les jeux ni le lecteur de livres dans ce récit.

## Critère de fin

Les ressources pédagogiques ne dépendent plus obligatoirement d'un fichier livré directement avec le frontend.

---

# Récit 5 — PROGRESS-API-05

## Branche

`feat/server-side-learning-progress`

## Objectif

Préparer la progression élève côté serveur.

## À faire

Créer un modèle backend simple pour enregistrer :

- cours commencé ;
- leçon commencée ;
- leçon terminée ;
- exercice réalisé ;
- résultat.

Le `localStorage` peut rester temporairement comme cache technique, mais ne doit plus être la seule source de vérité.

## Critère de fin

Une progression peut être enregistrée et relue depuis le backend.

---

# Après ces récits — Android

La création de l'application Android sera traitée séparément.

L'APK devra principalement contenir :

```text
UI
React
Phaser
moteurs interactifs
assets génériques
Yamba
client API
```

et récupérer le contenu pédagogique depuis Mbuyamba Education.

## Ordre

```text
CONTENT-API-01
      ↓
CONTENT-MIGRATION-02
      ↓
ASSESSMENT-API-03
      ↓
CONTENT-DELIVERY-04
      ↓
PROGRESS-API-05
      ↓
ANDROID
```

Chaque récit possède sa propre branche et sa propre PR.

Ne pas mélanger plusieurs récits dans une même branche.
