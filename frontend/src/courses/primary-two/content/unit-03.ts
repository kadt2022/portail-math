import type { LessonContent } from "../interactive/types";

// Unité 3 — J'additionne avec des stratégies (L09 à L12 + évaluation).

const tensControls = [
  { id: "tens", labelKey: "tens", min: 0, max: 9 },
  { id: "units", labelKey: "units", min: 0, max: 9 },
];

export const UNIT_03: readonly LessonContent[] = [
  {
    id: "MATH-2P-U03-L01",
    text: "u03l01",
    activities: [
      {
        type: "numeric",
        text: "u03l01.discover",
        visual: { kind: "expression", value: "23 + 5" },
        fields: [
          { key: "tens", accept: 2, visual: { kind: "tens", tens: 2, units: 3 } },
          { key: "units", accept: 8, check: "3 + 5", visual: { kind: "collection", item: "tomato", count: 5, container: "none" } },
          { key: "total", accept: 28, check: "23 + 5" },
        ],
      },
      {
        type: "build",
        text: "u03l01.manipulate",
        visual: { kind: "expression", value: "34 + 4" },
        controls: [
          { id: "tens", labelKey: "tens", min: 0, max: 9, start: 3 },
          { id: "units", labelKey: "units", min: 0, max: 9, start: 4 },
        ],
        preview: { kind: "tens", tens: "tens", units: "units" },
        goal: { tens: 3, units: 8 },
      },
      {
        type: "choice",
        text: "u03l01.understand",
        visual: { kind: "expression", value: "23 + 5" },
        options: [{ id: "units" }, { id: "tens" }, { id: "both" }],
        correct: ["units"],
      },
      {
        type: "numeric",
        text: "u03l01.practice",
        fields: [
          { key: "q1", accept: 27, check: "21 + 6" },
          { key: "q2", accept: 49, check: "42 + 7" },
          { key: "q3", accept: 33, check: "38 - 5" },
        ],
      },
      {
        type: "match",
        text: "u03l01.play",
        items: [
          { id: "a", labelKey: "a", bin: "35" },
          { id: "b", labelKey: "b", bin: "58" },
          { id: "c", labelKey: "c", bin: "49" },
          { id: "d", labelKey: "d", bin: "26" },
        ],
        bins: [
          { id: "26", label: 26 },
          { id: "35", label: 35 },
          { id: "49", label: 49 },
          { id: "58", label: 58 },
        ],
      },
      {
        type: "choice",
        text: "u03l01.remember",
        options: [{ id: "rule" }, { id: "tens" }, { id: "count" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U03-L02",
    text: "u03l02",
    activities: [
      {
        type: "build",
        text: "u03l02.discover",
        controls: [{ id: "added", labelKey: "added", min: 0, max: 6 }],
        preview: { kind: "tenFrame", count: "added", base: 8 },
        goal: { added: 2 },
      },
      {
        type: "build",
        text: "u03l02.manipulate",
        controls: [{ id: "added", labelKey: "added", min: 0, max: 6 }],
        preview: { kind: "tenFrame", count: "added", base: 7 },
        goal: { added: 3 },
      },
      {
        type: "choice",
        text: "u03l02.understand",
        visual: { kind: "tenFrame", filled: 8 },
        options: [{ id: "two" }, { id: "eighteen" }, { id: "ten" }],
        correct: ["two"],
      },
      {
        type: "numeric",
        text: "u03l02.practice",
        fields: [
          { key: "q1", accept: 4, check: "10 - 6" },
          { key: "q2", accept: 1, check: "10 - 9" },
          { key: "q3", accept: 6, check: "20 - 14" },
        ],
      },
      {
        type: "rounds",
        text: "u03l02.play",
        rounds: [
          {
            type: "build",
            text: "u03l02.play.r1",
            controls: [{ id: "added", labelKey: "added", min: 0, max: 9 }],
            preview: { kind: "tenFrame", count: "added", base: 5 },
            goal: { added: 5 },
          },
          {
            type: "build",
            text: "u03l02.play.r2",
            controls: [{ id: "added", labelKey: "added", min: 0, max: 9 }],
            preview: { kind: "tenFrame", count: "added", base: 3 },
            goal: { added: 7 },
          },
          {
            type: "build",
            text: "u03l02.play.r3",
            controls: [{ id: "added", labelKey: "added", min: 0, max: 9 }],
            preview: { kind: "tenFrame", count: "added", base: 9 },
            goal: { added: 1 },
          },
        ],
      },
      {
        type: "choice",
        text: "u03l02.remember",
        options: [{ id: "rule" }, { id: "eight" }, { id: "add" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U03-L03",
    text: "u03l03",
    activities: [
      {
        type: "numeric",
        text: "u03l03.discover",
        visual: { kind: "numberLine", from: 25, to: 35, marks: [28, 30, 33], jumps: [[28, 30], [30, 33]] },
        fields: [
          { key: "toTen", accept: 2, check: "30 - 28" },
          { key: "rest", accept: 3, check: "5 - 2" },
          { key: "total", accept: 33, check: "28 + 5" },
        ],
      },
      {
        type: "build",
        text: "u03l03.manipulate",
        visual: { kind: "expression", value: "16 + 7" },
        controls: [
          { id: "tens", labelKey: "tens", min: 0, max: 9, start: 1 },
          { id: "units", labelKey: "units", min: 0, max: 9, start: 6 },
        ],
        preview: { kind: "tens", tens: "tens", units: "units" },
        goal: { tens: 2, units: 3 },
      },
      {
        type: "choice",
        text: "u03l03.understand",
        visual: { kind: "numberLine", from: 45, to: 55, marks: [48, 50, 54], jumps: [[48, 50], [50, 54]] },
        options: [{ id: "bridge" }, { id: "concat" }, { id: "drop" }],
        correct: ["bridge"],
      },
      {
        type: "numeric",
        text: "u03l03.practice",
        fields: [
          { key: "q1", accept: 21, check: "17 + 4" },
          { key: "q2", accept: 44, check: "36 + 8" },
          { key: "q3", accept: 54, check: "48 + 6" },
        ],
      },
      {
        type: "match",
        text: "u03l03.play",
        items: [
          { id: "a", labelKey: "a", bin: "32" },
          { id: "b", labelKey: "b", bin: "42" },
          { id: "c", labelKey: "c", bin: "52" },
          { id: "d", labelKey: "d", bin: "22" },
        ],
        bins: [
          { id: "22", label: 22 },
          { id: "32", label: 32 },
          { id: "42", label: 42 },
          { id: "52", label: 52 },
        ],
      },
      {
        type: "choice",
        text: "u03l03.remember",
        options: [{ id: "rule" }, { id: "units" }, { id: "guess" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U03-L04",
    text: "u03l04",
    activities: [
      {
        type: "numeric",
        text: "u03l04.discover",
        visual: { kind: "expression", value: "24 + 32" },
        fields: [
          { key: "tens", accept: 50, check: "20 + 30", visual: { kind: "tens", tens: 5, units: 0 } },
          { key: "units", accept: 6, check: "4 + 2" },
          { key: "total", accept: 56, check: "24 + 32" },
        ],
      },
      {
        type: "build",
        text: "u03l04.manipulate",
        visual: { kind: "expression", value: "23 + 35" },
        controls: tensControls,
        preview: { kind: "tens", tens: "tens", units: "units" },
        goal: { tens: 5, units: 8 },
      },
      {
        type: "order",
        text: "u03l04.understand",
        values: [1, 2, 3],
        direction: "asc",
        sequence: true,
      },
      {
        type: "numeric",
        text: "u03l04.practice",
        fields: [
          { key: "q1", accept: 57, check: "31 + 26" },
          { key: "q2", accept: 79, check: "45 + 34" },
          { key: "q3", accept: 45, check: "27 + 18" },
        ],
      },
      {
        type: "match",
        text: "u03l04.play",
        items: [
          { id: "a", labelKey: "a", bin: "66" },
          { id: "b", labelKey: "b", bin: "47" },
          { id: "c", labelKey: "c", bin: "69" },
          { id: "d", labelKey: "d", bin: "58" },
        ],
        bins: [
          { id: "47", label: 47 },
          { id: "58", label: 58 },
          { id: "66", label: 66 },
          { id: "69", label: 69 },
        ],
      },
      {
        type: "choice",
        text: "u03l04.remember",
        options: [{ id: "rule" }, { id: "glue" }, { id: "biggest" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U03-EVAL",
    text: "u03eval",
    activities: [
      { type: "numeric", text: "u03eval.q1", fields: [{ key: "q", accept: 49, check: "42 + 7" }] },
      {
        type: "build",
        text: "u03eval.q2",
        controls: [{ id: "added", labelKey: "added", min: 0, max: 5 }],
        preview: { kind: "tenFrame", count: "added", base: 9 },
        goal: { added: 1 },
      },
      { type: "numeric", text: "u03eval.q3", fields: [{ key: "q", accept: 44, check: "36 + 8" }] },
      { type: "numeric", text: "u03eval.q4", fields: [{ key: "q", accept: 79, check: "45 + 34" }] },
      { type: "selfcheck", text: "u03eval.check", recap: ["r1", "r2", "r3", "r4"] },
    ],
  },
];
