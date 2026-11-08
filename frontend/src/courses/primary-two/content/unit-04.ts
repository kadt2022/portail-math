import type { BuildSpec, LessonContent } from "../interactive/types";

// Unité 4 — Je soustrais et je vérifie (L13 à L16 + évaluation).

function tensFrom(text: string, tens: number, units: number, goal: { tens: number; units: number }): BuildSpec {
  return {
    type: "build",
    text,
    controls: [
      { id: "tens", labelKey: "tens", min: 0, max: 9, start: tens },
      { id: "units", labelKey: "units", min: 0, max: 9, start: units },
    ],
    preview: { kind: "tens", tens: "tens", units: "units" },
    goal,
  };
}

function backJumps(text: string, start: number, first: number, second: number): BuildSpec {
  const end = start - first - second;
  return {
    type: "build",
    text,
    visual: { kind: "expression", value: `${start} − ${first + second}` },
    controls: [
      { id: "first", labelKey: "first", min: 0, max: 9 },
      { id: "second", labelKey: "second", min: 0, max: 9 },
    ],
    preview: { kind: "jumps", start, from: Math.max(0, end - 3), to: start + 2, jumps: ["first", "second"], direction: -1 },
    goal: { first, second },
  };
}

function transfer(text: string, a: number, b: number): BuildSpec {
  return {
    type: "build",
    text,
    controls: [{ id: "move", labelKey: "move", min: 0, max: a }],
    preview: { kind: "transfer", a, b, move: "move", item: "mango" },
    goal: { move: (a - b) / 2 },
  };
}

export const UNIT_04: readonly LessonContent[] = [
  {
    id: "MATH-2P-U04-L01",
    text: "u04l01",
    activities: [
      {
        type: "numeric",
        text: "u04l01.discover",
        visual: { kind: "tens", tens: 3, units: 8 },
        fields: [
          { key: "rest", accept: 32, check: "38 - 6" },
          { key: "tens", accept: 3, check: "Math.floor(32 / 10)" },
        ],
      },
      { ...tensFrom("u04l01.manipulate", 4, 7, { tens: 4, units: 2 }), visual: { kind: "expression", value: "47 − 5" } },
      {
        type: "choice",
        text: "u04l01.understand",
        visual: { kind: "expression", value: "38 − 6" },
        options: [{ id: "units" }, { id: "tens" }, { id: "add" }],
        correct: ["units"],
      },
      {
        type: "numeric",
        text: "u04l01.practice",
        fields: [
          { key: "q1", accept: 25, check: "29 - 4" },
          { key: "q2", accept: 63, check: "66 - 3" },
          { key: "q3", accept: 49, check: "42 + 7" },
        ],
      },
      {
        type: "rounds",
        text: "u04l01.play",
        rounds: [
          { type: "numeric", text: "u04l01.play.r1", visual: { kind: "tens", tens: 5, units: 9 }, fields: [{ key: "q", accept: 55, check: "59 - 4" }] },
          { type: "numeric", text: "u04l01.play.r2", visual: { kind: "tens", tens: 7, units: 6 }, fields: [{ key: "q", accept: 71, check: "76 - 5" }] },
          { type: "numeric", text: "u04l01.play.r3", visual: { kind: "tens", tens: 8, units: 8 }, fields: [{ key: "q", accept: 80, check: "88 - 8" }] },
        ],
      },
      {
        type: "choice",
        text: "u04l01.remember",
        options: [{ id: "rule" }, { id: "tens" }, { id: "both" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U04-L02",
    text: "u04l02",
    activities: [
      {
        type: "numeric",
        text: "u04l02.discover",
        visual: { kind: "numberLine", from: 25, to: 34, marks: [32, 30, 27], jumps: [[32, 30], [30, 27]] },
        fields: [
          { key: "first", accept: 30, check: "32 - 2" },
          { key: "left", accept: 3, check: "5 - 2" },
          { key: "result", accept: 27, check: "32 - 5" },
        ],
      },
      backJumps("u04l02.manipulate", 41, 1, 5),
      {
        type: "choice",
        text: "u04l02.understand",
        visual: { kind: "numberLine", from: 54, to: 66, marks: [64, 60, 56], jumps: [[64, 60], [60, 56]] },
        options: [{ id: "bridge" }, { id: "add" }, { id: "drop" }],
        correct: ["bridge"],
      },
      {
        type: "numeric",
        text: "u04l02.practice",
        fields: [
          { key: "q1", accept: 18, check: "23 - 5" },
          { key: "q2", accept: 43, check: "50 - 7" },
          { key: "q3", accept: 56, check: "64 - 8" },
        ],
      },
      {
        type: "rounds",
        text: "u04l02.play",
        rounds: [
          backJumps("u04l02.play.r1", 32, 2, 3),
          backJumps("u04l02.play.r2", 53, 3, 3),
          backJumps("u04l02.play.r3", 71, 1, 3),
        ],
      },
      {
        type: "choice",
        text: "u04l02.remember",
        options: [{ id: "rule" }, { id: "forward" }, { id: "big" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U04-L03",
    text: "u04l03",
    activities: [
      {
        type: "numeric",
        text: "u04l03.discover",
        visual: { kind: "tens", tens: 7, units: 5, item: "bag" },
        fields: [
          { key: "removed", accept: 3, check: "30 / 10" },
          { key: "left", accept: 4, check: "7 - 3" },
          { key: "result", accept: 45, check: "75 - 30" },
        ],
      },
      { ...tensFrom("u04l03.manipulate", 6, 2, { tens: 4, units: 2 }), visual: { kind: "expression", value: "62 − 20" } },
      {
        type: "choice",
        text: "u04l03.understand",
        visual: { kind: "expression", value: "75 − 30" },
        options: [{ id: "tens" }, { id: "units" }, { id: "both" }],
        correct: ["tens"],
      },
      {
        type: "numeric",
        text: "u04l03.practice",
        fields: [
          { key: "q1", accept: 28, check: "48 - 20" },
          { key: "q2", accept: 50, check: "90 - 40" },
          { key: "q3", accept: 30, check: "87 - 57" },
        ],
      },
      {
        type: "rounds",
        text: "u04l03.play",
        rounds: [
          tensFrom("u04l03.play.r1", 5, 3, { tens: 3, units: 3 }),
          tensFrom("u04l03.play.r2", 8, 1, { tens: 3, units: 1 }),
          tensFrom("u04l03.play.r3", 9, 6, { tens: 5, units: 6 }),
        ],
      },
      {
        type: "choice",
        text: "u04l03.remember",
        options: [{ id: "rule" }, { id: "units" }, { id: "all" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U04-L04",
    text: "u04l04",
    activities: [
      {
        type: "numeric",
        text: "u04l04.discover",
        visual: { kind: "numberLine", from: 38, to: 56, marks: [39, 40, 50, 54], jumps: [[39, 40], [40, 50], [50, 54]] },
        fields: [{ key: "gap", accept: 15, check: "54 - 39" }],
      },
      {
        type: "numeric",
        text: "u04l04.manipulate",
        visual: { kind: "groups", item: "token", groups: [15, 11], container: "box" },
        fields: [{ key: "alone", accept: 4, check: "15 - 11" }],
      },
      {
        type: "choice",
        text: "u04l04.understand",
        options: [{ id: "gap" }, { id: "sum" }, { id: "count" }],
        correct: ["gap"],
      },
      {
        type: "numeric",
        text: "u04l04.practice",
        fields: [
          { key: "q1", accept: 5, check: "18 - 13" },
          { key: "q2", accept: 12, check: "62 - 50" },
          { key: "q3", accept: 38, check: "47 - 9" },
        ],
      },
      {
        type: "rounds",
        text: "u04l04.play",
        rounds: [transfer("u04l04.play.r1", 12, 8), transfer("u04l04.play.r2", 15, 9), transfer("u04l04.play.r3", 10, 4)],
      },
      {
        type: "choice",
        text: "u04l04.remember",
        options: [{ id: "rule" }, { id: "add" }, { id: "biggest" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U04-EVAL",
    text: "u04eval",
    activities: [
      { type: "numeric", text: "u04eval.q1", fields: [{ key: "q", accept: 63, check: "66 - 3" }] },
      { type: "numeric", text: "u04eval.q2", fields: [{ key: "q", accept: 43, check: "50 - 7" }] },
      { type: "numeric", text: "u04eval.q3", fields: [{ key: "q", accept: 50, check: "90 - 40" }] },
      { type: "numeric", text: "u04eval.q4", fields: [{ key: "q", accept: 12, check: "62 - 50" }] },
      { type: "selfcheck", text: "u04eval.check", recap: ["r1", "r2", "r3", "r4"] },
    ],
  },
];
