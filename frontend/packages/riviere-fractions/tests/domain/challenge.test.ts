import { describe, expect, it } from "vitest";

import { drawChallenge, expectedValue, LEVEL_ONE_FAMILIES, variantsOf } from "../../src/domain/challenge";
import { createRandom } from "../../src/domain/random";

describe("Familles de défis du niveau 1", () => {
  it.each(LEVEL_ONE_FAMILIES)("%s produit au moins trente variantes distinctes", (family) => {
    const variants = variantsOf(family);
    expect(variants.length).toBeGreaterThanOrEqual(30);
    expect(new Set(variants.map((challenge) => challenge.id)).size).toBe(variants.length);
  });

  it.each(LEVEL_ONE_FAMILIES)("%s : une seule bonne réponse, exacte, et trois valeurs toutes différentes", (family) => {
    for (const challenge of variantsOf(family)) {
      expect(challenge.answer.value.equals(expectedValue(challenge.expression))).toBe(true);
      expect(challenge.answer.mistake).toBeNull();
      const values = [challenge.answer, ...challenge.distractors].map((option) => option.value.toString());
      expect(new Set(values).size).toBe(3);
      for (const distractor of challenge.distractors) {
        expect(distractor.mistake).not.toBeNull();
        expect(distractor.value.numerator).toBeGreaterThan(0);
      }
    }
  });

  it("propose les erreurs typiques de la mission", () => {
    const division = variantsOf("division-small").find((challenge) => challenge.id === "division-small:12/4");
    expect(division?.distractors.map((option) => option.mistake)).toEqual(["copied-divisor", "subtracted"]);
    const simplify = variantsOf("simplify").find((challenge) => challenge.id === "simplify:6/12");
    expect(simplify?.answer.value.toString()).toBe("1/2");
    expect(simplify?.distractors.map((option) => option.value.toString())).toEqual(["2", "1/3"]);
    const sum = variantsOf("addition-same-denominator").find((challenge) => challenge.id === "addition-same-denominator:1/5+2/5");
    expect(sum?.distractors.map((option) => option.mistake)).toEqual(["added-denominators", "kept-one-numerator"]);
  });

  it("évite les questions demandées tant que c'est possible", () => {
    const random = createRandom(3);
    const all = variantsOf("division");
    const avoid = new Set(all.slice(1).map((challenge) => challenge.id));
    expect(drawChallenge("division", random, avoid).id).toBe(all[0].id);
    // Tout est à éviter : on retombe sur une question de la famille plutôt que d'échouer.
    expect(drawChallenge("division", random, new Set(all.map((challenge) => challenge.id))).family).toBe("division");
  });
});
