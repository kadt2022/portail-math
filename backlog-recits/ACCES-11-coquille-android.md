# ACCES-11 — La coquille Android

**Lot :** [LOT-ACCES — Web et Android sous contrôle du serveur](LOT-ACCES-web-android-sous-controle.md)
**Statut :** PROPOSITION — relecture de Crochet, validation du Capitaine Pi
**Branche proposée :** `feat/acces-11-coquille-android`
**Dépend de :** ACCES-04, ACCES-06, ACCES-07, ACCES-08, ACCES-10. Décisions D7 et D8.

## Contexte

Au 2026-09-13, Mbuyamba n'a **aucune version Android** : le dépôt ne contient ni Capacitor, ni TWA, ni projet Android.

Ce récit est **volontairement le dernier du lot**. Le contrôle ne vit pas dans l'application, il vit dans le serveur. Une coquille Android produite avant ACCES-06, 07 et 08 embarquerait les livres, les cours et les réponses. Produite après, elle ne contient que le code et les contenus `LIBRE` : sans le serveur, elle n'ouvre rien d'autre.

## Choix de la coquille (décision D7)

| Critère | Capacitor | TWA (Trusted Web Activity) |
|---|---|---|
| Ce que contient l'APK | Le code et les contenus `LIBRE` | Rien : Chrome affiche le site |
| Démarrage sans réseau | Oui | Seulement via un service worker |
| Stockage sécurisé (Keystore Android) | Oui, par plugin natif | Non, stockage du navigateur |
| Mise à jour du code | Nouvelle version de l'APK | Immédiate : c'est le site |
| Dépendance | WebView système | Chrome installé et à jour |
| Effort | Moyen | Faible |

**Proposition : Capacitor.** Il démarre sans réseau et garde le jeton et la clé de cache du bail (ACCES-10) dans le Keystore, deux besoins directs de ce lot.

## User Stories

En tant qu'élève,
je veux installer Mbuyamba sur mon téléphone et l'ouvrir même sans réseau,
afin d'apprendre partout.

En tant que Capitaine,
je veux que l'application installée dépende de mon serveur pour tout contenu non libre, et pouvoir imposer une mise à jour,
afin de ne jamais perdre le contrôle de ce qui a été installé.

## Périmètre

- projet Android construit à partir de `frontend/dist`, avec la coquille retenue en D7 ;
- **contenu de l'APK limité au code et aux contenus `LIBRE`**, garanti par une vérification automatisée ;
- adresse absolue de l'API de Mbuyamba, puisque l'application n'est plus servie par le backend, configurable par environnement ;
- **CORS du backend Mbuyamba** : autoriser l'origine de la WebView de l'application en plus de l'origine web, et rien d'autre ;
- **CORS de Takibo** : l'origine de l'application doit être acceptée (prérequis Takibo, voir ACCES-04) ;
- jeton Takibo et clé de cache du bail stockés dans le **Keystore Android** ;
- **version minimale imposée par le serveur** :
  - `GET /api/v1/app/version-minimale` ;
  - l'application envoie sa version à chaque appel ;
  - en dessous de la version minimale, le serveur refuse le bail et les contenus non `LIBRE`, et l'application affiche « Mise à jour obligatoire » ;
- bouton retour Android cohérent avec la navigation du portail ;
- jeux plein écran et verrouillage paysage fonctionnels dans la WebView ;
- clé de signature de l'APK **hors du dépôt**, procédure de signature documentée. L'APK de production est signé par le Capitaine ;
- version minimale d'Android fixée dans la PR, en fonction de la coquille retenue et des appareils d'entrée de gamme visés en RDC.

## Critères d'acceptation

### CA-01 — Rien de protégé dans l'APK

Une vérification automatisée de la CI liste les fichiers de l'APK et échoue si elle y trouve un PDF de livre, un identifiant ou une clé i18n de contenu non `LIBRE`, une donnée de matière Exetat protégée ou une clé privée.

### CA-02 — Démarrage hors ligne

En mode avion, l'application s'ouvre, affiche les contenus `LIBRE` et le contenu premium couvert par un bail valide.

### CA-03 — Dépendance au serveur

Un appareil sans bail valide n'ouvre aucun contenu non `LIBRE`, même après réinstallation ou effacement des données de l'application.

### CA-04 — Fin d'abonnement

Un élève dont le droit a expiré retrouve, à la reconnexion, les contenus premium fermés, la progression intacte et le message d'ACCES-05.

### CA-05 — Mise à jour obligatoire

Après relèvement de la version minimale sur le serveur, une ancienne version affiche « Mise à jour obligatoire » en ligne, et n'obtient plus ni bail ni contenu non `LIBRE`. Les contenus `LIBRE` restent ouverts.

### CA-06 — Secrets protégés

Le jeton et la clé de cache sont dans le Keystore. Aucun secret n'est dans les fichiers de l'APK ni dans le dépôt, clé de signature comprise.

### CA-07 — CORS strict

Le backend de Mbuyamba accepte l'origine web et l'origine de l'application, et refuse une origine inconnue. Un test le démontre.

### CA-08 — Validation sur appareil réel

Une liste de vérification manuelle est déroulée sur au moins un téléphone Android d'entrée de gamme, et son résultat est joint à la PR : installation, démarrage hors ligne, connexion, contenu premium, téléchargement hors ligne, expiration du bail, déconnexion, jeux en paysage.

### CA-09 — Qualité technique

La CI construit un APK de test. Le code d'adaptation à la plateforme (stockage sécurisé, version, configuration) est couvert par des tests unitaires.

Conformément aux règles d'équipe, aucun emoji n'est introduit dans le code et tout nouveau code est testé.

```text
npm run lint
npm run test
npm run build
./gradlew test
./gradlew bootJar
```

## Hors périmètre

- publication sur le Play Store et fiche de l'application (D8, action du Capitaine) ;
- iOS ;
- attestation d'intégrité de l'appareil (Play Integrity) ;
- mises à jour du code à chaud ;
- notifications.

## Consignes de réalisation

Avant de commencer :

1. vérifier qu'ACCES-04, 06, 07, 08 et 10 sont fusionnés, que D7 et D8 sont tranchées, et que le prérequis CORS de Takibo est levé ;
2. synchroniser `main` avec `origin/main` ;
3. créer la branche dédiée depuis ce `main` à jour.

À la fin, lorsque tous les critères sont satisfaits et les tests sont verts :

1. déplacer le récit vers `Terminé/` en ajoutant `TERMINÉ` à son nom ;
2. mettre à jour son statut dans l'index du lot ;
3. ouvrir une PR consacrée uniquement à ce récit. Revue de Crochet, fusion par le Capitaine Pi.

## Définition de terminé

Le récit est terminé lorsqu'une application Android installable démarre sans réseau, ne contient que le code et les contenus libres, garde ses secrets dans le Keystore, n'ouvre le premium qu'avec un bail signé par le serveur, se ferme au premium quand l'abonnement expire, peut être forcée à la mise à jour par le serveur, a été vérifiée sur un appareil réel, et que la CI est verte.
