import { describe, expect, it } from "vitest";

import { chooseGuide, type GuideInput } from "./guide";

const base: GuideInput = { phase: "idle", hasWrongLetters: false, hasFreeTile: true, frozen: false, beginner: true, nudged: false };

describe("main qui guide l'enfant", () => {
  it("montre le bouton Lancer au départ, puis Nouvelle manche après une réussite", () => {
    // Le bouton dit déjà ce qu’il fait : la main suffit, pas de bulle.
    expect(chooseGuide(base)).toEqual({ target: "launch", textKey: null });
    expect(chooseGuide({ ...base, phase: "won" })).toEqual({ target: "launch", textKey: null });
  });

  it("ne montre rien pendant que le rouleau tourne ou que l'image tombe", () => {
    expect(chooseGuide({ ...base, phase: "spinning" })).toBeNull();
    expect(chooseGuide({ ...base, phase: "dropping" })).toBeNull();
  });

  it("pendant l'écriture, désigne une lettre à toucher, sans dire laquelle ; les mauvaises lettres, elle les désigne pour les retirer", () => {
    expect(chooseGuide({ ...base, phase: "writing" })).toEqual({ target: "tile", textKey: "yambaWriting.game.guide.letter" });
    expect(chooseGuide({ ...base, phase: "writing", hasWrongLetters: true })).toEqual({ target: "wrong", textKey: "yambaWriting.game.guide.remove" });
    expect(chooseGuide({ ...base, phase: "writing", hasFreeTile: false })).toBeNull();
  });

  it("disparaît quand le jeu est en pause", () => {
    expect(chooseGuide({ ...base, frozen: true })).toBeNull();
  });

  it("n'insiste pas auprès de celui qui a déjà réussi un mot : elle ne revient qu'après un moment d'inactivité", () => {
    const expert = { ...base, beginner: false };
    expect(chooseGuide(expert)).toBeNull();
    expect(chooseGuide({ ...expert, phase: "writing" })).toBeNull();
    expect(chooseGuide({ ...expert, nudged: true })?.target).toBe("launch");
    expect(chooseGuide({ ...expert, nudged: true, phase: "writing" })?.target).toBe("tile");
  });
});
