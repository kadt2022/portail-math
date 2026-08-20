import { describe, expect, it } from "vitest";

import { numberToWordsEn, numberToWordsFr, roundToNearestTen } from "./number-words";

describe("numberToWordsFr", () => {
  it.each([
    [0, "zéro"],
    [6, "six"],
    [17, "dix-sept"],
    [21, "vingt-et-un"],
    [71, "soixante-et-onze"],
    [80, "quatre-vingts"],
    [81, "quatre-vingt-un"],
    [91, "quatre-vingt-onze"],
    [100, "cent"],
    [101, "cent un"],
    [200, "deux cents"],
    [246, "deux cent quarante-six"],
    [328, "trois cent vingt-huit"],
    [407, "quatre cent sept"],
    [432, "quatre cent trente-deux"],
    [509, "cinq cent neuf"],
    [605, "six cent cinq"],
    [760, "sept cent soixante"],
    [904, "neuf cent quatre"],
    [999, "neuf cent quatre-vingt-dix-neuf"],
  ])("écrit %i en lettres : %s", (value, expected) => {
    expect(numberToWordsFr(value)).toBe(expected);
  });
});

describe("numberToWordsEn", () => {
  it.each([
    [0, "zero"],
    [17, "seventeen"],
    [100, "one hundred"],
    [246, "two hundred and forty-six"],
    [328, "three hundred and twenty-eight"],
    [407, "four hundred and seven"],
    [432, "four hundred and thirty-two"],
    [509, "five hundred and nine"],
    [760, "seven hundred and sixty"],
    [999, "nine hundred and ninety-nine"],
  ])("writes %i in words: %s", (value, expected) => {
    expect(numberToWordsEn(value)).toBe(expected);
  });
});

describe("roundToNearestTen", () => {
  it.each([
    [63, 60],
    [65, 70],
    [4, 0],
    [905, 910],
  ])("arrondit %i à %i", (value, expected) => {
    expect(roundToNearestTen(value)).toBe(expected);
  });
});
