import { describe, expect, it } from "vitest";

import { drawLaneSequence, isValidLaneSequence, LANES, planAttempt, type LaneIndex } from "../../src/domain/attempt";
import { LEVEL_ONE_FAMILIES } from "../../src/domain/challenge";
import { FractionRiverLevel } from "../../src/domain/level";
import { createRandom } from "../../src/domain/random";

const wrongLane = (correct: LaneIndex): LaneIndex => ((correct + 1) % 3) as LaneIndex;

function solveUpTo(level: FractionRiverLevel, count: number) {
  for (let i = 0; i < count; i += 1) {
    const challenge = level.challenge;
    if (!challenge) throw new Error("plus de défi");
    level.answer(challenge.correctLane);
  }
}

describe("Positions des réponses", () => {
  it("chaque voie porte la bonne réponse au moins deux fois sur sept, jamais trois fois de suite", () => {
    for (let seed = 0; seed < 300; seed += 1) {
      const sequence = drawLaneSequence(7, createRandom(seed), new Map());
      expect(isValidLaneSequence(sequence)).toBe(true);
      for (const lane of LANES) expect(sequence.filter((value) => value === lane).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("respecte les positions interdites", () => {
    const forbidden = new Map<number, LaneIndex>([[0, 0], [3, 2], [6, 1]]);
    for (let seed = 0; seed < 100; seed += 1) {
      const sequence = drawLaneSequence(7, createRandom(seed), forbidden);
      expect(sequence[0]).not.toBe(0);
      expect(sequence[3]).not.toBe(2);
      expect(sequence[6]).not.toBe(1);
    }
  });

  it("refuse trois fois de suite la même voie", () => {
    expect(isValidLaneSequence([0, 0, 0, 1, 1, 2, 2])).toBe(false);
    expect(isValidLaneSequence([0, 0, 1, 1, 2, 2, 0])).toBe(true);
    expect(isValidLaneSequence([0, 0, 1, 1, 0, 1, 0])).toBe(false);
  });
});

describe("Tentative", () => {
  it("compte exactement sept défis, un par famille et dans l'ordre", () => {
    const attempt = planAttempt({ number: 1, families: LEVEL_ONE_FAMILIES, rework: [], recent: new Set(), random: createRandom(1) });
    expect(attempt.challenges).toHaveLength(7);
    expect(attempt.challenges.map((planned) => planned.challenge.family)).toEqual([...LEVEL_ONE_FAMILIES]);
    for (const planned of attempt.challenges) {
      expect(planned.lanes[planned.correctLane]).toBe(planned.challenge.answer);
      expect(new Set(planned.lanes).size).toBe(3);
    }
  });
});

describe("Niveau 1 — Première traversée", () => {
  it("se réussit avec sept bonnes voies d'affilée", () => {
    const level = new FractionRiverLevel(createRandom(42));
    solveUpTo(level, 6);
    expect(level.snapshot.phase).toBe("playing");
    const last = level.challenge!;
    const result = level.answer(last.correctLane);
    expect(result.completed).toBe(true);
    expect(level.snapshot.phase).toBe("completed");
    expect(level.challenge).toBeNull();
  });

  it("une mauvaise voie termine la tentative et met la question à retravailler", () => {
    const level = new FractionRiverLevel(createRandom(7));
    solveUpTo(level, 3);
    const failed = level.challenge!;
    const result = level.answer(wrongLane(failed.correctLane));
    expect(result.correct).toBe(false);
    expect(level.snapshot.phase).toBe("failed");
    expect(level.snapshot.rework.map((entry) => entry.challenge.id)).toEqual([failed.challenge.id]);
    expect(() => level.answer(0)).toThrow();
  });

  it("recommence au premier défi, renouvelle les questions et réintroduit la question ratée au même rang, sur une autre voie", () => {
    const level = new FractionRiverLevel(createRandom(11));
    const first = level.snapshot.attempt;
    solveUpTo(level, 2);
    const failed = level.challenge!;
    level.answer(wrongLane(failed.correctLane));
    const second = level.restart();
    expect(level.snapshot.index).toBe(0);
    expect(second.number).toBe(2);
    const again = second.challenges[failed.rank];
    expect(again.challenge.id).toBe(failed.challenge.id);
    expect(again.rework).toBe(true);
    expect(again.correctLane).not.toBe(failed.correctLane);
    second.challenges.forEach((planned, rank) => {
      if (rank !== failed.rank) expect(planned.challenge.id).not.toBe(first.challenges[rank].challenge.id);
    });
  });

  it("garde une question à retravailler tant qu'elle n'est pas réussie, même si l'erreur vient avant elle", () => {
    const level = new FractionRiverLevel(createRandom(5));
    solveUpTo(level, 4);
    const hard = level.challenge!;
    level.answer(wrongLane(hard.correctLane));
    level.restart();
    // Nouvelle erreur au défi 2 : la question du rang 4 n'est pas atteinte, elle doit rester dans la liste.
    solveUpTo(level, 1);
    const early = level.challenge!;
    level.answer(wrongLane(early.correctLane));
    expect(level.snapshot.rework.map((entry) => entry.challenge.id)).toEqual([hard.challenge.id, early.challenge.id]);
    const third = level.restart();
    expect(third.challenges).toHaveLength(7);
    expect(third.challenges[hard.rank].challenge.id).toBe(hard.challenge.id);
    expect(third.challenges[early.rank].challenge.id).toBe(early.challenge.id);
    // Réussies cette fois : elles quittent la liste.
    solveUpTo(level, 7);
    expect(level.snapshot.rework).toHaveLength(0);
    expect(level.snapshot.phase).toBe("completed");
  });

  it("garde exactement sept défis quand plusieurs questions d'une même famille sont à retravailler", () => {
    const level = new FractionRiverLevel(createRandom(9));
    const failedIds: string[] = [];
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const first = level.challenge!;
      failedIds.push(first.challenge.id);
      level.answer(wrongLane(first.correctLane));
      level.restart();
    }
    // Trois échecs au premier défi : la même question revient tant qu'elle n'est pas réussie.
    expect(new Set(failedIds).size).toBe(1);
    expect(level.snapshot.attempt.challenges).toHaveLength(7);
  });
});
