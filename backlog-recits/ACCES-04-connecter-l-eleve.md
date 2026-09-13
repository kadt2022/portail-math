# ACCES-04 — Connecter l'élève dans le portail

**Lot :** [LOT-ACCES — Web et Android sous contrôle du serveur](LOT-ACCES-web-android-sous-controle.md)
**Statut :** PROPOSITION — relecture de Crochet, validation du Capitaine Pi
**Branche proposée :** `feat/acces-04-connexion-eleve`
**Dépend de :** ACCES-03. Décisions D5 et D6. Prérequis côté Takibo : voir ci-dessous.

## Contexte

Le portail n'a aucun écran de connexion : tout le monde navigue de façon anonyme. Depuis ACCES-03, le backend sait reconnaître un jeton Takibo, mais l'élève n'a encore aucun moyen d'en obtenir un.

Côté Takibo :

- `POST /api/v1/auth/login` est public (`SecurityConfig` de `takibo-security-management`). Au relevé du 2026-08-25, la connexion se fait par code d'organisation, adresse e-mail et mot de passe. **À revérifier au début du récit** ;
- `accounts.email` est obligatoire, alors qu'un enfant de 8 ans en RDC n'a pas d'adresse e-mail. C'est la décision D5 ;
- le flux cible pour une application publique est `authorization_code` + PKCE (TAS-GRANTS-04, pas encore rédigé, qui attend TAS-GRANTS-03) ;
- Takibo ne prévoit **pas de refresh token pour un client public**. Quand le jeton expire, l'élève doit se reconnecter.

**Le flux de connexion va donc changer.** Ce récit doit rendre ce changement indolore : le reste de l'application ne sait pas *comment* on obtient un jeton.

## Prérequis côté Takibo

À vérifier avant de commencer, et à porter par un récit dans Takibo-IAM si nécessaire. Aucun code de Takibo n'est modifié dans ce récit.

1. **CORS.** Takibo autorise actuellement les requêtes CORS credentialed depuis toute origine via `allowedOriginPattern("*")`. `CorsConfig` (`takibo-iam-boot`) l'applique à `/**`, sous le commentaire « En dev, on ouvre large », sans restriction de profil. Cette configuration doit être restreinte avant une exposition de production, et inclure l'origine de Mbuyamba ;
2. **Comptes élèves.** Qui crée un compte élève dans Takibo (l'école, un enseignant, le Capitaine), et avec quels identifiants (D5) ;
3. **Durée de vie** du jeton humain dans l'environnement cible, qui fixe la fréquence de reconnexion.

## User Stories

En tant qu'élève inscrit,
je veux me connecter simplement, avec des identifiants que je peux retenir,
afin d'accéder aux contenus réservés.

En tant qu'enfant qui partage un téléphone,
je veux me déconnecter en un geste,
afin que le suivant ne navigue pas avec mon compte.

En tant que visiteur,
je veux continuer à utiliser les contenus libres sans compte,
afin que la connexion ne soit jamais un obstacle à la découverte.

## Périmètre

- un **port d'authentification** dans le frontend, qui expose l'état de connexion, le jeton, la connexion et la déconnexion. Première implémentation : `POST /api/v1/auth/login`. Une implémentation PKCE pourra le remplacer sans toucher aux écrans ;
- page de connexion `/app/connexion` et accès « Se connecter / Se déconnecter » dans la navigation d'`AppLayout` ;
- champs de connexion conformes à D5 ;
- ajout de l'en-tête `Authorization` aux appels vers l'API de Mbuyamba, et à eux seuls ;
- stockage du jeton conforme à D6. Proposition : en mémoire et dans `sessionStorage` sur le web, dans le Keystore sur Android (ACCES-11) ;
- jeton expiré ou refusé (`401 JETON_INVALIDE`) : retour à l'état déconnecté, message « Ta session a expiré », puis retour à la page d'origine après reconnexion ;
- adresse de Takibo configurable **sans recompiler** le frontend : configuration exposée par le backend ou injectée au déploiement ;
- textes en français et en anglais par l'i18n du portail.

Le backend de Mbuyamba ne reçoit jamais le mot de passe : le frontend l'envoie directement à Takibo.

## Critères d'acceptation

### CA-01 — Le mode anonyme ne change pas

Sans connexion, tous les contenus `LIBRE` restent accessibles exactement comme avant. Aucune fenêtre de connexion n'est imposée.

### CA-02 — Connexion réussie

Après connexion, `GET /api/v1/moi` répond `200` et l'interface affiche l'état connecté.

### CA-03 — Échec de connexion

Des identifiants faux produisent un message générique. Il ne révèle jamais lequel des champs est faux, ni si le compte existe.

### CA-04 — Jeton protégé

Le jeton n'apparaît jamais dans une URL, jamais dans `localStorage` sur le web, et n'est jamais envoyé à un autre domaine que Mbuyamba et Takibo. Des tests le vérifient.

### CA-05 — Expiration

Un `401 JETON_INVALIDE` ramène à l'état déconnecté avec le message prévu. Après reconnexion, l'élève revient sur sa page.

### CA-06 — Déconnexion

La déconnexion efface le jeton. Elle ne touche pas à la progression enregistrée sur l'appareil.

### CA-07 — Flux interchangeable

Aucun écran n'importe directement l'adresse ou le format de réponse de Takibo. Les tests d'écrans utilisent une fausse implémentation du port.

### CA-08 — Responsive et accessibilité

La page de connexion fonctionne sans débordement horizontal dès 320 px, au clavier, et avec des libellés compréhensibles par les technologies d'assistance.

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

- création de compte, inscription et mot de passe oublié ;
- flux `authorization_code` + PKCE, qui fera l'objet d'un récit de migration quand TAS-GRANTS-04 existera ;
- synchronisation de la progression (ACCES-09) ;
- stockage sécurisé Android (ACCES-11) ;
- toute modification du dépôt Takibo-IAM.

## Consignes de réalisation

Avant de commencer :

1. vérifier qu'ACCES-03 est fusionné, que D5 et D6 sont tranchées, et faire les vérifications des prérequis Takibo ;
2. synchroniser `main` avec `origin/main` ;
3. créer la branche dédiée depuis ce `main` à jour.

À la fin, lorsque tous les critères sont satisfaits et les tests sont verts :

1. déplacer le récit vers `Terminé/` en ajoutant `TERMINÉ` à son nom ;
2. mettre à jour son statut dans l'index du lot ;
3. ouvrir une PR consacrée uniquement à ce récit. Revue de Crochet, fusion par le Capitaine Pi.

## Définition de terminé

Le récit est terminé lorsqu'un élève peut se connecter avec un compte Takibo, que le portail appelle l'API de Mbuyamba avec son jeton, gère l'expiration et la déconnexion sans perdre la progression locale, que le mode anonyme reste intact pour les contenus libres, que le flux de connexion peut être remplacé sans toucher aux écrans, et que la CI est verte.
