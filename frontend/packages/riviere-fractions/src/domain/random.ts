// Hasard reproductible : la même graine donne toujours les mêmes questions et les mêmes positions, ce qui rend les
// règles du niveau vérifiables par des tests.

export interface Random {
  /** Nombre dans [0, 1). */
  next(): number;
  /** Entier dans [min, max], bornes comprises. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  shuffle<T>(items: readonly T[]): T[];
}

/** Générateur mulberry32 : rapide, suffisant pour du contenu de jeu, et identique sur tous les navigateurs. */
export function createRandom(seed: number): Random {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    pick: (items) => {
      if (items.length === 0) throw new RangeError("Impossible de choisir dans une liste vide.");
      return items[int(0, items.length - 1)];
    },
    shuffle: (items) => {
      const copy = [...items];
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = int(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
}

/** Graine tirée du moment présent, pour qu'une nouvelle partie ne reprenne pas les questions de la précédente. */
export function freshSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
