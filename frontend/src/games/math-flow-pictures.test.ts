import { describe, expect, it } from "vitest";

import { ILLUSTRATION_CATALOGUE } from "../illustrations/catalogue";
import { PICTURE_COLOR } from "../../packages/math-flow/src/engine/pictures";

// Garde de cohérence entre la bibliothèque d'illustrations de Yamba et les couleurs de jeu de Math Flow.
describe("Math Flow : couleurs des illustrations de la bibliothèque", () => {
  const living = [...ILLUSTRATION_CATALOGUE.fruits];

  it("donne une couleur à chaque fruit", () => {
    for (const picture of living) expect(PICTURE_COLOR[picture], picture).toBeDefined();
  });

  it("n'emploie que les fruits : ni animal, ni objet, ni illustration inconnue", () => {
    expect(Object.keys(PICTURE_COLOR).sort()).toEqual([...living].sort());
  });
});
