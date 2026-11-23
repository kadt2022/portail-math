import { describe, expect, it } from "vitest";

import { LEVEL_ONE_FAMILIES, variantsOf } from "../../src/domain/challenge";
import { explain, MISTAKE_TRANSLATION_KEYS, writtenText } from "../../src/domain/explanation";
import { createTranslator, isMessageKey, messages } from "../../src/i18n/messages";

describe("Explications après une erreur", () => {
  it("applique la règle aux nombres de la question", () => {
    const challenge = variantsOf("division-small").find((item) => item.id === "division-small:12/4")!;
    const explanation = explain(challenge, challenge.distractors[1]);
    expect(explanation.rule).toEqual({ key: "explain.division", params: { dividend: "12", divisor: "4", answer: "3" } });
    expect(explanation.mistake).toEqual({ key: "mistake.subtracted", params: { chosen: "8" } });
    expect(createTranslator("fr")("explain.division", explanation.rule.params)).toBe("12 ÷ 4 = 3, car 4 × 3 = 12.");
  });

  it("trouve le facteur de simplification et le facteur d'équivalence", () => {
    const simplify = variantsOf("simplify").find((item) => item.id === "simplify:6/12")!;
    expect(explain(simplify, simplify.distractors[0]).rule.params).toMatchObject({ factor: "6", answer: "1/2" });
    const equivalent = variantsOf("equivalent-missing").find((item) => item.id === "equivalent-missing:2/3=?/9")!;
    expect(explain(equivalent, equivalent.distractors[0]).rule.params).toMatchObject({ factor: "3", answer: "6" });
  });

  it.each(LEVEL_ONE_FAMILIES)("%s : chaque explication et chaque erreur ont un texte dans les deux langues", (family) => {
    for (const challenge of variantsOf(family)) {
      for (const option of challenge.distractors) {
        const explanation = explain(challenge, option);
        expect(isMessageKey(explanation.rule.key)).toBe(true);
        expect(explanation.mistake && isMessageKey(explanation.mistake.key)).toBe(true);
      }
    }
  });

  it("couvre toutes les erreurs connues", () => {
    for (const key of MISTAKE_TRANSLATION_KEYS) {
      expect(isMessageKey(key)).toBe(true);
      expect(messages.en[key as keyof typeof messages.en]).toContain("{chosen}");
    }
  });

  it("écrit une réponse telle qu'elle est montrée", () => {
    expect(writtenText({ kind: "integer", value: 4 })).toBe("4");
    expect(writtenText({ kind: "fraction", numerator: 3, denominator: 6 })).toBe("3/6");
  });
});
