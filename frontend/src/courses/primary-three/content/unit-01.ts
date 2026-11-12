import { step, type EvaluationContent, type LessonContent } from "./lesson-content";

const METHOD_KEY = "content.method";

export const UNIT_01_LESSON_CONTENT: Record<string, LessonContent> = {
  "MATH-3P-U01-L01": {
    objectiveKey: "content.u01l01.objective",
    situationKey: "content.u01l01.situation",
    discoverKey: "content.u01l01.discover",
    manipulate: step("content.u01l01.manipulate", "content.u01l01.manipulate.instruction", { kind: "place-value-build", id: "u01l01-manipulate", targets: [324], maxHundreds: 9, maxTens: 9, maxUnits: 9 }, "content.u01l01.manipulate.title"),
    exampleMethodKey: METHOD_KEY,
    examplePromptKeys: [
      "content.u01l01.example.easy",
      "content.u01l01.example.medium",
      "content.u01l01.example.reflection",
    ],
    practice: step("content.u01l01.practice", "content.u01l01.practice.instruction", { kind: "place-value-build", id: "u01l01-practice", targets: [572], maxHundreds: 9, maxTens: 9, maxUnits: 9 }, "content.u01l01.practice.title"),
    reflect: step("content.u01l01.reflect", "content.u01l01.reflect.instruction", { kind: "numeric-question", id: "u01l01-reflect", promptKey: "content.u01l01.reflect.prompt", answer: 835 }, "content.u01l01.reflect.title"),
    play: step("content.u01l01.play", "content.u01l01.play.instruction", { kind: "place-value-build", id: "u01l01-play", targets: [463], maxHundreds: 9, maxTens: 9, maxUnits: 9 }, "content.u01l01.play.title"),
    rememberKey: "content.u01l01.remember",
    check: step("content.u01l01.check", "content.u01l01.check.instruction", {
        kind: "numeric-question",
        id: "u01l01-check",
        promptKey: "content.u01l01.check.prompt",
        choices: [6, 60, 600],
        answer: 600,
      }, "content.u01l01.check.title"),
  },

  "MATH-3P-U01-L02": {
    objectiveKey: "content.u01l02.objective",
    situationKey: "content.u01l02.situation",
    discoverKey: "content.u01l02.discover",
    manipulate: step("content.u01l02.manipulate", "content.u01l02.manipulate.instruction", {
        kind: "place-value-build",
        id: "u01l02-manipulate",
        targets: [407, 760, 999],
        maxHundreds: 9,
        maxTens: 9,
        maxUnits: 9,
      }, "content.u01l02.manipulate.title"),
    exampleMethodKey: METHOD_KEY,
    examplePromptKeys: [
      "content.u01l02.example.easy",
      "content.u01l02.example.medium",
      "content.u01l02.example.reflection",
    ],
    practice: step("content.u01l02.practice", "content.u01l02.practice.instruction", {
        kind: "number-words-match",
        id: "u01l02-practice",
        items: [
          { value: 328, direction: "words-to-digits", distractors: [382, 238, 823] },
          { value: 904, direction: "digits-to-words", distractors: [940, 490, 409] },
        ],
      }, "content.u01l02.practice.title"),
    reflect: step("content.u01l02.reflect", "content.u01l02.reflect.instruction", { kind: "numeric-question", id: "u01l02-reflect", promptKey: "content.u01l02.reflect.prompt", answer: 507 }, "content.u01l02.reflect.title"),
    play: step("content.u01l02.play", "content.u01l02.play.instruction", {
        kind: "number-words-match",
        id: "u01l02-play",
        items: [
          { value: 615, direction: "digits-to-words", distractors: [651, 561, 165] },
          { value: 340, direction: "words-to-digits", distractors: [304, 430, 43] },
        ],
      }, "content.u01l02.play.title"),
    rememberKey: "content.u01l02.remember",
    check: step("content.u01l02.check", "content.u01l02.check.instruction", { kind: "place-value-build", id: "u01l02-check", targets: [693], maxHundreds: 9, maxTens: 9, maxUnits: 9 }, "content.u01l02.check.title"),
  },

  "MATH-3P-U01-L03": {
    objectiveKey: "content.u01l03.objective",
    situationKey: "content.u01l03.situation",
    discoverKey: "content.u01l03.discover",
    manipulate: step("content.u01l03.manipulate", "content.u01l03.manipulate.instruction", {
        kind: "place-value-build",
        id: "u01l03-manipulate",
        targets: [438, 483],
        maxHundreds: 9,
        maxTens: 9,
        maxUnits: 9,
      }, "content.u01l03.manipulate.title"),
    exampleMethodKey: METHOD_KEY,
    examplePromptKeys: [
      "content.u01l03.example.easy",
      "content.u01l03.example.medium",
      "content.u01l03.example.reflection",
    ],
    practice: step("content.u01l03.practice", "content.u01l03.practice.instruction", {
        kind: "compare-numbers",
        id: "u01l03-practice",
        items: [
          { left: 706, right: 670 },
          { left: 438, right: 483 },
        ],
      }, "content.u01l03.practice.title"),
    reflect: step("content.u01l03.reflect", "content.u01l03.reflect.instruction", { kind: "number-order", id: "u01l03-reflect", values: [312, 132, 321, 213], direction: "ascending" }, "content.u01l03.reflect.title"),
    play: step("content.u01l03.play", "content.u01l03.play.instruction", {
        kind: "compare-numbers",
        id: "u01l03-play",
        items: [
          { left: 275, right: 257 },
          { left: 601, right: 610 },
        ],
      }, "content.u01l03.play.title"),
    rememberKey: "content.u01l03.remember",
    check: step("content.u01l03.check", "content.u01l03.check.instruction", { kind: "number-in-range", id: "u01l03-check", min: 495, max: 500 }, "content.u01l03.check.title"),
  },

  "MATH-3P-U01-L04": {
    objectiveKey: "content.u01l04.objective",
    situationKey: "content.u01l04.situation",
    discoverKey: "content.u01l04.discover",
    manipulate: step("content.u01l04.manipulate", "content.u01l04.manipulate.instruction", { kind: "sequence-fill", id: "u01l04-manipulate", sequence: [200, 250, 300, 350], blankIndex: 3 }, "content.u01l04.manipulate.title"),
    exampleMethodKey: METHOD_KEY,
    examplePromptKeys: [
      "content.u01l04.example.easy",
      "content.u01l04.example.medium",
      "content.u01l04.example.reflection",
    ],
    practice: step("content.u01l04.practice", "content.u01l04.practice.instruction", { kind: "sequence-fill", id: "u01l04-practice", sequence: [340, 350, 360, 370], blankIndex: 2 }, "content.u01l04.practice.title"),
    reflect: step("content.u01l04.reflect", "content.u01l04.reflect.instruction", { kind: "round-to-ten", id: "u01l04-reflect", items: [{ value: 63, distractor: 70 }] }, "content.u01l04.reflect.title"),
    play: step("content.u01l04.play", "content.u01l04.play.instruction", { kind: "sequence-fill", id: "u01l04-play", sequence: [500, 600, 700, 800], blankIndex: 2 }, "content.u01l04.play.title"),
    rememberKey: "content.u01l04.remember",
    check: step("content.u01l04.check", "content.u01l04.check.instruction", {
        kind: "numeric-question",
        id: "u01l04-check",
        promptKey: "content.u01l04.check.prompt",
        choices: [10, 100, 1000],
        answer: 100,
      }, "content.u01l04.check.title"),
  },
};
export const UNIT_01_EVALUATION: EvaluationContent = {
  introKey: "content.u01eval.intro",
  items: [
    {
      titleKey: "content.u01eval.q1.title",
      instructionKey: "content.u01eval.q1.instruction",
      hintKey: "content.u01eval.q1.hint",
      strongHintKey: "content.u01eval.q1.strongHint",
      exercise: { kind: "numeric-question", id: "u01eval-q1", promptKey: "content.u01eval.q1.prompt", answer: 835 },
    },
    {
      titleKey: "content.u01eval.q2.title",
      instructionKey: "content.u01eval.q2.instruction",
      hintKey: "content.u01eval.q2.hint",
      strongHintKey: "content.u01eval.q2.strongHint",
      exercise: {
        kind: "number-words-match",
        id: "u01eval-q2",
        items: [{ value: 904, direction: "digits-to-words", distractors: [940, 490, 409] }],
      },
    },
    {
      titleKey: "content.u01eval.q3.title",
      instructionKey: "content.u01eval.q3.instruction",
      hintKey: "content.u01eval.q3.hint",
      strongHintKey: "content.u01eval.q3.strongHint",
      exercise: { kind: "number-order", id: "u01eval-q3", values: [312, 132, 321, 213], direction: "ascending" },
    },
    {
      titleKey: "content.u01eval.q4.title",
      instructionKey: "content.u01eval.q4.instruction",
      hintKey: "content.u01eval.q4.hint",
      strongHintKey: "content.u01eval.q4.strongHint",
      exercise: { kind: "round-to-ten", id: "u01eval-q4", items: [{ value: 63, distractor: 70 }] },
    },
  ],
};
