// Moteur pur du Niveau 1 de Flux Forge : aucune dépendance à React ni à Babylon.js.
// Il porte la banque d'exercices et la machine à états de progression (3 maisons,
// 5 étapes chacune). La scène 3D et l'interface ne font que lire cet état et lui
// soumettre des réponses ; toute la logique métier vit ici pour rester testable
// sans navigateur ni WebGL.

export type ExerciseCategory = "surface" | "volume" | "conversion";
export type ObjectType = "wall" | "door" | "roof" | "block";
export type ExerciseUnit = "m²" | "m³" | "L";

export interface Exercise {
  id: string;
  type: ExerciseCategory;
  objectType: ObjectType;
  dimensions: {
    length?: number;
    width?: number;
    height?: number;
  };
  expectedAnswer: number;
  unit: ExerciseUnit;
}

export type HousePart = "wall" | "door" | "roof" | "volume" | "conversion";
export type PartStatus = "locked" | "active" | "completed";

export interface HouseState {
  wall: PartStatus;
  door: PartStatus;
  roof: PartStatus;
  volume: PartStatus;
  conversion: PartStatus;
}

export type HouseIndex = 0 | 1 | 2;

export interface LevelState {
  currentHouse: HouseIndex;
  /** null seulement quand le niveau est terminé (plus aucune étape active). */
  currentPart: HousePart | null;
  houses: [HouseState, HouseState, HouseState];
  levelCompleted: boolean;
}

/** Ordre strict des étapes pour une maison : aucune étape ne peut être sautée. */
export const PART_ORDER: readonly HousePart[] = ["wall", "door", "roof", "volume", "conversion"];

export const HOUSE_LABELS = ["A", "B", "C"] as const;
export type HouseLabel = (typeof HOUSE_LABELS)[number];

export function houseLabel(index: HouseIndex): HouseLabel {
  return HOUSE_LABELS[index];
}

/**
 * Banque d'exercices : plusieurs exercices peuvent être déclarés par
 * emplacement (maison + étape). Le niveau pioche parmi les candidats
 * compatibles avec l'élément couramment actif. Les dimensions de l'exercice
 * piochée pilotent aussi la géométrie 3D affichée : pour le MVP, chaque
 * emplacement n'a qu'un seul candidat, mais la structure supporte d'en
 * ajouter d'autres sans toucher au reste du moteur.
 */
const EXERCISE_BANK: Record<HouseIndex, Record<HousePart, Exercise[]>> = {
  0: {
    wall: [
      {
        id: "house-a-wall-1",
        type: "surface",
        objectType: "wall",
        dimensions: { length: 4, height: 2 },
        expectedAnswer: 8,
        unit: "m²",
      },
    ],
    door: [
      {
        id: "house-a-door-1",
        type: "surface",
        objectType: "door",
        dimensions: { width: 1, height: 2 },
        expectedAnswer: 2,
        unit: "m²",
      },
    ],
    roof: [
      {
        id: "house-a-roof-1",
        type: "surface",
        objectType: "roof",
        dimensions: { length: 5, width: 3 },
        expectedAnswer: 15,
        unit: "m²",
      },
    ],
    volume: [
      {
        id: "house-a-volume-1",
        type: "volume",
        objectType: "block",
        dimensions: { length: 2, width: 2, height: 1 },
        expectedAnswer: 4,
        unit: "m³",
      },
    ],
    conversion: [
      {
        id: "house-a-conversion-1",
        type: "conversion",
        objectType: "block",
        dimensions: { length: 2, width: 2, height: 1 },
        expectedAnswer: 4000,
        unit: "L",
      },
    ],
  },
  1: {
    wall: [
      {
        id: "house-b-wall-1",
        type: "surface",
        objectType: "wall",
        dimensions: { length: 5, height: 2 },
        expectedAnswer: 10,
        unit: "m²",
      },
    ],
    door: [
      {
        id: "house-b-door-1",
        type: "surface",
        objectType: "door",
        dimensions: { width: 1, height: 2 },
        expectedAnswer: 2,
        unit: "m²",
      },
    ],
    roof: [
      {
        id: "house-b-roof-1",
        type: "surface",
        objectType: "roof",
        dimensions: { length: 6, width: 3 },
        expectedAnswer: 18,
        unit: "m²",
      },
    ],
    volume: [
      {
        id: "house-b-volume-1",
        type: "volume",
        objectType: "block",
        dimensions: { length: 3, width: 2, height: 1 },
        expectedAnswer: 6,
        unit: "m³",
      },
    ],
    conversion: [
      {
        id: "house-b-conversion-1",
        type: "conversion",
        objectType: "block",
        dimensions: { length: 3, width: 2, height: 1 },
        expectedAnswer: 6000,
        unit: "L",
      },
    ],
  },
  2: {
    wall: [
      {
        id: "house-c-wall-1",
        type: "surface",
        objectType: "wall",
        dimensions: { length: 6, height: 2 },
        expectedAnswer: 12,
        unit: "m²",
      },
    ],
    door: [
      {
        id: "house-c-door-1",
        type: "surface",
        objectType: "door",
        dimensions: { width: 1, height: 2 },
        expectedAnswer: 2,
        unit: "m²",
      },
    ],
    roof: [
      {
        id: "house-c-roof-1",
        type: "surface",
        objectType: "roof",
        dimensions: { length: 7, width: 3 },
        expectedAnswer: 21,
        unit: "m²",
      },
    ],
    volume: [
      {
        id: "house-c-volume-1",
        type: "volume",
        objectType: "block",
        dimensions: { length: 3, width: 2, height: 2 },
        expectedAnswer: 12,
        unit: "m³",
      },
    ],
    conversion: [
      {
        id: "house-c-conversion-1",
        type: "conversion",
        objectType: "block",
        dimensions: { length: 3, width: 2, height: 2 },
        expectedAnswer: 12000,
        unit: "L",
      },
    ],
  },
};

export function getExerciseCandidates(houseIndex: HouseIndex, part: HousePart): Exercise[] {
  return EXERCISE_BANK[houseIndex][part];
}

/** Pioche un exercice compatible avec l'élément courant (maison + étape). */
export function pickExercise(houseIndex: HouseIndex, part: HousePart, rng: () => number = Math.random): Exercise {
  const candidates = getExerciseCandidates(houseIndex, part);
  const index = Math.floor(rng() * candidates.length);
  return candidates[Math.min(index, candidates.length - 1)];
}

function createLockedHouse(): HouseState {
  return { wall: "locked", door: "locked", roof: "locked", volume: "locked", conversion: "locked" };
}

export function createInitialLevelState(): LevelState {
  const houses: [HouseState, HouseState, HouseState] = [createLockedHouse(), createLockedHouse(), createLockedHouse()];
  houses[0].wall = "active";
  return {
    currentHouse: 0,
    currentPart: "wall",
    houses,
    levelCompleted: false,
  };
}

/** L'exercice actif du niveau, ou null si le niveau est déjà terminé. */
export function getActiveExercise(state: LevelState, rng: () => number = Math.random): Exercise | null {
  if (state.levelCompleted || state.currentPart === null) {
    return null;
  }
  return pickExercise(state.currentHouse, state.currentPart, rng);
}

export function isPartInteractable(state: LevelState, houseIndex: HouseIndex, part: HousePart): boolean {
  return state.houses[houseIndex][part] === "active";
}

function cloneHouses(houses: [HouseState, HouseState, HouseState]): [HouseState, HouseState, HouseState] {
  return [{ ...houses[0] }, { ...houses[1] }, { ...houses[2] }];
}

/** Fait avancer l'état après une bonne réponse : complète l'étape courante et active la suivante. */
function advance(state: LevelState): LevelState {
  if (state.currentPart === null) {
    return state;
  }
  const houses = cloneHouses(state.houses);
  const part = state.currentPart;
  houses[state.currentHouse][part] = "completed";

  const partIndex = PART_ORDER.indexOf(part);
  if (partIndex < PART_ORDER.length - 1) {
    const nextPart = PART_ORDER[partIndex + 1];
    houses[state.currentHouse][nextPart] = "active";
    return { ...state, houses, currentPart: nextPart };
  }

  if (state.currentHouse < 2) {
    const nextHouse = (state.currentHouse + 1) as HouseIndex;
    houses[nextHouse].wall = "active";
    return { ...state, houses, currentHouse: nextHouse, currentPart: "wall" };
  }

  return { ...state, houses, currentPart: null, levelCompleted: true };
}

export interface SubmitAnswerResult {
  state: LevelState;
  correct: boolean;
}

/**
 * Soumet une réponse pour l'exercice actif. Une mauvaise réponse ne modifie
 * jamais l'état (aucun élément n'est construit) ; une bonne réponse construit
 * réellement l'élément en avançant la machine à états.
 */
export function submitAnswer(state: LevelState, exercise: Exercise, answer: number): SubmitAnswerResult {
  if (state.levelCompleted || state.currentPart === null) {
    return { state, correct: false };
  }
  const correct = answer === exercise.expectedAnswer;
  if (!correct) {
    return { state, correct: false };
  }
  return { state: advance(state), correct: true };
}

export function countCompletedParts(house: HouseState): number {
  return PART_ORDER.reduce((total, part) => total + (house[part] === "completed" ? 1 : 0), 0);
}

export function isHouseCompleted(house: HouseState): boolean {
  return countCompletedParts(house) === PART_ORDER.length;
}

export function levelProgress(state: LevelState): { completedParts: number; totalParts: number } {
  const totalParts = PART_ORDER.length * state.houses.length;
  const completedParts = state.houses.reduce((total, house) => total + countCompletedParts(house), 0);
  return { completedParts, totalParts };
}

/**
 * Cache des exercices déjà piochés pour une maison : une fois qu'une étape a
 * été activée, son exercice (et donc ses dimensions 3D) ne doit plus changer,
 * même en cas de nouvelle tentative après une mauvaise réponse. La scène 3D
 * et le panneau d'exercice doivent toujours lire le même exercice pour une
 * étape donnée.
 */
export type ResolvedExerciseMap = Partial<Record<HousePart, Exercise>>;
export type ResolvedExercises = [ResolvedExerciseMap, ResolvedExerciseMap, ResolvedExerciseMap];

export function createEmptyResolvedExercises(): ResolvedExercises {
  return [{}, {}, {}];
}
