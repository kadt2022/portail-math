import type {
  Accept,
  BuildSpec,
  ClockSpec,
  CollectSpec,
  DistributeSpec,
  MatchSpec,
  OrderSpec,
  SymmetrySpec,
} from "./types";

// Règles pures des activités : elles ne dépendent ni de React ni des textes,
// ce qui permet de les tester exhaustivement pour toutes les leçons.

/** Lit une saisie d'enfant : chiffres seulement, espaces tolérés (« 1 000 »). */
export function parseAnswer(raw: string): number | null {
  const cleaned = raw.replace(/[\s\u00a0\u202f]/g, "");
  if (!/^-?\d+$/.test(cleaned)) return null;
  return Number(cleaned);
}

export function accepts(accept: Accept, value: number | null): boolean {
  if (value === null) return false;
  if (typeof accept === "number") return value === accept;
  if ("oneOf" in accept) return accept.oneOf.includes(value);
  return value >= accept.min && value <= accept.max && !(accept.not ?? []).includes(value);
}

/** Toutes les valeurs acceptées (pour les tests et l'état « déjà réussi »). */
export function acceptedValues(accept: Accept): number[] {
  if (typeof accept === "number") return [accept];
  if ("oneOf" in accept) return [...accept.oneOf];
  const values: number[] = [];
  for (let value = accept.min; value <= accept.max; value += 1) {
    if (!(accept.not ?? []).includes(value)) values.push(value);
  }
  return values;
}

/** Hachage stable d'une chaîne, pour mélanger toujours de la même façon. */
function hash(text: string) {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

/**
 * Mélange déterministe : la présentation initiale ne doit jamais être déjà
 * dans l'ordre de la réponse. Si le mélange retombe sur l'ordre de départ,
 * on décale d'un cran.
 */
export function shuffle<T>(values: readonly T[], seed: string, forbidden?: readonly T[]): T[] {
  const result = [...values];
  let state = hash(seed) || 1;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    const other = state % (index + 1);
    [result[index], result[other]] = [result[other], result[index]];
  }
  const avoid = forbidden ?? values;
  if (result.length > 1 && result.every((value, index) => value === avoid[index])) {
    result.push(result.shift() as T);
  }
  return result;
}

export function expectedOrder(spec: OrderSpec) {
  const sorted = [...spec.values].sort((a, b) => a - b);
  return spec.direction === "asc" ? sorted : sorted.reverse();
}

/** Première paire mal rangée, pour un indice précis ; null si tout est juste. */
export function firstOrderMistake(spec: OrderSpec, placed: readonly (number | undefined)[]) {
  const expected = expectedOrder(spec);
  if (placed.length < expected.length || placed.some((value) => value === undefined)) return "incomplete" as const;
  for (let index = 0; index < expected.length - 1; index += 1) {
    const a = placed[index] as number;
    const b = placed[index + 1] as number;
    const wrong = spec.direction === "asc" ? a > b : a < b;
    if (wrong) return [a, b] as const;
  }
  return null;
}

export function matchIsCorrect(spec: MatchSpec, placement: Readonly<Record<string, string | undefined>>) {
  return spec.items.every((item) => placement[item.id] === item.bin);
}

export function buildIsCorrect(spec: BuildSpec, values: Readonly<Record<string, number>>) {
  return Object.entries(spec.goal).every(([id, value]) => values[id] === value);
}

export function distributeShares(spec: DistributeSpec) {
  return { each: Math.floor(spec.total / spec.recipients), rest: spec.total % spec.recipients };
}

/** Le partage est équitable quand chacun a la même part et qu'il reste moins d'un tour. */
export function distributionIsFair(spec: DistributeSpec, shares: readonly number[]) {
  const { each } = distributeShares(spec);
  return shares.length === spec.recipients && shares.every((share) => share === each);
}

export function collectTotal(spec: CollectSpec, counts: Readonly<Record<string, number>>) {
  return spec.supply.reduce((total, supply) => total + supply.value * (counts[supply.id] ?? 0), 0);
}

export function collectIsCorrect(spec: CollectSpec, counts: Readonly<Record<string, number>>) {
  const total = collectTotal(spec, counts);
  const items = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const withinLimits = spec.supply.every((supply) => (counts[supply.id] ?? 0) <= (supply.limit ?? Infinity));
  if (!withinLimits) return false;
  if ("equals" in spec.goal) return total === spec.goal.equals;
  return total <= spec.goal.atMost && total >= (spec.goal.atLeast ?? 1) && items >= (spec.goal.minItems ?? 1);
}

export function collectSignature(counts: Readonly<Record<string, number>>) {
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([id, count]) => `${id}:${count}`)
    .join("|");
}

/** Position de la petite aiguille en « demi-heures » : 3 h 30 → 7. */
export function clockIsCorrect(spec: ClockSpec, hour: number, minute: number) {
  return hour === spec.hour && minute === spec.minute;
}

export function symmetryTargets(spec: SymmetrySpec) {
  return spec.left.map(([column, row]) => `${column},${row}`);
}

export function symmetryIsCorrect(spec: SymmetrySpec, right: ReadonlySet<string>) {
  const targets = symmetryTargets(spec);
  return right.size === targets.length && targets.every((cell) => right.has(cell));
}
