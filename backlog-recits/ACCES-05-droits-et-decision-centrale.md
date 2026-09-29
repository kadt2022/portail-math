# ACCES-05 — Droits d'accès et décision centrale

**Lot :** [LOT-ACCES — Web et Android sous contrôle du serveur](LOT-ACCES-web-android-sous-controle.md)
**Statut :** PROPOSITION — relecture de Crochet, validation du Capitaine Pi
**Branche proposée :** `feat/acces-05-droits-et-decision`
**Dépend de :** ACCES-01, ACCES-02, ACCES-03. Décisions D3 et D4.

## Contexte

Après ACCES-01, le serveur sait ce que **chaque contenu exige**. Après ACCES-03, il sait **qui parle**. Il lui manque deux choses :

1. savoir **ce que cette personne a le droit d'ouvrir**, parce qu'elle ou son école a un abonnement actif ;
2. une **décision unique**, appelée par tous les points d'accès, qui répond « autorisé » ou « refusé, pour telle raison ».

Takibo gère les identités et le statut des utilisateurs. Il ne connaît pas les abonnements de Mbuyamba, et ne doit pas les connaître : c'est une règle pédagogique et commerciale, qui appartient à Mbuyamba.

## User Stories

En tant qu'élève dont l'école est abonnée,
je veux ouvrir les contenus premium,
afin de suivre tout le programme.

En tant qu'élève sans abonnement,
je veux comprendre pourquoi un contenu est fermé (connexion requise, abonnement requis, abonnement expiré, accès suspendu),
afin de savoir quoi faire, au lieu de voir une erreur incompréhensible.

En tant que Capitaine,
je veux accorder, prolonger, suspendre ou révoquer un droit, et retrouver l'historique de chaque changement,
afin de garder la main sur l'accès commercial.

## Modèle proposé

Table `droits_acces` :

| Colonne | Rôle |
|---|---|
| `id` | Identifiant technique |
| `beneficiaire_type` | `ELEVE` ou `ORGANISATION` (décision D3) |
| `beneficiaire_id` | `user_id` Takibo pour un élève, `org_id` Takibo pour une organisation |
| `formule` | Libellé court, par exemple `ecole-annuelle` |
| `debut` | Début de validité, inclus |
| `fin` | Fin de validité, **exclue** |
| `statut` | `ACTIF`, `SUSPENDU` ou `REVOQUE` |
| `motif` | Texte libre, obligatoire pour une suspension ou une révocation |
| `cree_par`, `cree_le`, `modifie_le` | Traçabilité |

Table `droits_acces_historique` : chaque création ou modification y ajoute une ligne. Rien n'y est jamais modifié ni supprimé. C'est la mémoire en cas de litige de paiement.

Dans ce récit, un droit actif ouvre **tout le niveau `PREMIUM`**. Les offres par contenu ou par pack viendront plus tard.

## La décision

```text
contenu absent du registre                          -> REFUS     CONTENU_INCONNU
niveau LIBRE                                        -> AUTORISE
aucune identité                                     -> REFUS     CONNEXION_REQUISE
niveau INSCRIT                                      -> AUTORISE
droit ACTIF, debut <= maintenant < fin,
  pour l'élève ou pour son org_id                   -> AUTORISE
droit SUSPENDU ou REVOQUE, sans autre droit actif   -> REFUS     ACCES_SUSPENDU
droit arrivé à échéance, sans autre droit actif     -> REFUS     ABONNEMENT_EXPIRE
sinon                                               -> REFUS     ABONNEMENT_REQUIS
```

`maintenant` est **toujours l'horloge du serveur** (horloge injectable pour les tests), jamais une date envoyée par le client.

## Périmètre

- migrations Flyway des deux tables ;
- le service de décision ci-dessus, seul autorisé à répondre à la question « peut-il ouvrir ce contenu ? » ;
- `GET /api/v1/moi/droits` renvoie l'heure du serveur, les niveaux ouverts, la date de fin du droit premium s'il existe, et la raison d'un refus ;
- `GET /api/v1/moi/acces/{contenuId}` renvoie la décision et sa raison pour un contenu ;
- frontend : cadenas et message clair, en français et en anglais, sur les cartes et pages de contenus fermés ;
- **octroi pendant le pilote (D4)** : une procédure SQL documentée dans `docs/`, qui écrit aussi dans l'historique. Pas d'écran ni d'API d'administration.

**Attention :** masquer un bouton dans l'interface n'est pas une protection. Ce récit **informe** l'utilisateur. La protection réelle des fichiers et des données arrive avec ACCES-06, 07 et 08.

## Critères d'acceptation

### CA-01 — Chaque branche de la décision est testée

Un test par branche, plus les bornes :

- exactement à `debut` : autorisé ;
- exactement à `fin` : refusé, `ABONNEMENT_EXPIRE` ;
- un droit suspendu et un autre actif pour la même personne : autorisé.

### CA-02 — Droit d'organisation

Un droit `ORGANISATION` couvre tout élève dont le jeton porte ce `org_id`. Un élève d'une autre organisation n'en bénéficie pas.

### CA-03 — Heure du serveur uniquement

Aucun paramètre, en-tête ou champ du client ne modifie `maintenant`. Des tests à horloge fixe le démontrent.

### CA-04 — Expirer n'efface rien

L'expiration, la suspension ou la révocation ne suppriment ni progression, ni historique, ni compte.

### CA-05 — Historique complet

Toute création, prolongation, suspension ou révocation ajoute une ligne à `droits_acces_historique`.

### CA-06 — Pas d'appel à Takibo pendant la décision

La décision s'appuie sur le jeton déjà vérifié (ACCES-03). Elle n'interroge pas Takibo à chaque requête.

### CA-07 — Interface compréhensible

Les quatre raisons de refus s'affichent avec un message distinct, en français et en anglais, sans débordement à 320 px.

### CA-08 — Procédure d'octroi

La procédure SQL est documentée, et essayée sur une base de test dans les tests d'intégration.

### CA-09 — Qualité technique

Conformément aux règles d'équipe, aucun emoji n'est introduit dans le code et tout nouveau code est testé.

```text
npm run lint
npm run test
npm run build
./gradlew test
./gradlew bootJar
```

## Hors périmètre

- paiement et mobile money ;
- écran ou API d'administration des droits ;
- offres par contenu ou par pack ;
- facturation ;
- protection effective des livres, unités, quiz et jeux (ACCES-06 à 08).

## Consignes de réalisation

Avant de commencer :

1. vérifier qu'ACCES-01, 02 et 03 sont fusionnés, et que D3 et D4 sont tranchées dans l'index du lot ;
2. synchroniser `main` avec `origin/main` ;
3. créer la branche dédiée depuis ce `main` à jour.

À la fin, lorsque tous les critères sont satisfaits et les tests sont verts :

1. déplacer le récit vers `Terminé/` en ajoutant `TERMINÉ` à son nom ;
2. mettre à jour son statut dans l'index du lot ;
3. ouvrir une PR consacrée uniquement à ce récit. Revue de Crochet, fusion par le Capitaine Pi.

## Définition de terminé

Le récit est terminé lorsque le serveur enregistre des droits datés et historisés pour un élève ou une organisation, qu'un service unique décide de l'accès à tout contenu selon l'heure du serveur, que l'élève voit clairement pourquoi un contenu est fermé, que le Capitaine dispose d'une procédure documentée pour accorder ou retirer un droit, et que la CI est verte.
