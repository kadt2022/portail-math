import type { BuildSpec, LessonContent } from "../interactive/types";

// Unité 2 — Dizaines et nombres jusqu'à 100 (L05 à L08 + évaluation).

const tensControls = (max = 9) => [
  { id: "tens", labelKey: "tens", min: 0, max },
  { id: "units", labelKey: "units", min: 0, max: 9 },
];

function sticksRound(text: string, count: number): BuildSpec {
  return {
    type: "build",
    text,
    visual: { kind: "collection", item: "stick", count, container: "none" },
    controls: tensControls(2),
    preview: { kind: "tens", tens: "tens", units: "units" },
    goal: { tens: Math.floor(count / 10), units: count % 10 },
  };
}

function granaryRound(text: string, seeds: number): BuildSpec {
  return {
    type: "build",
    text,
    visual: { kind: "expression", value: String(seeds) },
    controls: [
      { id: "bags", labelKey: "bags", min: 0, max: 10 },
      { id: "seeds", labelKey: "seeds", min: 0, max: 9 },
    ],
    preview: { kind: "tens", tens: "bags", units: "seeds", item: "bag" },
    goal: { bags: Math.floor(seeds / 10), seeds: seeds % 10 },
  };
}

export const UNIT_02: readonly LessonContent[] = [
  {
    id: "MATH-2P-U02-L01",
    text: "u02l01",
    activities: [
      {
        type: "numeric",
        text: "u02l01.discover",
        visual: { kind: "collection", item: "stick", count: 14, container: "none" },
        fields: [
          { key: "total", accept: 14 },
          { key: "bundles", accept: 1, check: "Math.floor(14 / 10)" },
        ],
      },
      {
        type: "build",
        text: "u02l01.manipulate",
        visual: { kind: "collection", item: "seed", count: 26, container: "none" },
        controls: tensControls(3),
        preview: { kind: "tens", tens: "tens", units: "units", item: "bag" },
        goal: { tens: 2, units: 6 },
      },
      {
        type: "choice",
        text: "u02l01.understand",
        visual: { kind: "tens", tens: 1, units: 4 },
        options: [{ id: "ten" }, { id: "tenTens" }, { id: "one" }],
        correct: ["ten"],
      },
      {
        type: "numeric",
        text: "u02l01.practice",
        fields: [
          { key: "q1", accept: 10 },
          { key: "q2", accept: 30, check: "3 * 10", visual: { kind: "tens", tens: 3, units: 0 } },
          { key: "q3", accept: 2, check: "Math.floor(28 / 10)" },
          { key: "q4", accept: 8, check: "28 % 10" },
        ],
      },
      {
        type: "rounds",
        text: "u02l01.play",
        rounds: [sticksRound("u02l01.play.r1", 13), sticksRound("u02l01.play.r2", 17), sticksRound("u02l01.play.r3", 20)],
      },
      {
        type: "choice",
        text: "u02l01.remember",
        options: [{ id: "rule" }, { id: "five" }, { id: "hundred" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U02-L02",
    text: "u02l02",
    activities: [
      {
        type: "numeric",
        text: "u02l02.discover",
        visual: { kind: "tens", tens: 4, units: 3 },
        fields: [
          { key: "tens", accept: 4 },
          { key: "units", accept: 3 },
          { key: "number", accept: 43, check: "4 * 10 + 3" },
        ],
      },
      {
        type: "build",
        text: "u02l02.manipulate",
        visual: { kind: "expression", value: "52" },
        controls: tensControls(6),
        preview: { kind: "tens", tens: "tens", units: "units" },
        goal: { tens: 5, units: 2 },
      },
      {
        type: "choice",
        text: "u02l02.understand",
        visual: { kind: "tens", tens: 4, units: 3 },
        options: [{ id: "forty" }, { id: "four" }, { id: "fortyThree" }],
        correct: ["forty"],
      },
      {
        type: "numeric",
        text: "u02l02.practice",
        fields: [
          { key: "q1", accept: 27, check: "2 * 10 + 7" },
          { key: "q2", accept: 6, check: "Math.floor(64 / 10)" },
          { key: "q3", accept: 4, check: "64 % 10" },
          { key: "q4", accept: 50, check: "Math.floor(58 / 10) * 10" },
        ],
      },
      {
        type: "match",
        text: "u02l02.play",
        items: [
          { id: "a", visual: { kind: "tens", tens: 3, units: 5 }, bin: "35" },
          { id: "b", visual: { kind: "tens", tens: 5, units: 3 }, bin: "53" },
          { id: "c", visual: { kind: "tens", tens: 6, units: 1 }, bin: "61" },
          { id: "d", visual: { kind: "tens", tens: 1, units: 6 }, bin: "16" },
        ],
        bins: [
          { id: "16", label: 16 },
          { id: "35", label: 35 },
          { id: "53", label: 53 },
          { id: "61", label: 61 },
        ],
      },
      {
        type: "choice",
        text: "u02l02.remember",
        options: [{ id: "rule" }, { id: "swap" }, { id: "sum" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U02-L03",
    text: "u02l03",
    activities: [
      {
        type: "numeric",
        text: "u02l03.discover",
        visual: { kind: "tens", tens: 7, units: 0, item: "bag" },
        fields: [
          { key: "seventy", accept: 70, check: "7 * 10" },
          { key: "hundred", accept: 100, check: "10 * 10" },
        ],
      },
      {
        type: "build",
        text: "u02l03.manipulate",
        visual: { kind: "expression", value: "94" },
        controls: tensControls(10),
        preview: { kind: "tens", tens: "tens", units: "units" },
        goal: { tens: 9, units: 4 },
      },
      {
        type: "choice",
        text: "u02l03.understand",
        visual: { kind: "tens", tens: 10, units: 0, item: "bag" },
        options: [{ id: "tenTens" }, { id: "hundredTens" }, { id: "oneTen" }],
        correct: ["tenTens"],
      },
      {
        type: "numeric",
        text: "u02l03.practice",
        fields: [
          { key: "q1", accept: 80, check: "8 * 10" },
          { key: "q2", accept: 7, check: "97 - 90" },
          { key: "q3", accept: 3, check: "(100 - 70) / 10" },
        ],
      },
      {
        type: "rounds",
        text: "u02l03.play",
        rounds: [granaryRound("u02l03.play.r1", 80), granaryRound("u02l03.play.r2", 76), granaryRound("u02l03.play.r3", 100)],
      },
      {
        type: "choice",
        text: "u02l03.remember",
        options: [{ id: "rule" }, { id: "seven" }, { id: "seventeen" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U02-L04",
    text: "u02l04",
    activities: [
      {
        type: "choice",
        text: "u02l04.discover",
        options: [
          { id: "red", visual: { kind: "tens", tens: 4, units: 8 } },
          { id: "blue", visual: { kind: "tens", tens: 5, units: 2 } },
        ],
        correct: ["blue"],
      },
      { type: "symbol", text: "u02l04.manipulate", pairs: [[46, 49]], showTens: true },
      {
        type: "choice",
        text: "u02l04.understand",
        options: [{ id: "tens" }, { id: "units" }, { id: "digits" }],
        correct: ["tens"],
      },
      {
        type: "rounds",
        text: "u02l04.practice",
        rounds: [
          { type: "symbol", text: "u02l04.practice.r1", pairs: [[73, 68], [45, 54], [90, 90], [39, 93]] },
          {
            type: "numeric",
            text: "u02l04.practice.r2",
            fields: [{ key: "q", accept: { min: 67, max: 69 } }],
          },
        ],
      },
      { type: "order", text: "u02l04.play", values: [45, 54, 40, 49], direction: "asc" },
      {
        type: "choice",
        text: "u02l04.remember",
        options: [{ id: "rule" }, { id: "units" }, { id: "last" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U02-EVAL",
    text: "u02eval",
    activities: [
      { type: "numeric", text: "u02eval.q1", fields: [{ key: "q", accept: 30, check: "3 * 10" }] },
      {
        type: "numeric",
        text: "u02eval.q2",
        fields: [
          { key: "tens", accept: 6 },
          { key: "units", accept: 4 },
        ],
      },
      { type: "numeric", text: "u02eval.q3", fields: [{ key: "q", accept: 90, check: "97 - 7" }] },
      { type: "order", text: "u02eval.q4", values: [45, 54, 40, 49], direction: "asc" },
      { type: "selfcheck", text: "u02eval.check", recap: ["r1", "r2", "r3", "r4"] },
    ],
  },
];
