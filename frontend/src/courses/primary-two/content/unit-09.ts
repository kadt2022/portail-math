import type { BuildSpec, LessonContent, ShapeName } from "../interactive/types";

// Unité 9 — Formes, solides et symétrie (L33 à L36 + évaluation).

/** Reconstruire un motif : compter les pièces de chaque forme du modèle. */
function rebuild(text: string, shapes: readonly ShapeName[]): BuildSpec {
  const count = (shape: ShapeName) => shapes.filter((candidate) => candidate === shape).length;
  return {
    type: "build",
    text,
    visual: { kind: "composite", shapes },
    controls: (["square", "triangle", "rectangle"] as const).map((shape) => ({ id: shape, labelKey: shape, min: 0, max: 4 })),
    goal: { square: count("square"), triangle: count("triangle"), rectangle: count("rectangle") },
  };
}

export const UNIT_09: readonly LessonContent[] = [
  {
    id: "MATH-2P-U09-L01",
    text: "u09l01",
    activities: [
      {
        type: "choice",
        text: "u09l01.discover",
        multiple: true,
        options: [
          { id: "triangle", visual: { kind: "shape", shape: "triangle" } },
          { id: "circle", visual: { kind: "shape", shape: "circle" } },
          { id: "square", visual: { kind: "shape", shape: "square" } },
          { id: "oval", visual: { kind: "shape", shape: "oval" } },
          { id: "rectangle", visual: { kind: "shape", shape: "rectangle" } },
        ],
        correct: ["triangle", "square", "rectangle"],
      },
      {
        type: "match",
        text: "u09l01.manipulate",
        items: [
          { id: "a", visual: { kind: "shape", shape: "triangle" }, bin: "triangle" },
          { id: "b", visual: { kind: "shape", shape: "square" }, bin: "square" },
          { id: "c", visual: { kind: "shape", shape: "rectangle" }, bin: "rectangle" },
        ],
        bins: [
          { id: "triangle", label: "triangle" },
          { id: "square", label: "square" },
          { id: "rectangle", label: "rectangle" },
        ],
      },
      {
        type: "choice",
        text: "u09l01.understand",
        visual: { kind: "shape", shape: "circle" },
        options: [{ id: "no" }, { id: "yes" }],
        correct: ["no"],
      },
      {
        type: "numeric",
        text: "u09l01.practice",
        fields: [
          { key: "q1", accept: 3, visual: { kind: "shape", shape: "triangle" } },
          { key: "q2", accept: 4, visual: { kind: "shape", shape: "rectangle" } },
          { key: "q3", accept: 6, visual: { kind: "shape", shape: "hexagon" } },
        ],
      },
      {
        type: "match",
        text: "u09l01.play",
        items: [
          { id: "a", visual: { kind: "shape", shape: "triangle" }, bin: "3" },
          { id: "b", visual: { kind: "shape", shape: "square" }, bin: "4" },
          { id: "c", visual: { kind: "shape", shape: "pentagon" }, bin: "5" },
          { id: "d", visual: { kind: "shape", shape: "hexagon" }, bin: "6" },
          { id: "e", visual: { kind: "shape", shape: "rectangle" }, bin: "4" },
        ],
        bins: [
          { id: "3", label: "sides3" },
          { id: "4", label: "sides4" },
          { id: "5", label: "sides5" },
          { id: "6", label: "sides6" },
        ],
      },
      {
        type: "choice",
        text: "u09l01.remember",
        options: [{ id: "rule" }, { id: "round" }, { id: "open" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U09-L02",
    text: "u09l02",
    activities: [
      {
        type: "match",
        text: "u09l02.discover",
        items: [
          { id: "die", labelKey: "die", bin: "cube" },
          { id: "box", labelKey: "box", bin: "cuboid" },
          { id: "ball", labelKey: "ball", bin: "sphere" },
          { id: "tin", labelKey: "tin", bin: "cylinder" },
        ],
        bins: [
          { id: "cube", label: "cube" },
          { id: "cuboid", label: "cuboid" },
          { id: "sphere", label: "sphere" },
          { id: "cylinder", label: "cylinder" },
        ],
      },
      {
        type: "match",
        text: "u09l02.manipulate",
        items: [
          { id: "a", visual: { kind: "solid", solid: "sphere" }, bin: "all" },
          { id: "b", visual: { kind: "solid", solid: "cylinder" }, bin: "one" },
          { id: "c", visual: { kind: "solid", solid: "cube" }, bin: "none" },
          { id: "d", visual: { kind: "solid", solid: "cuboid" }, bin: "none" },
        ],
        bins: [
          { id: "all", label: "all" },
          { id: "one", label: "one" },
          { id: "none", label: "none" },
        ],
      },
      {
        type: "choice",
        text: "u09l02.understand",
        visual: { kind: "solid", solid: "cube" },
        options: [{ id: "squares" }, { id: "round" }, { id: "two" }],
        correct: ["squares"],
      },
      {
        type: "rounds",
        text: "u09l02.practice",
        rounds: [
          {
            type: "numeric",
            text: "u09l02.practice.r1",
            fields: [
              { key: "q1", accept: 6, visual: { kind: "solid", solid: "cube" } },
              { key: "q2", accept: 2, visual: { kind: "solid", solid: "cylinder" } },
            ],
          },
          {
            type: "choice",
            text: "u09l02.practice.r2",
            multiple: true,
            options: [{ id: "tin" }, { id: "pipe" }, { id: "book" }, { id: "orange" }],
            correct: ["tin", "pipe"],
          },
        ],
      },
      {
        type: "match",
        text: "u09l02.play",
        items: [
          { id: "a", visual: { kind: "solid", solid: "cube" }, bin: "stack" },
          { id: "b", visual: { kind: "solid", solid: "sphere" }, bin: "roll" },
          { id: "c", visual: { kind: "solid", solid: "cuboid" }, bin: "stack" },
          { id: "d", visual: { kind: "solid", solid: "cylinder" }, bin: "both" },
        ],
        bins: [
          { id: "roll", label: "roll" },
          { id: "stack", label: "stack" },
          { id: "both", label: "both" },
        ],
      },
      {
        type: "choice",
        text: "u09l02.remember",
        options: [{ id: "rule" }, { id: "flat" }, { id: "same" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U09-L03",
    text: "u09l03",
    activities: [
      {
        type: "choice",
        text: "u09l03.discover",
        options: [
          { id: "sym", visual: { kind: "grid", cols: 6, rows: 4, axis: true, cells: [[1, 0], [4, 0], [2, 1], [3, 1], [0, 2], [5, 2], [2, 3], [3, 3]] } },
          { id: "notSym", visual: { kind: "grid", cols: 6, rows: 4, axis: true, cells: [[1, 0], [5, 0], [2, 1], [3, 1], [0, 2], [3, 2], [2, 3]] } },
        ],
        correct: ["sym"],
      },
      { type: "symmetry", text: "u09l03.manipulate", half: 3, rows: 4, left: [[1, 0], [2, 1], [1, 2], [3, 3]] },
      {
        type: "choice",
        text: "u09l03.understand",
        options: [{ id: "no" }, { id: "yes" }],
        correct: ["no"],
      },
      {
        type: "rounds",
        text: "u09l03.practice",
        rounds: [
          { type: "symmetry", text: "u09l03.practice.r1", half: 3, rows: 3, left: [[2, 0], [2, 2]] },
          {
            type: "numeric",
            text: "u09l03.practice.r2",
            visual: { kind: "shape", shape: "rectangle" },
            fields: [{ key: "q", accept: 2 }],
          },
        ],
      },
      {
        type: "rounds",
        text: "u09l03.play",
        rounds: [
          { type: "symmetry", text: "u09l03.play.r1", half: 3, rows: 4, left: [[1, 0], [1, 1], [2, 1], [3, 2], [1, 3]] },
          { type: "symmetry", text: "u09l03.play.r2", half: 4, rows: 5, left: [[4, 0], [3, 1], [1, 2], [2, 2], [3, 3], [4, 4]] },
        ],
      },
      {
        type: "choice",
        text: "u09l03.remember",
        options: [{ id: "rule" }, { id: "colour" }, { id: "always" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U09-L04",
    text: "u09l04",
    activities: [
      {
        type: "choice",
        text: "u09l04.discover",
        visual: { kind: "house" },
        multiple: true,
        options: [{ id: "triangle" }, { id: "rectangle" }, { id: "circle" }, { id: "oval" }],
        correct: ["triangle", "rectangle"],
      },
      {
        type: "build",
        text: "u09l04.manipulate",
        visual: { kind: "house" },
        controls: [
          { id: "triangle", labelKey: "triangle", min: 0, max: 4 },
          { id: "rectangle", labelKey: "rectangle", min: 0, max: 4 },
          { id: "circle", labelKey: "circle", min: 0, max: 4 },
        ],
        goal: { triangle: 1, rectangle: 2, circle: 0 },
      },
      {
        type: "choice",
        text: "u09l04.understand",
        visual: { kind: "shape", shape: "square" },
        options: [{ id: "triangles" }, { id: "squares" }, { id: "rectangles" }],
        correct: ["triangles"],
      },
      {
        type: "rounds",
        text: "u09l04.practice",
        rounds: [
          {
            type: "numeric",
            text: "u09l04.practice.r1",
            visual: { kind: "composite", shapes: ["square", "triangle", "triangle", "rectangle"] },
            fields: [
              { key: "q1", accept: 4 },
              { key: "q2", accept: 2 },
            ],
          },
          {
            type: "choice",
            text: "u09l04.practice.r2",
            options: [{ id: "precise" }, { id: "vague" }, { id: "colour" }],
            correct: ["precise"],
          },
        ],
      },
      {
        type: "rounds",
        text: "u09l04.play",
        rounds: [
          rebuild("u09l04.play.r1", ["square", "triangle", "triangle", "rectangle"]),
          rebuild("u09l04.play.r2", ["triangle", "triangle", "triangle", "square", "square"]),
        ],
      },
      {
        type: "choice",
        text: "u09l04.remember",
        options: [{ id: "rule" }, { id: "never" }, { id: "one" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U09-EVAL",
    text: "u09eval",
    activities: [
      { type: "numeric", text: "u09eval.q1", visual: { kind: "shape", shape: "rectangle" }, fields: [{ key: "q", accept: 4 }] },
      {
        type: "choice",
        text: "u09eval.q2",
        options: [
          { id: "sphere", visual: { kind: "solid", solid: "sphere" } },
          { id: "cuboid", visual: { kind: "solid", solid: "cuboid" } },
        ],
        correct: ["sphere"],
      },
      { type: "symmetry", text: "u09eval.q3", half: 3, rows: 3, left: [[2, 0], [2, 2]] },
      {
        type: "choice",
        text: "u09eval.q4",
        multiple: true,
        options: [{ id: "rectangle" }, { id: "triangle" }, { id: "circle" }],
        correct: ["rectangle", "triangle"],
      },
      { type: "selfcheck", text: "u09eval.check", recap: ["r1", "r2", "r3", "r4"] },
    ],
  },
];
