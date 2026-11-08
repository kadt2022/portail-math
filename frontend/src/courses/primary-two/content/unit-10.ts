import type { LessonContent } from "../interactive/types";

// Unité 10 — Temps, calendrier et problèmes (L37 à L40 + évaluation),
// puis le grand bilan final du parcours.

type Day = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
const dayOptions = (ids: readonly Day[]) => ids.map((id) => ({ id }));

export const UNIT_10: readonly LessonContent[] = [
  {
    id: "MATH-2P-U10-L01",
    text: "u10l01",
    activities: [
      {
        type: "numeric",
        text: "u10l01.discover",
        visual: { kind: "clock", hour: 8, minute: 0 },
        fields: [{ key: "q", accept: 8, unit: "h" }],
      },
      { type: "clock", text: "u10l01.manipulate", hour: 7, minute: 0 },
      {
        type: "choice",
        text: "u10l01.understand",
        visual: { kind: "clock", hour: 3, minute: 30 },
        options: [{ id: "six" }, { id: "twelve" }, { id: "three" }],
        correct: ["six"],
      },
      {
        type: "rounds",
        text: "u10l01.practice",
        rounds: [
          {
            type: "numeric",
            text: "u10l01.practice.r1",
            fields: [
              { key: "q1", accept: 8, unit: "h", visual: { kind: "clock", hour: 8, minute: 0 } },
              { key: "q2", accept: 10, unit: "h", check: "9 + 1" },
            ],
          },
          {
            type: "choice",
            text: "u10l01.practice.r2",
            options: [
              { id: "half", visual: { kind: "clock", hour: 3, minute: 30 } },
              { id: "four", visual: { kind: "clock", hour: 4, minute: 30 } },
              { id: "three", visual: { kind: "clock", hour: 3, minute: 0 } },
            ],
            correct: ["half"],
          },
        ],
      },
      {
        type: "rounds",
        text: "u10l01.play",
        rounds: [
          { type: "clock", text: "u10l01.play.r1", hour: 10, minute: 0 },
          { type: "clock", text: "u10l01.play.r2", hour: 2, minute: 30 },
          { type: "clock", text: "u10l01.play.r3", hour: 6, minute: 30 },
        ],
      },
      {
        type: "choice",
        text: "u10l01.remember",
        options: [{ id: "rule" }, { id: "six" }, { id: "small" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U10-L02",
    text: "u10l02",
    activities: [
      {
        type: "order",
        text: "u10l02.discover",
        values: [1, 2, 3, 4, 5, 6, 7],
        direction: "asc",
        sequence: true,
      },
      {
        type: "numeric",
        text: "u10l02.manipulate",
        visual: { kind: "calendar", firstWeekday: 6, days: 30, marks: [10] },
        fields: [
          { key: "next", accept: 17, check: "10 + 7" },
          { key: "previous", accept: 3, check: "10 - 7" },
        ],
      },
      {
        type: "choice",
        text: "u10l02.understand",
        visual: { kind: "calendar", firstWeekday: 6, days: 30, marks: [10, 17] },
        options: dayOptions(["monday", "tuesday", "wednesday", "sunday"]),
        correct: ["tuesday"],
      },
      {
        type: "rounds",
        text: "u10l02.practice",
        rounds: [
          {
            type: "choice",
            text: "u10l02.practice.r1",
            options: dayOptions(["tuesday", "wednesday", "thursday"]),
            correct: ["wednesday"],
          },
          {
            type: "numeric",
            text: "u10l02.practice.r2",
            fields: [
              { key: "q1", accept: 14, check: "2 * 7" },
              { key: "q2", accept: 17, check: "10 + 7" },
            ],
          },
        ],
      },
      {
        type: "match",
        text: "u10l02.play",
        items: [
          { id: "party", labelKey: "party", bin: "thursday" },
          { id: "match", labelKey: "match", bin: "saturday" },
          { id: "market", labelKey: "market", bin: "wednesday" },
          { id: "visit", labelKey: "visit", bin: "tuesday" },
        ],
        bins: [
          { id: "tuesday", label: "tuesday" },
          { id: "wednesday", label: "wednesday" },
          { id: "thursday", label: "thursday" },
          { id: "saturday", label: "saturday" },
        ],
      },
      {
        type: "choice",
        text: "u10l02.remember",
        options: [{ id: "rule" }, { id: "ten" }, { id: "month" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U10-L03",
    text: "u10l03",
    activities: [
      {
        type: "numeric",
        text: "u10l03.discover",
        visual: { kind: "collection", item: "tomato", count: 12, container: "basket" },
        fields: [
          { key: "picked", accept: 44, check: "26 + 18" },
          { key: "left", accept: 32, check: "44 - 12" },
        ],
      },
      {
        type: "build",
        text: "u10l03.manipulate",
        controls: [{ id: "birds", labelKey: "birds", min: 0, max: 20, start: 10 }],
        preview: { kind: "collection", count: "birds", item: "bird" },
        goal: { birds: 12 },
      },
      {
        type: "order",
        text: "u10l03.understand",
        values: [1, 2, 3],
        direction: "asc",
        sequence: true,
      },
      {
        type: "numeric",
        text: "u10l03.practice",
        fields: [
          { key: "q1", accept: 12, check: "10 + 5 - 3" },
          { key: "q2", accept: 40, check: "24 + 16" },
          { key: "q3", accept: 30, check: "40 - 10" },
          { key: "q4", accept: 13, check: "4 * 5 - 7", visual: { kind: "array", rows: 4, cols: 5, item: "chalk" } },
        ],
      },
      {
        type: "rounds",
        text: "u10l03.play",
        rounds: [
          { type: "numeric", text: "u10l03.play.r1", fields: [{ key: "q", accept: 23, check: "15 + 8" }] },
          { type: "numeric", text: "u10l03.play.r2", fields: [{ key: "q", accept: 17, check: "23 - 6" }] },
          { type: "numeric", text: "u10l03.play.r3", visual: { kind: "groups", item: "token", groups: [5, 5], container: "bag" }, fields: [{ key: "q", accept: 27, check: "17 + 2 * 5" }] },
        ],
      },
      {
        type: "choice",
        text: "u10l03.remember",
        options: [{ id: "rule" }, { id: "last" }, { id: "biggest" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U10-L04",
    text: "u10l04",
    activities: [
      {
        type: "choice",
        text: "u10l04.discover",
        options: [{ id: "missing" }, { id: "colour" }, { id: "nothing" }],
        correct: ["missing"],
      },
      {
        type: "match",
        text: "u10l04.manipulate",
        items: [
          { id: "a1", labelKey: "a1", bin: "known" },
          { id: "a2", labelKey: "a2", bin: "change" },
          { id: "a3", labelKey: "a3", bin: "asked" },
          { id: "b1", labelKey: "b1", bin: "known" },
          { id: "b2", labelKey: "b2", bin: "change" },
          { id: "b3", labelKey: "b3", bin: "asked" },
        ],
        bins: [
          { id: "known", label: "known" },
          { id: "change", label: "change" },
          { id: "asked", label: "asked" },
        ],
      },
      {
        type: "choice",
        text: "u10l04.understand",
        options: [{ id: "solve" }, { id: "hard" }, { id: "noanswer" }],
        correct: ["solve"],
      },
      {
        type: "rounds",
        text: "u10l04.practice",
        rounds: [
          { type: "choice", text: "u10l04.practice.r1", options: [{ id: "good" }, { id: "add" }, { id: "times" }], correct: ["good"] },
          { type: "choice", text: "u10l04.practice.r2", options: [{ id: "good" }, { id: "plus" }, { id: "share" }], correct: ["good"] },
          { type: "numeric", text: "u10l04.practice.r3", fields: [{ key: "q", accept: 46, check: "27 + 19" }] },
        ],
      },
      {
        type: "rounds",
        text: "u10l04.play",
        rounds: [
          {
            type: "match",
            text: "u10l04.play.r1",
            items: [
              { id: "a", labelKey: "a", bin: "right" },
              { id: "b", labelKey: "b", bin: "wrong" },
              { id: "c", labelKey: "c", bin: "right" },
              { id: "d", labelKey: "d", bin: "wrong" },
            ],
            bins: [
              { id: "right", label: "right" },
              { id: "wrong", label: "wrong" },
            ],
          },
          {
            type: "numeric",
            text: "u10l04.play.r2",
            fields: [
              { key: "q1", accept: 25, check: "40 - 15" },
              { key: "q2", accept: 25, check: "18 + 7" },
            ],
          },
        ],
      },
      {
        type: "choice",
        text: "u10l04.remember",
        options: [{ id: "rule" }, { id: "long" }, { id: "numbers" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U10-EVAL",
    text: "u10eval",
    activities: [
      { type: "clock", text: "u10eval.q1", hour: 10, minute: 0, startHour: 9 },
      { type: "numeric", text: "u10eval.q2", fields: [{ key: "q", accept: 14, check: "2 * 7" }] },
      {
        type: "numeric",
        text: "u10eval.q3",
        fields: [
          { key: "q1", accept: 40, check: "24 + 16" },
          { key: "q2", accept: 30, check: "40 - 10" },
        ],
      },
      { type: "choice", text: "u10eval.q4", options: [{ id: "good" }, { id: "plus" }, { id: "nothing" }], correct: ["good"] },
      { type: "selfcheck", text: "u10eval.check", recap: ["r1", "r2", "r3", "r4"] },
    ],
  },
  {
    id: "MATH-2P-BILAN",
    text: "bilan",
    activities: [
      { type: "order", text: "bilan.q1", values: [72, 27, 70, 29], direction: "asc" },
      {
        type: "build",
        text: "bilan.q2",
        visual: { kind: "expression", value: "86" },
        controls: [
          { id: "tens", labelKey: "tens", min: 0, max: 10 },
          { id: "units", labelKey: "units", min: 0, max: 9 },
        ],
        preview: { kind: "tens", tens: "tens", units: "units" },
        goal: { tens: 8, units: 6 },
      },
      { type: "numeric", text: "bilan.q3", fields: [{ key: "q", accept: 55, check: "47 + 8" }] },
      { type: "numeric", text: "bilan.q4", fields: [{ key: "q", accept: 36, check: "63 - 27" }] },
      { type: "numeric", text: "bilan.q5", visual: { kind: "groups", item: "orange", groups: [5, 5, 5, 5], container: "plate" }, fields: [{ key: "q", accept: 20, check: "4 * 5" }] },
      { type: "distribute", text: "bilan.q6", total: 18, recipients: 3, item: "nut", container: "child", askEach: true },
      { type: "numeric", text: "bilan.q7", fields: [{ key: "q", accept: 350, unit: "FC", check: "1000 - 650" }] },
      { type: "numeric", text: "bilan.q8", visual: { kind: "ruler", start: 0, end: 9, max: 10 }, fields: [{ key: "q", accept: 9, unit: "cm" }] },
      {
        type: "choice",
        text: "bilan.q9",
        options: [
          { id: "cube", visual: { kind: "solid", solid: "cube" } },
          { id: "sphere", visual: { kind: "solid", solid: "sphere" } },
          { id: "cylinder", visual: { kind: "solid", solid: "cylinder" } },
        ],
        correct: ["cube"],
      },
      {
        type: "numeric",
        text: "bilan.q10",
        fields: [
          { key: "q1", accept: 40, check: "24 + 16" },
          { key: "q2", accept: 31, check: "40 - 9" },
        ],
      },
      { type: "selfcheck", text: "bilan.check", recap: ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8", "r9", "r10"] },
    ],
  },
];
