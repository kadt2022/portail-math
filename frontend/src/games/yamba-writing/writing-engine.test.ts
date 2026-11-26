import { describe, expect, it } from "vitest";

import {
  availableTiles,
  buildReel,
  buildSlots,
  createRound,
  giveHint,
  helpLevel,
  letterAt,
  misplacedSlots,
  moveBetweenSlots,
  pickNext,
  placeTile,
  remember,
  removeFromSlot,
  spinProgress,
  type Rng,
  type RoundState,
} from "./writing-engine";
import { DEFAULT_WRITING_LOCALE, WRITING_CATEGORY_ORDER, WRITING_WORDS, wordsFor } from "./writing-words";

/** Hasard déterministe : une suite de valeurs qui se répète. */
function sequence(values: number[]): Rng {
  let index = 0;
  return () => values[index++ % values.length];
}

function tileFor(state: RoundState, letter: string) {
  const tile = availableTiles(state).find((candidate) => candidate.letter === letter);
  if (!tile) throw new Error(`lettre indisponible : ${letter}`);
  return tile;
}

function write(state: RoundState, text: string): RoundState {
  let next = state;
  for (const letter of text) next = placeTile(next, tileFor(next, letter).id);
  return next;
}

describe("catalogue de mots", () => {
  it("compte les 30 mots demandés : 10 fruits, 5 animaux domestiques, 5 animaux sauvages, 10 objets", () => {
    expect(WRITING_WORDS).toHaveLength(30);
    expect(wordsFor("fruits")).toHaveLength(10);
    expect(wordsFor("domestic-animals")).toHaveLength(5);
    expect(wordsFor("wild-animals")).toHaveLength(5);
    expect(wordsFor("objects")).toHaveLength(10);
    expect(wordsFor("all")).toHaveLength(30);
    expect(WRITING_CATEGORY_ORDER).toHaveLength(4);
  });

  it("a des identifiants uniques et un mot français pour chacun", () => {
    expect(new Set(WRITING_WORDS.map((word) => word.id)).size).toBe(30);
    for (const word of WRITING_WORDS) expect(word.labels[DEFAULT_WRITING_LOCALE]).toBeTruthy();
  });

  it("écarte les mots sans traduction dans la langue demandée, sans modifier le moteur", () => {
    const words = [
      { id: "a", category: "fruits" as const, labels: { fr: "pomme", en: "apple" } },
      { id: "b", category: "fruits" as const, labels: { fr: "poire" } },
    ];
    expect(wordsFor("fruits", "en", words).map((word) => word.id)).toEqual(["a"]);
  });
});

describe("cases du mot", () => {
  it("met le mot en majuscules et garde les accents", () => {
    expect(buildSlots("pastèque").map((slot) => (slot.kind === "letter" ? slot.expected : slot.char)).join("")).toBe("PASTÈQUE");
    expect(buildSlots("clé")[2]).toEqual({ kind: "letter", expected: "É" });
  });

  it("traite l'espace d'un mot composé comme un signe fixe, sans case à remplir", () => {
    const slots = buildSlots("noix de coco");
    expect(slots.filter((slot) => slot.kind === "fixed")).toHaveLength(2);
    expect(slots.filter((slot) => slot.kind === "letter")).toHaveLength(10);
  });
});

describe("manche", () => {
  it("propose exactement les lettres du mot, mélangées, jamais déjà dans le bon ordre", () => {
    for (const seed of [0, 0.2, 0.5, 0.9]) {
      const state = createRound("lion", sequence([seed, 0.1, 0.7]));
      expect(state.tiles.map((tile) => tile.letter).sort().join("")).toBe("ILNO");
      expect(state.tiles.map((tile) => tile.letter).join("")).not.toBe("LION");
      expect(state.placed.every((tile) => tile === null)).toBe(true);
    }
  });

  it("accepte un mot dont toutes les lettres sont identiques sans boucler", () => {
    const state = createRound("aa", sequence([0.3]));
    expect(state.tiles).toHaveLength(2);
  });

  it("forme LION dans l'ordre : le mot est juste", () => {
    const state = write(createRound("lion", sequence([0.4, 0.8, 0.1])), "LION");
    expect(state.status).toBe("won");
    expect(misplacedSlots(state)).toEqual([]);
  });

  it("gère les lettres répétées : deux A sont interchangeables", () => {
    const round = createRound("ananas", sequence([0.2, 0.6, 0.9]));
    expect(write(round, "ANANAS").status).toBe("won");
  });

  it("gère un mot composé : seules les lettres sont placées, l'espace est déjà là", () => {
    const state = write(createRound("noix de coco", sequence([0.3, 0.7])), "NOIXDECOCO");
    expect(state.status).toBe("won");
  });

  it("gère les accents : E ne remplace pas É", () => {
    const round = createRound("clé", sequence([0.5]));
    const wrong = round.tiles.every((tile) => tile.letter !== "E");
    expect(wrong).toBe(true);
    expect(write(round, "CLÉ").status).toBe("won");
  });

  it("pose dans la case demandée, et une lettre déjà posée change de case sans se dupliquer", () => {
    let state = createRound("lion", sequence([0.4, 0.8, 0.1]));
    const l = tileFor(state, "L");
    state = placeTile(state, l.id, 2);
    expect(letterAt(state, 2)).toBe("L");
    state = placeTile(state, l.id, 0);
    expect(letterAt(state, 0)).toBe("L");
    expect(letterAt(state, 2)).toBeNull();
    expect(availableTiles(state)).toHaveLength(3);
  });

  it("ignore une pose sur une case fixe, une lettre inconnue ou une manche déjà gagnée", () => {
    const base = createRound("noix de coco", sequence([0.3, 0.7]));
    expect(placeTile(base, base.tiles[0].id, 4)).toBe(base);
    expect(placeTile(base, 999)).toBe(base);
    const won = write(base, "NOIXDECOCO");
    expect(removeFromSlot(won, 0)).toBe(won);
    expect(moveBetweenSlots(won, 0, 1)).toBe(won);
    expect(giveHint(won)).toBe(won);
    expect(placeTile(won, won.tiles[0].id)).toBe(won);
  });

  it("permet de retirer une lettre mal placée : elle revient parmi les lettres disponibles", () => {
    let state = createRound("lion", sequence([0.4, 0.8, 0.1]));
    state = placeTile(state, tileFor(state, "O").id);
    expect(availableTiles(state)).toHaveLength(3);
    state = removeFromSlot(state, 0);
    expect(availableTiles(state)).toHaveLength(4);
    expect(removeFromSlot(state, 0)).toBe(state);
  });

  it("déplace ou échange deux lettres posées", () => {
    let state = createRound("lion", sequence([0.4, 0.8, 0.1]));
    state = placeTile(state, tileFor(state, "I").id, 0);
    state = placeTile(state, tileFor(state, "L").id, 1);
    state = moveBetweenSlots(state, 0, 1);
    expect([letterAt(state, 0), letterAt(state, 1)]).toEqual(["L", "I"]);
    state = moveBetweenSlots(state, 0, 3);
    expect([letterAt(state, 0), letterAt(state, 3)]).toEqual([null, "L"]);
    expect(moveBetweenSlots(state, 0, 1)).toBe(state);
    expect(moveBetweenSlots(state, 1, 1)).toBe(state);
  });
});

describe("aide progressive, sans pénalité", () => {
  it("compte les tentatives complètes fausses, sans bloquer la partie", () => {
    let state = write(createRound("lion", sequence([0.4, 0.8, 0.1])), "LOIN");
    expect(state.status).toBe("playing");
    expect(state.wrongAttempts).toBe(1);
    expect(helpLevel(state)).toBe(1);
    expect(misplacedSlots(state)).toEqual([1, 2]);
    state = moveBetweenSlots(state, 1, 2);
    expect(state.status).toBe("won");
  });

  it("au deuxième échec, l'aide retire les mauvaises lettres et offre la bonne à la première case non juste", () => {
    let state = write(createRound("lion", sequence([0.4, 0.8, 0.1])), "LOIN");
    state = moveBetweenSlots(state, 0, 3);
    expect(state.wrongAttempts).toBe(2);
    expect(helpLevel(state)).toBe(2);
    state = giveHint(state);
    expect([0, 1, 2, 3].map((index) => letterAt(state, index))).toEqual(["L", null, null, null]);
    expect(state.status).toBe("playing");
  });

  it("l'aide sur une manche vide offre la première lettre ; sur une manche presque finie, la dernière", () => {
    const empty = giveHint(createRound("lion", sequence([0.4, 0.8, 0.1])));
    expect(letterAt(empty, 0)).toBe("L");
    const almost = write(createRound("lion", sequence([0.4, 0.8, 0.1])), "LIO");
    expect(giveHint(almost).status).toBe("won");
  });

  it("l'aide conserve les lettres justes et ne remplace que les mauvaises", () => {
    const state = write(createRound("lion", sequence([0.4, 0.8, 0.1])), "LOIN");
    const next = giveHint(state);
    expect([0, 1, 2, 3].map((index) => letterAt(next, index))).toEqual(["L", "I", null, "N"]);
    expect(next.status).toBe("playing");
  });
});

describe("tirage des mots", () => {
  const pool = ["a", "b", "c", "d", "e"].map((id) => ({ id }));

  it("n'enchaîne jamais les mêmes illustrations : les derniers mots vus sont écartés", () => {
    let recent: string[] = [];
    let previous = "";
    for (let round = 0; round < 60; round += 1) {
      const next = pickNext(pool, recent, Math.random, 3);
      expect(next).not.toBeNull();
      expect(recent.slice(-3)).not.toContain(next!.id);
      expect(next!.id).not.toBe(previous);
      recent = remember(recent, next!.id);
      previous = next!.id;
    }
  });

  it("avec peu de mots, ne bloque pas : il garde au moins un candidat", () => {
    expect(pickNext([{ id: "a" }, { id: "b" }], ["a", "b"], () => 0, 3)?.id).toBe("a");
    expect(pickNext([{ id: "a" }], ["a"], () => 0)?.id).toBe("a");
    expect(pickNext([], [], () => 0)).toBeNull();
  });

  it("garde une mémoire courte et sans doublon", () => {
    expect(remember(["a", "b", "c", "d", "e"], "f")).toEqual(["b", "c", "d", "e", "f"]);
    expect(remember(["a", "b"], "a")).toEqual(["b", "a"]);
  });
});

describe("rouleau", () => {
  it("se termine sur l'illustration gagnante, sans répétition immédiate", () => {
    const pool = ["a", "b", "c", "d"];
    const reel = buildReel(pool, "c", Math.random, 24);
    expect(reel).toHaveLength(24);
    expect(reel[reel.length - 1]).toBe("c");
    for (let index = 1; index < reel.length; index += 1) expect(reel[index]).not.toBe(reel[index - 1]);
  });

  it("ne boucle jamais, même avec un hasard figé, et n'enchaîne pas deux fois la même image", () => {
    const reel = buildReel(["a", "b", "c"], "c", () => 0, 12);
    expect(reel).toHaveLength(12);
    for (let index = 1; index < reel.length; index += 1) expect(reel[index]).not.toBe(reel[index - 1]);
  });

  it("fonctionne avec une seule illustration", () => {
    expect(buildReel(["a"], "a", () => 0, 5)).toEqual(["a", "a", "a", "a", "a"]);
  });

  it("ralentit : avancement rapide au début, de plus en plus lent, 1 à la fin", () => {
    expect(spinProgress(0, 3000)).toBe(0);
    expect(spinProgress(3000, 3000)).toBe(1);
    expect(spinProgress(9000, 3000)).toBe(1);
    expect(spinProgress(-5, 3000)).toBe(0);
    const early = spinProgress(500, 3000) - spinProgress(0, 3000);
    const late = spinProgress(3000, 3000) - spinProgress(2500, 3000);
    expect(early).toBeGreaterThan(late * 5);
    expect(spinProgress(1, 0)).toBe(1);
  });
});
