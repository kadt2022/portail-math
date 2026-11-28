import { describe, expect, it } from "vitest";

import { ADDITION, DIVISION, getOperation, MULTIPLICATION, OPERATIONS, SUBTRACTION } from "../src/engine/operations";

describe("opérations configurables", () => {
  it("expose les quatre opérations par leur identifiant", () => {
    expect(Object.keys(OPERATIONS).sort()).toEqual(["addition", "division", "multiplication", "subtraction"]);
    expect(getOperation("multiplication")).toBe(MULTIPLICATION);
  });

  it("calcule chaque opération", () => {
    expect(ADDITION.compute(3, 4)).toBe(7);
    expect(SUBTRACTION.compute(9, 4)).toBe(5);
    expect(MULTIPLICATION.compute(3, 4)).toBe(12);
    expect(DIVISION.compute(12, 4)).toBe(3);
  });

  it("accepte tout couple pour l'addition et la multiplication", () => {
    for (const operation of [ADDITION, MULTIPLICATION]) {
      expect(operation.accepts(0, 0)).toBe(true);
      expect(operation.accepts(1, 9, true)).toBe(true);
    }
  });

  it("soustraction : aux premiers niveaux, jamais de résultat négatif", () => {
    expect(SUBTRACTION.accepts(5, 3, true)).toBe(true);
    expect(SUBTRACTION.accepts(3, 5, true)).toBe(false);
    expect(SUBTRACTION.accepts(3, 5, false)).toBe(true);
    expect(SUBTRACTION.arrange(3, 5)).toEqual([5, 3]);
    expect(SUBTRACTION.arrange(5, 3)).toEqual([5, 3]);
  });

  it("division : jamais par zéro, divisions exactes aux premiers niveaux", () => {
    expect(DIVISION.accepts(6, 0, false)).toBe(false);
    expect(DIVISION.accepts(6, 0, true)).toBe(false);
    expect(DIVISION.accepts(6, 3, true)).toBe(true);
    expect(DIVISION.accepts(7, 3, true)).toBe(false);
    expect(DIVISION.accepts(7, 3, false)).toBe(true);
    expect(() => DIVISION.compute(6, 0)).toThrow();
  });

  it("multiplication : les opérandes gardent leur ordre d'arrivée", () => {
    expect(MULTIPLICATION.arrange(3, 4)).toEqual([3, 4]);
    expect(MULTIPLICATION.arrange(4, 3)).toEqual([4, 3]);
  });
});
