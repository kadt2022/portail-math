# ACCES-10 — Le bail hors ligne : utiliser le premium sans réseau, pour un temps limité

**Lot :** [LOT-ACCES — Web et Android sous contrôle du serveur](LOT-ACCES-web-android-sous-controle.md)
**Statut :** PROPOSITION — relecture de Crochet, validation du Capitaine Pi
**Branche proposée :** `feat/acces-10-bail-hors-ligne`
**Dépend de :** ACCES-05, ACCES-06, ACCES-07, ACCES-09. Décisions D2 et D9.

## Contexte

En RDC, le réseau est intermittent et souvent coûteux. Deux écueils opposés existent :

- **aucun hors ligne** : le contenu premium est inutilisable dès que le réseau tombe ;
- **un hors ligne sans limite** : une fois le contenu téléchargé, l'application devient une copie autonome de Mbuyamba, qui ne dépend plus du serveur. C'est précisément ce que le Capitaine refuse.

Le **bail** est le compromis entre les deux : le serveur prête le contenu premium pour une durée limitée, et seul le serveur peut renouveler ce prêt.

## Principe

```text
en ligne      l'application demande un bail
              -> le serveur vérifie l'identité (ACCES-03) et le droit actif (ACCES-05)
              -> il signe un bail : élève, appareil, contenus, émis le, expire le

hors ligne    le contenu premium téléchargé reste lisible tant que le bail est valide

expiration    le contenu premium en cache devient illisible
              la progression reste visible et intacte

reconnexion   nouveau bail si le droit est toujours actif, refus motivé sinon
```

## Contrat du bail

- **émis et signé par Mbuyamba**, pas par Takibo : c'est une décision commerciale, pas une question d'identité ;
- contenu : `user_id`, `org_id`, identifiant d'appareil, liste des contenus autorisés hors ligne, `emis_le` (heure du serveur), `expire_le`, version du format ;
- `expire_le = min(emis_le + durée D2, fin du droit actif)` : un bail ne dépasse jamais la fin de l'abonnement ;
- clé privée de signature persistée hors du dépôt, avec une procédure de rotation (mêmes exigences que TAS-GRANTS-02A côté Takibo) ;
- vérifiable par l'application **sans réseau**, grâce à la clé publique embarquée et mise à jour à chaque connexion.

## Cache chiffré

- l'élève choisit ce qu'il télécharge pour le hors ligne, dans une limite de taille configurable. Les livres pèsent de 5 à 12 Mo chacun ;
- le contenu est téléchargé depuis les points d'accès d'ACCES-06 et ACCES-07, pendant la validité du bail ;
- il est stocké **chiffré** (AES-GCM) avec une clé de cache délivrée avec le bail ;
- à l'expiration ou au refus de renouvellement, la clé de cache est détruite et les fichiers sont purgés.

## Horloge

L'application mémorise le plus grand instant observé : heure du serveur reçue et heure locale. Si l'horloge du téléphone recule sous cette valeur, le bail est considéré comme expiré jusqu'à la prochaine connexion.

## Limites assumées

**Un bail ne peut pas être retiré à un téléphone hors ligne.** Le risque maximal est donc borné par la durée D2 :

- plus D2 est court, plus le contrôle est fort, et plus l'élève doit se reconnecter souvent ;
- plus D2 est long, plus l'élève est libre, et plus un droit résilié continue de servir longtemps.

**Renouveler un bail exige un jeton Takibo valide.** Takibo ne prévoit pas de refresh token pour un client public (`README-TAS-GRANTS.md`, décisions transversales). Si le jeton a expiré, l'élève se reconnecte. Le bail en cours reste valable jusqu'à son terme.

**Ce que le bail n'empêche pas**, à écrire tel quel dans la documentation :

- une personne compétente, avec un téléphone rooté, peut extraire la clé de cache et le contenu pendant la validité du bail ;
- les captures d'écran et les photos de pages ;
- un contenu déjà extrait ne s'efface pas à distance.

Le bail rend la copie **coûteuse et temporaire**, pas impossible. Les mesures complémentaires (Keystore Android en ACCES-11, filigrane nominatif, limite d'appareils D9) réduisent ce risque sans le supprimer.

## Périmètre

- `POST /api/v1/moi/bail` avec l'identifiant d'appareil. Réponse : le bail signé et la clé de cache, ou le refus avec la raison d'ACCES-05 ;
- limite du nombre d'appareils actifs par élève (D9) et procédure documentée pour libérer un appareil ;
- vérification du bail, gestion de l'horloge, cache chiffré, téléchargement choisi, purge, dans le code frontend partagé ;
- écran « Disponible hors ligne » : contenus téléchargés, place occupée, date de fin du bail ;
- le mécanisme vit dans le code frontend commun. Sa cible prioritaire est la coquille Android (ACCES-11).

## Critères d'acceptation

### CA-01 — Émission

Droit actif et réseau disponible : un bail est émis, avec `expire_le` inférieur ou égal à la fin du droit.

### CA-02 — Refus

Sans droit actif, pas de bail. La raison est affichée.

### CA-03 — Lecture hors ligne

Hors ligne, bail valide : un livre et une unité téléchargés s'ouvrent.

### CA-04 — Expiration

Hors ligne, bail expiré : le contenu premium est refusé avec un message clair. La progression reste visible.

### CA-05 — Recul d'horloge

Reculer l'horloge de l'appareil sous le plus grand instant observé rend le bail inutilisable jusqu'à la reconnexion.

### CA-06 — Falsification

Un bail modifié d'un seul octet, ou signé par une autre clé, est rejeté.

### CA-07 — Fin de droit

Lors d'une reconnexion après expiration ou suspension du droit, le renouvellement est refusé, la clé de cache est détruite et le cache est purgé.

### CA-08 — Limite d'appareils

Au-delà de la limite D9, un nouvel appareil n'obtient pas de bail tant qu'un appareil n'est pas libéré.

### CA-09 — Contenus libres

Les contenus `LIBRE` restent accessibles hors ligne, sans bail.

### CA-10 — Aucun secret livré

Aucune clé privée de signature ne se trouve dans le dépôt, le bundle ou l'APK. Une vérification automatisée de la CI le garantit.

### CA-11 — Tests

Tests à horloge simulée : bornes d'expiration, recul d'horloge, signature, purge, limite d'appareils.

### CA-12 — Qualité technique

Conformément aux règles d'équipe, aucun emoji n'est introduit dans le code et tout nouveau code est testé.

```text
npm run lint
npm run test
npm run build
./gradlew test
./gradlew bootJar
```

## Hors périmètre

- ouverture hors ligne de l'application web par service worker ;
- filigrane nominatif ;
- attestation d'intégrité de l'appareil ;
- révocation à distance d'un bail hors ligne, qui est impossible par nature.

## Consignes de réalisation

Avant de commencer :

1. vérifier qu'ACCES-05, 06, 07 et 09 sont fusionnés, et que D2 et D9 sont tranchées ;
2. synchroniser `main` avec `origin/main` ;
3. créer la branche dédiée depuis ce `main` à jour.

À la fin, lorsque tous les critères sont satisfaits et les tests sont verts :

1. déplacer le récit vers `Terminé/` en ajoutant `TERMINÉ` à son nom ;
2. mettre à jour son statut dans l'index du lot ;
3. ouvrir une PR consacrée uniquement à ce récit. Revue de Crochet, fusion par le Capitaine Pi.

## Définition de terminé

Le récit est terminé lorsqu'un élève avec un droit actif peut télécharger du contenu premium et l'utiliser sans réseau jusqu'à la fin d'un bail signé par le serveur, que ce contenu devient illisible à l'expiration ou si l'horloge recule, que seul le serveur peut renouveler le bail, que la progression n'est jamais touchée, que les limites du mécanisme sont écrites dans la documentation, et que la CI est verte.
