# ACCES-09 — Progression côté serveur : le téléphone garde un cache, le serveur fait foi

**Lot :** [LOT-ACCES — Web et Android sous contrôle du serveur](LOT-ACCES-web-android-sous-controle.md)
**Statut :** PROPOSITION — relecture de Crochet, validation du Capitaine Pi
**Branche proposée :** `feat/acces-09-progression-serveur`
**Dépend de :** ACCES-02, ACCES-03, ACCES-04.

## Contexte

Aujourd'hui, la progression vit dans le `localStorage` de l'appareil. C'est un choix volontaire d'un portail conçu sans comptes :

| Domaine | Clé | Fichier |
|---|---|---|
| Cours (moteur partagé) | `mbuyamba-math:course-progress:{courseId}`, version 1 | `frontend/src/courses/course-engine/progress-storage.ts` |
| Cours de 1re (ancien adaptateur) | à relever au début du récit | `frontend/src/courses/primary-one/progress-storage.ts` |
| Exetat | `portailMath.exetat.progress.v1` (ancienne clé `timbiriMaths.exetat.progress.v1`) | `frontend/src/exetat/progress-storage.ts` |
| Jeux autonomes | propres à chaque jeu | `src/main/resources/static/js/progress-store.js`, `multiplication-train-store.js`, `fraction-river-store.js` |

Décisions et contraintes déjà posées :

- **décision du Capitaine (2026-08-25)** : chaque élève est identifié et sa progression est persistée côté serveur ;
- **Rivière des fractions** : il est interdit d'effacer une progression déjà enregistrée sur l'appareil (pas de `localStorage.clear()`, pas de renommage de clé sans migration) ;
- **connectivité en RDC** : l'enfant doit pouvoir jouer sans réseau.

Un problème nouveau apparaît avec les comptes : **les appareils partagés**. Un téléphone familial ou une tablette de classe sert à plusieurs enfants. Les clés actuelles ne sont rattachées à personne.

Bonne nouvelle : le moteur de cours dépend déjà d'une abstraction `StorageLike`, et non de `localStorage` directement. On peut brancher un autre stockage sans toucher au moteur.

## Une migration progressive, pas un remplacement

Le `localStorage` n'est pas une erreur d'architecture à corriger. Il **reste** dans la cible, parce que c'est lui qui permet la progression immédiate, le hors ligne, la reprise instantanée et l'usage anonyme des contenus libres.

```text
maintenant
localStorage
    ↓
ensuite
localStorage + synchronisation serveur
    ↓
cible
serveur = progression officielle
local   = cache / hors ligne / reprise instantanée
```

Ce récit réalise l'étape « ensuite » et pose la cible pour les élèves connectés :

- un visiteur anonyme continue d'utiliser **uniquement** le `localStorage`, exactement comme aujourd'hui ;
- un élève connecté écrit d'abord en local, puis la synchronisation envoie au serveur ;
- le serveur ne devient la progression officielle d'un élève qu'après son intégration : connexion, puis synchronisation ;
- **aucun stockage local existant n'est supprimé.** Tout retrait éventuel exigerait un récit dédié, avec migration et validation du Capitaine.

## User Stories

En tant qu'élève,
je veux que ma progression me suive d'un appareil à l'autre et survive à une réinstallation,
afin de ne jamais perdre mon travail.

En tant qu'élève sans réseau,
je veux continuer à apprendre et voir ma progression immédiatement,
afin que la connexion ne m'arrête pas.

En tant qu'enfant qui partage un téléphone,
je ne veux pas voir la progression de mon frère ou de ma sœur, et je ne veux pas qu'il ou elle voie la mienne.

## Périmètre

- stockage serveur de la progression par élève, domaine et clé, avec numéro de version du format ;
- `GET /api/v1/moi/progression` et `PUT /api/v1/moi/progression/{domaine}/{cle}` ;
- **fusion monotone et idempotente** côté serveur :
  - un élément terminé ne redevient jamais « non commencé » ;
  - le meilleur score est conservé ;
  - renvoyer deux fois la même mise à jour ne change rien ;
- côté client, un stockage compatible `StorageLike` : **cache local, plus file d'attente d'envoi**. L'écriture locale est immédiate, l'envoi part au retour du réseau sans bloquer l'enfant ;
- espace de noms par élève pour les données d'un élève connecté. Les données anonymes existantes restent en place ;
- **rattachement** : à la première connexion sur un appareil qui porte une progression anonyme, l'application propose de l'associer au compte. Proposition unique, refus possible, jamais automatique ;
- périmètre des domaines : **cours et Exetat**.

## Critères d'acceptation

### CA-01 — Hors ligne puis synchronisation

Sans réseau, un élève connecté termine une leçon : la progression s'affiche aussitôt. Au retour du réseau, elle arrive sur le serveur sans aucune action de l'enfant.

### CA-02 — Deux appareils

Le même élève progresse sur deux appareils. Après synchronisation, les deux affichent la fusion monotone des deux progressions.

### CA-03 — Aucune donnée locale effacée

Après la mise à jour, les clés locales existantes sont intactes. Un test le vérifie avec des données au format actuel.

### CA-04 — Appareil partagé

L'élève A se connecte, progresse, se déconnecte. L'élève B se connecte sur le même appareil : il ne voit aucune progression de A.

### CA-05 — Rattachement consenti

La proposition de rattacher la progression anonyme n'apparaît qu'une fois par appareil et par compte. Un refus est respecté et mémorisé.

### CA-06 — File d'attente sans perte

La file garde au plus le dernier état par clé : sa taille est bornée par le nombre de clés, et aucun état n'est perdu silencieusement. Un échec d'envoi est retenté plus tard, avec un délai croissant.

### CA-07 — Fin de droit

Quand un droit expire, la progression reste conservée et consultable. Seul l'accès au contenu est fermé.

### CA-08 — Le serveur ne croit pas tout

Le serveur refuse une progression pour un contenu absent du registre d'ACCES-01. Les scores envoyés par le client servent à l'affichage, jamais à délivrer un certificat.

### CA-09 — Mode anonyme inchangé

Sans connexion, la progression s'enregistre et se relit uniquement en local, comme aujourd'hui, sans aucun appel au serveur.

### CA-10 — Qualité technique

Conformément aux règles d'équipe, aucun emoji n'est introduit dans le code et tout nouveau code est testé.

```text
npm run lint
npm run test
npm run build
./gradlew test
./gradlew bootJar
```

## Hors périmètre

- suppression ou remplacement d'un stockage local existant ;
- progression des jeux autonomes (récit de suite) ;
- tableau de bord enseignant ;
- certificats et bulletins ;
- suppression de compte et export des données (récit de suite, à traiter avant un lancement public).

## Consignes de réalisation

Avant de commencer :

1. vérifier qu'ACCES-02, 03 et 04 sont fusionnés ;
2. relever la clé exacte de `primary-one/progress-storage.ts` et la compléter dans la table du contexte ;
3. synchroniser `main` avec `origin/main` ;
4. créer la branche dédiée depuis ce `main` à jour.

À la fin, lorsque tous les critères sont satisfaits et les tests sont verts :

1. déplacer le récit vers `Terminé/` en ajoutant `TERMINÉ` à son nom ;
2. mettre à jour son statut dans l'index du lot ;
3. ouvrir une PR consacrée uniquement à ce récit. Revue de Crochet, fusion par le Capitaine Pi.

## Définition de terminé

Le récit est terminé lorsque la progression des cours et de l'Exetat d'un élève connecté est synchronisée avec le serveur par fusion monotone, qu'elle reste immédiate et utilisable hors ligne grâce au stockage local, que le mode anonyme reste purement local, qu'aucune donnée locale existante n'a été effacée, que deux enfants sur un même appareil ne voient jamais la progression l'un de l'autre, et que la CI est verte.
