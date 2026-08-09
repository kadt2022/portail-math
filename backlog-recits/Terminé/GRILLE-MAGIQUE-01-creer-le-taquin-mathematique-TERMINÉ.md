# GRILLE-MAGIQUE-01 — Créer le taquin mathématique de la Grille magique

## Contexte

Le Portail éducatif doit proposer des jeux dans lesquels les mathématiques constituent directement la mécanique de jeu, et non un questionnaire posé sur un décor.

Un prototype React nommé `grille-magique-taquin-2.txt` existe déjà. Il démontre l'identité visuelle générale, une grille de taquin 3 × 3, le déplacement légal des tuiles, un mélange résoluble, une carte magique centrale, un chronomètre et un score.

Ce prototype est une référence fonctionnelle et visuelle. Il ne doit pas être intégré tel quel : sa règle de validation actuelle recherche une disposition secrète exacte, alors que le jeu attendu doit accepter toute disposition qui respecte les opérations affichées.

## User Story

En tant qu'élève du primaire,
je veux faire glisser des nombres dans une grille et utiliser une carte magique,
afin de résoudre des égalités en jouant à un véritable taquin mathématique.

## Principe du jeu

La grille comporte neuf positions : huit tuiles numériques mobiles et une case vide.

Les opérateurs, les signes d'égalité et les résultats sont fixes. Seules les tuiles numériques se déplacent.

La neuvième valeur est portée par une carte magique située à l'extérieur de la grille :

1. l'enfant peut toucher la carte dès le début pour révéler son nombre ;
2. il fait glisser les huit tuiles comme dans un taquin normal ;
3. il organise les nombres pour respecter les opérations horizontales et verticales ;
4. il ramène la case vide au centre ;
5. il pose la carte magique au centre pour soumettre sa solution ;
6. le jeu valide alors toutes les égalités.

La victoire dépend uniquement de la validité mathématique de la grille complétée. Toute disposition respectant les opérations doit être acceptée, même si elle diffère de celle utilisée pour générer le niveau.

## Périmètre du récit

Ce premier récit couvre deux difficultés :

- **Facile** : addition uniquement ;
- **Moyen** : addition et soustraction, avec des calculs et résultats adaptés au primaire et sans résultat négatif.

Le niveau Difficile, qui combinera addition, soustraction et multiplication dans une même grille, est reporté à un récit ultérieur. Ce futur récit devra définir explicitement la priorité des opérations ou afficher des parenthèses.

## Critères d'acceptation

### CA-01 — Grille de taquin

La grille contient huit tuiles numériques et une case vide.

Une tuile ne peut se déplacer que si elle est voisine horizontalement ou verticalement de la case vide. Aucun déplacement diagonal n'est permis.

Le mélange initial est obtenu par une suite de déplacements légaux depuis une grille valide afin de garantir que chaque niveau est résoluble.

### CA-02 — Opérations fixes

Les opérateurs, les signes `=` et les résultats attendus restent statiques pendant toute la partie.

Les tuiles numériques sont les seuls éléments de la grille qui peuvent changer de position.

Les opérations horizontales et verticales sont lisibles sans ambiguïté sur téléphone, tablette et ordinateur.

### CA-03 — Carte magique révélable

La carte magique se trouve à l'extérieur de la grille au démarrage.

L'enfant peut la toucher dès le début de la partie pour révéler sa valeur. La révélation ne valide pas la grille et n'interrompt pas le chronomètre.

Une fois révélée, sa valeur reste visible jusqu'à la fin de la partie ou jusqu'à la création d'une nouvelle grille.

### CA-04 — Pose de la carte

La carte magique ne peut être posée que lorsque la case vide se trouve au centre de la grille.

La pose de la carte au centre constitue l'action explicite de soumission de la solution.

### CA-05 — Validation mathématique

Au moment de la pose, le moteur complète temporairement la grille avec la valeur de la carte et évalue toutes les opérations horizontales et verticales.

La grille est gagnée si, et seulement si, toutes les égalités sont correctes.

La validation ne compare jamais la position des tuiles avec une disposition secrète mémorisée.

Toute autre disposition mathématiquement valide est acceptée.

### CA-06 — Solution incorrecte

Si au moins une égalité est fausse :

- la partie n'est pas gagnée ;
- la carte reste disponible hors de la grille ou y retourne ;
- les lignes ou colonnes incorrectes sont indiquées clairement, sans dévoiler la solution ;
- les déplacements peuvent reprendre ;
- le chronomètre et le nombre de mouvements continuent.

### CA-07 — Niveau Facile

Toutes les opérations utilisent l'addition.

Les nombres et résultats sont adaptés au primaire. Chaque grille générée possède au moins une solution valide et peut être terminée par des déplacements légaux.

### CA-08 — Niveau Moyen

Les opérations peuvent utiliser l'addition et la soustraction.

Une même grille doit comporter au moins une addition et une soustraction. Les calculs affichés ne produisent pas de résultat négatif.

Chaque grille générée possède au moins une solution valide et peut être terminée par des déplacements légaux.

### CA-09 — Progression et score

Le jeu affiche au minimum :

- la difficulté active ;
- le temps écoulé ;
- le nombre de déplacements ;
- le score ;
- le niveau courant.

Le score n'est ajouté qu'après une validation réussie. Le bouton de niveau suivant crée une nouvelle grille dans la difficulté sélectionnée.

Le bouton Nouvelle grille réinitialise le temps et les déplacements de la partie courante sans effacer le score de la session.

Le score, le temps, les déplacements et le niveau vivent uniquement dans l'état de la partie en cours : ils ne sont pas persistés et ne s'appuient sur aucun système de progression partagé entre jeux, celui-ci n'existant pas encore dans le portail (seul `frontend/src/exetat/progress-storage.ts` existe, et il est spécifique aux quiz Exetat). Une progression partagée entre les jeux fera l'objet d'un récit transversal ultérieur.

### CA-10 — Consigne

La consigne explique clairement les deux actions distinctes : révéler la carte, puis la poser pour valider.

Texte de référence :

> Révèle la carte magique, puis fais glisser les tuiles pour respecter toutes les opérations. Ramène la case vide au centre et pose la carte pour valider ta grille.

La consigne existe en français et en anglais par l'intermédiaire du système d'internationalisation du portail.

### CA-11 — Responsive et accessibilité

Le jeu fonctionne sans débordement horizontal à partir d'une largeur de 320 px.

Les tuiles et la carte magique sont de véritables contrôles accessibles au clavier. Leur état et leur nom sont compréhensibles par les technologies d'assistance.

Le jeu ne dépend pas uniquement de la couleur pour signaler une opération incorrecte.

### CA-12 — Intégration au portail

Le jeu est intégré à l'application React existante et accessible depuis le catalogue ou tableau de bord des jeux selon la navigation en vigueur.

Il respecte l'architecture et le mécanisme FR/EN déjà présents. Aucun second déploiement ou artefact indépendant n'est créé.

Le jeu doit fonctionner depuis le JAR Spring Boot final.

### CA-13 — Qualité technique

La logique métier est séparée du composant React et couvre au minimum :

- la génération d'une grille valide ;
- le mélange résoluble ;
- les déplacements autorisés et interdits ;
- la révélation de la carte ;
- l'impossibilité de poser la carte hors du centre ;
- la validation d'une solution correcte ;
- le refus d'une solution incorrecte ;
- l'acceptation de plusieurs dispositions lorsqu'elles satisfont les mêmes égalités ;
- les contraintes propres aux niveaux Facile et Moyen.

Les styles sont placés dans un CSS Module. Le jeu ne charge aucune police ou ressource indispensable depuis un service externe.

Conformément aux règles d'équipe, aucun emoji n'est introduit dans le code et tout nouveau code est testé.

Les commandes suivantes doivent réussir :

```text
npm run lint
npm run test
npm run build
./gradlew test
./gradlew bootJar
```

## Hors périmètre

- multiplication et division ;
- niveau Difficile ou Expert ;
- classement en ligne ;
- compte utilisateur obligatoire ;
- moteur 2D ou 3D externe ;
- modification des autres jeux ;
- refonte générale du dashboard.

## Consignes de réalisation pour Crochet

Avant de commencer :

1. synchroniser `main` avec `origin/main` ;
2. créer une branche dédiée depuis ce `main` à jour ;
3. conserver le récit et le prototype de référence dans le dépôt ;
4. ne pas recopier aveuglément le prototype : appliquer les règles et critères du présent récit lorsqu'ils diffèrent du prototype.

À la fin du récit, lorsque tous les critères sont satisfaits et les tests sont verts :

1. déplacer le récit du backlog vers le dossier `Terminé` ;
2. ajouter clairement `TERMINÉ` dans son nom ;
3. ouvrir une PR consacrée uniquement à ce récit.

## Définition de terminé

Le récit est terminé lorsque les niveaux Facile et Moyen sont jouables, que la carte peut être révélée dès le début puis posée au centre pour déclencher la validation mathématique, que toute solution valide est acceptée, que l'intégration responsive FR/EN fonctionne depuis le JAR, et que tous les tests et contrôles de la CI sont verts.
