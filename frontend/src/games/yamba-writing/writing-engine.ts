// Moteur pur du jeu d'écriture : aucune dépendance à React ni au DOM, aucune connaissance des catégories ni des illustrations.
// Il reçoit un mot (un texte) et gère la manche : cases, lettres mélangées, placement, correction, aide progressive.
// Aucune erreur n'est punie : une mauvaise lettre se retire, rien n'est décompté.

/** Source de hasard (0 inclus, 1 exclu) : `Math.random` en jeu, une suite fixe dans les tests. */
export type Rng = () => number;

/** Une case du mot : une lettre à placer, ou un signe fixe (espace, trait d'union, apostrophe) déjà en place. */
export type Slot = { kind: "letter"; expected: string } | { kind: "fixed"; char: string };

export interface Tile {
  id: number;
  letter: string;
}

export interface RoundState {
  slots: Slot[];
  /** Toutes les lettres proposées (mélangées), dans l'ordre d'affichage. */
  tiles: Tile[];
  /** Pour chaque case : la lettre qui y est posée (identifiant), ou null. Toujours null pour une case fixe. */
  placed: Array<number | null>;
  /** Tentatives complètes mais fausses : elles déclenchent l'aide progressive. */
  wrongAttempts: number;
  status: "playing" | "won";
}

const FIXED_CHARS = new Set([" ", "-", "'", "’"]);

/** Découpe le mot en cases, en majuscules (les accents sont conservés : É n'est pas E). */
export function buildSlots(word: string, locale = "fr"): Slot[] {
  return Array.from(word.trim().toLocaleUpperCase(locale)).map((char) => (FIXED_CHARS.has(char) ? { kind: "fixed", char } : { kind: "letter", expected: char }));
}

function shuffle<T>(items: T[], rng: Rng): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(rng() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

/** Crée une manche : cases vides, lettres mélangées. Le mélange n'est jamais déjà la bonne réponse (quand c'est possible). */
export function createRound(word: string, rng: Rng = Math.random, locale = "fr"): RoundState {
  const slots = buildSlots(word, locale);
  const letters = slots.flatMap((slot) => (slot.kind === "letter" ? [slot.expected] : []));
  const solved = letters.join("");
  let order = shuffle(letters.map((letter, id) => ({ id, letter })), rng);
  // Deux lettres différentes au moins : sinon aucun autre ordre n'existe. Quelques essais suffisent, puis on échange deux lettres.
  for (let attempt = 0; attempt < 5 && order.map((tile) => tile.letter).join("") === solved && new Set(letters).size > 1; attempt += 1) order = shuffle(order, rng);
  if (order.map((tile) => tile.letter).join("") === solved && new Set(letters).size > 1) {
    const first = 0;
    const second = order.findIndex((tile) => tile.letter !== order[0].letter);
    [order[first], order[second]] = [order[second], order[first]];
  }
  return { slots, tiles: order, placed: slots.map(() => null), wrongAttempts: 0, status: "playing" };
}

const isLetterSlot = (state: RoundState, index: number) => state.slots[index]?.kind === "letter";

function tilePosition(state: RoundState, tileId: number): number {
  return state.placed.indexOf(tileId);
}

/** Lettres encore disponibles (non posées), dans l'ordre d'affichage. */
export function availableTiles(state: RoundState): Tile[] {
  return state.tiles.filter((tile) => tilePosition(state, tile.id) < 0);
}

function firstEmptySlot(state: RoundState): number {
  return state.placed.findIndex((tileId, index) => tileId === null && isLetterSlot(state, index));
}

/** Pose une lettre dans la case demandée (ou, sinon, la première case vide). Case occupée : la lettre déjà là revient aux disponibles. */
export function placeTile(state: RoundState, tileId: number, slotIndex?: number): RoundState {
  if (state.status === "won" || !state.tiles.some((tile) => tile.id === tileId)) return state;
  const target = slotIndex ?? firstEmptySlot(state);
  if (target < 0 || !isLetterSlot(state, target)) return state;
  const placed = [...state.placed];
  const from = tilePosition(state, tileId);
  if (from >= 0) placed[from] = null;
  placed[target] = tileId;
  return settle({ ...state, placed });
}

/** Retire la lettre d'une case : elle retourne parmi les lettres disponibles. */
export function removeFromSlot(state: RoundState, slotIndex: number): RoundState {
  if (state.status === "won" || state.placed[slotIndex] == null) return state;
  const placed = [...state.placed];
  placed[slotIndex] = null;
  return { ...state, placed };
}

/** Déplace la lettre d'une case vers une autre : vers une case vide elle s'y pose, vers une case occupée les deux lettres s'échangent. */
export function moveBetweenSlots(state: RoundState, from: number, to: number): RoundState {
  if (state.status === "won" || from === to || state.placed[from] == null || !isLetterSlot(state, to)) return state;
  const placed = [...state.placed];
  [placed[from], placed[to]] = [placed[to], placed[from]];
  return settle({ ...state, placed });
}

/** Lettre posée dans une case, ou null. */
export function letterAt(state: RoundState, slotIndex: number): string | null {
  const tileId = state.placed[slotIndex];
  return tileId == null ? null : (state.tiles.find((tile) => tile.id === tileId)?.letter ?? null);
}

/** Cases dont la lettre posée n'est pas la bonne (à signaler doucement, sans jamais dire quelle lettre convient). */
export function misplacedSlots(state: RoundState): number[] {
  return state.slots.flatMap((slot, index) => (slot.kind === "letter" && state.placed[index] != null && letterAt(state, index) !== slot.expected ? [index] : []));
}

function isFull(state: RoundState): boolean {
  return state.slots.every((slot, index) => slot.kind === "fixed" || state.placed[index] != null);
}

/** Évalue la manche après chaque pose : mot juste, ou tentative complète fausse (comptée pour l'aide, jamais pour une pénalité). */
function settle(state: RoundState): RoundState {
  if (!isFull(state)) return state;
  if (misplacedSlots(state).length === 0) return { ...state, status: "won" };
  return { ...state, wrongAttempts: state.wrongAttempts + 1 };
}

/** Niveau d'aide proposé : 0 aucune ; 1 les mauvaises lettres sont signalées ; 2 une lettre est offerte. */
export function helpLevel(state: RoundState): 0 | 1 | 2 {
  if (state.wrongAttempts >= 2) return 2;
  return state.wrongAttempts >= 1 ? 1 : 0;
}

/** Aide : retire les mauvaises lettres, puis pose la bonne lettre dans la première case qui n'est pas encore juste. */
export function giveHint(state: RoundState): RoundState {
  if (state.status === "won") return state;
  let next = state;
  for (const index of misplacedSlots(state)) next = removeFromSlot(next, index);
  const target = next.slots.findIndex((slot, index) => slot.kind === "letter" && next.placed[index] == null);
  if (target < 0) return next;
  const expected = (next.slots[target] as { kind: "letter"; expected: string }).expected;
  const tile = availableTiles(next).find((candidate) => candidate.letter === expected);
  return tile ? placeTile(next, tile.id, target) : next;
}

/** Choisit le prochain mot en évitant les derniers déjà vus (les `avoid` derniers, au plus tous sauf un). */
export function pickNext<T extends { id: string }>(pool: T[], recentIds: string[], rng: Rng = Math.random, avoid = 3): T | null {
  if (pool.length === 0) return null;
  const memory = new Set(recentIds.slice(-Math.min(avoid, pool.length - 1)));
  const candidates = pool.filter((entry) => !memory.has(entry.id));
  const source = candidates.length > 0 ? candidates : pool;
  return source[Math.floor(rng() * source.length)];
}

/** Mémoire des derniers mots vus : ajoute celui qui vient de tomber, en gardant une courte liste. */
export function remember(recentIds: string[], id: string, keep = 5): string[] {
  return [...recentIds.filter((recent) => recent !== id), id].slice(-keep);
}

/** Bande d'illustrations du rouleau : au moins `minItems` images, la dernière est la gagnante, jamais deux fois la même à la suite. */
export function buildReel(poolIds: string[], targetId: string, rng: Rng = Math.random, minItems = 24): string[] {
  const others = poolIds.filter((id) => id !== targetId);
  const source = others.length > 0 ? others : [targetId];
  const reel: string[] = [];
  while (reel.length < minItems - 1) {
    let index = Math.floor(rng() * source.length);
    // Même image que la précédente : on prend la suivante de la liste (le hasard ne peut jamais bloquer la boucle).
    if (source.length > 1 && source[index] === reel[reel.length - 1]) index = (index + 1) % source.length;
    reel.push(source[index]);
  }
  reel.push(targetId);
  return reel;
}

/** Avancement du rouleau, de 0 à 1 : rapide au début, puis ralentit jusqu'à l'arrêt (décélération cubique). */
export function spinProgress(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;
  const x = Math.min(Math.max(elapsedMs / durationMs, 0), 1);
  return 1 - (1 - x) ** 3;
}
