import { describe, expect, it } from "vitest";

import {
  chooseTargetResult,
  comboForHit,
  createFruitSpec,
  createStartingFruitSpecs,
  fruitSpawnYRange,
  hasDuplicateTriplets,
  hasFullyCrossedDefense,
  HUD_SAFE_TOP,
  INTRUSION_LIMITS,
  operationForResult,
  registerFailure,
  TURBO_LEVELS,
  type ExpertFailures,
  type FruitSpec,
} from "./turbo-pulse-engine";

const redFive: FruitSpec = { id: 1, family: "tomato", familyLabel: "tomate", emoji: "🍅", variant: "red", variantLabel: "rouge", color: 0xe94f4f, number: 5 };
const greenFive: FruitSpec = { id: 2, family: "avocado", familyLabel: "avocat", emoji: "🥑", variant: "green", variantLabel: "vert", color: 0x69a84f, number: 5 };
const redNine: FruitSpec = { id: 3, family: "apple", familyLabel: "pomme", emoji: "🍎", variant: "red", variantLabel: "rouge", color: 0xd94343, number: 9 };

describe("moteur Turbo Pulse", () => {
  it("conserve les sept cadences, tailles de groupe et limites de défense validées", () => {
    expect(TURBO_LEVELS).toHaveLength(7);
    expect(TURBO_LEVELS.map((level) => [level.minMs, level.maxMs])).toEqual([
      [5000, 6500], [4000, 5200], [3000, 4000], [2200, 3000], [1500, 2200], [750, 1050], [420, 650],
    ]);
    expect(TURBO_LEVELS.map((level) => [level.batchMin, level.batchMax])).toEqual([
      [1, 1], [1, 2], [1, 2], [2, 2], [2, 3], [3, 4], [4, 5],
    ]);
    expect(INTRUSION_LIMITS).toEqual([5, 5, 4, 4, 3, 2, 1]);
  });

  it("commence avec une même réponse sur deux couleurs différentes", () => {
    const fruits = createStartingFruitSpecs(0, () => 0.25);
    expect(fruits[0].number).toBe(fruits[1].number);
    expect(fruits[0].variant).not.toBe(fruits[1].variant);
    expect(hasDuplicateTriplets(fruits)).toBe(false);
  });

  it("ne génère jamais deux fois le même triplet famille, couleur et valeur", () => {
    const fruits: FruitSpec[] = createStartingFruitSpecs(6, () => 0.47);
    let seed = 17;
    const rng = () => {
      seed = (seed * 48271) % 2147483647;
      return seed / 2147483647;
    };
    for (let id = 4; id <= 12; id += 1) fruits.push(createFruitSpec(fruits, 6, id, rng));
    expect(hasDuplicateTriplets(fruits)).toBe(false);
  });

  it("privilégie une valeur disponible dans plusieurs couleurs", () => {
    expect(chooseTargetResult([redNine, redFive, greenFive], () => 0.99)).toBe(5);
  });

  it("détruit toute la couleur sélectionnée sans toucher les autres couleurs", () => {
    expect(comboForHit([redFive, greenFive, redNine], redFive).map((fruit) => fruit.id)).toEqual([1, 3]);
  });

  it("ne compte l’intrusion qu’après le franchissement complet du fruit", () => {
    expect(hasFullyCrossedDefense(41, 31, 72)).toBe(false);
    expect(hasFullyCrossedDefense(41, 31, 72.1)).toBe(true);
  });

  it("exclut toujours le bandeau HUD réservé de la zone de déplacement des fruits", () => {
    const radius = 31;
    const range = fruitSpawnYRange(radius, 540);
    // Le bord haut d'un fruit (centre - rayon) doit rester sous le bandeau HUD :
    // aucun fruit ne peut donc jamais apparaître derrière le calcul « À résoudre ».
    expect(range.min - radius).toBeGreaterThanOrEqual(HUD_SAFE_TOP);
    expect(range.max).toBeLessThan(540);
    expect(range.min).toBeLessThan(range.max);
  });

  it("génère toujours une opération dont le résultat est la valeur ciblée", () => {
    for (let level = 0; level < 7; level += 1) {
      const operation = operationForResult(level < 2 ? 8 : 56, level, () => 0.2);
      const actual = operation.operator === "+" ? operation.left + operation.right : operation.operator === "−" ? operation.left - operation.right : operation.left * operation.right;
      expect(actual).toBe(operation.result);
    }
  });

  it("accorde trois tentatives indépendantes aux niveaux 6 et 7", () => {
    let failures: ExpertFailures = { 5: 0, 6: 0 };
    const firstSix = registerFailure(5, failures);
    failures = firstSix.failures;
    expect(firstSix.action).toBe("retry");
    expect(failures).toEqual({ 5: 1, 6: 0 });
    failures = registerFailure(5, failures).failures;
    const thirdSix = registerFailure(5, failures);
    expect(thirdSix.action).toBe("restart-run");
    expect(thirdSix.failures[6]).toBe(0);
    expect(registerFailure(6, { 5: 0, 6: 0 }).attemptUsed).toBe(1);
  });
});
