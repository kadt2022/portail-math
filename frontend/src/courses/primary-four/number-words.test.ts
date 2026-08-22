import { describe, expect, it } from "vitest";

import { formatNumber, numberToWordsEn, numberToWordsFr, roundToNearest } from "./number-words";

describe("numberToWordsFr", () => {
  it("écrit les nombres sans milliers comme en 3e primaire", () => {
    expect(numberToWordsFr(0)).toBe("zéro");
    expect(numberToWordsFr(328)).toBe("trois cent vingt-huit");
    expect(numberToWordsFr(904)).toBe("neuf cent quatre");
  });

  it("compose un groupe de mille sans « un » devant mille", () => {
    expect(numberToWordsFr(1000)).toBe("mille");
    expect(numberToWordsFr(1200)).toBe("mille deux cents");
  });

  it("écrit des nombres à cinq chiffres", () => {
    expect(numberToWordsFr(24638)).toBe("vingt-quatre mille six cent trente-huit");
    expect(numberToWordsFr(63020)).toBe("soixante-trois mille vingt");
    expect(numberToWordsFr(90000)).toBe("quatre-vingt-dix mille");
  });

  it("n'accorde pas « quatre-vingt » au pluriel quand il précède mille", () => {
    expect(numberToWordsFr(80000)).toBe("quatre-vingt mille");
    expect(numberToWordsFr(80638)).toBe("quatre-vingt mille six cent trente-huit");
  });

  it("refuse une valeur hors de 0-99 999", () => {
    expect(() => numberToWordsFr(100000)).toThrow(RangeError);
  });
});

describe("numberToWordsEn", () => {
  it("matches the base 0-999 rules", () => {
    expect(numberToWordsEn(0)).toBe("zero");
    expect(numberToWordsEn(328)).toBe("three hundred and twenty-eight");
    expect(numberToWordsEn(904)).toBe("nine hundred and four");
  });

  it("writes five-digit numbers", () => {
    expect(numberToWordsEn(24638)).toBe("twenty-four thousand six hundred and thirty-eight");
    expect(numberToWordsEn(63020)).toBe("sixty-three thousand and twenty");
    expect(numberToWordsEn(90000)).toBe("ninety thousand");
  });

  it("rejects a value outside 0-99 999", () => {
    expect(() => numberToWordsEn(100000)).toThrow(RangeError);
  });
});

describe("roundToNearest", () => {
  it("arrondit à l'unité de rang demandée", () => {
    expect(roundToNearest(24638, 10)).toBe(24640);
    expect(roundToNearest(24638, 100)).toBe(24600);
    expect(roundToNearest(24638, 1000)).toBe(25000);
    expect(roundToNearest(24638, 10000)).toBe(20000);
  });
});

describe("formatNumber", () => {
  it("groupe les milliers par un espace en français", () => {
    expect(formatNumber(24638, "fr")).toBe("24 638");
    expect(formatNumber(300, "fr")).toBe("300");
    expect(formatNumber(3000, "fr")).toBe("3 000");
  });

  it("groupe les milliers par une virgule en anglais", () => {
    expect(formatNumber(24638, "en")).toBe("24,638");
    expect(formatNumber(3000, "en")).toBe("3,000");
  });
});
