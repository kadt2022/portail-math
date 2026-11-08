import type { BuildSpec, ItemName, LessonContent } from "../interactive/types";

// Unité 6 — Je partage équitablement (L21 à L24 + évaluation).

/** Former des paquets de taille fixe dans une collection : on cherche le nombre de paquets. */
function packs(text: string, total: number, size: number, item: ItemName): BuildSpec {
  return {
    type: "build",
    text,
    visual: { kind: "collection", item, count: total, container: "none" },
    controls: [{ id: "groups", labelKey: "groups", min: 0, max: 10 }],
    preview: { kind: "groups", groups: "groups", size, item, container: "box" },
    goal: { groups: total / size },
  };
}

export const UNIT_06: readonly LessonContent[] = [
  {
    id: "MATH-2P-U06-L01",
    text: "u06l01",
    activities: [
      { type: "distribute", text: "u06l01.discover", total: 12, recipients: 3, item: "nut", container: "child", askEach: true },
      { type: "distribute", text: "u06l01.manipulate", total: 10, recipients: 2, item: "cap", container: "bowl", askEach: true },
      {
        type: "choice",
        text: "u06l01.understand",
        options: [{ id: "turns" }, { id: "first" }, { id: "handful" }],
        correct: ["turns"],
      },
      {
        type: "rounds",
        text: "u06l01.practice",
        rounds: [
          {
            type: "numeric",
            text: "u06l01.practice.r1",
            fields: [
              { key: "q1", accept: 4, check: "8 / 2" },
              { key: "q2", accept: 5, check: "15 / 3" },
            ],
          },
          { type: "distribute", text: "u06l01.practice.r2", total: 7, recipients: 2, item: "orange", container: "child", askEach: true, askRest: true },
        ],
      },
      {
        type: "rounds",
        text: "u06l01.play",
        rounds: [
          { type: "distribute", text: "u06l01.play.r1", total: 9, recipients: 3, item: "mango", container: "basket", askEach: true },
          { type: "distribute", text: "u06l01.play.r2", total: 16, recipients: 4, item: "token", container: "child", askEach: true },
          { type: "distribute", text: "u06l01.play.r3", total: 11, recipients: 2, item: "beignet", container: "plate", askEach: true, askRest: true },
        ],
      },
      {
        type: "choice",
        text: "u06l01.remember",
        options: [{ id: "rule" }, { id: "biggest" }, { id: "random" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U06-L02",
    text: "u06l02",
    activities: [
      packs("u06l02.discover", 18, 3, "chalk"),
      packs("u06l02.manipulate", 16, 4, "seed"),
      {
        type: "choice",
        text: "u06l02.understand",
        visual: { kind: "groups", item: "chalk", groups: [3, 3, 3, 3, 3, 3], container: "box" },
        options: [{ id: "count" }, { id: "size" }, { id: "total" }],
        correct: ["count"],
      },
      {
        type: "numeric",
        text: "u06l02.practice",
        fields: [
          { key: "q1", accept: 5, check: "10 / 2" },
          { key: "q2", accept: 4, check: "20 / 5" },
          { key: "q3", accept: 12, check: "3 * 4" },
        ],
      },
      {
        type: "match",
        text: "u06l02.play",
        items: [
          { id: "a", labelKey: "a", bin: "2" },
          { id: "b", labelKey: "b", bin: "3" },
          { id: "c", labelKey: "c", bin: "4" },
          { id: "d", labelKey: "d", bin: "5" },
        ],
        bins: [
          { id: "2", label: 2 },
          { id: "3", label: 3 },
          { id: "4", label: 4 },
          { id: "5", label: 5 },
        ],
      },
      {
        type: "choice",
        text: "u06l02.remember",
        options: [{ id: "rule" }, { id: "share" }, { id: "add" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U06-L03",
    text: "u06l03",
    activities: [
      {
        type: "choice",
        text: "u06l03.discover",
        options: [
          { id: "equal", visual: { kind: "fraction", parts: 2, shaded: 1, equal: true } },
          { id: "unequal", visual: { kind: "fraction", parts: 2, shaded: 1, equal: false } },
          { id: "three", visual: { kind: "fraction", parts: 3, shaded: 1, equal: true } },
        ],
        correct: ["equal"],
      },
      {
        type: "rounds",
        text: "u06l03.manipulate",
        rounds: [
          { type: "distribute", text: "u06l03.manipulate.r1", total: 10, recipients: 2, item: "orange", container: "plate", askEach: true },
          { type: "distribute", text: "u06l03.manipulate.r2", total: 12, recipients: 4, item: "beignet", container: "plate", askEach: true },
        ],
      },
      {
        type: "choice",
        text: "u06l03.understand",
        visual: { kind: "fraction", parts: 4, shaded: 1, equal: true },
        options: [{ id: "quarter" }, { id: "anyFour" }, { id: "half" }],
        correct: ["quarter"],
      },
      {
        type: "rounds",
        text: "u06l03.practice",
        rounds: [
          {
            type: "numeric",
            text: "u06l03.practice.r1",
            fields: [
              { key: "q1", accept: 5, check: "10 / 2" },
              { key: "q2", accept: 3, check: "12 / 4" },
            ],
          },
          {
            type: "choice",
            text: "u06l03.practice.r2",
            visual: { kind: "fraction", parts: 2, shaded: 1, equal: false },
            options: [{ id: "no" }, { id: "yes" }],
            correct: ["no"],
          },
        ],
      },
      {
        type: "match",
        text: "u06l03.play",
        items: [
          { id: "a", visual: { kind: "fraction", parts: 2, shaded: 1, equal: true }, bin: "half" },
          { id: "b", visual: { kind: "fraction", parts: 4, shaded: 1, equal: true }, bin: "quarter" },
          { id: "c", visual: { kind: "fraction", parts: 2, shaded: 1, equal: false }, bin: "unequal" },
          { id: "d", visual: { kind: "fraction", parts: 4, shaded: 1, equal: false }, bin: "unequal" },
          { id: "e", visual: { kind: "fraction", parts: 4, shaded: 3, equal: true }, bin: "quarter" },
        ],
        bins: [
          { id: "half", label: "half" },
          { id: "quarter", label: "quarter" },
          { id: "unequal", label: "unequal" },
        ],
      },
      {
        type: "choice",
        text: "u06l03.remember",
        options: [{ id: "rule" }, { id: "two" }, { id: "big" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U06-L04",
    text: "u06l04",
    activities: [
      {
        type: "match",
        text: "u06l04.discover",
        items: [
          { id: "a", labelKey: "a", bin: "share" },
          { id: "b", labelKey: "b", bin: "group" },
          { id: "c", labelKey: "c", bin: "share" },
          { id: "d", labelKey: "d", bin: "group" },
        ],
        bins: [
          { id: "share", label: "share" },
          { id: "group", label: "group" },
        ],
      },
      {
        type: "rounds",
        text: "u06l04.manipulate",
        rounds: [
          { type: "distribute", text: "u06l04.manipulate.r1", total: 12, recipients: 3, item: "token", container: "child", askEach: true },
          packs("u06l04.manipulate.r2", 12, 3, "token"),
        ],
      },
      {
        type: "choice",
        text: "u06l04.understand",
        options: [{ id: "size" }, { id: "count" }, { id: "same" }],
        correct: ["size"],
      },
      {
        type: "numeric",
        text: "u06l04.practice",
        fields: [
          { key: "q1", accept: 4, check: "12 / 3" },
          { key: "q2", accept: 4, check: "12 / 3" },
          { key: "q3", accept: 5, check: "20 / 4" },
        ],
      },
      {
        type: "rounds",
        text: "u06l04.play",
        rounds: [
          { type: "choice", text: "u06l04.play.r1", options: [{ id: "share" }, { id: "group" }], correct: ["share"] },
          { type: "distribute", text: "u06l04.play.r2", total: 15, recipients: 3, item: "mango", container: "child", askEach: true },
          { type: "choice", text: "u06l04.play.r3", options: [{ id: "share" }, { id: "group" }], correct: ["group"] },
          packs("u06l04.play.r4", 16, 4, "chalk"),
        ],
      },
      {
        type: "choice",
        text: "u06l04.remember",
        options: [{ id: "rule" }, { id: "inverse" }, { id: "same" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U06-EVAL",
    text: "u06eval",
    activities: [
      { type: "numeric", text: "u06eval.q1", fields: [{ key: "q", accept: 5, check: "15 / 3" }] },
      { type: "numeric", text: "u06eval.q2", fields: [{ key: "q", accept: 4, check: "20 / 5" }] },
      { type: "numeric", text: "u06eval.q3", visual: { kind: "collection", item: "orange", count: 12, container: "none" }, fields: [{ key: "q", accept: 3, check: "12 / 4" }] },
      { type: "numeric", text: "u06eval.q4", fields: [{ key: "q", accept: 4, check: "12 / 3" }] },
      { type: "selfcheck", text: "u06eval.check", recap: ["r1", "r2", "r3", "r4"] },
    ],
  },
];
