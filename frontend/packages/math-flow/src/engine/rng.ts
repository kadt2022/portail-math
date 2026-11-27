/** Source de hasard (0 inclus, 1 exclu) : reproductible à partir d'une graine, pour que les plateaux soient rejouables et testables. */
export type Rng = () => number;

/** mulberry32 : petit générateur déterministe. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randomInt = (rng: Rng, min: number, max: number): number => min + Math.floor(rng() * (max - min + 1));

export function shuffled<T>(items: readonly T[], rng: Rng): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [result[index], result[other]] = [result[other] as T, result[index] as T];
  }
  return result;
}
