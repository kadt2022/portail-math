# ACCES-08 — Appliquer les droits à l'Exetat et aux jeux

**Lot :** [LOT-ACCES — Web et Android sous contrôle du serveur](LOT-ACCES-web-android-sous-controle.md)
**Statut :** PROPOSITION — relecture de Crochet, validation du Capitaine Pi
**Branche proposée :** `feat/acces-08-exetat-et-jeux`
**Dépend de :** ACCES-02, ACCES-05. Décisions D0 et D1.

## Contexte

### Exetat : le bon modèle, pas encore fermé

L'Exetat est la partie de Mbuyamba la mieux protégée :

- `GET /api/v1/exetat/matieres/{subjectId}/questions` renvoie des `PublicQuestionResponse`, **sans la bonne réponse** ;
- la correction se fait sur le serveur (`POST /api/v1/exetat/quizzes/{quizId}/answers`), et la solution n'est révélée qu'après la réponse.

Trois failles restent pourtant ouvertes :

1. **aucun contrôle d'accès** : toutes les matières sont ouvertes à tous ;
2. **tentatives en mémoire** (`InMemoryQuizAttemptRepository`) : elles sont perdues à chaque redéploiement, ne sont pas partagées entre pods et ne sont rattachées à aucun élève ;
3. **les bonnes réponses et les solutions** sont dans `src/main/resources/content/exetat/*.json`, versés dans le dépôt **public**. La correction côté serveur se contourne en lisant GitHub (D0).

### Jeux

| Jeu | Disponibilité | Où vit le code |
|---|---|---|
| `multiplication-train`, `fraction-river`, `flux-forge` | `standalone` | `src/main/resources/static/games/*.html` et `static/js/`, servis publiquement |
| `grille-magique`, `turbo-pulse` | `react` | Bundle principal sous `/app/` |

## User Story

En tant que Capitaine,
je veux que les matières Exetat et les jeux non `LIBRE` ne soient accessibles qu'aux élèves qui y ont droit,
afin que la partie à plus forte valeur ne soit plus ouverte à tous.

En tant qu'élève,
je veux retrouver mes tentatives Exetat même après une mise à jour du serveur,
afin de ne pas perdre mon travail.

## Périmètre

### Exetat

- décision d'ACCES-05 sur `exetat:{subjectId}` pour :
  - `GET /api/v1/exetat/matieres/{subjectId}/questions` ;
  - `POST /api/v1/exetat/quizzes` (démarrage) ;
  - `POST /api/v1/exetat/quizzes/{quizId}/reviews` ;
- `GET /api/v1/exetat/matieres` reste lisible par tous et indique le niveau d'accès de chaque matière ;
- une tentative démarrée par un élève connecté lui est rattachée. Un autre élève ne peut ni la lire ni y répondre ;
- une tentative anonyme reste possible pour une matière `LIBRE` ;
- persistance des tentatives en base, en remplacement d'`InMemoryQuizAttemptRepository` en production ;
- le contenu des matières protégées sort du dépôt public vers le stockage retenu en D0. Une matière `LIBRE` peut y rester comme contenu de démonstration.

### Jeux

- un jeu non `LIBRE` n'est plus servi depuis `static/games` ni inclus dans le bundle principal. Ses fichiers passent par une route soumise à la décision d'ACCES-05 ;
- le catalogue des jeux affiche le cadenas et la raison ;
- le lancement plein écran (mécanisme partagé `fraction-river-launch.js`) continue de fonctionner pour les jeux autorisés.

## Critères d'acceptation

### CA-01 — Matière protégée

Pour une matière non `LIBRE`, sans droit suffisant, les questions, le démarrage et la révision répondent `401` ou `403` avec la raison.

### CA-02 — Pas de fuite de réponse

Aucune réponse d'API ne contient une bonne réponse ou une solution avant que la question ait été répondue. Le test existant est conservé et étendu aux nouveaux points d'accès.

### CA-03 — Tentative privée

L'élève B reçoit `403` sur la tentative de l'élève A, même s'il connaît son `quizId`.

### CA-04 — Tentatives durables

Une tentative commencée avant un redémarrage se poursuit après.

### CA-05 — Jeux fermés

Un jeu non `LIBRE` ne se trouve ni dans `static/games`, ni dans le bundle principal. Une vérification automatisée de la CI le garantit. Son adresse directe renvoie `401` ou `403` sans droit.

### CA-06 — Non-régression

Les matières et jeux `LIBRE` fonctionnent sans compte, comme aujourd'hui.

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

Un jeu est du code. Une fois chargé par un élève autorisé, ce code peut être conservé. À terme, la protection la plus solide consiste à servir les **niveaux** d'un jeu (ses données) par l'API, plutôt que de protéger son moteur. Cette évolution est hors de ce récit.

## Hors périmètre

- nouvelles matières Exetat ;
- migration de la progression Exetat locale (ACCES-09) ;
- niveaux de jeux servis par l'API ;
- nettoyage de l'historique Git du dépôt public.

## Consignes de réalisation

Avant de commencer :

1. vérifier qu'ACCES-02 et ACCES-05 sont fusionnés, et que D0 et D1 sont tranchées ;
2. synchroniser `main` avec `origin/main` ;
3. créer la branche dédiée depuis ce `main` à jour.

À la fin, lorsque tous les critères sont satisfaits et les tests sont verts :

1. déplacer le récit vers `Terminé/` en ajoutant `TERMINÉ` à son nom ;
2. mettre à jour son statut dans l'index du lot ;
3. ouvrir une PR consacrée uniquement à ce récit. Revue de Crochet, fusion par le Capitaine Pi.

## Définition de terminé

Le récit est terminé lorsque les matières Exetat et les jeux non `LIBRE` ne sont accessibles qu'avec un droit suffisant, que les tentatives Exetat sont persistées et rattachées à leur élève, qu'aucune réponse ne fuit avant d'être répondue, que les contenus `LIBRE` restent ouverts sans compte, et que la CI est verte.
