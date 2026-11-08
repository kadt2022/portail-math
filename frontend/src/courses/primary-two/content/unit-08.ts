import type { BuildSpec, CollectSpec, LessonContent } from "../interactive/types";

// Unité 8 — Je mesure et j'estime (L29 à L32 + évaluation).

function fill(text: string, liters: number, target: number): BuildSpec {
  return {
    type: "build",
    text,
    controls: [{ id: "bottles", labelKey: "bottles", min: 0, max: 12 }],
    preview: { kind: "containers", count: "bottles", liters, target },
    goal: { bottles: target / liters },
  };
}

function balanceWeights(text: string, equals: number, solution: Record<string, number>): CollectSpec {
  return {
    type: "collect",
    text,
    unit: "kg",
    supply: [
      { id: "kg1", value: 1, visual: { kind: "weight", kg: 1 } },
      { id: "kg2", value: 2, visual: { kind: "weight", kg: 2 } },
      { id: "kg5", value: 5, visual: { kind: "weight", kg: 5 } },
    ],
    goal: { equals },
    solution,
  };
}

export const UNIT_08: readonly LessonContent[] = [
  {
    id: "MATH-2P-U08-L01",
    text: "u08l01",
    activities: [
      {
        type: "numeric",
        text: "u08l01.discover",
        fields: [
          { key: "a", accept: 7, unit: "cm", visual: { kind: "ruler", start: 0, end: 7, max: 10 } },
          { key: "b", accept: 8, unit: "cm", visual: { kind: "ruler", start: 0, end: 8, max: 10 } },
        ],
      },
      {
        type: "rounds",
        text: "u08l01.manipulate",
        rounds: [
          { type: "numeric", text: "u08l01.manipulate.r1", visual: { kind: "ruler", start: 2, end: 8, max: 10 }, fields: [{ key: "q", accept: 6, unit: "cm", check: "8 - 2" }] },
          { type: "numeric", text: "u08l01.manipulate.r2", visual: { kind: "ruler", start: 3, end: 10, max: 12 }, fields: [{ key: "q", accept: 7, unit: "cm", check: "10 - 3" }] },
        ],
      },
      {
        type: "choice",
        text: "u08l01.understand",
        visual: { kind: "ruler", start: 2, end: 7, max: 10, broken: true },
        options: [{ id: "known" }, { id: "edge" }, { id: "end" }],
        correct: ["known"],
      },
      {
        type: "numeric",
        text: "u08l01.practice",
        fields: [
          { key: "q1", accept: 7, unit: "cm", check: "7 - 0" },
          { key: "q2", accept: 6, unit: "cm", check: "8 - 2" },
          { key: "q3", accept: 5, unit: "cm", check: "7 - 2", visual: { kind: "ruler", start: 2, end: 7, max: 10, broken: true } },
        ],
      },
      {
        type: "match",
        text: "u08l01.play",
        items: [
          { id: "a", visual: { kind: "ruler", start: 0, end: 4, max: 10 }, bin: "4" },
          { id: "b", visual: { kind: "ruler", start: 1, end: 6, max: 10 }, bin: "5" },
          { id: "c", visual: { kind: "ruler", start: 3, end: 9, max: 10 }, bin: "6" },
          { id: "d", visual: { kind: "ruler", start: 0, end: 9, max: 10 }, bin: "9" },
        ],
        bins: [
          { id: "4", label: "cm4" },
          { id: "5", label: "cm5" },
          { id: "6", label: "cm6" },
          { id: "9", label: "cm9" },
        ],
      },
      {
        type: "choice",
        text: "u08l01.remember",
        options: [{ id: "rule" }, { id: "mass" }, { id: "edge" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U08-L02",
    text: "u08l02",
    activities: [
      {
        type: "choice",
        text: "u08l02.discover",
        options: [{ id: "metre" }, { id: "ruler" }],
        correct: ["metre"],
      },
      {
        type: "numeric",
        text: "u08l02.manipulate",
        visual: { kind: "numberLine", from: 0, to: 100, step: 10, marks: [0, 100] },
        fields: [{ key: "q", accept: 10, check: "100 / 10" }],
      },
      {
        type: "choice",
        text: "u08l02.understand",
        options: [{ id: "hundred" }, { id: "ten" }, { id: "thousand" }],
        correct: ["hundred"],
      },
      {
        type: "numeric",
        text: "u08l02.practice",
        fields: [
          { key: "q1", accept: 200, unit: "cm", check: "2 * 100" },
          { key: "q2", accept: 300, unit: "cm", check: "3 * 100" },
          { key: "q3", accept: 150, unit: "cm", check: "100 + 50" },
        ],
      },
      {
        type: "match",
        text: "u08l02.play",
        items: [
          { id: "notebook", labelKey: "notebook", bin: "cm" },
          { id: "pencil", labelKey: "pencil", bin: "cm" },
          { id: "classroom", labelKey: "classroom", bin: "m" },
          { id: "field", labelKey: "field", bin: "m" },
          { id: "eraser", labelKey: "eraser", bin: "cm" },
          { id: "corridor", labelKey: "corridor", bin: "m" },
        ],
        bins: [
          { id: "cm", label: "cm" },
          { id: "m", label: "m" },
        ],
      },
      {
        type: "choice",
        text: "u08l02.remember",
        options: [{ id: "rule" }, { id: "small" }, { id: "same" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U08-L03",
    text: "u08l03",
    activities: [
      {
        type: "choice",
        text: "u08l03.discover",
        visual: { kind: "balance", heavier: "left", leftKey: "u08l03.bagA", rightKey: "u08l03.bagB" },
        options: [{ id: "a" }, { id: "b" }, { id: "same" }],
        correct: ["a"],
      },
      {
        type: "rounds",
        text: "u08l03.manipulate",
        rounds: [
          {
            type: "choice",
            text: "u08l03.manipulate.r1",
            visual: { kind: "balance", heavier: "right", leftKey: "u08l03.box", rightKey: "u08l03.rice" },
            options: [{ id: "box" }, { id: "rice" }],
            correct: ["rice"],
          },
          {
            type: "choice",
            text: "u08l03.manipulate.r2",
            visual: { kind: "balance", heavier: "equal", leftKey: "u08l03.beans", rightKey: "u08l03.maize" },
            options: [{ id: "beans" }, { id: "maize" }, { id: "same" }],
            correct: ["same"],
          },
        ],
      },
      {
        type: "choice",
        text: "u08l03.understand",
        options: [{ id: "heavy" }, { id: "light" }, { id: "big" }],
        correct: ["heavy"],
      },
      {
        type: "rounds",
        text: "u08l03.practice",
        rounds: [
          { type: "order", text: "u08l03.practice.r1", values: [1, 3, 2], direction: "asc", format: "kg" },
          { type: "numeric", text: "u08l03.practice.r2", fields: [{ key: "q", accept: 2, unit: "kg", check: "5 - 3" }] },
        ],
      },
      {
        type: "rounds",
        text: "u08l03.play",
        rounds: [
          balanceWeights("u08l03.play.r1", 5, { kg5: 1 }),
          balanceWeights("u08l03.play.r2", 7, { kg5: 1, kg2: 1 }),
          balanceWeights("u08l03.play.r3", 4, { kg2: 2 }),
        ],
      },
      {
        type: "choice",
        text: "u08l03.remember",
        options: [{ id: "rule" }, { id: "size" }, { id: "colour" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U08-L04",
    text: "u08l04",
    activities: [
      {
        type: "choice",
        text: "u08l04.discover",
        options: [
          { id: "three", visual: { kind: "container", liters: 3 } },
          { id: "five", visual: { kind: "container", liters: 5 } },
        ],
        correct: ["five"],
      },
      fill("u08l04.manipulate", 1, 5),
      {
        type: "choice",
        text: "u08l04.understand",
        options: [{ id: "unit" }, { id: "faster" }, { id: "nice" }],
        correct: ["unit"],
      },
      {
        type: "numeric",
        text: "u08l04.practice",
        fields: [
          { key: "q1", accept: 2, unit: "L", check: "5 - 3" },
          { key: "q2", accept: 2, unit: "L", check: "1 + 1" },
          { key: "q3", accept: 4, unit: "L", check: "4 * 1" },
        ],
      },
      { type: "rounds", text: "u08l04.play", rounds: [fill("u08l04.play.r1", 1, 4), fill("u08l04.play.r2", 2, 6), fill("u08l04.play.r3", 5, 10)] },
      {
        type: "choice",
        text: "u08l04.remember",
        options: [{ id: "rule" }, { id: "length" }, { id: "mass" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U08-EVAL",
    text: "u08eval",
    activities: [
      { type: "numeric", text: "u08eval.q1", visual: { kind: "ruler", start: 2, end: 8, max: 10 }, fields: [{ key: "q", accept: 6, unit: "cm", check: "8 - 2" }] },
      { type: "choice", text: "u08eval.q2", options: [{ id: "cm" }, { id: "m" }], correct: ["m"] },
      { type: "order", text: "u08eval.q3", values: [1, 3, 2], direction: "asc", format: "kg" },
      { type: "numeric", text: "u08eval.q4", visual: { kind: "collection", item: "bottle", count: 2, container: "none" }, fields: [{ key: "q", accept: 2, unit: "L", check: "1 + 1" }] },
      { type: "selfcheck", text: "u08eval.check", recap: ["r1", "r2", "r3", "r4"] },
    ],
  },
];
