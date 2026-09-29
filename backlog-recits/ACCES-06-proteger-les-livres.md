# ACCES-06 — Mettre les livres derrière le contrôle d'accès

**Lot :** [LOT-ACCES — Web et Android sous contrôle du serveur](LOT-ACCES-web-android-sous-controle.md)
**Statut :** PROPOSITION — relecture de Crochet, validation du Capitaine Pi
**Branche proposée :** `feat/acces-06-livres-proteges`
**Dépend de :** ACCES-05. Décision D0.

## Contexte

Les trois livres PDF de la bibliothèque, soit environ 29 Mo au total, sont aujourd'hui **publics** :

- ils sont rangés dans `frontend/public/books/` ;
- Vite copie `public/` dans `frontend/dist/`, puis `processResources` (`build.gradle`) copie `frontend/dist` dans `static/app` ;
- résultat : `/app/books/mbuyamba-1re-primaire-livre-complet.pdf` se télécharge sans compte, par n'importe qui connaissant l'adresse. Une coquille Android construite aujourd'hui les embarquerait aussi.

`frontend/src/library/library-catalogue.ts` expose ces chemins (`pdfPath`), et `LibraryReaderPage.tsx` les passe au lecteur.

Le lecteur (`frontend/packages/pdf-reader/src/PdfReader.tsx`) appelle `getDocument({ url, disableAutoFetch: true, disableStream: true })`. Il ne demande ainsi que les octets des pages affichées, par **requêtes HTTP Range** (PR #42). Ce gain doit être conservé.

**Dépôt public (D0).** Les PDF sont aussi présents dans l'historique Git du dépôt public `kadt2022/portail-math`. Ce récit ferme l'accès par l'application. Il ne retire pas ce qui a déjà été publié sur GitHub.

## User Story

En tant que Capitaine,
je veux que les livres ne puissent être lus que par un élève qui y a droit,
afin que le contenu le plus facile à redistribuer ne soit plus en libre téléchargement.

En tant qu'élève autorisé,
je veux que le livre s'ouvre aussi vite qu'aujourd'hui,
afin que la protection ne dégrade pas la lecture.

## Périmètre

- retirer les PDF de `frontend/public/books/` et de tout ce qui aboutit dans `static/` ;
- les stocker **hors du dépôt public** (D0), par exemple sur un volume OpenShift ou un stockage objet, à un emplacement configurable, avec une procédure de développement local documentée ;
- `GET /api/v1/livres/{livreId}/fichier` et `HEAD` sur le même chemin :
  - décision d'ACCES-05 sur `livre:{livreId}` ;
  - prise en charge de `Range` : `206 Partial Content`, `Accept-Ranges: bytes`, `Content-Range`, et `416` pour une plage invalide ;
  - `Cache-Control: private, no-store`. Le cache hors ligne relève d'ACCES-10 ;
- le lecteur transmet le jeton par l'en-tête `Authorization` (option `httpHeaders` de pdf.js), **jamais dans l'URL**, car les URL finissent dans les journaux ;
- les couvertures (`library-*-cover.webp`) restent publiques : c'est la vitrine ;
- la bibliothèque affiche le cadenas et la raison d'ACCES-05 pour un livre fermé.

## Critères d'acceptation

### CA-01 — Ancienne adresse fermée

Après déploiement, `/app/books/<fichier>.pdf` répond `404`.

### CA-02 — Aucun livre dans les livrables

Une vérification automatisée de la CI échoue si un PDF de livre se trouve dans `frontend/dist` ou dans le JAR.

### CA-03 — Contrôle d'accès

| Cas | Réponse |
|---|---|
| Sans jeton | `401` |
| Jeton valide, pas de droit | `403` avec la raison d'ACCES-05 |
| Droit actif, sans `Range` | `200` |
| Droit actif, avec `Range` valide | `206`, octets exacts |
| Plage invalide | `416` |

### CA-04 — Lecture toujours partielle

Le test du lecteur vérifie que `getDocument` reçoit `httpHeaders`, `disableAutoFetch: true` et `disableStream: true`. Ouvrir un livre ne télécharge pas le fichier entier.

### CA-05 — Pas de jeton dans les URL

Un test vérifie qu'aucune URL construite par la bibliothèque ou le lecteur ne contient le jeton.

### CA-06 — Pas de traversée de chemin

`livreId` est validé contre le catalogue. Il n'est jamais concaténé directement à un chemin de fichier. Un test essaie `../` et des variantes encodées.

### CA-07 — Qualité technique

Conformément aux règles d'équipe, aucun emoji n'est introduit dans le code et tout nouveau code est testé.

```text
npm run lint
npm run test
npm run build
./gradlew test
./gradlew bootJar
```

## Hors périmètre

- filigrane nominatif dans les pages ;
- lecture hors ligne (ACCES-10) ;
- nettoyage de l'historique Git du dépôt public, action distincte du Capitaine ;
- tout DRM.

## Consignes de réalisation

Avant de commencer :

1. vérifier qu'ACCES-05 est fusionné et que D0 est tranchée ;
2. synchroniser `main` avec `origin/main` ;
3. créer la branche dédiée depuis ce `main` à jour.

À la fin, lorsque tous les critères sont satisfaits et les tests sont verts :

1. déplacer le récit vers `Terminé/` en ajoutant `TERMINÉ` à son nom ;
2. mettre à jour son statut dans l'index du lot ;
3. ouvrir une PR consacrée uniquement à ce récit. Revue de Crochet, fusion par le Capitaine Pi.

## Définition de terminé

Le récit est terminé lorsque les livres ne sont plus servis publiquement ni présents dans les livrables, qu'ils ne se lisent qu'à travers un point d'accès soumis à la décision d'ACCES-05, que la lecture reste partielle par requêtes Range, qu'aucun jeton n'apparaît dans une URL, et que la CI est verte.
