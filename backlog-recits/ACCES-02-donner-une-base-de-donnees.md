# ACCES-02 — Donner une base de données à Mbuyamba

**Lot :** [LOT-ACCES — Web et Android sous contrôle du serveur](LOT-ACCES-web-android-sous-controle.md)
**Statut :** PROPOSITION — relecture de Crochet, validation du Capitaine Pi
**Branche proposée :** `feat/acces-02-socle-postgresql`
**Dépend de :** aucun récit. Peut avancer en parallèle d'ACCES-01 et d'ACCES-03.

## Contexte

Le backend de Mbuyamba n'a aucun état durable :

- `build.gradle` ne déclare que `spring-boot-starter-web` et `spring-boot-starter-actuator` ;
- `application.yml` ne configure aucune source de données ;
- les tentatives de quiz Exetat vivent dans `InMemoryQuizAttemptRepository`. Elles disparaissent à chaque redéploiement et ne sont pas partagées si OpenShift fait tourner plusieurs pods.

Les droits d'accès (ACCES-05), la progression des élèves (ACCES-09) et les baux hors ligne (ACCES-10) exigent un état qui survit aux redémarrages. Un serveur qui oublie tout ne peut rien contrôler.

**Choix proposé : PostgreSQL et Flyway.** C'est déjà la seule base cible de Takibo-IAM (`README-TAS-GRANTS.md`). L'équipe n'aura qu'une technologie de base de données à maîtriser, sauvegarder et surveiller.

## User Story

En tant que mainteneur,
je veux que Mbuyamba dispose d'une base PostgreSQL migrée automatiquement, testée en CI et déployée sur OpenShift,
afin que les récits suivants puissent enregistrer des droits et des progressions sans reconstruire le socle à chaque fois.

## Périmètre

- dépendances d'accès aux données (JDBC ou JPA, choix justifié dans la PR), pilote PostgreSQL, Flyway ;
- une migration initiale **sans table métier**. Les tables arrivent avec les récits qui les utilisent ;
- configuration par variables d'environnement uniquement (URL, utilisateur, mot de passe) ;
- OpenShift : une base PostgreSQL, un `Secret` pour les identifiants, lu par `openshift/deployment.yml` ;
- sondes : la base intervient dans `readiness`, pas dans `liveness` ;
- tests d'intégration contre un vrai PostgreSQL (Testcontainers ou service de base dans `ci-cd-openshift.yml`) ;
- procédure de lancement local documentée ;
- procédures de sauvegarde et de restauration documentées dans `docs/DEPLOIEMENT-OPENSHIFT.md`.

## Critères d'acceptation

### CA-01 — Migrations au démarrage

L'application démarre contre PostgreSQL et applique les migrations Flyway en attente.

### CA-02 — Pas de repli silencieux

En production, si la base est injoignable, l'application ne passe pas `ready`. Elle ne se replie jamais sur un stockage en mémoire.

### CA-03 — Aucun secret dans le dépôt

Le dépôt `kadt2022/portail-math` est **public**. Aucun mot de passe, aucune URL de production avec identifiants et aucun fichier `.env` réel n'y est versé. Seul un exemple sans valeur réelle est autorisé.

### CA-04 — Sondes correctes

- base indisponible : `/actuator/health/readiness` est `DOWN`, `/actuator/health/liveness` reste `UP` ;
- base disponible : les deux sont `UP` ;
- aucun détail de connexion n'apparaît dans les réponses d'`actuator` (`show-details: never` est conservé).

### CA-05 — Tests d'intégration en CI

Au moins un test d'intégration démarre le contexte Spring contre PostgreSQL et vérifie que les migrations passent. Il est exécuté par `ci-cd-openshift.yml`.

### CA-06 — Exploitation documentée

`docs/DEPLOIEMENT-OPENSHIFT.md` explique comment créer la base, créer le secret, sauvegarder et restaurer. La restauration a été essayée au moins une fois sur un environnement de test, et la PR le mentionne.

### CA-07 — Aucune régression

Tableau de bord, cours, jeux, bibliothèque et Exetat fonctionnent comme avant.

### CA-08 — Qualité technique

Conformément aux règles d'équipe, aucun emoji n'est introduit dans le code et tout nouveau code est testé.

```text
npm run lint
npm run test
npm run build
./gradlew test
./gradlew bootJar
```

## Hors périmètre

- toute table métier (droits, progression, baux) ;
- la persistance des tentatives Exetat (ACCES-08) ;
- MySQL ou tout autre moteur ;
- la haute disponibilité et la réplication.

## Consignes de réalisation

Avant de commencer :

1. synchroniser `main` avec `origin/main` ;
2. créer la branche dédiée depuis ce `main` à jour.

À la fin, lorsque tous les critères sont satisfaits et les tests sont verts :

1. déplacer le récit vers `Terminé/` en ajoutant `TERMINÉ` à son nom ;
2. mettre à jour son statut dans l'index du lot ;
3. ouvrir une PR consacrée uniquement à ce récit. Revue de Crochet, fusion par le Capitaine Pi.

## Définition de terminé

Le récit est terminé lorsque Mbuyamba démarre sur une base PostgreSQL migrée par Flyway, en local, en CI et sur OpenShift, sans aucun secret dans le dépôt public, avec des sondes qui reflètent l'état de la base, une sauvegarde et une restauration documentées et essayées, et sans régression.
