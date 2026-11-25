import { describe, expect, it } from "vitest";

import { Fraction, gcd } from "../../src/domain/fraction";

describe("Fraction", () => {
  it("réduit toujours par le PGCD et garde un dénominateur positif", () => {
    expect(Fraction.of(6, 12).toString()).toBe("1/2");
    expect(Fraction.of(3, -9).toString()).toBe("-1/3");
    expect(Fraction.of(-4, -8).toString()).toBe("1/2");
    expect(Fraction.of(0, 5).toString()).toBe("0");
    expect(Fraction.of(12, 4).isInteger).toBe(true);
  });

  it("considère égales deux écritures de même valeur", () => {
    expect(Fraction.of(2, 4).equals(Fraction.of(1, 2))).toBe(true);
    expect(Fraction.of(2, 3).equals(Fraction.of(3, 4))).toBe(false);
  });

  it("calcule exactement, sans virgule", () => {
    expect(Fraction.of(1, 5).plus(Fraction.of(2, 5)).toString()).toBe("3/5");
    expect(Fraction.of(1, 6).plus(Fraction.of(2, 6)).toString()).toBe("1/2");
    expect(Fraction.of(3, 4).minus(Fraction.of(1, 4)).toString()).toBe("1/2");
    expect(Fraction.of(1, 3).times(Fraction.integer(12)).toString()).toBe("4");
    expect(Fraction.integer(12).dividedBy(Fraction.integer(4)).toString()).toBe("3");
    expect(Fraction.of(1, 3).plus(Fraction.of(1, 6)).equals(Fraction.of(1, 2))).toBe(true);
  });

  it("compare par produits en croix", () => {
    expect(Fraction.of(1, 3).compare(Fraction.of(1, 2))).toBeLessThan(0);
    expect(Fraction.of(3, 4).compare(Fraction.of(2, 3))).toBeGreaterThan(0);
    expect(Fraction.of(2, 4).compare(Fraction.of(1, 2))).toBe(0);
  });

  it("refuse un dénominateur nul, une division par zéro et les nombres non entiers", () => {
    expect(() => Fraction.of(1, 0)).toThrow(RangeError);
    expect(() => Fraction.of(1.5, 2)).toThrow(RangeError);
    expect(() => Fraction.of(1, 2).dividedBy(Fraction.integer(0))).toThrow(RangeError);
  });

  it("calcule le PGCD", () => {
    expect(gcd(12, 18)).toBe(6);
    expect(gcd(-12, 18)).toBe(6);
    expect(gcd(7, 0)).toBe(7);
  });
});
