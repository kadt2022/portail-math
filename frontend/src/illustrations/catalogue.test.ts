import { describe, expect, it } from "vitest";

import { ILLUSTRATION_CATALOGUE, ILLUSTRATION_CATEGORY_ORDER, illustrationCategory, illustrationsOf } from "./catalogue";
import { illustrationIds } from "./illustrations";

describe("catalogue des illustrations", () => {
  it("répartit les 30 illustrations : 10 fruits, 5 animaux domestiques, 5 animaux sauvages, 10 objets", () => {
    expect(ILLUSTRATION_CATEGORY_ORDER.map((category) => ILLUSTRATION_CATALOGUE[category].length)).toEqual([10, 5, 5, 10]);
    expect(illustrationsOf("all")).toHaveLength(30);
    expect(illustrationsOf("wild-animals")).toEqual(["lion", "elephant", "girafe", "zebre", "singe"]);
  });

  it("décrit exactement les fichiers de la bibliothèque : aucune illustration sans catégorie, aucune catégorie sans fichier", () => {
    expect([...illustrationsOf("all")].sort((a, b) => a.localeCompare(b))).toEqual(illustrationIds());
  });

  it("retrouve la catégorie d'une illustration et refuse une illustration inconnue", () => {
    expect(illustrationCategory("pasteque")).toBe("fruits");
    expect(illustrationCategory("cle")).toBe("objects");
    expect(() => illustrationCategory("inconnue")).toThrow("Illustration inconnue");
  });
});
