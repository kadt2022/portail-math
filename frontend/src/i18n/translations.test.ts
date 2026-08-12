import { describe, expect, it } from "vitest";

import commonEn from "./locales/en/common.json";
import dashboardEn from "./locales/en/dashboard.json";
import exetatEn from "./locales/en/exetat.json";
import gamesEn from "./locales/en/games.json";
import progressEn from "./locales/en/progress.json";
import primaryOneEn from "./locales/en/primaryOne.json";
import commonFr from "./locales/fr/common.json";
import dashboardFr from "./locales/fr/dashboard.json";
import exetatFr from "./locales/fr/exetat.json";
import gamesFr from "./locales/fr/games.json";
import progressFr from "./locales/fr/progress.json";
import primaryOneFr from "./locales/fr/primaryOne.json";

// Chemins de clés triés, quel que soit l'ordre des propriétés dans le JSON :
// "welcome.title" plutôt que la structure imbriquée brute, pour comparer
// deux arbres facilement.
function keyPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) {
    return [prefix];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    keyPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

const NAMESPACES = [
  { name: "common", fr: commonFr, en: commonEn },
  { name: "dashboard", fr: dashboardFr, en: dashboardEn },
  { name: "exetat", fr: exetatFr, en: exetatEn },
  { name: "games", fr: gamesFr, en: gamesEn },
  { name: "progress", fr: progressFr, en: progressEn },
  { name: "primaryOne", fr: primaryOneFr, en: primaryOneEn },
];

describe("Complétude des traductions français / anglais", () => {
  it.each(NAMESPACES)("$name : les mêmes clés existent dans les deux langues", ({ fr, en }) => {
    const frKeys = keyPaths(fr).sort();
    const enKeys = keyPaths(en).sort();
    expect(enKeys).toEqual(frKeys);
  });

  it.each(NAMESPACES)("$name : aucune valeur vide dans aucune langue", ({ fr, en }) => {
    for (const value of [...keyPaths(fr).map((key) => resolve(fr, key)), ...keyPaths(en).map((key) => resolve(en, key))]) {
      expect(typeof value).toBe("string");
      expect((value as string).trim().length).toBeGreaterThan(0);
    }
  });
});

function resolve(tree: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((node, segment) => {
    if (typeof node !== "object" || node === null) {
      return undefined;
    }
    return (node as Record<string, unknown>)[segment];
  }, tree);
}
