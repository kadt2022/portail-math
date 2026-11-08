import type { LessonContent } from "../interactive/types";

// Unité 1 — les leçons L01 à L04 sont réalisées par Crochet dans
// PrimaryTwoLessonActivities.tsx. Seule l'évaluation d'unité est ajoutée ici.

export const UNIT_01: readonly LessonContent[] = [
  {
    id: "MATH-2P-U01-EVAL",
    text: "u01eval",
    activities: [
      {
        type: "build",
        text: "u01eval.q1",
        controls: [
          { id: "groups", labelKey: "groups", min: 0, max: 5 },
          { id: "size", labelKey: "size", min: 0, max: 8 },
        ],
        preview: { kind: "groups", groups: "groups", size: "size", item: "token", container: "plate" },
        goal: { groups: 3, size: 5 },
      },
      {
        type: "numeric",
        text: "u01eval.q2",
        visual: { kind: "expression", value: "16, 17, …, 19" },
        fields: [{ key: "missing", accept: 18, check: "17 + 1" }],
      },
      { type: "symbol", text: "u01eval.q3", pairs: [[7, 15]] },
      { type: "order", text: "u01eval.q4", values: [20, 14, 19, 10], direction: "asc" },
      { type: "selfcheck", text: "u01eval.check", recap: ["r1", "r2", "r3", "r4"] },
    ],
  },
];
