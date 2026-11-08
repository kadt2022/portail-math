# Journal d’avancement — parcours interactif de mathématiques, 2e primaire

Branche locale : `feature/2e-primaire-parcours-complet` (créée depuis `origin/main` @ `7d3478a`, PR #61). Aucun push, aucune PR, aucune fusion, aucun déploiement.

## Point de reprise

- **Terminé par Crochet (non modifié)** : `MATH-2P-U01-L01` à `L04`, six phases chacune, dans `PrimaryTwoLessonActivities.tsx`.
- **Non commencé au départ** : évaluation U01, unités 2 à 10 (36 leçons, 9 évaluations), bilan final.
- **Limite de l’inspection** : l’état a été lu sur le dépôt GitHub (`main`), pas sur le poste du Capitaine. D’éventuels fichiers locaux non commités de Crochet n’étaient pas visibles.
- **Étapes prévues** : 47 (U01-EVAL, puis L05 → L40 avec chaque évaluation d’unité dans l’ordre, puis le bilan final).
- **Étapes achevées** : 47 / 47.

## Architecture ajoutée

- `frontend/src/courses/primary-two/interactive/` : moteur d’activités piloté par données.
  - `types.ts` : modèle typé (11 types d’activités + manches).
  - `logic.ts` : règles pures (réponses acceptées, ordre, partage, monnaie, symétrie, mélange déterministe).
  - `activities.tsx` : composants ; réutilise `ActivityFrame` de Crochet (seul changement dans son fichier : `export`).
  - `visuals.tsx` : **illustrations provisoires** SVG/CSS, isolées des règles. Remplacer un glyphe par une image ne change ni les réponses ni les interactions.
  - `Interactive.module.css` : styles, cibles tactiles ≥ 44 px, colonne unique sous 420 px.
- `frontend/src/courses/primary-two/content/unit-01.ts … unit-10.ts` : données des leçons (quantités, réponses, calculs de contrôle).
- `frontend/src/i18n/locales/fr/primaryTwoLessons.json` : tous les textes (nouvel espace de traduction ; `en` vide, la page affiche déjà « contenu bientôt disponible en anglais »).
- Catalogue : un élément est publié dès que son contenu existe dans le registre `content/index.ts`. Les évaluations ont 4 questions + « Je m’évalue ». Le bilan `MATH-2P-BILAN` est rattaché au module 10 (`finalEvaluation`, champ optionnel ajouté au modèle commun).
- Progression : inchangée, toujours en mémoire de session. Les tests vérifient que `localStorage` et `sessionStorage` restent vides.

## Tests exécutés (à chaque unité, puis en fin de mission)

- `npx vitest run` : **39 fichiers, 853 tests verts** (toute l’application, avant : 38 fichiers et 70 tests pour la 2e primaire).
- `content/content.test.ts` : pour chaque leçon/évaluation, nombre d’étapes, existence de chaque texte, calculs de contrôle (`check`) recalculés, quantités des collections = nombre de la case, cartes mélangées, solutions de monnaie valides, variété des types (pas de suite de QCM).
- `PrimaryTwoInteractive.test.tsx` : parcours complet de chacun des 47 éléments par l’interface (validation à vide refusée, résolution, progression étape par étape, écran de fin).
- `interactive/activities.test.tsx` : retours ciblés, recommencer, glisser-déposer et alternative au toucher, manches.
- `npx eslint .` : 0 erreur. `npm run build` : réussi.
- Vérification visuelle (Chrome sans tête) à 320 px et 1280 px : aucun débordement horizontal (U02-L01, U04-L02, U06-L01, U07-L01, U09-L03, U10-L01, horloge, symétrie).

## Détail par leçon et évaluation

### MATH-2P-U01-EVAL — Évaluation du module

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je montre que je sais compter, trouver un voisin, comparer et ranger.
- **Activités** :
  - Question 1 : « Question 1 · Trois groupes de 5 » — construire (+/−)
  - Question 2 : « Question 2 · Le nombre qui manque » — saisie
  - Question 3 : « Question 3 · Je compare » — signes < = >
  - Question 4 : « Question 4 · Je range » — ranger
  - Je m’évalue : « Je m’évalue » — autoévaluation
- **Ressources visuelles à remplacer** : groupes / assiettes SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U02-L01 — Je fais des paquets de dix

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux échanger 10 unités contre 1 dizaine.
- **Activités** :
  - Je découvre : « Les bâtonnets du marché » — saisie
  - Je manipule : « Je range 26 graines » — construire (+/−)
  - Je comprends : « Dix unités, une dizaine » — choix raisonné
  - Je m’entraîne : « Dizaines et unités » — saisie
  - Je joue : « Le jeu des fagots » — construire (+/−) (3 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : fagots et bâtonnets CSS, objets comptables SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U02-L02 — Je lis et j'écris jusqu'à 69

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux relier écriture, parole et matériel jusqu’à 69.
- **Activités** :
  - Je découvre : « La boîte de craies » — saisie
  - Je manipule : « Je montre 52 » — construire (+/−)
  - Je comprends : « La valeur des chiffres » — choix raisonné
  - Je m’entraîne : « Lire et décomposer » — saisie
  - Je joue : « Le bon nombre pour chaque boîte » — associer/classer
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : fagots et bâtonnets CSS.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U02-L03 — Les nombres de 70 à 100

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux former et décomposer les grands nombres de l’année, de 70 à 100.
- **Activités** :
  - Je découvre : « Les sacs de graines » — saisie
  - Je manipule : « Je montre 94 » — construire (+/−)
  - Je comprends : « Cent » — choix raisonné
  - Je m’entraîne : « Jusqu’à 100 » — saisie
  - Je joue : « Le grenier » — construire (+/−) (3 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : fagots et bâtonnets CSS.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U02-L04 — Je compare jusqu'à 100

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux comparer les nombres jusqu’à 100 selon la valeur des chiffres.
- **Activités** :
  - Je découvre : « Quelle équipe en a le plus ? » — choix raisonné
  - Je manipule : « 46 et 49 » — signes < = >
  - Je comprends : « Ma méthode » — choix raisonné
  - Je m’entraîne : « Comparer et chercher » — signes < = >, saisie (2 manches)
  - Je joue : « La course des coureurs » — ranger
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : fagots et bâtonnets CSS.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U02-EVAL — Évaluation du module

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je montre que je sais construire les nombres avec des dizaines et des unités.
- **Activités** :
  - Question 1 : « Question 1 · Des dizaines » — saisie
  - Question 2 : « Question 2 · Je décompose 64 » — saisie
  - Question 3 : « Question 3 · Je décompose 97 » — saisie
  - Question 4 : « Question 4 · Je range » — ranger
  - Je m’évalue : « Je m’évalue » — autoévaluation
- **Ressources visuelles à remplacer** : aucune.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U03-L01 — J'ajoute des unités

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux additionner sans former une nouvelle dizaine.
- **Activités** :
  - Je découvre : « Les tomates de la vendeuse » — saisie
  - Je manipule : « J’ajoute 4 unités à 34 » — construire (+/−)
  - Je comprends : « Qu’est-ce qui change ? » — choix raisonné
  - Je m’entraîne : « Je calcule » — saisie
  - Je joue : « Les wagons du train » — associer/classer
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : fagots et bâtonnets CSS, objets comptables SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U03-L02 — Je complète jusqu'à la dizaine

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux utiliser les compléments à 10.
- **Activités** :
  - Je découvre : « Le panier de mangues » — construire (+/−)
  - Je manipule : « Je complète 7 » — construire (+/−)
  - Je comprends : « Combien manque-t-il ? » — choix raisonné
  - Je m’entraîne : « Compléments » — saisie
  - Je joue : « Ferme les cadres de dix » — construire (+/−) (3 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : cadre de dix CSS.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U03-L03 — Je passe une dizaine

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux additionner en regroupant 10 unités.
- **Activités** :
  - Je découvre : « Je passe par 30 » — saisie
  - Je manipule : « 16 + 7 avec un échange » — construire (+/−)
  - Je comprends : « 48 + 6 en passant par 50 » — choix raisonné
  - Je m’entraîne : « Je calcule » — saisie
  - Je joue : « L’échange des dix » — associer/classer
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : fagots et bâtonnets CSS, ligne numérique SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U03-L04 — J'additionne deux nombres

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux additionner deux nombres : les dizaines, puis les unités.
- **Activités** :
  - Je découvre : « Les cahiers des deux classes » — saisie
  - Je manipule : « Je réunis 23 et 35 » — construire (+/−)
  - Je comprends : « Dans quel ordre ? » — ranger
  - Je m’entraîne : « Je calcule » — saisie
  - Je joue : « Les deux convois » — associer/classer
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : fagots et bâtonnets CSS.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U03-EVAL — Évaluation du module

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je montre que je sais calculer des sommes et choisir une méthode.
- **Activités** :
  - Question 1 : « Question 1 » — saisie
  - Question 2 : « Question 2 » — construire (+/−)
  - Question 3 : « Question 3 » — saisie
  - Question 4 : « Question 4 » — saisie
  - Je m’évalue : « Je m’évalue » — autoévaluation
- **Ressources visuelles à remplacer** : cadre de dix CSS.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U04-L01 — J'enlève des unités

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux soustraire sans casser une dizaine.
- **Activités** :
  - Je découvre : « La boîte de craies » — saisie
  - Je manipule : « Je retire 5 unités de 47 » — construire (+/−)
  - Je comprends : « Où est-ce que j’enlève ? » — choix raisonné
  - Je m’entraîne : « Je calcule » — saisie
  - Je joue : « Le magasin » — saisie (3 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : fagots et bâtonnets CSS.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U04-L02 — Je recule jusqu'à la dizaine

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux soustraire en passant par un nombre rond.
- **Activités** :
  - Je découvre : « Kito recule sur la ligne » — saisie
  - Je manipule : « 41 − 6 en deux bonds » — construire (+/−)
  - Je comprends : « 64 − 8 en passant par 60 » — choix raisonné
  - Je m’entraîne : « Je calcule » — saisie
  - Je joue : « Le pion qui recule » — construire (+/−) (3 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : bonds sur ligne SVG, ligne numérique SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U04-L03 — Je soustrais des dizaines

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux retirer des groupes de dix.
- **Activités** :
  - Je découvre : « Le dépôt » — saisie
  - Je manipule : « Je retire 2 fagots » — construire (+/−)
  - Je comprends : « Qu’est-ce qui change ? » — choix raisonné
  - Je m’entraîne : « Je calcule » — saisie
  - Je joue : « Le camion de fagots » — construire (+/−) (3 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : fagots et bâtonnets CSS.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U04-L04 — Je cherche la différence

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux comparer deux quantités par soustraction.
- **Activités** :
  - Je découvre : « L’écart entre les équipes » — saisie
  - Je manipule : « Les jetons sans partenaire » — saisie
  - Je comprends : « Trouver la différence » — choix raisonné
  - Je m’entraîne : « Je calcule » — saisie
  - Je joue : « Égalise les paniers » — construire (+/−) (3 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : groupes / assiettes SVG, ligne numérique SVG, paniers SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U04-EVAL — Évaluation du module

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je montre que je sais résoudre des retraits, des écarts et des compléments.
- **Activités** :
  - Question 1 : « Question 1 » — saisie
  - Question 2 : « Question 2 » — saisie
  - Question 3 : « Question 3 » — saisie
  - Question 4 : « Question 4 » — saisie
  - Je m’évalue : « Je m’évalue » — autoévaluation
- **Ressources visuelles à remplacer** : aucune.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U05-L01 — Je forme des groupes égaux

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux reconnaître des collections régulières : des groupes égaux.
- **Activités** :
  - Je découvre : « Les assiettes de beignets » — saisie
  - Je manipule : « Je fais 4 groupes de 3 » — construire (+/−)
  - Je comprends : « Groupes égaux ou non ? » — choix raisonné
  - Je m’entraîne : « Je m’entraîne » — saisie, choix raisonné (2 manches)
  - Je joue : « Les assiettes de la fête » — distribuer
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : groupes / assiettes SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U05-L02 — Je lis une multiplication

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux utiliser le signe × pour des groupes égaux.
- **Activités** :
  - Je découvre : « Les rangées du jardin » — saisie
  - Je manipule : « Je représente 3 × 4 » — construire (+/−)
  - Je comprends : « Que veut dire × ? » — choix raisonné
  - Je m’entraîne : « Je calcule » — saisie
  - Je joue : « Le jardinier » — construire (+/−) (3 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : groupes / assiettes SVG, rangées SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U05-L03 — Doubles et table de 2

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux calculer deux fois une quantité : le double.
- **Activités** :
  - Je découvre : « Deux craies par enfant » — saisie
  - Je manipule : « Deux rangées de 7 » — construire (+/−)
  - Je comprends : « Le double » — choix raisonné
  - Je m’entraîne : « Je calcule » — saisie
  - Je joue : « Le jeu des doubles » — associer/classer
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : groupes / assiettes SVG, rangées SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U05-L04 — Groupes de 5 et de 10

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux compter rapidement par 5 et par 10.
- **Activités** :
  - Je découvre : « Les doigts des mains » — saisie
  - Je manipule : « 4 groupes de 5 » — construire (+/−)
  - Je comprends : « Je compte de 5 en 5 » — ranger
  - Je m’entraîne : « Je calcule » — saisie
  - Je joue : « Le chargement du camion » — composer (monnaie, masses, achats)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : groupes / assiettes SVG, objets comptables SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U05-EVAL — Évaluation du module

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je montre que je comprends la multiplication comme une addition répétée.
- **Activités** :
  - Question 1 : « Question 1 » — saisie
  - Question 2 : « Question 2 » — construire (+/−)
  - Question 3 : « Question 3 » — saisie
  - Question 4 : « Question 4 » — saisie
  - Je m’évalue : « Je m’évalue » — autoévaluation
- **Ressources visuelles à remplacer** : groupes / assiettes SVG, rangées SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U06-L01 — Une part pour chacun

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux partager par distribution.
- **Activités** :
  - Je découvre : « Les noix des trois enfants » — distribuer
  - Je manipule : « Les bouchons dans deux bols » — distribuer
  - Je comprends : « Comment partager ? » — choix raisonné
  - Je m’entraîne : « Je m’entraîne » — saisie, distribuer (2 manches)
  - Je joue : « Personne n’est oublié » — distribuer (3 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : aucune.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U06-L02 — Je fais des paquets

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux chercher combien de groupes on peut former.
- **Activités** :
  - Je découvre : « Les paquets de craies » — construire (+/−)
  - Je manipule : « Des groupes de 4 » — construire (+/−)
  - Je comprends : « Grouper, c’est… » — choix raisonné
  - Je m’entraîne : « Je calcule » — saisie
  - Je joue : « Les caisses de l’entrepôt » — associer/classer
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : groupes / assiettes SVG, objets comptables SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U06-L03 — Moitié et quart

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux trouver des parts égales simples : la moitié et le quart.
- **Activités** :
  - Je découvre : « Quelle orange est coupée en deux moitiés ? » — choix raisonné
  - Je manipule : « Moitié et quart d’une collection » — distribuer (2 manches)
  - Je comprends : « Le quart » — choix raisonné
  - Je m’entraîne : « Je m’entraîne » — saisie, choix raisonné (2 manches)
  - Je joue : « Le découpage des galettes » — associer/classer
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : galettes SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U06-L04 — Je choisis entre grouper et partager

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux interpréter une situation de division concrète : grouper ou partager.
- **Activités** :
  - Je découvre : « Partager ou grouper ? » — associer/classer
  - Je manipule : « 12 jetons, deux questions » — distribuer, construire (+/−) (2 manches)
  - Je comprends : « Ce que l’on cherche » — choix raisonné
  - Je m’entraîne : « Je calcule » — saisie
  - Je joue : « Le rangement de la classe » — choix raisonné, distribuer, construire (+/−) (4 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : groupes / assiettes SVG, objets comptables SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U06-EVAL — Évaluation du module

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je montre que je comprends le partage et le groupement.
- **Activités** :
  - Question 1 : « Question 1 » — saisie
  - Question 2 : « Question 2 » — saisie
  - Question 3 : « Question 3 » — saisie
  - Question 4 : « Question 4 » — saisie
  - Je m’évalue : « Je m’évalue » — autoévaluation
- **Ressources visuelles à remplacer** : objets comptables SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U07-L01 — Je reconnais une somme

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux former une même valeur de plusieurs façons.
- **Activités** :
  - Je découvre : « Combien vaut ma monnaie ? » — saisie
  - Je manipule : « 300 FC de deux façons » — composer (monnaie, masses, achats)
  - Je comprends : « Qu’est-ce qu’une somme ? » — choix raisonné
  - Je m’entraîne : « Je calcule » — saisie
  - Je joue : « Le prix exact » — composer (monnaie, masses, achats) (3 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : monnaie factice CSS.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U07-L02 — Je calcule un achat

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux additionner des prix simples.
- **Activités** :
  - Je découvre : « Le crayon et la gomme » — saisie
  - Je manipule : « Le jeu du marché » — composer (monnaie, masses, achats)
  - Je comprends : « Plusieurs achats » — choix raisonné
  - Je m’entraîne : « Je calcule » — saisie
  - Je joue : « À la caisse » — saisie (3 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : articles SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U07-L03 — Je cherche la monnaie rendue

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux calculer ce qui reste après un paiement fictif : la monnaie rendue.
- **Activités** :
  - Je découvre : « Le livre à 300 FC » — saisie
  - Je manipule : « Je rends la monnaie » — composer (monnaie, masses, achats)
  - Je comprends : « La monnaie rendue » — choix raisonné
  - Je m’entraîne : « Je calcule » — saisie
  - Je joue : « Ma petite caisse » — composer (monnaie, masses, achats) (3 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : articles SVG, monnaie factice CSS.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U07-L04 — Je prépare un petit budget

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux choisir des achats sans dépasser une somme.
- **Activités** :
  - Je découvre : « Les courses de la famille » — composer (monnaie, masses, achats)
  - Je manipule : « Sans dépasser 900 FC » — composer (monnaie, masses, achats)
  - Je comprends : « La règle du budget » — choix raisonné
  - Je m’entraîne : « Je m’entraîne » — choix raisonné, saisie (2 manches)
  - Je joue : « Exactement 700 FC » — composer (monnaie, masses, achats)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : articles SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U07-EVAL — Évaluation du module

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je montre que je sais utiliser la monnaie dans des situations simulées.
- **Activités** :
  - Question 1 : « Question 1 » — saisie
  - Question 2 : « Question 2 » — saisie
  - Question 3 : « Question 3 » — saisie
  - Question 4 : « Question 4 » — saisie
  - Je m’évalue : « Je m’évalue » — autoévaluation
- **Ressources visuelles à remplacer** : monnaie factice CSS.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U08-L01 — Le centimètre

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux mesurer une petite longueur avec une règle, en centimètres.
- **Activités** :
  - Je découvre : « Deux crayons presque pareils » — saisie
  - Je manipule : « Quand on ne part pas de zéro » — saisie (2 manches)
  - Je comprends : « La règle cassée » — choix raisonné
  - Je m’entraîne : « Je mesure » — saisie
  - Je joue : « Chaque crayon à sa place » — associer/classer
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : règle SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U08-L02 — Le mètre

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux choisir une unité adaptée : le centimètre ou le mètre.
- **Activités** :
  - Je découvre : « Mesurer la classe » — choix raisonné
  - Je manipule : « La ficelle d’un mètre » — saisie
  - Je comprends : « Mètre et centimètres » — choix raisonné
  - Je m’entraîne : « Je convertis » — saisie
  - Je joue : « Centimètre ou mètre ? » — associer/classer
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : ligne numérique SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U08-L03 — Masse : léger et lourd

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux comparer et ordonner des masses.
- **Activités** :
  - Je découvre : « Les sacs fermés » — choix raisonné
  - Je manipule : « Je compare avec la balance » — choix raisonné (2 manches)
  - Je comprends : « Lire une balance » — choix raisonné
  - Je m’entraîne : « Je m’entraîne » — ranger, saisie (2 manches)
  - Je joue : « Équilibre la balance » — composer (monnaie, masses, achats) (3 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : balance SVG, masses SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U08-L04 — Capacité : litre et récipient

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux comparer ce que des récipients peuvent contenir, en litres.
- **Activités** :
  - Je découvre : « Les bidons du point d’eau » — choix raisonné
  - Je manipule : « Je remplis le bidon » — construire (+/−)
  - Je comprends : « La même tasse » — choix raisonné
  - Je m’entraîne : « Je calcule » — saisie
  - Je joue : « Remplis à la capacité demandée » — construire (+/−) (3 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : bouteilles et bidon SVG, récipients SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U08-EVAL — Évaluation du module

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je montre que je sais mesurer des longueurs, des masses et des capacités.
- **Activités** :
  - Question 1 : « Question 1 » — saisie
  - Question 2 : « Question 2 » — choix raisonné
  - Question 3 : « Question 3 » — ranger
  - Question 4 : « Question 4 » — saisie
  - Je m’évalue : « Je m’évalue » — autoévaluation
- **Ressources visuelles à remplacer** : objets comptables SVG, règle SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U09-L01 — Polygones familiers

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux décrire le triangle, le carré et le rectangle.
- **Activités** :
  - Je découvre : « Les motifs du tissu » — choix raisonné
  - Je manipule : « Je nomme les formes » — associer/classer
  - Je comprends : « Le cercle » — choix raisonné
  - Je m’entraîne : « Côtés et sommets » — saisie
  - Je joue : « Je classe les formes » — associer/classer
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : formes SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U09-L02 — Cube, pavé, boule et cylindre

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux reconnaître quelques solides : cube, pavé, boule et cylindre.
- **Activités** :
  - Je découvre : « Les objets de la maison » — associer/classer
  - Je manipule : « Rouler ou pas ? » — associer/classer
  - Je comprends : « Le cube » — choix raisonné
  - Je m’entraîne : « Je m’entraîne » — saisie, choix raisonné (2 manches)
  - Je joue : « Rouler ou empiler » — associer/classer
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : solides SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U09-L03 — Je complète une symétrie

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux reconnaître et compléter deux moitiés en miroir.
- **Activités** :
  - Je découvre : « Les ailes du papillon » — choix raisonné
  - Je manipule : « Je complète le motif » — compléter la symétrie
  - Je comprends : « Toujours un axe ? » — choix raisonné
  - Je m’entraîne : « Je m’entraîne » — compléter la symétrie, saisie (2 manches)
  - Je joue : « Le miroir magique » — compléter la symétrie (2 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : formes SVG, quadrillage CSS.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U09-L04 — Je construis et je décris

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux assembler des formes selon un modèle et le décrire.
- **Activités** :
  - Je découvre : « La maison dessinée » — choix raisonné
  - Je manipule : « Les pièces de la maison » — construire (+/−)
  - Je comprends : « Je découpe un carré » — choix raisonné
  - Je m’entraîne : « Je m’entraîne » — saisie, choix raisonné (2 manches)
  - Je joue : « Je reconstruis le motif » — construire (+/−) (2 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : formes SVG, maison SVG, modèle de formes SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U09-EVAL — Évaluation du module

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je montre que je sais observer et construire des objets géométriques.
- **Activités** :
  - Question 1 : « Question 1 » — saisie
  - Question 2 : « Question 2 » — choix raisonné
  - Question 3 : « Question 3 » — compléter la symétrie
  - Question 4 : « Question 4 » — choix raisonné
  - Je m’évalue : « Je m’évalue » — autoévaluation
- **Ressources visuelles à remplacer** : formes SVG, solides SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U10-L01 — Heures entières et demies

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux lire une horloge simple : heures entières et demies.
- **Activités** :
  - Je découvre : « L’horloge de l’école » — saisie
  - Je manipule : « Je règle l’horloge » — régler l’horloge
  - Je comprends : « La demie » — choix raisonné
  - Je m’entraîne : « Je m’entraîne » — saisie, choix raisonné (2 manches)
  - Je joue : « Tourne les aiguilles » — régler l’horloge (3 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : horloge SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U10-L02 — Jours, semaines et mois

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux utiliser un calendrier : jours, semaines et mois.
- **Activités** :
  - Je découvre : « Les jours de la semaine » — ranger
  - Je manipule : « Je lis le calendrier » — saisie
  - Je comprends : « Une semaine plus tard » — choix raisonné
  - Je m’entraîne : « Je m’entraîne » — choix raisonné, saisie (2 manches)
  - Je joue : « Les événements de la semaine » — associer/classer
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : calendrier HTML.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U10-L03 — Je résous en plusieurs étapes

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux enchaîner deux actions pour résoudre un problème.
- **Activités** :
  - Je découvre : « Les tomates du jardin » — saisie
  - Je manipule : « Les oiseaux sur la branche » — construire (+/−)
  - Je comprends : « Ma méthode » — ranger
  - Je m’entraîne : « Je calcule étape par étape » — saisie
  - Je joue : « La mission des jetons » — saisie (3 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : groupes / assiettes SVG, objets comptables SVG, rangées SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U10-L04 — Je crée et je vérifie un problème

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je peux inventer des données cohérentes et contrôler la réponse d’un problème.
- **Activités** :
  - Je découvre : « Un problème incomplet » — choix raisonné
  - Je manipule : « Les trois parties d’un problème » — associer/classer
  - Je comprends : « Avant de proposer un défi » — choix raisonné
  - Je m’entraîne : « Je m’entraîne » — choix raisonné, saisie (3 manches)
  - Je joue : « Je corrige les défis » — associer/classer, saisie (2 manches)
  - Je retiens : « Je retiens » — choix raisonné
- **Ressources visuelles à remplacer** : aucune.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-U10-EVAL — Évaluation du module

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je montre que je sais me repérer dans le temps et raisonner.
- **Activités** :
  - Question 1 : « Question 1 » — régler l’horloge
  - Question 2 : « Question 2 » — saisie
  - Question 3 : « Question 3 » — saisie
  - Question 4 : « Question 4 » — choix raisonné
  - Je m’évalue : « Je m’évalue » — autoévaluation
- **Ressources visuelles à remplacer** : aucune.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

### MATH-2P-BILAN — Grand bilan final

- **Statut** : terminé et fonctionnel (tests de parcours verts).
- **Objectif** : Je montre tout ce que j’ai appris en 2e primaire.
- **Activités** :
  - Question 1 : « Question 1 · Je range » — ranger
  - Question 2 : « Question 2 · Je décompose » — construire (+/−)
  - Question 3 : « Question 3 · J’additionne » — saisie
  - Question 4 : « Question 4 · Je soustrais » — saisie
  - Question 5 : « Question 5 · Groupes égaux » — saisie
  - Question 6 : « Question 6 · Je partage » — distribuer
  - Question 7 : « Question 7 · Monnaie rendue » — saisie
  - Question 8 : « Question 8 · Je mesure » — saisie
  - Question 9 : « Question 9 · Les solides » — choix raisonné
  - Question 10 : « Question 10 · Problème » — saisie
  - Je m’évalue : « Je m’évalue » — autoévaluation
- **Ressources visuelles à remplacer** : fagots et bâtonnets CSS, groupes / assiettes SVG, règle SVG, solides SVG.
- **Problèmes restants** : aucun bloquant ; relecture pédagogique par un enseignant de 2e primaire à prévoir (comme pour tout le livre).

## Problèmes signalés dans le travail existant (non corrigés, hors mission)

1. **U01-L03, Je m’entraîne** : les trois énoncés sont affichés déjà résolus (`18 = 18`, `7 < 15`, `10 < 12 < 14`) et un seul bouton valide l’étape ; l’enfant ne raisonne pas.
2. **U01-L03, Je joue** : même image et même réponse (« panier de gauche ») que Je découvre.
3. **U01-L02, Je m’entraîne** : un `<span class=srOnly>` contient la réponse attendue de chaque champ ; un lecteur d’écran lit donc la réponse.
4. **Écran de fin de L01 à L04** : titre fixe « Bravo, tu sais compter sans te perdre ! », message fixe « 1 leçon terminée sur les 40 » et « La prochaine leçon arrive bientôt », faux pour L02-L04 et maintenant que tout est publié. Les nouveaux éléments utilisent un écran de fin propre (titre de la leçon, compte réel, bouton « Leçon suivante »).
5. **U01-L04, Je comprends / Je retiens** : deux questions à choix presque identiques.
6. **Référentiel PDF, corrigé U01-L03 Q3** : « 11, 12 ou 13 ; deux de ces nombres conviennent » alors que les trois conviennent.

## Travail restant

- Images réalistes et vidéos (Crochet) : remplacer les glyphes de `interactive/visuals.tsx` (voir la liste par leçon ci-dessus).
- Traductions anglaises du nouvel espace `primaryTwoLessons` (la page anglaise affiche déjà un message d’attente).
- Relecture pédagogique des 47 éléments par un enseignant ; décision sur les problèmes signalés ci-dessus.
- Revue de code, puis push / PR / fusion / déploiement : **uniquement sur accord explicite du Capitaine**.

## Navigation de l’enfant (branche `feature/2e-primaire-navigation-enfant`)

Demandée par le Capitaine après la mise en dev : le passage entre leçons et entre modules était difficile à suivre pour un enfant.

- **Un seul chemin** (`primary-two/journey.ts`) : L01 → L02 → L03 → L04 → évaluation, module après module, puis le grand bilan (51 arrêts).
- **Un seul gros bouton « Continuer ▶ »** sur l’écran de fin de chaque leçon et évaluation, y compris L01 à L04 de Crochet (seul l’écran de fin change, pas ses exercices). Il mène à la leçon suivante, à l’évaluation, puis à la première leçon du module suivant.
- **Fin de module fêtée** (« Module N réussi ! 🏅 » quand ses 4 leçons sont faites) ; **fin de parcours** après le bilan (« Tu as terminé la 2e primaire ! 🎓 »). Plus aucun cul-de-sac.
- **Petit chemin de ronds** (1 2 3 4 🏅, et 🎓 au module 10) en haut de chaque leçon, sur l’écran de fin et sur la page du module : étoile = terminé, rond plein = « tu es ici ».
- **Page du module** : un gros bouton Commencer / Reprendre / Continuer / Module suivant vers ce qu’il faut faire maintenant (emplacement facultatif `renderHeroAction` ajouté à `GenericModulePage`, sans effet sur les autres cours).
- Libellé corrigé : « Retour au module ». Textes faux supprimés de l’écran de fin de L01-L04 (« 1 leçon sur 40 », « La prochaine leçon arrive bientôt »).
- Tests : `journey.test.tsx` (chemin complet, chaque passage, bouton du module, écrans de fin, passage réel évaluation U03 → U04-L01). Vérification visuelle à 320 px : chemin sur une ligne, aucun débordement.

## Même navigation pour la 1re primaire (branche `feature/1re-primaire-navigation-enfant`)

- La logique et l’affichage du chemin sont devenus **communs** (`courses/components/journey/`) et servent aux deux parcours. La 2e primaire garde exactement le même comportement (tests inchangés).
- 1re primaire : chemin de ronds dans chaque leçon et sur la page du module, gros bouton « Continuer ▶ » en fin de leçon, fête de fin de module, « Tu as terminé la 1re primaire ! 🎓 » après le bilan. Le résultat d’évaluation (`AssessmentResult`) reste affiché.
- Modules de 1re de 2 à 5 leçons : le chemin s’adapte (jusqu’à 6 ronds), vérifié à 320 px.
