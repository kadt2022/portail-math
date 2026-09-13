# ACCES-03 — Reconnaître les jetons Takibo dans le backend

**Lot :** [LOT-ACCES — Web et Android sous contrôle du serveur](LOT-ACCES-web-android-sous-controle.md)
**Statut :** PROPOSITION — relecture de Crochet, validation du Capitaine Pi
**Branche proposée :** `feat/acces-03-jetons-takibo`
**Dépend de :** Takibo-IAM TAS-GRANTS-02A (clés de signature persistantes), **TERMINÉ** le 2026-09-09. Peut avancer en parallèle d'ACCES-01 et d'ACCES-02.

## Contexte

Mbuyamba n'a aucune authentification : pas de dépendance Spring Security, aucune route protégée.

La décision est actée : **Takibo est le fournisseur d'identité de Mbuyamba**. La répartition des rôles est la suivante :

- **Takibo dit *qui* est l'utilisateur.** Il authentifie, signe un jeton et publie ses clés publiques ;
- **Mbuyamba décide *à quoi* il a droit** (ACCES-05). Mbuyamba ne voit jamais un mot de passe, ne signe jamais un jeton Takibo et ne recalcule pas le RBAC de Takibo.

Côté Takibo, au 2026-09-13 :

- les jetons de connexion humaine sont signés par `HumanTokenSigner` ;
- les clés de signature sont persistantes (TAS-GRANTS-02A). Un redéploiement de Takibo n'invalide plus tous les jetons ;
- les claims utiles sont déclarés dans `TakiboTokenClaims` : `user_id`, `account_id`, `org_id`, `space_id`, `subject_type` (`HUMAN` ou `CLIENT_APP`), `auth_method`, `roles`, `permissions`.

Ce récit apprend au backend de Mbuyamba à **vérifier** ces jetons. Il ne crée ni écran de connexion (ACCES-04) ni règle de droit (ACCES-05).

## Vérifications préalables

À faire avant d'écrire le code, et à consigner dans la description de la PR :

1. **L'émetteur (`iss`)** réellement placé dans les jetons de l'environnement cible. La configuration locale de Takibo déclare `http://localhost:8081`, qui ne convient pas à un déploiement ;
2. **L'URI publique des clés (JWKS)** exposée par Takibo, et son accessibilité depuis le cluster OpenShift de Mbuyamba ;
3. **Le destinataire du jeton.** Si aucun claim (`aud` ou équivalent) ne permet de distinguer un jeton émis pour Mbuyamba d'un jeton émis pour une autre application Takibo, le risque est écrit dans la PR et soumis au Capitaine **avant fusion**. Sans cette distinction, un jeton valide pour une autre application ouvrirait Mbuyamba.

## User Story

En tant que backend Mbuyamba,
je veux reconnaître un jeton Takibo authentique et en extraire l'identité de l'élève,
afin de pouvoir, dans les récits suivants, décider de ses droits sans jamais gérer de mot de passe.

## Périmètre

- `spring-boot-starter-oauth2-resource-server` ;
- vérification de la signature par le JWKS de Takibo, de `iss`, `exp` et `nbf`, avec une tolérance d'horloge d'au plus 60 secondes ;
- un objet d'identité interne (`userId`, `accountId`, `orgId`, `spaceId`) construit à partir des claims. Le reste du code ne lit jamais les claims bruts ;
- refus des jetons dont `subject_type` n'est pas `HUMAN` sur les routes élèves ;
- fonctionnement sans état : pas de session HTTP, pas de cookie d'authentification ;
- `GET /api/v1/moi` renvoie l'identité reconnue, sans rôle ni permission ;
- configuration de l'émetteur et du JWKS par variables d'environnement ;
- erreurs JSON cohérentes avec `ApiErrorResponse` : `AUTHENTIFICATION_REQUISE`, `JETON_INVALIDE`, `TYPE_DE_SUJET_REFUSE`.

### Politique de routes

| Routes | Règle dans ce récit |
|---|---|
| `/app/**`, `/games/**`, `/css/**`, `/js/**`, `/images/**` | Publiques, inchangées |
| Redirections de `LegacyPortalRedirectController` | Publiques, inchangées |
| `/actuator/health/**` | Publiques, inchangées |
| `/api/v1/exetat/**` | Publiques, inchangées jusqu'à ACCES-08 |
| `/api/v1/acces/registre` | Publique (ACCES-01) |
| `/api/v1/moi/**` | Jeton Takibo valide obligatoire |
| Toute autre route `/api/**` | **Refusée par défaut** : chaque nouvelle route doit être déclarée explicitement |

## Critères d'acceptation

### CA-01 — Jeton valide

Avec un jeton Takibo humain valide, `GET /api/v1/moi` répond `200` et renvoie `userId`, `accountId`, `orgId` et `spaceId`.

### CA-02 — Jetons refusés

| Cas | Réponse |
|---|---|
| Aucun jeton | `401 AUTHENTIFICATION_REQUISE` |
| Jeton expiré | `401 JETON_INVALIDE` |
| Signature par une clé absente du JWKS | `401 JETON_INVALIDE` |
| Émetteur différent | `401 JETON_INVALIDE` |
| Jeton altéré d'un seul octet | `401 JETON_INVALIDE` |
| `subject_type` = `CLIENT_APP` | `403 TYPE_DE_SUJET_REFUSE` |

### CA-03 — Takibo indisponible

Si le JWKS est injoignable, aucun jeton n'est accepté. La réponse est une erreur contrôlée, jamais un `500` avec trace et jamais une acceptation.

### CA-04 — Rotation des clés

Un jeton signé par une nouvelle clé, publiée ensuite dans le JWKS, est accepté sans redémarrer Mbuyamba.

### CA-05 — Non-régression des routes publiques

Un test vérifie que chaque route publique actuelle répond comme avant, sans jeton.

### CA-06 — Refus par défaut

Une route `/api/**` ajoutée sans déclaration explicite dans la politique de sécurité est refusée. Un test le démontre.

### CA-07 — Tests sans Takibo réel

Les tests génèrent leurs propres clés et servent un JWKS simulé. La CI ne dépend pas d'une instance Takibo.

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

- écran de connexion et stockage du jeton dans le frontend (ACCES-04) ;
- droits et décision d'accès (ACCES-05) ;
- configuration CORS pour l'application Android (ACCES-11) ;
- refresh token et révocation (TAS-GRANTS-05 et 07, côté Takibo) ;
- toute modification du dépôt Takibo-IAM. Une demande éventuelle, par exemple un claim d'audience, fait l'objet d'un récit dans Takibo.

## Consignes de réalisation

Avant de commencer :

1. faire les vérifications préalables ci-dessus ;
2. synchroniser `main` avec `origin/main` ;
3. créer la branche dédiée depuis ce `main` à jour.

À la fin, lorsque tous les critères sont satisfaits et les tests sont verts :

1. déplacer le récit vers `Terminé/` en ajoutant `TERMINÉ` à son nom ;
2. mettre à jour son statut dans l'index du lot ;
3. ouvrir une PR consacrée uniquement à ce récit. Revue de Crochet, fusion par le Capitaine Pi.

## Définition de terminé

Le récit est terminé lorsque le backend de Mbuyamba accepte les jetons humains authentiques de Takibo, refuse tous les autres, expose l'identité reconnue sur `GET /api/v1/moi`, refuse par défaut toute nouvelle route d'API non déclarée, laisse les routes publiques actuelles inchangées, et que la CI est verte sans instance Takibo.
