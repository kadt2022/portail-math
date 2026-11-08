import type { CollectSpec, CollectSupply, LessonContent } from "../interactive/types";

// Unité 7 — Argent et petits achats (L25 à L28 + évaluation).
// Monnaie factice uniquement : aucune somme réelle n'est manipulée.

const coin = (value: number): CollectSupply => ({ id: `c${value}`, value, visual: { kind: "money", values: [value] } });
const COINS = [coin(50), coin(100), coin(200)];

function pay(text: string, equals: number, solution: Record<string, number>): CollectSpec {
  return { type: "collect", text, unit: "FC", supply: COINS, goal: { equals }, solution };
}

export const UNIT_07: readonly LessonContent[] = [
  {
    id: "MATH-2P-U07-L01",
    text: "u07l01",
    activities: [
      {
        type: "numeric",
        text: "u07l01.discover",
        fields: [
          { key: "q1", accept: 150, unit: "FC", check: "100 + 50", visual: { kind: "money", values: [100, 50] } },
          { key: "q2", accept: 400, unit: "FC", check: "200 + 200", visual: { kind: "money", values: [200, 200] } },
        ],
      },
      { ...pay("u07l01.manipulate", 300, { c200: 1, c100: 1 }), twoWays: true, secondSolution: { c100: 3 } },
      {
        type: "choice",
        text: "u07l01.understand",
        visual: { kind: "money", values: [200, 100, 50] },
        options: [{ id: "value" }, { id: "count" }, { id: "biggest" }],
        correct: ["value"],
      },
      {
        type: "numeric",
        text: "u07l01.practice",
        fields: [
          { key: "q1", accept: 150, unit: "FC", check: "100 + 50" },
          { key: "q2", accept: 400, unit: "FC", check: "2 * 200" },
          { key: "q3", accept: 300, unit: "FC", check: "100 + 100 + 100" },
        ],
      },
      {
        type: "rounds",
        text: "u07l01.play",
        rounds: [
          pay("u07l01.play.r1", 250, { c200: 1, c50: 1 }),
          pay("u07l01.play.r2", 450, { c200: 2, c50: 1 }),
          pay("u07l01.play.r3", 350, { c200: 1, c100: 1, c50: 1 }),
        ],
      },
      {
        type: "choice",
        text: "u07l01.remember",
        options: [{ id: "rule" }, { id: "count" }, { id: "real" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U07-L02",
    text: "u07l02",
    activities: [
      {
        type: "numeric",
        text: "u07l02.discover",
        visual: { kind: "products", items: [{ product: "pencil", price: 200 }, { product: "eraser", price: 100 }] },
        fields: [{ key: "total", accept: 300, unit: "FC", check: "200 + 100" }],
      },
      {
        type: "collect",
        text: "u07l02.manipulate",
        unit: "FC",
        supply: [
          { id: "notebook", value: 250, limit: 1, visual: { kind: "product", product: "notebook", price: 250 } },
          { id: "pencil", value: 200, limit: 1, visual: { kind: "product", product: "pencil", price: 200 } },
          { id: "eraser", value: 100, limit: 1, visual: { kind: "product", product: "eraser", price: 100 } },
          { id: "ball", value: 300, limit: 1, visual: { kind: "product", product: "ball", price: 300 } },
        ],
        goal: { equals: 450 },
        solution: { notebook: 1, pencil: 1 },
      },
      {
        type: "choice",
        text: "u07l02.understand",
        options: [{ id: "add" }, { id: "biggest" }, { id: "subtract" }],
        correct: ["add"],
      },
      {
        type: "numeric",
        text: "u07l02.practice",
        fields: [
          { key: "q1", accept: 400, unit: "FC", check: "100 + 300" },
          { key: "q2", accept: 500, unit: "FC", check: "2 * 250" },
          { key: "q3", accept: 350, unit: "FC", check: "150 + 200" },
        ],
      },
      {
        type: "rounds",
        text: "u07l02.play",
        rounds: [
          {
            type: "numeric",
            text: "u07l02.play.r1",
            visual: { kind: "products", items: [{ product: "bread", price: 150 }, { product: "juice", price: 200 }] },
            fields: [{ key: "q", accept: 350, unit: "FC", check: "150 + 200" }],
          },
          {
            type: "numeric",
            text: "u07l02.play.r2",
            visual: { kind: "products", items: [{ product: "soap", price: 250 }, { product: "book", price: 300 }] },
            fields: [{ key: "q", accept: 550, unit: "FC", check: "250 + 300" }],
          },
          {
            type: "numeric",
            text: "u07l02.play.r3",
            visual: { kind: "products", items: [{ product: "ball", price: 300 }, { product: "pencil", price: 200 }, { product: "eraser", price: 100 }] },
            fields: [{ key: "q", accept: 600, unit: "FC", check: "300 + 200 + 100" }],
          },
        ],
      },
      {
        type: "choice",
        text: "u07l02.remember",
        options: [{ id: "rule" }, { id: "biggest" }, { id: "nounit" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U07-L03",
    text: "u07l03",
    activities: [
      {
        type: "numeric",
        text: "u07l03.discover",
        visual: { kind: "product", product: "book", price: 300 },
        fields: [{ key: "change", accept: 200, unit: "FC", check: "500 - 300", visual: { kind: "money", values: [500] } }],
      },
      pay("u07l03.manipulate", 150, { c100: 1, c50: 1 }),
      {
        type: "choice",
        text: "u07l03.understand",
        options: [{ id: "difference" }, { id: "sum" }, { id: "price" }],
        correct: ["difference"],
      },
      {
        type: "numeric",
        text: "u07l03.practice",
        fields: [
          { key: "q1", accept: 300, unit: "FC", check: "500 - 200" },
          { key: "q2", accept: 350, unit: "FC", check: "1000 - 650" },
          { key: "q3", accept: 1000, unit: "FC", check: "750 + 250" },
        ],
      },
      {
        type: "rounds",
        text: "u07l03.play",
        rounds: [
          pay("u07l03.play.r1", 200, { c200: 1 }),
          pay("u07l03.play.r2", 350, { c200: 1, c100: 1, c50: 1 }),
          pay("u07l03.play.r3", 250, { c200: 1, c50: 1 }),
        ],
      },
      {
        type: "choice",
        text: "u07l03.remember",
        options: [{ id: "rule" }, { id: "add" }, { id: "keep" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U07-L04",
    text: "u07l04",
    activities: [
      {
        type: "collect",
        text: "u07l04.discover",
        unit: "FC",
        supply: [
          { id: "bread", value: 300, limit: 1, visual: { kind: "product", product: "bread", price: 300 } },
          { id: "soap", value: 250, limit: 1, visual: { kind: "product", product: "soap", price: 250 } },
          { id: "juice", value: 200, limit: 1, visual: { kind: "product", product: "juice", price: 200 } },
          { id: "book", value: 500, limit: 1, visual: { kind: "product", product: "book", price: 500 } },
          { id: "ball", value: 400, limit: 1, visual: { kind: "product", product: "ball", price: 400 } },
        ],
        goal: { atMost: 1000, minItems: 3 },
        solution: { bread: 1, soap: 1, juice: 1 },
      },
      {
        type: "collect",
        text: "u07l04.manipulate",
        unit: "FC",
        supply: [
          { id: "p200", value: 200, limit: 1, visual: { kind: "product", product: "pencil", price: 200 } },
          { id: "p300", value: 300, limit: 1, visual: { kind: "product", product: "notebook", price: 300 } },
          { id: "p400", value: 400, limit: 1, visual: { kind: "product", product: "ball", price: 400 } },
          { id: "p500", value: 500, limit: 1, visual: { kind: "product", product: "book", price: 500 } },
        ],
        goal: { atMost: 900, minItems: 2 },
        solution: { p400: 1, p500: 1 },
      },
      {
        type: "choice",
        text: "u07l04.understand",
        options: [{ id: "atMost" }, { id: "exceed" }, { id: "all" }],
        correct: ["atMost"],
      },
      {
        type: "rounds",
        text: "u07l04.practice",
        rounds: [
          {
            type: "choice",
            text: "u07l04.practice.r1",
            options: [{ id: "yes" }, { id: "no" }],
            correct: ["yes"],
          },
          { type: "numeric", text: "u07l04.practice.r2", fields: [{ key: "q", accept: 350, unit: "FC", check: "800 - 450" }] },
        ],
      },
      {
        type: "collect",
        text: "u07l04.play",
        unit: "FC",
        supply: [
          { id: "p200", value: 200, limit: 1, visual: { kind: "product", product: "pencil", price: 200 } },
          { id: "p300", value: 300, limit: 1, visual: { kind: "product", product: "notebook", price: 300 } },
          { id: "p400", value: 400, limit: 1, visual: { kind: "product", product: "ball", price: 400 } },
          { id: "p500", value: 500, limit: 1, visual: { kind: "product", product: "book", price: 500 } },
        ],
        goal: { equals: 700 },
        twoWays: true,
        solution: { p200: 1, p500: 1 },
        secondSolution: { p300: 1, p400: 1 },
      },
      {
        type: "choice",
        text: "u07l04.remember",
        options: [{ id: "rule" }, { id: "spendAll" }, { id: "biggest" }],
        correct: ["rule"],
      },
    ],
  },
  {
    id: "MATH-2P-U07-EVAL",
    text: "u07eval",
    activities: [
      { type: "numeric", text: "u07eval.q1", visual: { kind: "money", values: [200, 200] }, fields: [{ key: "q", accept: 400, unit: "FC", check: "2 * 200" }] },
      { type: "numeric", text: "u07eval.q2", fields: [{ key: "q", accept: 500, unit: "FC", check: "2 * 250" }] },
      { type: "numeric", text: "u07eval.q3", fields: [{ key: "q", accept: 350, unit: "FC", check: "1000 - 650" }] },
      { type: "numeric", text: "u07eval.q4", fields: [{ key: "q", accept: 350, unit: "FC", check: "800 - 450" }] },
      { type: "selfcheck", text: "u07eval.check", recap: ["r1", "r2", "r3", "r4"] },
    ],
  },
];
