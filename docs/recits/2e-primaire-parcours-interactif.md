# Récit de conception - parcours interactif de mathématiques, 2e primaire

## Statut et périmètre

Ce document est une phase d'analyse et de conception. Il ne demande aucune modification du code, aucun achat de service et aucune publication externe.

Périmètre : module 1, `MATH-2P-U01`, « Je retrouve les nombres ».

- `MATH-2P-U01-L01` - Je compte jusqu'à 20 : déjà publié, à conserver et à diagnostiquer.
- `MATH-2P-U01-L02` - Avant, après, entre : à concevoir.
- `MATH-2P-U01-L03` - Je compare : à concevoir.
- `MATH-2P-U01-L04` - Je range et j'explique : à concevoir.

Les documents PDF de référence locaux utilisés pour le recoupement sont le référentiel `Livres/LIVRES/je-decouvre-les-maths-autour-de-moi-2e-primaire-rdc.pdf` et le livre complémentaire `Bibliotheque/mbuyamba-2e-primaire-livre-complet.pdf`. Les chemins H: fournis dans la mission n'étaient pas accessibles dans cet environnement ; les copies présentes dans le dépôt portent le même contenu de référence attendu.

## 1. Analyse de l'existant

### Architecture et catalogue

Le portail est une application React/TypeScript dans `frontend` avec un moteur de cours commun (`frontend/src/courses/course-engine`). Le catalogue 2e primaire est dans `frontend/src/courses/primary-two/course-catalogue.ts`.

Le catalogue expose déjà :

- le cours `MATH-2P` ;
- 10 modules et 40 leçons prévues ;
- quatre leçons et une évaluation par module ;
- les états `available` et `coming-soon` ;
- six étapes standardisées par leçon : `discover`, `manipulate`, `understand`, `practice`, `play`, `remember`.

Le module 1 est publié dans le catalogue, mais seule L01 possède des étapes. L02-L04 et l'évaluation restent correctement non publiées. Cette séparation publication/progression doit être conservée.

### L01 déjà implémentée

`PrimaryTwoLessonActivities.tsx` propose actuellement six activités :

1. toucher 18 graines et les déplacer vers une zone « déjà comptées » ;
2. former 17 avec une dizaine et 7 unités ;
3. choisir une stratégie de comptage fiable ;
4. résoudre trois petits défis numériques ;
5. placer 13, 4, 19 et 8 entre leurs voisins sur un sentier de 0 à 20 ;
6. choisir la bonne règle à retenir.

Les textes français sont centralisés dans `frontend/src/i18n/locales/fr/primaryTwo.json`. Yamba intervient dans l'accueil du cours, l'entrée de leçon et la fin de leçon via `YambaGuide`.

### Navigation, validation et progression

`PrimaryTwoLessonPage.tsx` pilote la navigation entre les six étapes. Une étape validée est enregistrée par le moteur commun, puis l'enfant peut continuer. Les erreurs restent dans l'activité et affichent un indice ou une explication.

La progression est volontairement volatile : `useCourseProgress.ts` utilise une `Map` en mémoire de session. Aucune écriture dans `localStorage`, `sessionStorage`, IndexedDB ou cookie n'est utilisée pour la progression. Le rechargement complet de l'application doit donc repartir d'une progression vide ; la navigation React dans la même session conserve l'état courant.

### Tests existants

Les tests couvrent déjà le catalogue 10 x 4, le dénominateur 40, le démarrage de L01, la validation des 18 graines, la composition de 17, la reprise à l'étape suivante, les erreurs et la mise en page à 320 px. Les tests d'activités vérifient aussi les limites des contrôles, les erreurs pédagogiques et la validation finale.

## 2. Comparaison avec la matière pédagogique

Le référentiel définit pour U01 la compétence « lire, représenter, comparer et organiser les nombres déjà connus ». Les fiches donnent les situations et repères suivants :

| Leçon | Objectif observé | Situation / exemples de référence | État portail |
| --- | --- | --- | --- |
| L01 | Compter une collection sans oubli ni double comptage | 18 graines ; groupe de 10 et unités ; 12, 15 et 14 + 2 | Cohérente et publiée |
| L02 | Trouver le précédent et le suivant | Rue numérotée 8, 9, 10, 11 ; après 13 ; `16, 17, __, 19` ; entre 9 et 11 | Catalogue seulement |
| L03 | Utiliser `=`, `<` et `>` correctement | Deux paniers de 14 et 9 oranges ; construire 12 et 16 ; compléter `18 __ 18`, `7 __ 15`, `10 < __ < 14` | Catalogue seulement |
| L04 | Ordonner plusieurs nombres | Dossards 17, 5, 12 et 9 ; ordre croissant ; rendre vraie `6 < __ < 9` | Catalogue seulement |

Les titres, la compétence, les quatre situations et la progression générale sont donc déjà alignés. Le principal écart n'est pas une erreur de matière : ce sont trois leçons non encore publiées et l'absence d'une évaluation U01. L01 est un prototype fonctionnel, mais son visuel représente encore des graines stylisées en CSS ; la direction artistique demande de prévoir des représentations plus réalistes ou des photographies lorsque cela améliore la reconnaissance.

Le livre complémentaire confirme la structure en 10 unités, 40 leçons, évaluations d'unité et bilan final. Il doit rester une source d'inspiration et de vérification, pas une maquette HTML à recopier.

## 3. Objectifs du module 1

À l'issue du module, l'enfant doit pouvoir :

- compter une collection jusqu'à 20 en déplaçant ou en pointant chaque objet une seule fois ;
- identifier le nombre juste avant, juste après et entre deux nombres ;
- comparer deux nombres en s'appuyant d'abord sur les dizaines puis sur les unités ;
- choisir et écrire `=`, `<` ou `>` ;
- ranger plusieurs nombres dans l'ordre croissant et expliquer sa stratégie ;
- représenter une réponse avec des objets avant de passer au symbole ;
- expliquer une réponse avec une phrase courte ou une justification guidée.

La règle de conception commune est : situation réelle -> manipulation visible -> formulation orale -> symbole ou écriture -> réinvestissement.

## 4. Activités proposées pour les leçons manquantes

Chaque leçon reprend les six étapes existantes. Les propositions ci-dessous sont des scénarios de conception, pas encore une demande d'implémentation.

### L02 - Avant, après, entre

- **Je découvre** : dans une rue de quartier, l'enfant observe les maisons 8, 9, 10 et 11 et repère la plaque manquante.
- **Je manipule** : il pose des cartes-nombres 6 à 12 sur une bande de maisons, puis retire une carte et la replace à partir des voisines.
- **Je comprends** : il déplace un pion sur une ligne numérique et verbalise « avant = un de moins », « après = un de plus ».
- **Je m'entraîne** : il complète `16, 17, __, 19`, puis répond à « après 13 ? » et « entre 9 et 11 ? ».
- **Je joue** : il répare plusieurs suites de numéros de maisons ou de dossards, sans chronomètre obligatoire.
- **Je retiens** : il choisit entre trois explications et remet dans l'ordre une mini-suite `avant / nombre / après`.

Validation : accepter la valeur correcte et, pour les activités de manipulation, vérifier la position de la carte plutôt que le seul clic sur la réponse.

### L03 - Je compare

- **Je découvre** : deux paniers réalistes contiennent respectivement 14 et 9 oranges ; l'enfant choisit le panier qui en contient le plus et peut les déplacer pour vérifier.
- **Je manipule** : il construit 12 et 16 avec des bâtonnets ou des collections d'oranges, puis oriente un grand signe entre les deux collections.
- **Je comprends** : il compare d'abord les dizaines, puis les unités, et associe l'ouverture du signe au plus grand nombre.
- **Je m'entraîne** : il complète `18 __ 18`, `7 __ 15` et `10 < __ < 14`, avec une représentation visible à côté des nombres.
- **Je joue** : il oriente un petit pont ou une flèche vers le panier qui contient le plus ; une variante demande d'identifier une égalité.
- **Je retiens** : il choisit la stratégie « dizaines puis unités » et explique pourquoi `14 > 9`.

Validation : ne pas confondre le sens visuel du signe avec un simple choix de carte ; donner un retour spécifique sur `=`, `<` et `>`.

### L04 - Je range et j'explique

- **Je découvre** : quatre dossards réalistes 17, 5, 12 et 9 sont mélangés sur un banc ou une corde à linge.
- **Je manipule** : l'enfant déplace les cartes sur une piste de 0 à 20 et utilise la stratégie « chercher le plus petit parmi ceux qui restent ».
- **Je comprends** : il compare deux cartes à la fois et verbalise pourquoi 5 vient avant 9, puis 12, puis 17.
- **Je m'entraîne** : il range `8, 2, 11` puis `20, 14, 19, 10`, et complète `6 < __ < 9`.
- **Je joue** : il remet des fanions ou des pirogues numérotées dans le bon ordre ; les nombres restent visibles dans l'interface, pas incrustés dans les images.
- **Je retiens** : il choisit la bonne règle et produit une explication guidée : « Je cherche le plus petit nombre parmi ceux qui restent. »

Validation : vérifier l'ordre complet, accepter uniquement les valeurs comprises entre 6 et 9 pour le défi ouvert, et signaler quelle paire est mal ordonnée.

## 5. Ressources visuelles nécessaires

Les images doivent être créées pour le projet ou provenir d'une source dont la licence est documentée. Les nombres, signes et consignes restent du texte HTML accessible.

| Ressource | Usage | Traitement recommandé |
| --- | --- | --- |
| Graines, oranges, mangues ou arachides | Compter et comparer | Photo ou illustration photoréaliste, objets séparables et comptables |
| Panier et petite table | Contexte L01/L03 | Deux zones très contrastées, fond peu chargé |
| Bâtonnets et paquet de dix | Groupement de L01/L03 | Vue claire, proportions cohérentes, version CSS possible en secours |
| Maisons et plaques | L02 | Plaques sans chiffre intégré ; numéro ajouté par l'interface |
| Bande numérique 0-20 | L02-L04 | Composant HTML/SVG avec nombres exacts et clavier accessible |
| Dossards, fanions ou pirogues | L04 | Objets réalistes ; nombres ajoutés par l'interface |
| Yamba | Accompagnement | Réutiliser le composant et les assets existants, sans nouveau service vocal ou vidéo |

Prévoir des variantes légères pour mobile : une image principale compressée, aucune image décorative non utilisée, `alt` descriptif et contraste suffisant. Le réalisme ne doit jamais rendre le nombre d'objets ambigu.

## 6. Composants techniques à réutiliser ou extraire

- `ActivityFrame` : titre, consigne, zone interactive, validation et feedback.
- `NumericControl` et contrôles de cartes : à généraliser seulement si une vraie réutilisation apparaît dans L02-L04.
- Un composant `ObjectCollection` : objets comptables, déplacement ou sélection, compteur et état accessible.
- Un composant `NumberLine` : bande 0-20, cartes déplaçables, emplacement nommé et navigation clavier.
- Un composant `ComparisonChoice` : deux collections, choix de `=`, `<`, `>` et explication ciblée.
- Un composant `SortableNumberCards` : réordonnancement tactile et clavier, contrôle de l'ordre complet.
- `YambaGuide`, `useCourseProgress`, le catalogue et le modèle des six étapes : conserver les conventions existantes.

Les données des leçons devraient rester séparées du rendu dès que plusieurs leçons sont publiées : objectifs, scènes, réponses, indices et explications dans une structure typée, composants pour l'interaction. Cela prépare les extensions sans copier-coller la logique de validation.

## 7. Critères d'acceptation

### Pédagogie et contenu

- Les quatre leçons du module 1 reprennent les objectifs et situations du référentiel sans recopier les pages du livre.
- L02 couvre avant, après et entre ; L03 couvre `=`, `<`, `>` et la comparaison par dizaines/unités ; L04 couvre l'ordre croissant et la justification.
- Chaque leçon possède exactement les six étapes attendues.
- Chaque activité demande une action significative et explique l'erreur avec un indice utile.

### Exactitude et interaction

- Les collections visibles contiennent exactement les quantités annoncées.
- Les réponses ouvertes sont validées avec les bonnes bornes ; aucun résultat ambigu n'est accepté par accident.
- Les interactions fonctionnent au toucher, au clavier quand l'action s'y prête, et avec des libellés accessibles.
- La validation d'une étape met à jour la progression et la navigation de façon cohérente.

### Produit et gouvernance

- Le catalogue reste à 10 modules et 40 leçons prévues ; seules les leçons validées passent à `available`.
- La progression n'est pas persistée dans le navigateur.
- Le français reste la langue publiée tant que les traductions anglaises ne sont pas validées.
- Aucun service payant, appel externe ou contenu commercial n'est introduit.
- Les licences et attributions des images sont consignées avant intégration.

## 8. Tests à prévoir

- Tests unitaires des règles : précédent/suivant/entre, comparaison, égalité, ordre croissant et bornes de la réponse ouverte.
- Tests de composants : déplacement d'un objet, compteur exact, remplacement d'une carte, orientation du signe, réordonnancement et feedback après erreur.
- Tests de parcours : L02-L04 s'ouvrent seulement quand elles sont publiées ; chaque étape avancée est enregistrée ; le rafraîchissement ne restaure pas la progression.
- Tests d'accessibilité : rôles et noms des boutons, focus visible, clavier, `aria-live`, ordre de tabulation et messages d'erreur compréhensibles.
- Tests responsive à 320 px, 375 px et largeur desktop ; aucun débordement horizontal de la zone de manipulation.
- Tests de non-régression sur L01 : ses six activités et ses tests existants restent verts.
- Tests de performance : taille des images, absence de chargement des ressources d'une leçon non ouverte, et comportement sur réseau mobile lent.
- Vérification visuelle manuelle des scènes : objets reconnaissables, proportions naturelles, décompte exact et absence de texte mathématique incrusté dans les images.

Commandes de vérification proposées dans le dépôt :

```text
cd portail-math/frontend
npm test -- --run src/courses/primary-two
npm run build
```

Adapter les scripts exacts au `package.json` au moment de l'implémentation ; cette phase ne lance ni ne modifie le code.

## 9. Risques et parades

| Risque | Parade |
| --- | --- |
| Une photo réaliste contient un nombre difficile à compter | Préférer des collections séparées, limiter le décor et tester chaque quantité visuellement |
| L'enfant mémorise le signe sans comprendre la comparaison | Afficher d'abord les collections et demander une manipulation avant le symbole |
| Le glisser-déposer est difficile sur téléphone | Prévoir sélection puis emplacement, boutons de secours et navigation clavier |
| La réponse ouverte de L04 devient ambiguë | Afficher les bornes 6 et 9 et accepter explicitement 7 ou 8 |
| Les activités deviennent des mini-jeux sans objectif | Relier chaque jeu à une compétence et à une explication vérifiable |
| L'image ralentit le parcours | Formats compressés, tailles adaptées, chargement au besoin et ressources réutilisables |
| Une réutilisation prématurée rigidifie les composants | Extraire seulement les patterns communs après deux usages validés |
| La progression est accidentellement persistée | Conserver la `Map` de session et ajouter un test négatif sur `localStorage`/`sessionStorage` |
| Les visuels du livre sont recopiés | Utiliser le livre comme référence pédagogique uniquement et produire des scènes originales sous licence claire |

## Décision proposée

Valider d'abord les scénarios L02-L04 et la liste d'assets. Ensuite, implémenter une seule leçon pilote - L02 - avec les composants `NumberLine` et `ObjectCollection`, la faire relire pédagogiquement, puis appliquer les abstractions confirmées à L03 et L04. L'évaluation U01 et les autres modules restent hors de ce lot.
