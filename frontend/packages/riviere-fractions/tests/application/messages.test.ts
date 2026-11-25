import { describe, expect, it } from "vitest";

import { LEVEL_ONE_FAMILIES } from "../../src/domain/challenge";
import { createTranslator, isMessageKey, messages, toRiverLocale } from "../../src/i18n/messages";

describe("Traductions du jeu", () => {
  it("ont exactement les mêmes clés en français et en anglais", () => {
    expect(Object.keys(messages.en).sort()).toEqual(Object.keys(messages.fr).sort());
    for (const key of Object.keys(messages.fr) as (keyof typeof messages.fr)[]) {
      expect(messages.en[key].length).toBeGreaterThan(0);
      // Mêmes paramètres dans les deux langues.
      const params = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
      expect(params(messages.en[key])).toEqual(params(messages.fr[key]));
    }
  });

  it("ont un indice pour chaque famille de défis", () => {
    for (const family of LEVEL_ONE_FAMILIES) expect(isMessageKey(`hint.${family}`)).toBe(true);
  });

  it("remplissent les paramètres et laissent intacts les paramètres absents", () => {
    const t = createTranslator("fr");
    expect(t("challenge.counter", { current: 3, total: 7 })).toBe("Défi 3 sur 7");
    expect(t("correct.text")).toBe("{answer} est juste.");
    expect(createTranslator("en")("challenge.counter", { current: 3, total: 7 })).toBe("Challenge 3 of 7");
  });

  it("ramènent la langue de l'hôte à une langue connue", () => {
    expect(toRiverLocale("en-GB")).toBe("en");
    expect(toRiverLocale("fr")).toBe("fr");
    expect(toRiverLocale("ln")).toBe("fr");
    expect(toRiverLocale(undefined)).toBe("fr");
  });
});
