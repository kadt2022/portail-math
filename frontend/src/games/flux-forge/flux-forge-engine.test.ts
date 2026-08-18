import { describe, expect, it } from "vitest";
import {
  createInitialLevelState,
  getActiveExercise,
  isHouseCompleted,
  isPartInteractable,
  levelProgress,
  PART_ORDER,
  pickExercise,
  submitAnswer,
  type HouseIndex,
  type LevelState,
} from "./flux-forge-engine";

function completeCurrentStep(state: LevelState): LevelState {
  const exercise = getActiveExercise(state);
  if (!exercise) {
    throw new Error("Aucun exercice actif : le niveau est déjà terminé.");
  }
  const result = submitAnswer(state, exercise, exercise.expectedAnswer);
  expect(result.correct).toBe(true);
  return result.state;
}

describe("createInitialLevelState", () => {
  it("démarre sur la maison A, étape mur, tout le reste verrouillé", () => {
    const state = createInitialLevelState();
    expect(state.currentHouse).toBe(0);
    expect(state.currentPart).toBe("wall");
    expect(state.levelCompleted).toBe(false);
    expect(state.houses[0].wall).toBe("active");
    expect(state.houses[0].door).toBe("locked");
    expect(state.houses[1].wall).toBe("locked");
    expect(state.houses[2].wall).toBe("locked");
  });
});

describe("getActiveExercise", () => {
  it("retourne l'exercice du mur de la maison A avec les bonnes dimensions", () => {
    const state = createInitialLevelState();
    const exercise = getActiveExercise(state);
    expect(exercise).not.toBeNull();
    expect(exercise?.objectType).toBe("wall");
    expect(exercise?.type).toBe("surface");
    expect(exercise?.dimensions).toEqual({ length: 4, height: 2 });
    expect(exercise?.expectedAnswer).toBe(8);
    expect(exercise?.unit).toBe("m²");
  });

  it("retourne null une fois le niveau terminé", () => {
    let state = createInitialLevelState();
    for (let i = 0; i < 15; i++) {
      state = completeCurrentStep(state);
    }
    expect(state.levelCompleted).toBe(true);
    expect(getActiveExercise(state)).toBeNull();
  });
});

describe("submitAnswer", () => {
  it("ne construit rien sur une mauvaise réponse", () => {
    const state = createInitialLevelState();
    const exercise = getActiveExercise(state)!;
    const result = submitAnswer(state, exercise, exercise.expectedAnswer + 1);
    expect(result.correct).toBe(false);
    expect(result.state).toBe(state);
    expect(result.state.houses[0].wall).toBe("active");
  });

  it("construit l'élément et active l'étape suivante sur une bonne réponse", () => {
    const state = createInitialLevelState();
    const exercise = getActiveExercise(state)!;
    const result = submitAnswer(state, exercise, exercise.expectedAnswer);
    expect(result.correct).toBe(true);
    expect(result.state.houses[0].wall).toBe("completed");
    expect(result.state.houses[0].door).toBe("active");
    expect(result.state.currentPart).toBe("door");
  });

  it("refuse toute réponse une fois le niveau terminé", () => {
    let state = createInitialLevelState();
    for (let i = 0; i < 15; i++) {
      state = completeCurrentStep(state);
    }
    const result = submitAnswer(state, { id: "x", type: "surface", objectType: "wall", dimensions: {}, expectedAnswer: 1, unit: "m²" }, 1);
    expect(result.correct).toBe(false);
    expect(result.state).toBe(state);
  });
});

describe("progression stricte", () => {
  it("respecte l'ordre mur → porte → toit → volume → conversion pour chaque maison", () => {
    let state = createInitialLevelState();
    const visitedParts: string[] = [];
    for (let step = 0; step < 15; step++) {
      visitedParts.push(state.currentPart as string);
      state = completeCurrentStep(state);
    }
    expect(visitedParts).toEqual([...PART_ORDER, ...PART_ORDER, ...PART_ORDER]);
  });

  it("termine la maison A avant d'activer la maison B", () => {
    let state = createInitialLevelState();
    for (let i = 0; i < PART_ORDER.length; i++) {
      expect(state.houses[1].wall).toBe("locked");
      state = completeCurrentStep(state);
    }
    expect(isHouseCompleted(state.houses[0])).toBe(true);
    expect(state.houses[1].wall).toBe("active");
    expect(state.currentHouse).toBe(1);
  });

  it("verrouille toujours les étapes non actives d'une maison en cours", () => {
    const state = createInitialLevelState();
    (["door", "roof", "volume", "conversion"] as const).forEach((part) => {
      expect(isPartInteractable(state, 0, part)).toBe(false);
    });
    expect(isPartInteractable(state, 0, "wall")).toBe(true);
  });

  it("termine le niveau seulement quand les trois maisons sont complètes", () => {
    let state = createInitialLevelState();
    for (let i = 0; i < 14; i++) {
      state = completeCurrentStep(state);
      expect(state.levelCompleted).toBe(false);
    }
    state = completeCurrentStep(state);
    expect(state.levelCompleted).toBe(true);
    expect(state.currentPart).toBeNull();
    state.houses.forEach((house) => expect(isHouseCompleted(house)).toBe(true));
  });
});

describe("levelProgress", () => {
  it("compte 0/15 au départ et 15/15 à la fin", () => {
    let state = createInitialLevelState();
    expect(levelProgress(state)).toEqual({ completedParts: 0, totalParts: 15 });
    for (let i = 0; i < 15; i++) {
      state = completeCurrentStep(state);
    }
    expect(levelProgress(state)).toEqual({ completedParts: 15, totalParts: 15 });
  });
});

describe("pickExercise", () => {
  it("est déterministe avec un rng injecté", () => {
    const houseIndex: HouseIndex = 0;
    const a = pickExercise(houseIndex, "wall", () => 0);
    const b = pickExercise(houseIndex, "wall", () => 0);
    expect(a).toEqual(b);
  });
});

describe("exercices des maisons B et C", () => {
  it("maison B utilise les dimensions du récit (mur 5×2, toit 6×3, volume 3×2×1)", () => {
    let state = createInitialLevelState();
    for (let i = 0; i < PART_ORDER.length; i++) {
      state = completeCurrentStep(state);
    }
    expect(state.currentHouse).toBe(1);
    const wall = getActiveExercise(state)!;
    expect(wall.dimensions).toEqual({ length: 5, height: 2 });
    expect(wall.expectedAnswer).toBe(10);
  });

  it("maison C utilise les dimensions du récit (mur 6×2, toit 7×3, volume 3×2×2)", () => {
    let state = createInitialLevelState();
    for (let i = 0; i < PART_ORDER.length * 2; i++) {
      state = completeCurrentStep(state);
    }
    expect(state.currentHouse).toBe(2);
    const wall = getActiveExercise(state)!;
    expect(wall.dimensions).toEqual({ length: 6, height: 2 });
    expect(wall.expectedAnswer).toBe(12);
    let s = state;
    for (let i = 0; i < 3; i++) s = completeCurrentStep(s);
    const volume = getActiveExercise(s)!;
    expect(volume.dimensions).toEqual({ length: 3, width: 2, height: 2 });
    expect(volume.expectedAnswer).toBe(12);
    const converted = completeCurrentStep(s);
    expect(isHouseCompleted(converted.houses[2])).toBe(false);
  });
});
