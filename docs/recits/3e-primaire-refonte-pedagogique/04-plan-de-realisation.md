# Plan de réalisation

Découpage en étapes courtes, vérifiables et testables, avec dépendances, risques et décisions à prendre. Aucune étape de code ne commence avant la validation décrite en phase C.

## 1. Où nous en sommes

| Phase | Contenu | État |
| --- | --- | --- |
| A | Audit pédagogique de la PR #65 | **Fait** : `01-audit-pedagogique-pr-65.md` |
| B | Scénario de la leçon pilote | **Fait** : `02-scenario-pilote-unite-6.md` |
| B' | Proposition technique | **Fait** : `03-proposition-technique.md` |
| C | Validation du scénario et du plan | **En attente** de la direction du projet |
| D | Implémentation pilote | Non commencée |
| E | Généralisation | Non commencée |

## 2. Décisions à prendre (phase C)

| # | Décision | Options | Recommandation |
| --- | --- | --- | --- |
| **D0** | Sort de la PR #65 | (a) la laisser ouverte, base du pilote ; (b) la fusionner avant de refondre ; (c) la scinder (moteur et widgets d'un côté, contenu de l'autre) | (a) : ne pas fusionner, car elle publie 36 leçons dont la qualité pédagogique est jugée insuffisante. Le pilote s'appuie dessus sans la modifier. |
| **D1** | Portée du pilote | (a) acte 1 seul (tranche verticale) ; (b) unité 6 entière (4 actes) | (a) d'abord, (b) ensuite par tranches validées. |
| **D2** | Visuels de la 2e primaire | (a) importer tels quels ; (b) extraire dans un dossier partagé | (a) pour le pilote, (b) en PR séparée avant la généralisation. |
| **D3** | Persistance | Inchangée (mémoire de session) | Inchangée ; toute évolution fait l'objet d'une proposition distincte. |
| **D4** | Échec répété dans une scène de transfert | (a) leçon terminable, critère « à revoir » ; (b) leçon non terminable | (a) : ne pas bloquer l'enfant. |
| **D5** | Évaluation d'unité | Remplacer les questions numériques par des situations jouées | Oui, mais après le pilote des quatre leçons. |
| **D6** | Prénoms, lieux, prix | Valider ou remplacer | Revue par un enseignant du contexte visé. |
| **D7** | Illustrations | Glyphes CSS/SVG existants, ou images produites pour le projet | Glyphes existants au pilote ; images seulement avec licence documentée. |
| **D8** | Suivi d'autonomie visible par l'enfant | Oui / non | Oui, en langage non évaluatif, sans note. |

## 3. Branches et gouvernance

- `main` n'est pas modifié. La PR #65 n'est pas fusionnée.
- Ce dossier de documents est livré dans une PR distincte, depuis `main` à jour, qui ne contient que des fichiers Markdown.
- Les branches d'implémentation partent de la branche de la PR #65 (qui contient les widgets, le registre et le test d'intégrité dont le pilote dépend) et ciblent **cette branche**, pas `main` : une PR « empilée » par tranche.
- Une tranche = une branche = une PR. Aucune fusion sans l'accord explicite de la direction du projet.
- Pas de nouvelle dépendance importante sans approbation ; aucune n'est prévue.
- Aucun nom d'agent interne dans les commits, branches, PR ou documents publics.
- Commits à l'identité de l'équipe de développement, sans mention de génération automatique.

## 4. Tranches d'implémentation (phase D)

Chaque tranche est livrable seule, testée, et se termine par TypeScript, ESLint, tests et build, **plus** une vérification mobile et une relecture pédagogique de ce qui est visible à l'écran.

### Tranche 0 — Décisions et gabarits

- **Livrable** : décisions D0 à D8 consignées ; gabarit de scénario validé sur papier.
- **Vérification** : accord écrit.
- **Dépendance** : aucune. **Risque** : décisions tardives qui reviennent sur le scénario.

### Tranche 1 — Noyau d'état pur

- **Livrable** : `story/ledger.ts` (zones, objets, `move`, conservation) et ses tests.
- **Tests** : quantités ≥ 0, conservation, aucun doublon, actions invalides sans effet, suites d'actions aléatoires à graine fixe.
- **Critère de sortie** : couverture des branches du noyau ≥ 95 %, zéro dépendance à React ou à l'i18n.
- **Dépendance** : D3. **Risque** : sur-généralisation ; garder les types réduits au besoin de l'acte 1.

### Tranche 2 — Règles de l'acte 1 et assistance

- **Livrable** : `story/rules.ts` (paiement exact, minimum de cartes), `story/assistance.ts`.
- **Tests** : paiement exact avec plusieurs combinaisons ; minimum calculé depuis l'état réel ; escalade des aides 1 → 2 → 3 ; qualification ; pas d'aide 3 dans le transfert.
- **Critère de sortie** : l'algorithme du minimum de cartes est correct sur tous les états générés par le scénario (test exhaustif des paiements de l'acte 1).
- **Risque** : cas où aucune solution existe ; l'état scénarisé doit toujours en garantir une (test d'intégrité).

### Tranche 3 — Exécution et retour/rejeu

- **Livrable** : `story/run.ts`, `useStoryRun`, remise à zéro commune avec la progression de session.
- **Tests** : retour en lecture seule ; rejeu avec restauration de l'instantané ; recommencement et invalidation des étapes ; validation idempotente.
- **Critère de sortie** : aucune transaction rejouée dans aucun scénario de test de navigation.
- **Risque** : incohérence entre progression des étapes et état de l'histoire ; traiter les deux comme un seul module de remise à zéro.

### Tranche 4 — Composants de base

- **Livrable** : `CardZones`, `YambaSays`, `AssistButton`, avec alternatives accessibles et vue mobile.
- **Tests** : manipulation au clavier ; annonces `aria-live` ; cibles ≥ 44 px ; rendu sans débordement à 320 px.
- **Critère de sortie** : un test de composant réalise un paiement sans souris et sans glisser.
- **Dépendance** : D2 (visuels). **Risque** : 17 cartes sur petit écran ; prévoir les piles avec compteur dès le départ.

### Tranche 5 — Intégration et acte 1 complet

- **Livrable** : registre de scénarios, `StoryStep` dans la page de leçon, contenu de l'acte 1 en français et en anglais, extension du test d'intégrité.
- **Tests** : progression des étapes ; conditions de validation ; défi de transfert ; parité fr/en ; parcours complet de l'acte 1.
- **Critère de sortie** : l'acte 1 se joue de bout en bout, à la souris, au doigt et au clavier, sur 320, 375 et 768 px, avec les trois niveaux d'aide observés.
- **Livraison** : revue pédagogique d'un enseignant avant poursuite.

### Tranche 6 — Actes 2 et 3

- **Livrable** : `ShopBoard`, mode `makeChange`, règles de note, de rendu et de caisse limitée ; contenu des actes 2 et 3.
- **Tests** : règles de rendu avec caisse limitée ; refus du paiement insuffisant sans effet ; note tachée ; estimation.
- **Dépendance** : tranche 5 validée.

### Tranche 7 — Acte 4 et défi final

- **Livrable** : `BudgetBar`, `ChainBuilder`, règle de chaîne de comptes ; contenu de l'acte 4.
- **Tests** : chaîne acceptée dans deux ordres équivalents ; solde faux isolé ; budget dépassé non validable ; transfert.

### Tranche 8 — Évaluation d'unité et documentation

- **Livrable** : évaluation par situations (D5), documentation de fonctionnement (`docs/`), mise à jour de l'audit.
- **Critère de sortie** : les trois questions finales du projet reçoivent une réponse positive en revue (§6).

## 5. Dépendances

```
D0, D1, D2, D3 ──► T1 ──► T2 ──► T3 ──► T4 ──► T5 ──► T6 ──► T7 ──► T8
                                       ▲
                          D2 (visuels) ┘
PR #65 (widgets, registre, test d'intégrité) ──► toutes les tranches
```

Prérequis sur la PR #65 : la branche doit rester stable (pas de réécriture d'historique) ; si elle bouge, chaque tranche empilée est mise à jour par fusion de la branche de base.

## 6. Critère de qualité à la fin de chaque acte

Trois questions, posées par un relecteur qui joue l'acte comme un enfant :

1. L'enfant a-t-il vécu une situation dans laquelle les mathématiques avaient une véritable utilité ?
2. A-t-il compris la notion grâce à ses observations, ses manipulations et ses raisonnements ?
3. Est-il capable de réutiliser cette connaissance pour résoudre un problème différent ?

Une réponse négative à l'une d'elles renvoie l'acte en amélioration avant la tranche suivante.

## 7. Risques

| # | Risque | Probabilité | Effet | Parade |
| --- | --- | --- | --- | --- |
| R1 | Les scénarios deviennent un moteur généraliste coûteux | Moyenne | Retard, dette | Noyau minimal ; règles en petites fonctions ; revue après la tranche 3. |
| R2 | Le scénario est trop long pour une leçon de 30 minutes (9 scènes par acte) | Moyenne | Fatigue, abandon | Chronométrer en essai ; scènes d'entraînement fusionnables ; possibilité de scinder un acte. |
| R3 | Manipulation tactile difficile (petites cartes, 17 objets) | Moyenne | Frustration | Piles avec compteur ; cibles ≥ 44 px ; tests sur téléphone. |
| R4 | Incohérence entre l'état d'histoire et la progression des étapes | Moyenne | Boucles, états fantômes | Module de remise à zéro unique ; tests de retour et de rejeu. |
| R5 | Conflit avec la PR #65 (catalogue, index de contenu, JSON de traduction) | Moyenne | Reprises de fusion | Branches empilées sur #65 ; fichiers de scénario séparés ; peu de fichiers partagés. |
| R6 | Dépendance entre cours (visuels de la 2e primaire) | Faible | Régression à la 2e | Importer sans modifier ; extraire plus tard en PR séparée (D2). |
| R7 | Duplication de code détectée par l'analyse qualité | Moyenne | Porte qualité en échec | Données séparées de la logique ; composants partagés ; vérifier tôt. |
| R8 | Couverture insuffisante sur le nouveau code | Moyenne | Porte qualité en échec | Tests de logique pure en premier ; seuil de 80 % surveillé à chaque tranche. |
| R9 | Qualité pédagogique mal jugée par un build vert | Élevée | Faux sentiment de réussite | Revue pédagogique obligatoire à la fin de chaque acte ; observation d'élèves. |
| R10 | Prix ou contexte inadaptés | Moyenne | Rejet par les enseignants | Revue du scénario (D6) avant toute implémentation. |
| R11 | Suite de tests lente sous charge | Moyenne | Échecs intermittents | Tests de logique rapides ; délais des tests lourds explicites ; ne pas alourdir les tests de page. |
| R12 | Le suivi d'autonomie est perçu comme une note | Faible | Stress de l'enfant | Formulations non évaluatives ; aucune pénalité ; aucune donnée sortante. |

## 8. Phase E — généralisation

Pas de conversion en masse. Une unité à la fois, chacune avec son scénario et sa validation, dans cet ordre indicatif :

| Ordre | Unité | Histoire envisagée | Remarques |
| --- | --- | --- | --- |
| 1 | 6 Monnaie | Pilote | Voir ce plan. |
| 2 | 3 Soustraire | Stock du marché (ventes, commande impossible, écart) | Reprend la logique de l'exemple de référence, noyau déjà prêt. |
| 3 | 4 Multiplier, partager | Répartition des fruits dans des paniers, groupes égaux, reste | Distribution objet par objet (réemploi du modèle `distribute` de 2e). |
| 4 | 9 Temps | Une journée d'école, ligne du temps manipulable | Horloge déjà réalisée ; manque la ligne du temps. |
| 5 | 5 Fractions | Partage d'une galette, comparaison de parts à tout égal | Nécessite des objets pliables ou superposables. |
| 6 | 2 Additionner | Un dépôt qui reçoit des livraisons ; échanges visibles (retenue) | Nécessite la manipulation des échanges. |
| 7 | 7 Mesures | Chantier ou jardin : mesurer, choisir l'instrument, clôturer | Nécessite règle et balance manipulables ; unité aujourd'hui sans manipulation. |
| 8 | 8 Géométrie | Plan du quartier, patron d'une boîte, tracés à la règle | Nécessite le tracé ; plus de développement. |
| 9 | 10 Données, problèmes | Sondage réel, problèmes à plusieurs étapes, création de défis | Réemploie le défi de chaîne de comptes. |

Pour chaque unité : audit rapide, scénario, validation, tranche, revue. L'ordre peut changer selon les retours du pilote et la disponibilité d'enseignants relecteurs. Les unités 1 et 2 de la 2e primaire et la 1re primaire ne sont pas concernées ici.

## 9. Ce que cette mission ne fait pas

- Modifier du code de production ou fusionner une PR.
- Introduire de la persistance, de l'audio, de la vidéo, de l'IA ou une dépendance importante.
- Convertir toutes les leçons en une opération unique.
- Présenter un build réussi comme preuve de qualité pédagogique.
