# Parcours RDC, mathématiques de 1re primaire

## Références et état initial

Audit effectué sur `origin/main` f1b0732, puis branche `feat/primary-one-rdc-exercises`.
Le dépôt ne déclarait que U01-L01 à U01-L04 (trois étapes de prototype), plus une évaluation à un seul bouton. Les neuf autres modules étaient vides. Aucune réponse pédagogique n’était vérifiée. La progression générale était calculée sur quatre leçons.

Les deux manuels fournis ont été extraits et lus en entier, corrigés compris :

- **Je découvre les maths autour de moi — 1re primaire RDC**, 71 pages : référence textuelle complète, objectifs, trois niveaux d’exercice, jeu, règle et corrigés.
- **Mbuyamba — 1re primaire, livre complet**, 96 pages : édition illustrée, mêmes quarante leçons et mêmes évaluations, avec quelques coupures de mise en page.

Répartition réelle : **4 / 4 / 4 / 4 / 5 / 5 / 4 / 4 / 4 / 2**, soit quarante leçons. Les unités 5 et 6 n’ont pas quatre leçons ; l’unité 10 en a deux.

Les composants des parcours 2P, 3P et 4P ont été examinés. Réutilisation de `ActivityShell`, `ChoiceGroup`, `NumericStepper`, `useAttempts`, des composants de navigation et du moteur générique. Les manipulations propres aux petites collections restent dans 1P. Le seul changement au moteur partagé est un normaliseur de progression optionnel (identité par défaut), nécessaire à la migration sûre des prototypes.

## Plan mis en œuvre

1. Remplacer les prototypes du module 1 par des activités vérifiées.
2. Étendre les mêmes contrôles aux modules 2–4, puis 5–7, puis 8–10.
3. Restaurer les dix évaluations à partir des corrigés, intégrer les huit défis finaux et la révision ciblée.
4. Vérifier chaque validateur, les interactions, les réponses incorrectes, la reprise, les sauvegardes existantes, les liens et les vues mobiles.

## Correspondance exhaustive

Chaque leçon comporte six étapes : découverte, compréhension, manipulation, entraînement (les trois exercices du manuel), jeu, et règle avec vérification. Le contrôle de fin reprend la réflexion avec un identifiant distinct pour exiger une nouvelle réponse. Cela donne **six exercices vérifiés par leçon**, soit **240**, plus **40 questions d’évaluations** et **8 de bilan final** : **288 occurrences d’exercices**. Ce nombre comprend les reprises du manuel dans les évaluations et le contrôle de fin ; il ne désigne pas 288 énoncés différents.

| Identifiant | Leçon | Page, édition 71 p. | Avant | Maintenant |
|---|---|---:|---|---|
| MATH-1P-U01-L01 | Même ou différent ? | 5 | Prototype | Six étapes, six exercices vérifiés |
| MATH-1P-U01-L02 | Je trie par couleur ou par forme | 6 | Prototype | Six étapes, six exercices vérifiés |
| MATH-1P-U01-L03 | Du plus petit au plus grand | 7 | Prototype | Six étapes, six exercices vérifiés |
| MATH-1P-U01-L04 | Je continue une suite | 8 | Prototype | Six étapes, six exercices vérifiés |
| MATH-1P-U02-L01 | Un, deux et trois | 11 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U02-L02 | Quatre et cinq | 12 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U02-L03 | Zéro : aucun | 13 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U02-L04 | Je montre, je lis et j’écris de 0 à 5 | 14 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U03-L01 | Six et sept | 17 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U03-L02 | Huit, neuf et dix | 18 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U03-L03 | En avant et en arrière | 19 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U03-L04 | Je construis un nombre | 20 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U04-L01 | Autant, plus ou moins ? | 23 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U04-L02 | Même quantité : = | 24 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U04-L03 | Plus grand ou plus petit : > et < | 25 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U04-L04 | Je range les nombres | 26 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U05-L01 | Je réunis deux groupes | 29 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U05-L02 | J’ajoute ce qui arrive | 30 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U05-L03 | J’écris une addition | 31 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U05-L04 | Je décompose un nombre | 32 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U05-L05 | Je cherche ce qui manque | 33 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U06-L01 | J’enlève et je trouve le reste | 36 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U06-L02 | Je barre sur un dessin | 37 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U06-L03 | J’écris une soustraction | 38 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U06-L04 | Combien de plus ? de moins ? | 39 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U06-L05 | Addition ou soustraction ? | 40 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U07-L01 | Onze à quinze | 43 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U07-L02 | Seize à vingt | 44 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U07-L03 | Une dizaine et des unités | 45 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U07-L04 | Je calcule et je partage | 46 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U08-L01 | Plus long ou plus court ? | 49 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U08-L02 | Je mesure avec une unité | 50 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U08-L03 | Plus lourd ou plus léger ? | 51 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U08-L04 | Quel récipient contient le plus ? | 52 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U09-L01 | Lignes droites et courbes | 55 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U09-L02 | Carré, rectangle, triangle, cercle | 56 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U09-L03 | Gauche, droite, haut, bas | 57 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U09-L04 | Je suis un chemin | 58 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U10-L01 | Ma journée et ma semaine | 61 | Absente | Six étapes, six exercices vérifiés |
| MATH-1P-U10-L02 | Je résous un défi | 62 | Absente | Six étapes, six exercices vérifiés |

## Évaluations : sources des énoncés et corrigés

Les pages 9, 15, 21, 27, 34, 41, 47, 53, 59 et 63 du manuel de 71 pages portent seulement « Moyen ». **Les sections EVAL des corrigés, pages 65–70, donnent les questions, pas leurs réponses.** Elles reprennent la question moyenne de chaque leçon ; les réponses ont donc été rapprochées du corrigé de cette leçon. L’édition illustrée les affiche aux pages 12, 21, 30, 39, 50, 61, 70, 79, 88 et 93 ; certaines lignes y sont coupées. Les huit défis et leurs réponses sont aux pages 64 et 70 de l’édition textuelle, 94 et 96 de l’édition illustrée.

| Unité | Questions | Source des énoncés, édition 71 p. | Réponses attendues |
|---|---:|---|---|
| 1 | 4 | p. 65, EVAL | Même couleur / tailles différentes ; autre tri par couleur ; 2,3,5 ; petit |
| 2 | 4 | p. 66, EVAL | Trois poissons ; quatre mangues visibles ; 3 ; 0,1,2,3,4,5 |
| 3 | 4 | p. 66, EVAL | 2 ; 8 ; 8 ; deux décompositions distinctes de 9 |
| 4 | 4 | p. 67, EVAL | Plus de craies ; = ; < ; 5,6,8,10 |
| 5 | 5 | p. 67, EVAL | 7 ; 8 ; 9 ; trois décompositions distinctes de 7 ; 3 |
| 6 | 5 | p. 68, EVAL | 6 ; 5 ; 6 ; 3 ; 7 |
| 7 | 4 | p. 68, EVAL | 5 ; 18 et 20 ; 19 ; 6 |
| 8 | 4 | p. 69, EVAL | 2,4,6 ; non ; oui ; bol de six tasses |
| 9 | 4 | p. 69, EVAL | Fermée ; carré ; bouchon à droite ; case 4 |
| 10 | 2 | p. 70, EVAL | Matin, après-midi, soir ; six graines chacun |
| Bilan | 8 | p. 64 et 70 | 2,4,7,9 ; 4 ; 12 ; 5 ; lundi ; 7 bâtonnets ; triangle ; 6 mangues |

## Adaptations explicites et points pédagogiques

- Les dessins de collections deviennent des objets à ajouter, retirer ou partager. Les sélections, regroupements et placements se font au clic, au toucher ou au clavier, sans dépendre d’un glisser-déposer.
- Le tri U01-L02 possède un contexte explicite : cercle rouge, carré bleu, cercle bleu. « Une autre règle » devient un tri par couleur après le tri par forme. Ce contexte était implicite dans l’évaluation.
- U01-L01 : les observations et dessins deviennent la sélection de formes de même couleur ou de même forme, avec des tailles distinctes.
- U01-L03 : l’énoncé « grand, petit, moyen » est restitué entièrement depuis le manuel textuel et les corrigés ; l’édition illustrée déplace le mot « moyen » au mauvais endroit. Deux objets de même taille peuvent venir dans l’un ou l’autre ordre.
- U01-L04 : la création libre de suite est guidée par deux couleurs et six cases ABABAB. Les deux orientations sont acceptées.
- Les décompositions acceptent toutes les parts entières positives ou nulles de somme correcte. Inverser les deux parts ne constitue pas une deuxième façon. Les partages égaux exigent effectivement deux parts égales.
- Les nombres 6 **et** 7 sont tous deux acceptés entre 5 et 8.
- U06-L05 : l’histoire libre est adaptée en construction d’un récit avec un type d’objet au choix et trois retraits sur huit. La cohérence du retrait est vérifiée ; la qualité de l’expression orale reste à apprécier avec l’adulte.
- U08 : les longueurs sont alignées au même départ ; les unités sont identiques et adjacentes ; la balance illustre la comparaison pierre/feuille du manuel, sans prétendre simuler toutes les masses réelles. Les tasses restent une même mesure pour les deux bols.
- U09-L01 : le tracé libre devient une courbe construite avec au moins trois points non alignés et deux extrémités distinctes. Cela conserve la notion de courbe ouverte, sans évaluer la motricité du dessin.
- U09-L02 : la maison à construire reprend toit triangulaire, mur carré, porte rectangulaire et fenêtre circulaire. Ce décor concrétise le mini-jeu du manuel.
- U09-L03/L04 : le repère est explicitement celui de l’écran ; le déplacement utilise des flèches nommées. La question sur deux personnes face à face garde la réponse « non » du corrigé.
- U10-L02 : les « deux paniers » apportés au jardin sont une donnée de contexte, pas deux tomates supplémentaires ; on pose explicitement la question des tomates restantes après trois cueillettes sur huit.
- Les jeux sans nombre cible dans le manuel prennent une cible issue des nombres travaillés dans la même leçon. Les jeux de vitesse restent sans chronomètre obligatoire afin de permettre l’accès au clavier et les reprises.
- Les explications orales, la variété des dessins personnels et les gestes hors écran ne peuvent pas être certifiés par ce logiciel. Les contrôles portent sur la notion mathématique et l’adulte peut demander d’expliquer la démarche.
- Le manuel lui-même demande une relecture locale par un enseignant ou inspecteur de RDC avant publication pédagogique définitive. L’implémentation ne constitue pas cette validation institutionnelle.

## Résultats, progression et compatibilité

Les réponses ne valident jamais automatiquement une étape après une erreur. Chaque tentative vérifiée et sa réponse sont enregistrées sous une clé locale distincte ; une réponse correcte débloque la suite. Les résultats montrent les réponses corrigées et les réussites au premier essai séparément. Une erreur suivie d’une correction garde un lien vers la notion à revoir. L’enfant peut rouvrir les exercices et consulter ses réponses enregistrées.

La progression globale compte 51 éléments : quarante leçons, dix évaluations et le bilan final. Le compteur de leçons reste sur quarante. Le parcours n’atteint 100 % qu’après tous les éléments, y compris le bilan. Une lecture reconnue n’est pas assimilée à une réponse mathématique.

Les clés de cours et les identifiants Uxx-Lxx sont conservés. S01 reste la découverte, S02 la manipulation, S03 la vérification finale ; S04, S05 et S06 ajoutent compréhension, entraînement et jeu dans l’ordre pédagogique. La migration conserve les lectures mais exige une preuve de validation pour les activités des anciens prototypes : un ancien « terminé » peut donc redevenir « en cours ». Les autres parcours utilisent l’identité par défaut et leurs sauvegardes restent indépendantes.

Les résultats restent sur l’appareil, comme la progression actuelle. Aucune synchronisation serveur ni nouveau curriculum n’est ajoutée.

## Validation

Les tests couvrent les 288 réponses attendues et erronées, les réponses ouvertes à plusieurs solutions, les manipulations de chaque type, les erreurs avant réussite, la reprise après remontage, les résultats et liens de révision, la migration et l’achèvement complet. Les vérifications visuelles et les résultats de CI sont consignés dans la PR.

Validation locale du 24 octobre 2026 : `npm test -- --reporter=dot --maxWorkers=2` — **632 tests réussis, 33 fichiers** ; `npm run build` et `npm run lint` réussis. Le premier essai avec tous les workers avait dépassé des délais dans plusieurs parcours ; la relance avec deux workers passe sans changement de leurs tests.

Chrome : réponse incorrecte bloquée, aide affichée, réponse et tentative conservées après rechargement, réponse correcte acceptée ; aucun débordement horizontal aux largeurs 320, 390, 768 et 1440 px dans les vues inspectées ; aucune erreur JavaScript. Vérification visuelle du cours, de la manipulation par sélection et du chemin sur quadrillage. Les interactions de tous les types sont en outre testées dans le DOM.

Le français est la langue des activités de ce curriculum. Depuis l’interface anglaise, une notice propose explicitement de passer au français, sans enregistrer une leçon comme commencée. Les clés de traduction restent présentes dans les deux langues et la navigation existante reste traduite.
