import { describe, expect, it } from "vitest";

import { illustrationIds, illustrationUrl } from "../../illustrations/illustrations";
import { WRITING_WORDS } from "./writing-words";

describe("bibliothèque d'illustrations", () => {
  it("contient une illustration pour chacun des 30 mots du catalogue, et aucune en trop", () => {
    expect(WRITING_WORDS.filter((word) => !illustrationUrl(word.id)).map((word) => word.id)).toEqual([]);
    const wordIds = new Set(WRITING_WORDS.map((word) => word.id));
    expect(illustrationIds().filter((id) => !wordIds.has(id))).toEqual([]);
    expect(illustrationIds()).toHaveLength(30);
  });

  it("répond undefined pour une illustration absente (le jeu affiche alors un cadre de remplacement)", () => {
    expect(illustrationUrl("inconnue")).toBeUndefined();
  });
});
