# Proposition technique — des exercices isolés aux expériences continues

Proposition pour revue. Aucun code n'est écrit. Objectif : rendre possible le scénario de `02-scenario-pilote-unite-6.md` avec les **adaptations minimales**, en gardant l'architecture pilotée par les données de la PR #65.

## 1. Ce qui est préservé

| Principe actuel | Décision |
| --- | --- |
| Aucune page React par leçon | **Conservé.** Une seule page de leçon (`PrimaryThreeLessonPage`). |
| Contenu en données (`content/unit-XX.ts`), textes en i18n | **Conservé.** Les scénarios sont des données, les textes des clés i18n. |
| Neuf étapes par leçon, progression par étape (`course-engine`) | **Conservé.** Une scène se rattache à une étape ; le catalogue et `course-progress` ne changent pas. |
| Progression en mémoire de session, aucune persistance | **Conservé.** L'état de l'histoire a la même durée de vie. |
| Parité français/anglais testée | **Conservé et étendu** aux scénarios. |
| Répartiteur `InteractiveExercise` | **Point d'extension** : les leçons sans scénario continuent de s'en servir. |

## 2. Exigences issues du scénario

1. Un **état partagé** entre les scènes d'une leçon (porte-monnaie, panier, caisse, budget).
2. Des **objets manipulables** déplacés entre des **zones**, avec invariants de conservation.
3. Des **règles de validation** exprimées comme des fonctions pures (paiement exact, rendu, budget, chaîne de comptes).
4. Des **aides en trois niveaux** et la qualification autonome / avec indice / guidée.
5. Un comportement explicite de **retour, rejeu et recommencement**.
6. Des **interventions de Yamba** déterministes, contextualisées.
7. Des **alternatives accessibles** au glisser-déposer.
8. Un contenu **fr/en** vérifié par test.

## 3. Principe : trois couches séparées

```
  données (scénario)        logique pure (sans React)         présentation (React)
  ─────────────────         ─────────────────────────         ────────────────────
  StoryLesson               ledger : zones, objets,           StoryScene (répartiteur)
   ├ scènes                   transactions, invariants        CardZones, ShopBoard,
   ├ état initial           rules : paiement, rendu,          BudgetBar, ChainBuilder,
   ├ textes (clés i18n)       budget, chaîne, minimum         YambaSays, AssistButton
   └ aides, effets          assistance : niveaux, qualification
                            run : transitions, retour, rejeu
```

Règle de dépendance : la présentation dépend de la logique et des données ; **la logique ne dépend ni de React ni de l'i18n** (elle renvoie des codes d'erreur, la présentation choisit le texte). Cela permet de tester la partie qui porte la rigueur mathématique sans rendu.

Modèle suivi : `courses/primary-two/interactive/logic.ts` (fonctions pures, testées) et le motif « validation déclarative » de `activities.tsx`.

## 4. Proposition de modèle de contenu

Nouveau dossier `frontend/src/courses/primary-three/story/`.

### 4.1 Données

```ts
// story/story-model.ts  (esquisse)
export type ObjectKind = `card:${50 | 100 | 200 | 500 | 1000}` | `article:${string}`;
export type ZoneId = string;                    // "purse", "counter", "basket", "till", ...
export type Counts = Readonly<Partial<Record<ObjectKind, number>>>;

export interface StoryLesson {
  lessonId: string;                             // ex. "MATH-3P-U06-L01"
  initialState: Readonly<Record<ZoneId, Counts>>;
  prices?: Readonly<Record<string, number>>;    // article -> FC
  scenes: readonly Scene[];
}

export interface Scene {
  id: string;                                   // "u06l01-s03"
  stepKind: LessonStepKind;                     // rattachement à une étape existante
  yamba: { intro: string; success: string; /* clés i18n */ };
  interaction: Interaction;                     // voir 4.2
  rule: RuleRef;                                // fonction de validation (4.3)
  assistance: readonly [string, string, string?]; // aide 1, 2, (3 si autorisée)
  allowDemonstration: boolean;                  // faux dans les scènes de transfert
  effects: readonly Effect[];                   // appliqués une seule fois à la validation
}
```

Une étape peut regrouper plusieurs scènes ; elle est validée quand ses scènes le sont. Le nombre d'étapes du catalogue ne change pas.

### 4.2 Types d'interaction nécessaires au pilote

| Interaction | Sert aux scènes | Description |
| --- | --- | --- |
| `sort` | 1.2 | Ranger des objets dans des tiroirs. |
| `pay` | 1.3, 1.4, 1.5, 1.9 | Poser des cartes sur le comptoir, payer, voir les objets changer de zone. |
| `explore` | 1.6, 1.7 | Table de comptage (bac à sable), pas de dépense. |
| `basket` | 2.x | Étal, quantités, note qui s'écrit, total. |
| `makeChange` | 3.x | Former le rendu avec les cartes de la caisse. |
| `budget` | 4.x | Barre de budget gradué, reste ou dépassement. |
| `chain` | 4.8 | Ranger des événements et écrire les soldes. |
| `choose` | estimation, QCM ponctuels | Réutilise `TextChoice` existant. |

Ce sont des **modes d'un même composant de zones** plus quelques vues, pas neuf composants indépendants (voir §6).

### 4.3 Règles pures

```ts
// story/rules.ts  (signatures)
export function exactPayment(counter: Counts, price: number): RuleResult;
export function minimalCardCount(target: number, available: Counts): number | null;   // petit sac à dos
export function changeIsRight(given: number, price: number, change: Counts, till: Counts): RuleResult;
export function budgetStatus(total: number, budget: number): { within: boolean; rest: number; over: number };
export function chainIsConsistent(events: readonly ChainEvent[], answers: readonly number[]): ChainResult;
```

`RuleResult` = `{ ok: true } | { ok: false; code: "short" | "over" | "missing-card" | "wrong-order" | … ; detail? }`. Les codes sont associés à des clés d'aide dans les données.

### 4.4 Noyau d'état (`ledger.ts`)

```ts
export type Ledger = Readonly<Record<ZoneId, Counts>>;
export function move(l: Ledger, from: ZoneId, to: ZoneId, kind: ObjectKind, n: number): Ledger | StateError;
export function total(zone: Counts, priceOf: (k: ObjectKind) => number): number;
export function conserves(before: Ledger, after: Ledger, allowed: readonly Effect[]): boolean;
```

- Immuable (copie à chaque transition), donc facile à tester et à restaurer.
- `move` refuse tout mouvement qui rendrait une quantité négative.
- `conserves` sert aux tests : après n'importe quelle suite d'actions valides, la quantité par type ne change que par un effet déclaré.

Le noyau ne connaît pas les mangues, les cartes ni les crayons : les objets sont des **types nommés avec une valeur**. Il sert donc aussi à un stock de mangues (scènes 2 à 4 de l'exemple de référence) sans modification. Il ne contient **pas** de moteur de règles générique : les règles sont de petites fonctions séparées, ajoutées au besoin.

### 4.5 Assistance et qualification

```ts
export type AssistLevel = 0 | 1 | 2 | 3;
export interface SceneAssist { level: AssistLevel; errors: number }
export function nextAssist(a: SceneAssist, requestedByChild: boolean, allowDemo: boolean): SceneAssist;
export function qualify(level: AssistLevel): "autonomous" | "hinted" | "guided";   // 0-1 / 2 / 3
```

Le niveau retenu est **le plus élevé atteint avant la réussite**. Aucune donnée personnelle ; les valeurs sont gardées avec l'état de l'histoire.

### 4.6 Exécution (`run.ts`, `useStoryRun.ts`)

Un `StoryRun` en mémoire, clé = identifiant de leçon, vit dans une `Map` comme `sessionProgress` aujourd'hui :

```ts
interface StoryRun {
  ledger: Ledger;                              // état courant
  snapshots: Record<SceneId, Ledger>;          // état au début de chaque scène
  results: Record<SceneId, { level: AssistLevel; done: true }>;
}
```

Actions : `act(sceneId, action)`, `validate(sceneId)`, `review(sceneId)` (lecture seule), `replay(sceneId)` (restaure l'instantané, efface les résultats des scènes suivantes), `restart()` (état initial, invalide les étapes via `invalidateLearningStep`). Les transactions d'une scène sont **idempotentes par identifiant de scène** : valider deux fois n'applique pas deux fois les effets.

Réinitialisation : `resetSessionCourseProgress()` doit aussi vider les `StoryRun` (une seule fonction de remise à zéro pour les tests et l'application).

## 5. Intégration dans la page de leçon

Modification **minimale** de `PrimaryThreeLessonPage.tsx` :

```tsx
const story = PRIMARY_THREE_STORY_CONTENT[item.id];        // nouveau registre
...
function renderStep() {
  if (story) return <StoryStep story={story} stepKind={step.kind} ... />;   // nouveau
  ...existant...
}
```

- `StoryStep` affiche les scènes de l'étape courante et appelle `onValidated` comme le font aujourd'hui les exercices (la page, la barre de progression et le bouton « Continuer » sont inchangés).
- Les étapes d'information (situation, découverte, retenir) restent des blocs, mais **leur texte et leurs visuels viennent de la scène** : l'histoire se continue sans rupture.
- Une leçon sans scénario fonctionne exactement comme aujourd'hui : l'extension est **additive**, ce qui permet de déployer l'histoire de l'unité 6 sans toucher aux 35 autres leçons.

## 6. Composants de présentation

| Composant | Rôle | Réutilisation |
| --- | --- | --- |
| `YambaSays` | Bulle de dialogue pilotée par événement (intro, réussite, aide 1-3). | `YambaGuide` |
| `CardZones` | Zones d'objets (porte-monnaie, comptoir, caisse, tiroirs) ; sélection puis zone, ou glisser. | `MoneyPiece`, `ItemGlyph`, `ProductGlyph` (2e primaire) |
| `ShopBoard` | Étal, panier, quantités, note qui s'écrit, total. | `ProductGlyph`, `NumericStepper` |
| `BudgetBar` | Barre graduée, ligne de limite, reste ou dépassement écrits. | nouveau, simple |
| `ChainBuilder` | Ranger des événements, écrire les soldes. | `StepOrder` (idée), composant propre |
| `AssistButton` | Demande d'aide volontaire. | nouveau, simple |

**Cartes de 2e primaire.** `visuals.tsx` est dans `primary-two/interactive/`. Deux voies :

- (a) **importer tels quels** les exports (`MoneyPiece`, `ItemGlyph`, `ProductGlyph`) depuis la 3e primaire : changement minimal, dépendance entre cours ;
- (b) **extraire** vers un dossier partagé avant le pilote : plus propre, mais touche la 2e primaire (risque de régression, relecture supplémentaire).

Recommandation : (a) pour le pilote, (b) dans une PR dédiée avant la généralisation (décision D2). Cela évite de modifier du code livré pour une expérimentation.

### 6.1 Accessibilité

- Toute manipulation est possible **sans glisser** : un objet se sélectionne (bouton), puis une action « Poser sur le comptoir / Reprendre / Mettre dans le tiroir X ».
- Cibles tactiles d'au moins 44 px ; le total de chaque zone est du texte, annoncé par `aria-live="polite"`.
- Aucune information portée par la couleur seule (le dépassement du budget est écrit).
- Clavier : ordre de tabulation logique, `Entrée` et `Espace` sur les boutons d'objets, focus conservé après un déplacement.
- Pas d'audio obligatoire, pas de vidéo, pas de ressource externe : glyphes CSS/SVG existants.
- Consignes de Yamba courtes ; l'adulte peut les lire à l'enfant.

### 6.2 Mobile

Les zones passent en colonne sous 600 px ; les cartes se superposent en piles avec compteur lisible plutôt qu'en rangées de 17 cartes. Vérification à 320, 375 et 768 px.

## 7. i18n

- Clés dédiées : `story.u06.l01.s03.intro`, `story.u06.l01.s03.help1`, `…help2`, `…help3`, `…success`, plus les textes de lieu et de personnage.
- Une clé par événement de Yamba ; paramètres nommés (`{{amount}}`, `{{item}}`) pour contextualiser sans multiplier les phrases.
- Le test d'intégrité existant est étendu : toute clé référencée par un scénario existe en français et en anglais, toute scène a ses trois aides (deux dans le transfert), toute transaction est réalisable depuis l'état initial.

## 8. Stratégie de test

| Thème | Niveau | Ce qu'on vérifie |
| --- | --- | --- |
| Cohérence des quantités, conservation | Unité (`ledger`) + test sur suites d'actions aléatoires (graine fixe) | Quantités ≥ 0 ; conservation par type ; aucun doublon. |
| Actions invalides | Unité | Déplacement impossible refusé sans effet ; paiement insuffisant sans effet. |
| Règles | Unité (`rules`) | Paiement exact, minimum de cartes, rendu avec caisse limitée, budget, chaîne. |
| Aides progressives, tentatives répétées | Unité (`assistance`) | Niveaux 1 → 2 → 3 ; pas de niveau 3 dans le transfert ; qualification. |
| Retour, rejeu, recommencement | Unité (`run`) + intégration | Lecture seule, instantané restauré, effets non rejoués, étapes invalidées. |
| Conditions de validation, progression | Intégration (page de leçon) | Étape validée uniquement quand ses scènes le sont ; « Continuer » ; fin de leçon. |
| Défi de transfert | Intégration | Scène finale réussie en contexte neuf ; aides limitées. |
| Accessibilité des manipulations | Composant | Réalisable au clavier ; libellés ; annonces `aria-live`. |
| Mobile | Vérification navigateur 320/375/768 px + test de structure | Pas de débordement horizontal ; cibles ≥ 44 px. |
| Parité fr/en | Intégrité de contenu | Mêmes clés, aucun repli sur le français. |

Un build réussi n'est pas une preuve pédagogique. La qualité se jugera en revue du scénario et en observation d'enfants ou d'enseignants lors de la phase d'essai.

## 9. Options écartées

| Option | Raison |
| --- | --- |
| Enrichir seulement les widgets (cartes visibles à la place des compteurs) | Utile mais insuffisant : sans état partagé, il n'y a pas de continuité. À faire quand même dans le cadre du pilote pour `MoneyBuilder`. |
| Moteur de scénarios généraliste (règles déclaratives, langage de script) | Disproportionné avant d'avoir validé un besoin réel ; complexité et dette de test. |
| Une page React par histoire | Contraire à l'architecture pilotée par les données. |
| Persistance de l'état d'histoire (stockage local ou serveur) | Hors périmètre ; changement de politique à valider séparément. |
| Service d'IA pour les retours de Yamba | Hors périmètre de cette version ; retours déterministes. |
| Nouvelle bibliothèque de glisser-déposer | Aucune dépendance nouvelle sans approbation ; sélection puis zone, plus glisser natif facultatif. |

## 10. Estimation d'effort (ordre de grandeur)

| Bloc | Lignes de code (approx.) |
| --- | ---: |
| `ledger` + `rules` + `assistance` + `run` (pur) | 500 à 700 |
| Composants (`CardZones`, `ShopBoard`, `BudgetBar`, `ChainBuilder`, `YambaSays`, `AssistButton`) | 600 à 900 |
| Intégration page + registre | 80 à 150 |
| Contenu unité 6 (4 actes, fr/en) | 1 200 à 1 800 de données et textes |
| Tests | 1 000 à 1 500 |

Une tranche verticale (acte 1 seul) coûte environ 40 % de l'ensemble, car le noyau, l'assistance et les composants de base sont créés à ce moment.

## 11. Questions techniques ouvertes

1. L'état de l'histoire doit-il être pris en compte par `resetSessionCourseProgress()` (recommandé : oui, une seule remise à zéro) ?
2. Les scènes d'une même étape se valident-elles dans l'ordre imposé (recommandé : oui) ?
3. Souhaite-t-on un mode « simulation » indépendant de la progression pour réviser une scène ?
4. Le suivi d'autonomie doit-il être visible par l'enfant en fin de leçon (recommandé : oui, en langage non évaluatif) ?
5. Faut-il versionner le format de scénario (`version: 1`) pour permettre une évolution compatible ?
