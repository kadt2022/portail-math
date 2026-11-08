import type { BuildSpec, ItemName, LessonContent } from "../interactive/types";

// Unité 5 — Groupes égaux et multiplication (L17 à L20 + évaluation).

function groupsBuild(text: string, groups: number, size: number, item: ItemName, maxGroups = 6, maxSize = 8): BuildSpec {
  return {
    type: "build",
    text,
    controls: [
      { id: "groups", labelKey: "groups", min: 0, max: maxGroups },
      { id: "size", labelKey: "size", min: 0, max: maxSize },
    ],
    preview: { kind: "groups", groups: "groups", size: "size", item, container: "plate" },
    goal: { groups, size },
  };
}

function arrayBuild(text: string, rows: number, cols: number, item: ItemName): BuildSpec {
  return {
    type: "build",
    text,
    controls: [
      { id: "rows", labelKey: "rows", min: 0, max: 6 },
      { id: "cols", labelKey: "cols", min: 0, max: 8 },
    ],
    preview: { kind: "array", rows: "rows", cols: "cols", item },
    goal: { rows, cols },
  };
}

export const UNIT_05: readonly LessonContent[] = [
  {
    id: "MATH-2P-U05-L01",
    text: "u05l01",
    activities: [
      {
        type: "numeric",
        text: "u05l01.discover",
        visual: { kind: "groups", item: "beignet", groups: [2, 2, 2], container: "plate" },
        fields: [
          { key: "plates", accept: 3 },
          { key: "each", accept: 2 },
          { key: "total", accept: 6, check: "2 + 2 + 2" },
        ],
      },
      groupsBuild("u05l01.manipulate", 4, 3, "seed"),
      {
        type: "choice",
        text: "u05l01.understand",
        multiple: true,
        options: [
          { id: "a", visual: { kind: "groups", item: "cap", groups: [3, 3, 3], container: "plate" } },
          { id: "b", visual: { kind: "groups", item: "nut", groups: [3, 3, 4], container: "plate" } },
          { id: "c", visual: { kind: "groups", item: "token", groups: [2, 2, 2, 2], container: "plate" } },
        ],
        correct: ["a", "c"],
      },
      {
        type: "rounds",
        text: "u05l01.practice",
        rounds: [
          {
            type: "numeric",
            text: "u05l01.practice.r1",
            fields: [
              { key: "q1", accept: 8, check: "4 + 4", visual: { kind: "groups", item: "orange", groups: [4, 4], container: "plate" } },
              { key: "q2", accept: 15, check: "5 + 5 + 5" },
            ],
          },
          {
            type: "choice",
            text: "u05l01.practice.r2",
            visual: { kind: "groups", item: "nut", groups: [3, 3, 4], container: "plate" },
            options: [{ id: "no" }, { id: "yes" }],
            correct: ["no"],
          },
        ],
      },
      { type: "distribute", text: "u05l01.play", total: 12, recipients: 4, item: "beignet", container: "plate", askEach: true },
      {
        type: "choice",
        text: "u05l01.remember",
        options: [{ id: "rule" }, { id: "many" }, { id: "big" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U05-L02",
    text: "u05l02",
    activities: [
      {
        type: "numeric",
        text: "u05l02.discover",
        visual: { kind: "array", rows: 4, cols: 2, item: "plant" },
        fields: [
          { key: "rows", accept: 4 },
          { key: "each", accept: 2 },
          { key: "total", accept: 8, check: "4 * 2" },
        ],
      },
      { ...groupsBuild("u05l02.manipulate", 3, 4, "cap"), visual: { kind: "expression", value: "3 × 4" } },
      {
        type: "choice",
        text: "u05l02.understand",
        visual: { kind: "expression", value: "3 × 2" },
        options: [{ id: "groups" }, { id: "plus" }, { id: "glue" }],
        correct: ["groups"],
      },
      {
        type: "numeric",
        text: "u05l02.practice",
        fields: [
          { key: "q1", accept: 10, check: "2 * 5" },
          { key: "q2", accept: 6, check: "3 * 2" },
          { key: "q3", accept: 5, check: "3 + 2" },
        ],
      },
      {
        type: "rounds",
        text: "u05l02.play",
        rounds: [
          { ...arrayBuild("u05l02.play.r1", 4, 3, "plant"), visual: { kind: "expression", value: "4 × 3" } },
          { ...arrayBuild("u05l02.play.r2", 2, 5, "plant"), visual: { kind: "expression", value: "2 × 5" } },
          { ...arrayBuild("u05l02.play.r3", 5, 2, "plant"), visual: { kind: "expression", value: "5 × 2" } },
        ],
      },
      {
        type: "choice",
        text: "u05l02.remember",
        options: [{ id: "rule" }, { id: "plus" }, { id: "fortyTwo" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U05-L03",
    text: "u05l03",
    activities: [
      {
        type: "numeric",
        text: "u05l03.discover",
        visual: { kind: "groups", item: "chalk", groups: [2, 2, 2, 2, 2, 2], container: "box" },
        fields: [
          { key: "children", accept: 6 },
          { key: "total", accept: 12, check: "6 * 2" },
        ],
      },
      arrayBuild("u05l03.manipulate", 2, 7, "seed"),
      {
        type: "choice",
        text: "u05l03.understand",
        visual: { kind: "array", rows: 2, cols: 6, item: "token" },
        options: [{ id: "double" }, { id: "plusTwo" }, { id: "minus" }],
        correct: ["double"],
      },
      {
        type: "numeric",
        text: "u05l03.practice",
        fields: [
          { key: "q1", accept: 8, check: "2 * 4" },
          { key: "q2", accept: 18, check: "9 + 9" },
          { key: "q3", accept: 7, check: "14 / 2" },
        ],
      },
      {
        type: "match",
        text: "u05l03.play",
        items: [
          { id: "a", labelKey: "a", bin: "6" },
          { id: "b", labelKey: "b", bin: "10" },
          { id: "c", labelKey: "c", bin: "16" },
          { id: "d", labelKey: "d", bin: "20" },
        ],
        bins: [
          { id: "6", label: 6 },
          { id: "10", label: 10 },
          { id: "16", label: 16 },
          { id: "20", label: 20 },
        ],
      },
      {
        type: "choice",
        text: "u05l03.remember",
        options: [{ id: "rule" }, { id: "plusTwo" }, { id: "half" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U05-L04",
    text: "u05l04",
    activities: [
      {
        type: "numeric",
        text: "u05l04.discover",
        visual: { kind: "groups", item: "token", groups: [5, 5], container: "none" },
        fields: [
          { key: "two", accept: 10, check: "5 + 5" },
          { key: "four", accept: 20, check: "4 * 5" },
        ],
      },
      groupsBuild("u05l04.manipulate", 4, 5, "stick"),
      {
        type: "order",
        text: "u05l04.understand",
        values: [20, 5, 15, 10],
        direction: "asc",
      },
      {
        type: "numeric",
        text: "u05l04.practice",
        fields: [
          { key: "q1", accept: 15, check: "3 * 5" },
          { key: "q2", accept: 60, check: "6 * 10" },
          { key: "q3", accept: 25, check: "10 + 10 + 5" },
        ],
      },
      {
        type: "collect",
        text: "u05l04.play",
        unit: "",
        supply: [
          { id: "five", value: 5, visual: { kind: "collection", item: "mango", count: 5, container: "basket" } },
          { id: "ten", value: 10, visual: { kind: "collection", item: "mango", count: 10, container: "basket" } },
        ],
        goal: { equals: 35 },
        solution: { ten: 3, five: 1 },
      },
      {
        type: "choice",
        text: "u05l04.remember",
        options: [{ id: "rule" }, { id: "ones" }, { id: "double" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U05-EVAL",
    text: "u05eval",
    activities: [
      { type: "numeric", text: "u05eval.q1", visual: { kind: "groups", item: "token", groups: [5, 5, 5], container: "plate" }, fields: [{ key: "q", accept: 15, check: "5 + 5 + 5" }] },
      { ...arrayBuild("u05eval.q2", 4, 3, "token"), visual: { kind: "expression", value: "4 × 3" } },
      { type: "numeric", text: "u05eval.q3", fields: [{ key: "q", accept: 18, check: "9 + 9" }] },
      { type: "numeric", text: "u05eval.q4", fields: [{ key: "q", accept: 60, check: "6 * 10" }] },
      { type: "selfcheck", text: "u05eval.check", recap: ["r1", "r2", "r3", "r4"] },
    ],
  },
];
