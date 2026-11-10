# Audit pédagogique de la PR #65 — parcours de 3e primaire, unités 2 à 10

## Statut et périmètre

- Document d'analyse en lecture seule. Aucun code de production n'est modifié par ce document.
- Objet : les 36 leçons et les 9 évaluations ajoutées par la PR #65 (`feature/react-cours-3p-02-10-parcours-complet`), soit les unités 2 à 10 du cours `MATH-3P`.
- Les références de fichiers renvoient à cette branche (`frontend/src/courses/primary-three/…`). Les identifiants d'exercice (`u06l02-manipulate`, `u08eval-q3`…) sont ceux des fichiers `content/unit-XX.ts`.
- Les chiffres ci-dessous sont comptés sur les définitions de contenu, pas estimés.
- Critère de lecture : la philosophie du portail, « Je découvre les mathématiques autour de moi » — vivre une situation utile, comprendre par l'observation et la manipulation, réutiliser dans une situation différente.

## 1. Verdict

La PR #65 apporte une **base technique réutilisable** (moteur piloté par les données, répartiteur d'exercices, parité français/anglais testée, neuf widgets). Elle n'apporte pas encore l'**expérience d'apprentissage** visée.

Le parcours se comporte comme un questionnaire illustré : chaque leçon enchaîne neuf écrans indépendants, dont quatre se lisent seulement, et dont la majorité des activités sont une saisie de nombre ou un choix parmi des propositions. La situation de départ, une phrase, n'est pas reprise par les écrans suivants.

Ce constat porte sur la conception du contenu, pas sur la qualité du code : les tests, le typage et le rendu mobile sont corrects. Un build vert ne prouve pas la qualité pédagogique, et cette PR ne doit pas être présentée comme telle.

## 2. Mesures

### 2.1 Nature des 180 activités de leçon (36 leçons × 5 activités)

Les cinq activités d'une leçon sont `manipulate`, `practice`, `reflect`, `play`, `check`.

| Nature de l'activité | Nombre | Part |
| --- | ---: | ---: |
| Réponse numérique saisie au clavier | 81 | 45 % |
| Choix parmi des propositions (QCM texte ou nombres) | 60 | 33 % |
| Opération posée : saisie des chiffres du résultat | 15 | 8 % |
| Manipulation d'objets (voir détail ci-dessous) | 24 | 13 % |

Manipulations d'objets comptées : valeur de position (2), groupes égaux (4), partage (4), monnaie (5), bande de fractions (2), horloge (2), plan quadrillé (2), remise en ordre d'étapes (3).

Seules **14 des 36 activités `manipulate`** et **10 des 36 activités `play`** sont de vraies manipulations. Le « Mini-jeu » est donc, dans 26 leçons sur 36, une question numérique ou un QCM sous un autre titre (exemples : `u08l02-play`, `u10l03-play` « Ouvre la bonne porte », `u07l02-play` « Équilibre la balance »).

### 2.2 Les 36 questions d'évaluation (unités 2 à 10)

| Nature | Nombre |
| --- | ---: |
| Réponse numérique saisie | 23 |
| QCM | 13 |
| Manipulation | **0** |

Les unités 3, 4 et 2 ne contiennent que des calculs saisis ; les unités 8 et 9 ne contiennent que des QCM. Aucune évaluation ne demande de fabriquer, de répartir, de payer, de mesurer ou de reconstituer un raisonnement. La capacité à réutiliser une compétence dans une situation nouvelle n'est donc pas évaluée.

### 2.3 Étapes passives

Quatre étapes sur neuf se lisent sans action mathématique : situation de départ, « Je découvre », « Exemple guidé », « Je retiens ». Elles représentent 44 % du temps de leçon.

### 2.4 Répartition par unité

| Unité | Numérique saisi | QCM | Opération posée | Manipulation d'objets | Évaluation |
| --- | ---: | ---: | ---: | ---: | --- |
| 2 Additionner | 7 | 6 | 6 | 1 | 4 numériques |
| 3 Soustraire | 9 | 4 | 6 | 1 | 4 numériques |
| 4 Multiplier, partager | 7 | 4 | 3 | 6 | 4 numériques |
| 5 Fractions | 7 | 9 | 0 | 4 | 3 numériques, 1 QCM |
| 6 Monnaie | 11 | 4 | 0 | 5 | 3 numériques, 1 QCM |
| 7 Mesures | 12 | 8 | 0 | **0** | 3 numériques, 1 QCM |
| 8 Géométrie | 5 | 13 | 0 | 2 | 4 QCM |
| 9 Temps | 12 | 4 | 0 | 4 | 4 QCM |
| 10 Données, problèmes | 11 | 8 | 0 | 1 | 2 numériques, 2 QCM |

## 3. Limites pédagogiques transversales

### L1 — La situation n'est qu'un habillage, jamais un fil conducteur

La situation de départ est une phrase (`content.uXXlYY.situation`). Les cinq activités suivantes ne la reprennent pas : les nombres, les objets et les personnages changent à chaque écran.

Exemple, unité 6, leçon 2 « Prix total » :

- situation : un cahier à 750 FC et un crayon à 250 FC ;
- `u06l02-practice` : 850 FC + 650 FC, sans objet ni article ;
- `u06l02-reflect` : deux achats totalisent 2 300 FC, l'un vaut 900 FC ;
- `u06l02-play` : 3 articles à 400 FC et 1 à 250 FC ;
- `u06l02-check` : 3 articles à 400 FC.

L'enfant ne rencontre jamais le cahier ni le crayon. Quatre des cinq activités de cette leçon sont des réponses numériques saisies.

### L2 — Aucun état partagé : chaque activité repart de zéro

Le répartiteur `InteractiveExercise` remet à zéro l'état d'un widget d'un exercice à l'autre (correction faite dans la PR). C'est correct pour des exercices indépendants, mais le modèle de contenu (`LessonContent`) ne sait exprimer ni scène, ni état partagé, ni conséquence d'une action. Une vente, un paiement ou un partage ne laissent aucune trace dans l'écran suivant.

### L3 — L'« Exemple guidé » n'est pas un exemple guidé

`blocks/GuidedExample.tsx` affiche, pour les 36 leçons :

- la même méthode en cinq phrases génériques (« Je représente les données… ») ;
- trois consignes « Facile / Intermédiaire / Réflexion » sous forme de texte, par exemple « 145 + 20 = __ », **sans champ de réponse** et sans démonstration.

L'étape ne montre aucun raisonnement résolu et n'invite pas à compléter une étape. C'est la principale occasion manquée du niveau « Je comprends » (lien entre l'objet manipulé et sa représentation mathématique).

### L4 — Les manipulations sont souvent des réglages de nombres

- `exercises/ShareTokens.tsx` : l'enfant règle deux compteurs (« dans chaque bol », « il reste »). Il ne déplace aucun jeton, donc ne découvre pas le partage.
- `exercises/EqualGroupsBuilder.tsx` : deux compteurs produisent un dessin de groupes ; le dessin illustre la réponse plutôt qu'il ne la fait trouver.
- `exercises/MoneyBuilder.tsx` : un compteur par valeur de carte (`NumericStepper`). Aucune carte n'est visible ni déplaçable ; la caisse, le porte-monnaie et le comptoir n'existent pas.
- `exercises/ClockSetter.tsx` : deux compteurs d'heures et de minutes pilotent l'horloge ; les aiguilles ne se manipulent pas.
- `exercises/ColumnCalc.tsx` : l'enfant tape les chiffres du résultat. L'échange « dix unités contre une dizaine » (leçons 3 des unités 2 et 3) n'est ni montré ni manipulé, alors que le référentiel demande de « réaliser les échanges ».

### L5 — L'accompagnement de Yamba est constant et générique

Yamba apparaît deux fois par leçon (`yamba.lessonTip` à la première étape, `yamba.lessonComplete` à la fin), avec des messages identiques pour les 40 leçons. Elle n'introduit pas la mission, ne commente pas une erreur, ne félicite pas un raisonnement précis.

### L6 — Les aides sont deux phrases fixes

`exercises/use-attempts.ts` offre deux niveaux : `hint` à la première erreur, `strongHint` ensuite. Le second niveau est une phrase qui contient souvent la réponse (« 12 − 7 = 5 »). Il n'existe ni invitation à observer, ni indice ciblé progressif, ni démonstration suivie d'un nouvel essai.

### L7 — Aucune distinction entre réussite autonome et réussite guidée

`LearningItemProgress` (`course-engine/course-progress.ts`) ne retient que `completedStepIds` et `completed`. Une étape réussie du premier coup et une étape réussie après deux aides sont indiscernables. Rien ne permet de savoir si une compétence est acquise ou seulement accompagnée.

### L8 — Les évaluations vérifient le calcul, pas la compétence

Voir §2.2. Elles ne distinguent ni la compréhension de la situation, ni le choix de stratégie, ni la manipulation, ni la vérification, ni le transfert.

### L9 — La variété de situations est faible

Les contextes sont des phrases de remplissage (« une équipe récolte des bouchons », « un dépôt reçoit des sacs »). Les lieux de vie prévus par la vision du projet (marché, maison, école, jardin, terrain de football, voyage, fête, chantier) sont absents ou réduits à un mot. Aucun personnage récurrent.

### L10 — Aucun défi ni transfert construit

Le « défi » (niveau 5) et la « réutilisation » (niveau 6) de la progression souhaitée n'existent pas comme étapes : `check` est une dernière question de la même forme que `practice`.

## 4. Synthèse par unité

Pour chaque unité : situations proposées, ce qui est réellement interactif, ce qui est un calcul isolé ou un QCM, possibilités de continuité narrative, faiblesse de progression. Fichier : `content/unit-0X.ts`.

### Unité 2 — Additionner avec précision (`unit-02.ts`)

- **Situations.** 120 + 35 bouchons ; 243 et 516 cahiers ; 278 + 156 sacs ; 356 + 128 livres.
- **Réellement interactif.** `u02l01-manipulate` (valeur de position, 276).
- **Calculs isolés / saisie.** 7 réponses numériques ; 6 opérations posées (`u02l02-*`, `u02l03-*`) où l'on tape des chiffres.
- **QCM.** 6, dont `u02l02-reflect` (alignement des rangs) et `u02l04-play` (informations utiles).
- **Continuité possible.** Un dépôt, un stock ou une bibliothèque dont la quantité évolue au fil des arrivées (additions) ; le stock devient l'état partagé.
- **Faiblesse.** La retenue n'est jamais manipulée (aucun échange visible). La leçon 4 (problèmes) n'a aucune manipulation : `u02l04-manipulate` est un QCM sur un « schéma en barres » non dessiné.

### Unité 3 — Soustraire et comparer (`unit-03.ts`)

- **Situations.** 460 graines utilisées ; 758 cahiers distribués ; retirer 47 de 132 ; écart de points entre deux équipes.
- **Réellement interactif.** `u03l01-manipulate` (valeur de position).
- **Calculs isolés.** 9 réponses numériques, 6 opérations posées.
- **QCM.** 4.
- **Continuité possible.** Le stock de l'unité 2 : ventes, distributions, commandes impossibles, écart entre quantité disponible et quantité demandée. C'est le terrain naturel des scènes 2 et 3 de l'exemple « mangues du marché ».
- **Faiblesse.** L'échange de la soustraction (`u03l03-*`) est saisi, jamais montré. La leçon 4 (« écart, nombre manquant ») est entièrement numérique alors que la ligne numérique est le bon outil.

### Unité 4 — Multiplier et partager (`unit-04.ts`)

- **Situations.** Bancs de 2 places ; plates-bandes de 3 plants ; 3 classes × 124 feuilles ; 24 fruits entre 4 paniers.
- **Réellement interactif.** Groupes égaux (4 : `u04l01-*`, `u04l02-*`), partage (2 : `u04l04-manipulate`, `u04l04-play`).
- **Limite de ces manipulations.** Réglage de compteurs, pas de déplacement d'objets (voir L4).
- **QCM.** 4. **Saisie.** 7, plus 3 opérations posées.
- **Continuité possible.** La répartition de 24 mangues dans 4 paniers est exactement la scène 1 de l'exemple de référence ; elle prolonge de façon naturelle l'unité 3 (vente) et l'unité 10 (problèmes).
- **Faiblesse.** Le sens du reste (`u04l04-reflect`, 23 objets en groupes de 5) est une question numérique ; le partage et le groupement ne sont pas distingués par une manipulation.

### Unité 5 — Fractions de la vie quotidienne (`unit-05.ts`)

- **Situations.** Galette entre quatre enfants ; panier de 12 fruits en 3 groupes ; deux galettes 1/2 et 1/4 ; moitié de 18 élèves.
- **Réellement interactif.** Bande à colorier (`u05l01-manipulate`, `u05l02-manipulate`), partage de jetons (`u05l04-*`).
- **QCM.** 9 sur 20, soit 45 % de l'unité, dont la comparaison de fractions (`u05l03-*`) : l'enfant lit deux bandes dessinées et choisit, au lieu de les superposer ou de les plier.
- **Continuité possible.** Partage d'une galette ou d'un panier, avec comparaison des parts obtenues.
- **Faiblesse.** Aucune manipulation de pièces égales ni de comparaison de touts de tailles différentes (`u05l03-reflect` est un QCM).

### Unité 6 — Monnaie et achats réfléchis (`unit-06.ts`) — cible de la leçon pilote

- **Situations.** Former 2 000 FC ; cahier 750 FC + crayon 250 FC ; achat de 2 650 FC payé 3 000 FC ; famille et budget de 5 000 FC.
- **Réellement interactif.** 5 activités de monnaie (`u06l01-manipulate`, `u06l01-play`, `u06l03-manipulate`, `u06l03-play`, `u06l04-play`), toutes via des compteurs par valeur de carte, sans carte visible.
- **Saisie.** 11 sur 20 (55 %). La leçon 2 « Prix total » est **entièrement numérique** (5 activités).
- **QCM.** 4 (`u06l04-manipulate` : comparer deux paniers par un choix ; `u06l01-reflect`, `u06l04-reflect`, `u06l04-check`).
- **Continuité possible.** Très forte : un porte-monnaie, un étal avec prix, un panier, une caisse qui rend la monnaie, un budget. C'est l'unité où l'état partagé a le plus de sens.
- **Faiblesse.** Le rendu de monnaie (`u06l03-practice`) est une soustraction saisie ; ni la caisse ni les cartes rendues n'existent ; on n'apprend pas qu'une caisse peut manquer de petites coupures.

### Unité 7 — Mesures utiles (`unit-07.ts`)

- **Situations.** Cahier, cour, distance entre villages ; balance de 500 g et 1 kg ; récipients d'eau ; clôture d'un jardin.
- **Réellement interactif.** **Aucune activité** (0 sur 20) : ni règle à poser, ni balance à équilibrer, ni récipient à remplir. L'illustration de règle et de rectangle est statique.
- **Saisie.** 12. **QCM.** 8.
- **Continuité possible.** Un chantier ou un jardin à clôturer : mesurer, choisir l'unité, calculer le périmètre, acheter la longueur de clôture (lien avec l'unité 6).
- **Faiblesse.** On mesure sans instrument. Le « Mini-jeu » « Équilibre la balance » (`u07l02-play`) est un QCM.

### Unité 8 — Géométrie et repérage (`unit-08.ts`)

- **Situations.** Plan de quartier ; coins d'un cahier ; boîtes, balles, boîtes cylindriques ; plan quadrillé.
- **Réellement interactif.** Déplacement sur quadrillage (`u08l04-manipulate`, `u08l04-play`).
- **QCM.** 13 sur 20 (65 %) et **4 questions d'évaluation sur 4**.
- **Continuité possible.** Un itinéraire du village au marché puis au point d'eau, un jardin à tracer, une boîte à construire à partir de son patron.
- **Faiblesse.** On reconnaît des figures dessinées au lieu de les tracer ou de les assembler ; le référentiel demande « trace des segments avec une règle » et « déplie une boîte ». Les angles droits se « vérifient » par QCM, pas avec une équerre à poser.

### Unité 9 — Temps et organisation (`unit-09.ts`)

- **Situations.** Une activité à 8 h 15 ; trajet de 7 h 30 à 8 h 15 ; activité pour le 18 du mois ; journée d'école.
- **Réellement interactif.** Horloge (`u09l01-manipulate`, `u09l01-play`), mise en ordre d'un horaire (`u09l04-*`).
- **Saisie.** 12 sur 20 ; les durées (`u09l02-*`) et le calendrier (`u09l03-*`) sont des soustractions saisies. **Évaluation : 4 QCM sur 4.**
- **Continuité possible.** Une journée d'école ou un voyage, avec une ligne du temps sur laquelle les durées s'additionnent.
- **Faiblesse.** Aucune ligne du temps manipulable ; le calendrier n'est pas affiché.

### Unité 10 — Données et problèmes (`unit-10.ts`)

- **Situations.** Sondage sur les fruits préférés ; récolte puis distribution ; choix d'opération ; création de défis.
- **Réellement interactif.** `u10l04-manipulate` (mise en ordre d'une histoire).
- **Saisie.** 11 ; **QCM** 8. Le tableau et le pictogramme sont des illustrations statiques, aucune donnée n'est collectée par l'enfant.
- **Continuité possible.** Les problèmes en deux étapes (`u10l02-*`) sont l'application directe du suivi d'un stock à plusieurs transactions : c'est le défi final de l'exemple de référence.
- **Faiblesse.** Les problèmes sont des énoncés calculés sans objets à suivre ; la leçon 3 « Choisir l'opération » demande de choisir parmi quatre étiquettes, sans qu'on voie l'action (réunir, retirer, grouper, partager).

## 5. Ce qui est réutilisable

### Dans la PR #65

| Élément | Intérêt pour la refonte |
| --- | --- |
| Registre de contenu piloté par les données (`content/index.ts`, `LessonContent`) | À préserver : pas de page par leçon. |
| `InteractiveExercise` (clé par exercice) | Point d'extension : on peut y brancher un type « scène » sans changer la page. |
| `ActivityShell`, `use-attempts` | Aide à deux niveaux : base du système à trois niveaux. |
| `ExerciseVisual` (tableau, pictogramme, bandes, horloge, règle, rectangle, solides) | Illustrations sans texte en dur, accessibles. |
| `ClockSetter`, `FractionShade`, `GridRoute`, `StepOrder`, `TextChoice` | Utilisables tels quels pour les situations qui s'y prêtent. |
| Test d'intégrité (`content-integrity.test.ts`) | Vérifie les clés FR/EN et la faisabilité des exercices ; à étendre aux scénarios. |

### Ailleurs dans le dépôt (2e primaire, `courses/primary-two/interactive/`)

| Élément | Intérêt |
| --- | --- |
| `visuals.tsx` : `ItemGlyph` (mangue, banane, bouteille, cahier, tomate, noix, craie…), `MoneyPiece` (pièces et billets en FC), `ProductGlyph` (crayon, gomme, cahier, ballon, pain, savon, jus, livre), `ClockFace`, `GridFigure`, `VisualView` | Représentation d'objets comptables sans image externe ; couvre les objets des histoires envisagées. |
| `logic.ts` (`distributeShares`, `distributionIsFair`, `collectIsCorrect`, `shuffle`) | Modèle à reprendre : **logique mathématique pure, testée, séparée du rendu**. |
| `activities.tsx` : `DistributeBody`, `CollectBody`, `OrderBody` | Distribution objet par objet, collecte sous contraintes, remise en ordre avec message d'erreur ciblé (`firstOrderMistake`). |
| Modèle `Check` / `register` / `touch` | Validation déclarative et retour spécifique par erreur. |

Ces composants prouvent que le projet sait déjà faire des manipulations d'objets ; l'effort de la refonte porte sur la continuité, l'état et l'accompagnement.

## 6. Priorités qui découlent de l'audit

1. **Une histoire à état partagé** par unité, exprimée en données (scènes, objets, règles), pas une page par leçon.
2. **Manipuler des objets** (déplacer, répartir, payer) plutôt que régler des compteurs ou saisir des nombres.
3. **Un exemple guidé réel** : démonstration par Yamba, puis étape à compléter par l'enfant.
4. **Des aides en trois niveaux** (observer, indice ciblé, démonstration puis nouvel essai) et une distinction réussite autonome / guidée, conservée en mémoire de session uniquement.
5. **Des évaluations par situations**, avec un transfert dans un contexte nouveau et sans aide de niveau 3.
6. **Commencer par l'unité 6** : continuité naturelle, objets déjà disponibles, peu de dépendances.
7. **Ne pas convertir en masse** : une unité à la fois, chacune avec sa spécificité (voir le plan).

## 7. Ce que cet audit ne dit pas

- Il ne juge pas l'exactitude mathématique des énoncés : les valeurs, les corrigés et les tests de faisabilité sont couverts par le test d'intégrité de la PR.
- Il ne remplace pas une validation par un enseignant de 3e primaire, que le référentiel exige avant toute publication officielle.
- Il ne propose aucune fusion : la PR #65 reste ouverte tant que la direction du projet n'a pas décidé de son sort (voir `04-plan-de-realisation.md`, décision D0).
