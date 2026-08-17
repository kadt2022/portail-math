export const CALCULATIONS_PER_LEVEL = 12;
export const INTRUSION_LIMITS = [5, 5, 4, 4, 3, 2, 1] as const;
export const MAX_FRUITS = 12;

// Bandeau HUD réservé en haut du monde de jeu (960x540) : le calcul « À
// résoudre » et, en plein écran, les commandes Pause/Quitter y sont affichés.
// Cette zone n'est jamais une zone de circulation des fruits — c'est une
// limite de gameplay réelle, pas un simple recouvrement visuel (z-index).
export const HUD_SAFE_TOP = 78;
const HUD_SAFE_MARGIN = 6;

export interface FruitSpawnYRange {
  min: number;
  max: number;
}

// Calcule la plage verticale où un fruit peut apparaître/se déplacer, en
// excluant systématiquement le bandeau HUD (et une marge de sécurité) et une
// bande basse réservée au décor de sol.
export function fruitSpawnYRange(
  radius: number,
  worldHeight: number,
  hudSafeTop: number = HUD_SAFE_TOP,
  floorMargin = 130,
): FruitSpawnYRange {
  return {
    min: hudSafeTop + radius + HUD_SAFE_MARGIN,
    max: worldHeight - floorMargin,
  };
}

// Monde de référence (voir TurboPulseGame.ts) : le monde réel suit la taille
// du conteneur (Scale.RESIZE), mais toutes les tailles visuelles/hitboxes
// ci-dessous sont conçues pour cette résolution — c'est le point de départ
// du facteur visuel borné (voir getTurboPulseVisualMetrics).
export const REFERENCE_WORLD_WIDTH = 960;
export const REFERENCE_WORLD_HEIGHT = 540;
export const FRUIT_RADIUS = 31;
// Marge de tolérance de tir ajoutée au rayon pour la détection de collision
// (facilite le ciblage tactile) : réduite avec le fruit, jamais fixe.
export const FRUIT_HIT_MARGIN = 22;
export const CANNON_X = 178;
// Distance fixe (à l'échelle 1) entre le bas du monde de référence et le
// centre du canon (540 - 465) : réduite avec le reste du canon sur petit
// écran pour rester ancré près du bas sans dévorer une part disproportionnée
// d'un monde déjà réduit.
export const CANNON_BOTTOM_MARGIN = 75;

export function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

const MIN_VISUAL_SCALE = 0.68;
const MAX_VISUAL_SCALE = 1;

export interface TurboPulseVisualMetrics {
  scale: number;
  fruitRadius: number;
  fruitHitRadius: number;
  cannonScale: number;
  cannonX: number;
  cannonBottomMargin: number;
  emojiFontSize: number;
  numberFontSize: number;
  numberFontSizeLarge: number;
  labelFontSize: number;
  cannonBadgeFontSize: number;
  projectileFontSize: number;
}

// Facteur visuel unique et borné : un grand écran révèle davantage de
// terrain de jeu (le monde Phaser suit déjà la taille réelle du conteneur,
// voir worldWidth/worldHeight) mais ne doit jamais agrandir les objets
// au-delà de leur taille de référence (960×540) — sinon on ne fait que
// reproduire, en sens inverse, le défaut qu'a corrigé le passage de
// Scale.FIT à Scale.RESIZE. À l'inverse, sur un petit écran (ex. téléphone
// Android en paysage, où la scène peut ne faire que ~300px de haut une fois
// le panneau d'informations retiré), le facteur réduit ensemble fruits,
// canon, textes ET leurs hitboxes de collision, jusqu'à un plancher de 0.68
// pour rester jouable. Le minimum dépend de la largeur ET de la hauteur : un
// monde étroit OU bas doit réduire les objets, pas seulement l'un des deux.
export function getTurboPulseVisualMetrics(worldWidth: number, worldHeight: number): TurboPulseVisualMetrics {
  const scale = clamp(
    Math.min(worldWidth / REFERENCE_WORLD_WIDTH, worldHeight / REFERENCE_WORLD_HEIGHT),
    MIN_VISUAL_SCALE,
    MAX_VISUAL_SCALE,
  );
  return {
    scale,
    fruitRadius: FRUIT_RADIUS * scale,
    fruitHitRadius: (FRUIT_RADIUS + FRUIT_HIT_MARGIN) * scale,
    cannonScale: scale,
    cannonX: CANNON_X * scale,
    cannonBottomMargin: CANNON_BOTTOM_MARGIN * scale,
    emojiFontSize: 31 * scale,
    numberFontSize: 22 * scale,
    numberFontSizeLarge: 18 * scale,
    labelFontSize: 10 * scale,
    cannonBadgeFontSize: 20 * scale,
    projectileFontSize: 18 * scale,
  };
}

export type FruitColor = "red" | "green" | "purple" | "orange" | "yellow" | "pink";
export type Operator = "+" | "−" | "×";
export type RandomSource = () => number;

export interface TurboLevel {
  name: string;
  minMs: number;
  maxMs: number;
  batchMin: number;
  batchMax: number;
  minResult: number;
  maxResult: number;
  mathLabel: string;
}

export const TURBO_LEVELS: readonly TurboLevel[] = [
  { name: "Découverte", minMs: 5000, maxMs: 6500, batchMin: 1, batchMax: 1, minResult: 2, maxResult: 10, mathLabel: "petites additions jusqu’à 10" },
  { name: "Low", minMs: 4000, maxMs: 5200, batchMin: 1, batchMax: 2, minResult: 3, maxResult: 18, mathLabel: "additions à un chiffre" },
  { name: "Medium Low", minMs: 3000, maxMs: 4000, batchMin: 1, batchMax: 2, minResult: 5, maxResult: 30, mathLabel: "additions et soustractions simples" },
  { name: "Medium", minMs: 2200, maxMs: 3000, batchMin: 2, batchMax: 2, minResult: 10, maxResult: 50, mathLabel: "additions et soustractions plus grandes" },
  { name: "High", minMs: 1500, maxMs: 2200, batchMin: 2, batchMax: 3, minResult: 10, maxResult: 80, mathLabel: "calculs à deux chiffres et multiplications" },
  { name: "X High", minMs: 750, maxMs: 1050, batchMin: 3, batchMax: 4, minResult: 20, maxResult: 120, mathLabel: "calculs avancés rapides" },
  { name: "Ultra High", minMs: 420, maxMs: 650, batchMin: 4, batchMax: 5, minResult: 25, maxResult: 200, mathLabel: "calcul expert jusqu’à 200" },
] as const;

interface FruitVariant {
  key: FruitColor;
  label: string;
  color: number;
}

interface FruitFamily {
  family: string;
  label: string;
  emoji: string;
  variants: readonly FruitVariant[];
}

export const FRUIT_FAMILIES: readonly FruitFamily[] = [
  { family: "tomato", label: "tomate", emoji: "🍅", variants: [{ key: "red", label: "rouge", color: 0xe94f4f }, { key: "green", label: "verte", color: 0x62a84f }] },
  { family: "apple", label: "pomme", emoji: "🍎", variants: [{ key: "red", label: "rouge", color: 0xd94343 }, { key: "green", label: "verte", color: 0x79b94f }] },
  { family: "avocado", label: "avocat", emoji: "🥑", variants: [{ key: "green", label: "vert", color: 0x69a84f }, { key: "yellow", label: "jaune", color: 0xd8c24a }] },
  { family: "grape", label: "raisin", emoji: "🍇", variants: [{ key: "purple", label: "violet", color: 0x845ec2 }, { key: "green", label: "vert", color: 0x8bbf55 }] },
  { family: "orange", label: "orange", emoji: "🍊", variants: [{ key: "orange", label: "orange", color: 0xf08b32 }, { key: "yellow", label: "jaune", color: 0xe7c83f }] },
  { family: "berry", label: "fraise", emoji: "🍓", variants: [{ key: "red", label: "rouge", color: 0xe95464 }, { key: "pink", label: "rose", color: 0xe98aa7 }] },
] as const;

export interface FruitSpec {
  id: number;
  family: string;
  familyLabel: string;
  emoji: string;
  variant: FruitColor;
  variantLabel: string;
  color: number;
  number: number;
}

export interface Operation {
  left: number;
  right: number;
  operator: Operator;
  result: number;
}

export interface ExpertFailures {
  5: number;
  6: number;
}

export interface FailureResolution {
  action: "retry" | "restart-run";
  failures: ExpertFailures;
  attemptUsed: number | null;
}

export function randomInt(minimum: number, maximum: number, rng: RandomSource = Math.random): number {
  return Math.floor(rng() * (maximum - minimum + 1)) + minimum;
}

export function tripletKey(fruit: Pick<FruitSpec, "family" | "variant" | "number">): string {
  return `${fruit.family}:${fruit.variant}:${fruit.number}`;
}

export function hasDuplicateTriplets(fruits: readonly FruitSpec[]): boolean {
  return new Set(fruits.map(tripletKey)).size !== fruits.length;
}

function identityFrom(family: FruitFamily, variant: FruitVariant) {
  return {
    family: family.family,
    familyLabel: family.label,
    emoji: family.emoji,
    variant: variant.key,
    variantLabel: variant.label,
    color: variant.color,
  };
}

function randomIdentity(rng: RandomSource) {
  const family = FRUIT_FAMILIES[randomInt(0, FRUIT_FAMILIES.length - 1, rng)];
  const variant = family.variants[randomInt(0, family.variants.length - 1, rng)];
  return identityFrom(family, variant);
}

export function createFruitSpec(existing: readonly FruitSpec[], levelIndex: number, nextId: number, rng: RandomSource = Math.random): FruitSpec {
  const level = TURBO_LEVELS[levelIndex];
  const model = existing.length > 0 && rng() < 0.58 ? existing[randomInt(0, existing.length - 1, rng)] : null;
  const identity = model
    ? { family: model.family, familyLabel: model.familyLabel, emoji: model.emoji, variant: model.variant, variantLabel: model.variantLabel, color: model.color }
    : randomIdentity(rng);
  const occupied = new Set(existing.filter((fruit) => fruit.family === identity.family && fruit.variant === identity.variant).map((fruit) => fruit.number));
  const reusable = existing.filter((fruit) => fruit.variant !== identity.variant && !occupied.has(fruit.number));
  const candidates = Array.from({ length: level.maxResult - level.minResult + 1 }, (_, index) => level.minResult + index).filter((number) => !occupied.has(number));
  // candidates peut être vide : si assez de fruits de cette même
  // famille/variante sont déjà en jeu (plage de niveau parfois réduite, ex.
  // 9 valeurs seulement au niveau 1) pour occuper TOUTES les valeurs
  // possibles, candidates[randomInt(0, -1)] valait alors `undefined` — un
  // nombre de fruit corrompu qui cassait ensuite le calcul affiché (NaN) et
  // la détection de la bonne réponse. reusable en repli, puis en dernier
  // recours une valeur du niveau même déjà occupée (doublon accepté), jamais
  // un fruit sans nombre.
  const number = candidates.length > 0
    ? (reusable.length > 0 && rng() < 0.52 ? reusable[randomInt(0, reusable.length - 1, rng)].number : candidates[randomInt(0, candidates.length - 1, rng)])
    : reusable.length > 0
      ? reusable[randomInt(0, reusable.length - 1, rng)].number
      : randomInt(level.minResult, level.maxResult, rng);
  return { id: nextId, ...identity, number };
}

export function createStartingFruitSpecs(levelIndex: number, rng: RandomSource = Math.random): FruitSpec[] {
  const level = TURBO_LEVELS[levelIndex];
  const sharedResult = randomInt(Math.max(level.minResult, levelIndex === 0 ? 4 : level.minResult), Math.min(level.maxResult, levelIndex === 0 ? 9 : level.maxResult), rng);
  const tomatoRed = identityFrom(FRUIT_FAMILIES[0], FRUIT_FAMILIES[0].variants[0]);
  const avocadoGreen = identityFrom(FRUIT_FAMILIES[2], FRUIT_FAMILIES[2].variants[0]);
  const fruits: FruitSpec[] = [{ id: 1, ...tomatoRed, number: sharedResult }, { id: 2, ...avocadoGreen, number: sharedResult }];
  fruits.push(createFruitSpec(fruits, levelIndex, 3, rng));
  return fruits;
}

function makeAddition(result: number, minimumOperand: number, preferredMaximum: number, rng: RandomSource): Operation {
  const minimumLeft = Math.max(minimumOperand, result - preferredMaximum);
  const maximumLeft = Math.min(preferredMaximum, result - minimumOperand);
  const left = minimumLeft <= maximumLeft ? randomInt(minimumLeft, maximumLeft, rng) : Math.max(1, Math.floor(result / 2));
  return { left, right: result - left, operator: "+", result };
}

function makeSubtraction(result: number, minimumSubtrahend: number, maximumSubtrahend: number, rng: RandomSource): Operation {
  const right = randomInt(minimumSubtrahend, maximumSubtrahend, rng);
  return { left: result + right, right, operator: "−", result };
}

function factorPairs(result: number, maximumFactor: number): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  for (let left = 2; left <= maximumFactor; left += 1) {
    const right = result / left;
    if (Number.isInteger(right) && right >= 2 && right <= maximumFactor) pairs.push([left, right]);
  }
  return pairs;
}

export function operationForResult(result: number, levelIndex: number, rng: RandomSource = Math.random): Operation {
  if (levelIndex === 0) return makeAddition(result, 1, 5, rng);
  if (levelIndex === 1) return makeAddition(result, 1, 9, rng);
  if (levelIndex === 2) return rng() < 0.55 ? makeAddition(result, 1, 18, rng) : makeSubtraction(result, 1, 9, rng);
  if (levelIndex === 3) return rng() < 0.5 ? makeAddition(result, 5, 35, rng) : makeSubtraction(result, 5, 20, rng);
  const maximumFactor = levelIndex === 4 ? 10 : levelIndex === 5 ? 20 : 25;
  const pairs = factorPairs(result, maximumFactor);
  const roll = rng();
  if (pairs.length > 0 && roll < (levelIndex >= 5 ? 0.38 : 0.28)) {
    const [left, right] = pairs[randomInt(0, pairs.length - 1, rng)];
    return { left, right, operator: "×", result };
  }
  if (roll < 0.68) return makeAddition(result, levelIndex >= 5 ? 10 : 5, levelIndex === 4 ? 55 : levelIndex === 5 ? 90 : 140, rng);
  return makeSubtraction(result, levelIndex === 4 ? 5 : levelIndex === 5 ? 12 : 18, levelIndex === 4 ? 30 : levelIndex === 5 ? 55 : 90, rng);
}

export function formatOperation(operation: Operation): string {
  return `${operation.left} ${operation.operator} ${operation.right}`;
}

export function chooseTargetResult(fruits: readonly FruitSpec[], rng: RandomSource = Math.random): number | null {
  if (fruits.length === 0) return null;
  const colorsByNumber = new Map<number, Set<FruitColor>>();
  fruits.forEach((fruit) => {
    const colors = colorsByNumber.get(fruit.number) ?? new Set<FruitColor>();
    colors.add(fruit.variant);
    colorsByNumber.set(fruit.number, colors);
  });
  const strategic = [...colorsByNumber].filter(([, colors]) => colors.size >= 2).map(([number]) => number);
  const choices = strategic.length > 0 ? strategic : fruits.map((fruit) => fruit.number);
  return choices[randomInt(0, choices.length - 1, rng)];
}

export function comboForHit(fruits: readonly FruitSpec[], selected: FruitSpec): FruitSpec[] {
  return fruits.filter((fruit) => fruit.variant === selected.variant);
}

export function hasFullyCrossedDefense(centerX: number, radius: number, defenseLineX: number): boolean {
  return centerX + radius < defenseLineX;
}

export function registerFailure(levelIndex: number, current: ExpertFailures): FailureResolution {
  const failures = { ...current };
  if (levelIndex < 5) return { action: "retry", failures, attemptUsed: null };
  failures[levelIndex as 5 | 6] += 1;
  return { action: failures[levelIndex as 5 | 6] >= 3 ? "restart-run" : "retry", failures, attemptUsed: failures[levelIndex as 5 | 6] };
}
