import { describe, expect, it } from "vitest";

import { challengeOfDay } from "./daily-challenge";

function everyDayOfYear(year: number): Date[] {
  const days: Date[] = [];
  for (const cursor = new Date(year, 0, 1); cursor.getFullYear() === year; cursor.setDate(cursor.getDate() + 1)) {
    days.push(new Date(cursor));
  }
  return days;
}

describe("Defi du jour", () => {
  it("donne le meme calcul pour la meme date, quelle que soit l'heure", () => {
    const matin = challengeOfDay(new Date(2026, 8, 3, 7, 30));
    const soir = challengeOfDay(new Date(2026, 8, 3, 21, 5));
    expect(soir).toEqual(matin);
  });

  it("change de calcul d'un jour a l'autre", () => {
    const veille = challengeOfDay(new Date(2026, 8, 3));
    const lendemain = challengeOfDay(new Date(2026, 8, 4));
    expect(lendemain).not.toEqual(veille);
  });

  it("annonce la bonne reponse et reste dans le primaire toute l'annee", () => {
    for (const day of everyDayOfYear(2026)) {
      const { left, right, operator, answer } = challengeOfDay(day);
      const expected = operator === "x" ? left * right : operator === "+" ? left + right : left - right;

      expect(answer).toBe(expected);
      expect(left).toBeGreaterThan(0);
      expect(right).toBeGreaterThan(0);
      expect(answer).toBeGreaterThan(0);
      expect(answer).toBeLessThanOrEqual(100);
    }
  });

  it("propose les trois operations au fil de l'annee", () => {
    const operators = new Set(everyDayOfYear(2026).map((day) => challengeOfDay(day).operator));
    expect(operators).toEqual(new Set(["+", "-", "x"]));
  });
});
