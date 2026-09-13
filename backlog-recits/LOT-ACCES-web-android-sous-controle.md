# LOT-ACCES — Mbuyamba web et Android, sous le contrôle du serveur

**Statut :** PROPOSITION — relecture de Crochet, validation du Capitaine Pi
**Rédigé le :** 2026-09-13
**Base technique :** branche `main` (`ca39391`)

## Vision du Capitaine

Mbuyamba doit exister sur le web et sur Android. Mais **installer l'application ne doit jamais donner un accès définitif et autonome à tout Mbuyamba.**

- l'application peut être installée sur le téléphone ;
- une partie de l'expérience et de la progression reste locale, sur l'appareil ;
- certains cours, jeux ou exercices ne sont ouverts qu'aux inscrits ;
- d'autres n'ouvrent que sous condition, par exemple un abonnement actif ;
- le backend de Mbuyamba décide de ce que l'utilisateur a le droit de voir et de faire ;
- l'application fonctionne en partie hors ligne, sans devenir une copie indépendante ;
- si l'abonnement expire, les contenus concernés se ferment, même si l'application reste installée ;
- **Takibo identifie** chaque utilisateur, **Mbuyamba décide** de ses droits pédagogiques et commerciaux.

Ce lot change volontairement une orientation d'origine : le portail était sans comptes par conception, et `GRILLE-MAGIQUE-01` plaçait « compte utilisateur obligatoire » hors périmètre. Le Capitaine a décidé le 2026-08-25 que tout se contrôle au backend. Les contenus `LIBRE` restent néanmoins utilisables sans compte.

## Constat au 2026-09-13

| Élément | Situation actuelle | Récit qui corrige |
|---|---|---|
| Version Android | N'existe pas encore | ACCES-11 |
| Authentification | Aucune (`spring-boot-starter-web` et `actuator` seulement) | ACCES-03, ACCES-04 |
| Base de données | Aucune. Tentatives Exetat en mémoire | ACCES-02 |
| Niveaux d'accès | Aucun : tout est ouvert à tous | ACCES-01, ACCES-05 |
| Livres PDF (environ 29 Mo) | Publics à `/app/books/*.pdf` | ACCES-06 |
| Leçons de cours | Compilées dans le bundle servi sous `/app/` | ACCES-07 |
| Exetat | **Bon modèle** : questions sans réponses, correction serveur. Mais aucune matière fermée | ACCES-08 |
| Jeux | Publics dans `static/games` ou dans le bundle | ACCES-08 |
| Progression | Dans le `localStorage` de l'appareil : choix volontaire d'un portail sans comptes | ACCES-09, par étapes, sans supprimer le stockage local |
| **Dépôt GitHub** | **Public**. Le code peut le rester, mais les livres PDF (`frontend/public/books/`), les leçons et les réponses Exetat (`correctChoiceId` et solutions) y sont aujourd'hui versés | Décision D0 |

Aujourd'hui, le problème n'est pas Android : **le site web donne déjà tout**. Une coquille Android construite maintenant ne ferait que l'emporter dans la poche. D'où l'ordre du lot : on ferme d'abord le serveur, et l'application vient en dernier.

## Principes

1. **Le serveur décide.** L'interface informe, elle ne protège pas : masquer un bouton n'est pas une protection.
2. **Seul le `LIBRE` sort du serveur.** Rien d'autre dans le bundle, dans `static/`, dans l'APK ou dans le dépôt public.
3. **Ce qui compte se corrige sur le serveur**, comme l'Exetat.
4. **Takibo dit qui, Mbuyamba décide à quoi.** Mbuyamba ne voit jamais un mot de passe et ne recalcule pas le RBAC de Takibo.
5. **Le hors ligne est un prêt daté, jamais une possession.**
6. **Fermer un accès n'efface jamais la progression d'un enfant.**
7. **Refus par défaut** : un contenu non classé ou une route non déclarée sont refusés.

## Les quatre zones

| Zone | Contenus | Où ils vivent | Si l'abonnement expire |
|---|---|---|---|
| Libre | Vitrine : unités 1, jeux historiques, une matière Exetat (D1) | Bundle et APK | Restent ouverts |
| Inscrit ou premium | Unités suivantes, livres, jeux et matières réservés | Serveur uniquement, livrés après décision | Fermés |
| Hors ligne | Copie chiffrée de contenus premium choisis | Appareil, sous bail signé et daté | Illisibles à l'expiration du bail |
| Serveur seul | Correction, progression officielle, droits, baux, futurs bulletins et suivi enseignant | Backend | Plus aucun accès |

## Ordre et dépendances

| Ordre | Récit | Statut | Branche | Dépend de | Décisions |
|---:|---|---|---|---|---|
| 01 | [Classer chaque contenu](ACCES-01-classer-chaque-contenu.md) | proposé | `feat/acces-01-registre-des-contenus` | — | D1 |
| 02 | [Donner une base de données](ACCES-02-donner-une-base-de-donnees.md) | proposé | `feat/acces-02-socle-postgresql` | — | — |
| 03 | [Reconnaître les jetons Takibo](ACCES-03-reconnaitre-les-jetons-takibo.md) | proposé | `feat/acces-03-jetons-takibo` | TAS-GRANTS-02A (terminé) | — |
| 04 | [Connecter l'élève](ACCES-04-connecter-l-eleve.md) | proposé | `feat/acces-04-connexion-eleve` | 03 | D5, D6 |
| 05 | [Droits et décision centrale](ACCES-05-droits-et-decision-centrale.md) | proposé | `feat/acces-05-droits-et-decision` | 01, 02, 03 | D3, D4 |
| 06 | [Protéger les livres](ACCES-06-proteger-les-livres.md) | proposé | `feat/acces-06-livres-proteges` | 05 | D0 |
| 07 | [Servir les cours protégés par l'API](ACCES-07-servir-les-cours-proteges-par-api.md) | proposé | `feat/acces-07-cours-par-api` | 05 | D0, D1 |
| 08 | [Appliquer les droits à l'Exetat et aux jeux](ACCES-08-appliquer-les-droits-exetat-et-jeux.md) | proposé | `feat/acces-08-exetat-et-jeux` | 02, 05 | D0, D1 |
| 09 | [Progression serveur et cache local](ACCES-09-progression-serveur-et-cache-local.md) | proposé | `feat/acces-09-progression-serveur` | 02, 03, 04 | — |
| 10 | [Bail hors ligne](ACCES-10-bail-hors-ligne.md) | proposé | `feat/acces-10-bail-hors-ligne` | 05, 06, 07, 09 | D2, D9 |
| 11 | [Coquille Android](ACCES-11-coquille-android.md) | proposé | `feat/acces-11-coquille-android` | 04, 06, 07, 08, 10 | D7, D8 |

Récits qui pourraient avancer sans s'attendre :

```text
vague 1 : 01, 02, 03
vague 2 : 04, 05
vague 3 : 06, 07, 08, 09
vague 4 : 10
vague 5 : 11
```

Les vagues montrent seulement ce que les dépendances autorisent. L'équipage reste libre de réaliser les récits un par un.

## Décisions du Capitaine

Aucune de ces décisions n'est prise par ce lot. La colonne de droite est remplie par le Capitaine Pi.

| | Question | Proposition | Récits | Décision du Capitaine |
|---|---|---|---|---|
| D0 | Quelle partie de Portail-Math reste publique, et où sont désormais stockés les contenus protégés ? | Le code de l'application reste public. Les contenus commerciaux ou protégés sortent du dépôt vers un stockage hors dépôt, dont la nature reste à choisir. Voir le schéma ci-dessous | 06, 07, 08 | |
| D1 | Quel contenu est libre, inscrit ou premium ? | Table de proposition dans ACCES-01 | 01, 07, 08 | |
| D2 | Durée d'un bail hors ligne ? | 14 jours | 10 | |
| D3 | À qui s'attache un abonnement ? | À l'élève ou à l'organisation. Pilote par école | 05 | |
| D4 | Qui accorde un droit pendant le pilote ? | Le Capitaine, par une procédure SQL documentée et historisée | 05 | |
| D5 | Comment un enfant sans e-mail se connecte-t-il, et qui crée son compte ? | Identifiant synthétique par école et code secret (proposé le 2026-08-25, non tranché). Comptes créés par l'école | 04 | |
| D6 | Où garder le jeton ? | Web : mémoire et `sessionStorage`. Android : Keystore. Chemin court `POST /api/v1/auth/login` jusqu'à TAS-GRANTS-04 | 04 | |
| D7 | Quelle coquille Android ? | Capacitor | 11 | |
| D8 | Comment distribuer l'application ? | APK direct pour le pilote, Play Store ensuite | 11 | |
| D9 | Combien d'appareils par élève ? | 2 appareils actifs | 10 | |

### D0 : séparer le code public du contenu protégé

La question n'est pas seulement « dépôt public ou privé ». Le moteur peut rester public, les contenus premium doivent sortir du dépôt public.

```text
Dépôt public portail-math
├── moteur React
├── composants
├── jeux libres
├── code Spring Boot
└── contenu de démonstration

Hors dépôt public
├── livres premium
├── cours premium
├── banques Exetat protégées
├── solutions protégées
└── futurs contenus commerciaux
```

Sortir un contenu du dépôt protège ses versions futures. Les versions déjà publiées restent dans l'historique Git. Les nettoyer, ou rendre le dépôt privé, sont des actions distinctes du Capitaine.

## Prérequis côté Takibo-IAM

Ils ne se réalisent pas dans ce dépôt. Chacun fait l'objet d'un récit dans Takibo-IAM si la vérification le demande.

- **CORS** : Takibo autorise actuellement les requêtes CORS credentialed depuis toute origine via `allowedOriginPattern("*")` (`CorsConfig` de `takibo-iam-boot`, appliqué à `/**`). Cette configuration doit être restreinte avant une exposition de production, et inclure les origines de Mbuyamba (web et Android). Requis par ACCES-04 et ACCES-11 ;
- **destinataire du jeton** : pouvoir distinguer un jeton émis pour Mbuyamba d'un jeton émis pour une autre application. À vérifier en ACCES-03 ;
- **comptes élèves** : identifiants sans e-mail (D5) ;
- **flux cible** : `authorization_code` + PKCE (TAS-GRANTS-04, à rédiger).

## Ce que ce lot n'empêche pas

À dire honnêtement, et à ne jamais promettre :

- une personne compétente, avec un téléphone rooté, peut extraire le contenu premium qu'elle a légitimement téléchargé, pendant la durée de son bail ;
- les captures d'écran et les photos de pages ;
- ce qui a déjà été publié dans le dépôt GitHub public ;
- le code d'un jeu déjà chargé par un élève autorisé.

L'objectif n'est pas une copie impossible. C'est que **tout ce qui a une valeur durable dépende du serveur** : les nouveaux contenus, la correction, la progression officielle, le suivi et le renouvellement de l'accès.

## Suite prévue, non rédigée

- correction serveur des évaluations de cours ;
- bulletins et certificats ;
- tableau de bord enseignant ;
- paiement, dont le mobile money ;
- progression des jeux autonomes ;
- niveaux de jeux servis par l'API ;
- conversion en données des leçons de 1re et 2e ;
- filigrane nominatif des livres ;
- attestation d'intégrité de l'appareil ;
- export et suppression des données d'un élève ;
- migration de la connexion vers `authorization_code` + PKCE.

## Règles de livraison

- un récit = une branche = une PR, créée depuis un `main` à jour ;
- un récit ne démarre que lorsque ses dépendances sont fusionnées et ses décisions tranchées ;
- aucune fusion sans tests verts, revue de Crochet et validation du Capitaine Pi ;
- à la clôture, le récit passe dans `Terminé/` avec `TERMINÉ` dans son nom, et sa ligne est mise à jour dans ce tableau.
