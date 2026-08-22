import type { EvaluationContent, LessonContent } from "./lesson-content";

const METHOD_KEY = "content.method";

export const UNIT_01_LESSON_CONTENT: Record<string, LessonContent> = {
  "MATH-4P-U01-L01": {
    objectiveKey: "content.u01l01.objective",
    situationKey: "content.u01l01.situation",
    discoverKey: "content.u01l01.discover",
    discoverFigureValue: 24638,
    manipulate: {
      titleKey: "content.u01l01.manipulate.title",
      instructionKey: "content.u01l01.manipulate.instruction",
      hintKey: "content.u01l01.manipulate.hint",
      strongHintKey: "content.u01l01.manipulate.strongHint",
      exercise: { kind: "place-value-build", id: "u01l01-manipulate", targets: [24638], maxDigit: 9 },
    },
    exampleMethodKey: METHOD_KEY,
    examplePromptKeys: [
      "content.u01l01.example.easy",
      "content.u01l01.example.medium",
      "content.u01l01.example.reflection",
    ],
    practice: {
      titleKey: "content.u01l01.practice.title",
      instructionKey: "content.u01l01.practice.instruction",
      hintKey: "content.u01l01.practice.hint",
      strongHintKey: "content.u01l01.practice.strongHint",
      exercise: { kind: "place-value-build", id: "u01l01-practice", targets: [40916], maxDigit: 9 },
    },
    reflect: {
      titleKey: "content.u01l01.reflect.title",
      instructionKey: "content.u01l01.reflect.instruction",
      hintKey: "content.u01l01.reflect.hint",
      strongHintKey: "content.u01l01.reflect.strongHint",
      exercise: { kind: "numeric-question", id: "u01l01-reflect", promptKey: "content.u01l01.reflect.prompt", answer: 27053 },
    },
    play: {
      titleKey: "content.u01l01.play.title",
      instructionKey: "content.u01l01.play.instruction",
      hintKey: "content.u01l01.play.hint",
      strongHintKey: "content.u01l01.play.strongHint",
      exercise: { kind: "place-value-build", id: "u01l01-play", targets: [78402], maxDigit: 9 },
    },
    rememberKey: "content.u01l01.remember",
    check: {
      titleKey: "content.u01l01.check.title",
      instructionKey: "content.u01l01.check.instruction",
      hintKey: "content.u01l01.check.hint",
      strongHintKey: "content.u01l01.check.strongHint",
      exercise: {
        kind: "numeric-question",
        id: "u01l01-check",
        promptKey: "content.u01l01.check.prompt",
        choices: [3, 300, 3000],
        answer: 3000,
      },
    },
  },

  "MATH-4P-U01-L02": {
    objectiveKey: "content.u01l02.objective",
    situationKey: "content.u01l02.situation",
    discoverKey: "content.u01l02.discover",
    manipulate: {
      titleKey: "content.u01l02.manipulate.title",
      instructionKey: "content.u01l02.manipulate.instruction",
      hintKey: "content.u01l02.manipulate.hint",
      strongHintKey: "content.u01l02.manipulate.strongHint",
      exercise: {
        kind: "place-value-build",
        id: "u01l02-manipulate",
        targets: [40005, 76000, 99999],
        maxDigit: 9,
      },
    },
    exampleMethodKey: METHOD_KEY,
    examplePromptKeys: [
      "content.u01l02.example.easy",
      "content.u01l02.example.medium",
      "content.u01l02.example.reflection",
    ],
    practice: {
      titleKey: "content.u01l02.practice.title",
      instructionKey: "content.u01l02.practice.instruction",
      hintKey: "content.u01l02.practice.hint",
      strongHintKey: "content.u01l02.practice.strongHint",
      exercise: {
        kind: "number-words-match",
        id: "u01l02-practice",
        items: [
          { value: 45210, direction: "words-to-digits", distractors: [45120, 45201, 54210] },
          { value: 63020, direction: "digits-to-words", distractors: [63200, 63002, 36020] },
        ],
      },
    },
    reflect: {
      titleKey: "content.u01l02.reflect.title",
      instructionKey: "content.u01l02.reflect.instruction",
      hintKey: "content.u01l02.reflect.hint",
      strongHintKey: "content.u01l02.reflect.strongHint",
      exercise: { kind: "numeric-question", id: "u01l02-reflect", promptKey: "content.u01l02.reflect.prompt", answer: 8700 },
    },
    play: {
      titleKey: "content.u01l02.play.title",
      instructionKey: "content.u01l02.play.instruction",
      hintKey: "content.u01l02.play.hint",
      strongHintKey: "content.u01l02.play.strongHint",
      exercise: {
        kind: "number-words-match",
        id: "u01l02-play",
        items: [
          { value: 76000, direction: "digits-to-words", distractors: [70600, 67000, 76100] },
          { value: 99999, direction: "words-to-digits", distractors: [9999, 90999, 99990] },
        ],
      },
    },
    rememberKey: "content.u01l02.remember",
    check: {
      titleKey: "content.u01l02.check.title",
      instructionKey: "content.u01l02.check.instruction",
      hintKey: "content.u01l02.check.hint",
      strongHintKey: "content.u01l02.check.strongHint",
      exercise: { kind: "place-value-build", id: "u01l02-check", targets: [40005], maxDigit: 9 },
    },
  },

  "MATH-4P-U01-L03": {
    objectiveKey: "content.u01l03.objective",
    situationKey: "content.u01l03.situation",
    discoverKey: "content.u01l03.discover",
    manipulate: {
      titleKey: "content.u01l03.manipulate.title",
      instructionKey: "content.u01l03.manipulate.instruction",
      hintKey: "content.u01l03.manipulate.hint",
      strongHintKey: "content.u01l03.manipulate.strongHint",
      exercise: {
        kind: "place-value-build",
        id: "u01l03-manipulate",
        targets: [47350, 47530],
        maxDigit: 9,
      },
    },
    exampleMethodKey: METHOD_KEY,
    examplePromptKeys: [
      "content.u01l03.example.easy",
      "content.u01l03.example.medium",
      "content.u01l03.example.reflection",
    ],
    practice: {
      titleKey: "content.u01l03.practice.title",
      instructionKey: "content.u01l03.practice.instruction",
      hintKey: "content.u01l03.practice.hint",
      strongHintKey: "content.u01l03.practice.strongHint",
      exercise: {
        kind: "compare-numbers",
        id: "u01l03-practice",
        items: [
          { left: 52400, right: 52040 },
          { left: 47350, right: 47530 },
        ],
      },
    },
    reflect: {
      titleKey: "content.u01l03.reflect.title",
      instructionKey: "content.u01l03.reflect.instruction",
      hintKey: "content.u01l03.reflect.hint",
      strongHintKey: "content.u01l03.reflect.strongHint",
      exercise: {
        kind: "number-order",
        id: "u01l03-reflect",
        values: [81250, 18520, 80125, 81025],
        direction: "ascending",
      },
    },
    play: {
      titleKey: "content.u01l03.play.title",
      instructionKey: "content.u01l03.play.instruction",
      hintKey: "content.u01l03.play.hint",
      strongHintKey: "content.u01l03.play.strongHint",
      exercise: {
        kind: "compare-numbers",
        id: "u01l03-play",
        items: [
          { left: 63450, right: 63045 },
          { left: 29800, right: 30200 },
        ],
      },
    },
    rememberKey: "content.u01l03.remember",
    check: {
      titleKey: "content.u01l03.check.title",
      instructionKey: "content.u01l03.check.instruction",
      hintKey: "content.u01l03.check.hint",
      strongHintKey: "content.u01l03.check.strongHint",
      exercise: { kind: "number-in-range", id: "u01l03-check", min: 9995, max: 10005 },
    },
  },

  "MATH-4P-U01-L04": {
    objectiveKey: "content.u01l04.objective",
    situationKey: "content.u01l04.situation",
    discoverKey: "content.u01l04.discover",
    manipulate: {
      titleKey: "content.u01l04.manipulate.title",
      instructionKey: "content.u01l04.manipulate.instruction",
      hintKey: "content.u01l04.manipulate.hint",
      strongHintKey: "content.u01l04.manipulate.strongHint",
      exercise: { kind: "sequence-fill", id: "u01l04-manipulate", sequence: [15000, 20000, 25000, 30000], blankIndex: 3 },
    },
    exampleMethodKey: METHOD_KEY,
    examplePromptKeys: [
      "content.u01l04.example.easy",
      "content.u01l04.example.medium",
      "content.u01l04.example.reflection",
    ],
    practice: {
      titleKey: "content.u01l04.practice.title",
      instructionKey: "content.u01l04.practice.instruction",
      hintKey: "content.u01l04.practice.hint",
      strongHintKey: "content.u01l04.practice.strongHint",
      exercise: { kind: "sequence-fill", id: "u01l04-practice", sequence: [3000, 3500, 4000, 4500], blankIndex: 2 },
    },
    reflect: {
      titleKey: "content.u01l04.reflect.title",
      instructionKey: "content.u01l04.reflect.instruction",
      hintKey: "content.u01l04.reflect.hint",
      strongHintKey: "content.u01l04.reflect.strongHint",
      exercise: {
        kind: "round-to-target",
        id: "u01l04-reflect",
        items: [{ value: 24638, roundTo: 1000, distractor: 24000 }],
      },
    },
    play: {
      titleKey: "content.u01l04.play.title",
      instructionKey: "content.u01l04.play.instruction",
      hintKey: "content.u01l04.play.hint",
      strongHintKey: "content.u01l04.play.strongHint",
      exercise: {
        kind: "round-to-target",
        id: "u01l04-play",
        items: [{ value: 47350, roundTo: 10000, distractor: 40000 }],
      },
    },
    rememberKey: "content.u01l04.remember",
    check: {
      titleKey: "content.u01l04.check.title",
      instructionKey: "content.u01l04.check.instruction",
      hintKey: "content.u01l04.check.hint",
      strongHintKey: "content.u01l04.check.strongHint",
      exercise: {
        kind: "round-to-target",
        id: "u01l04-check",
        items: [{ value: 63020, roundTo: 100, distractor: 63100 }],
      },
    },
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
      exercise: { kind: "numeric-question", id: "u01eval-q1", promptKey: "content.u01eval.q1.prompt", answer: 35027 },
    },
    {
      titleKey: "content.u01eval.q2.title",
      instructionKey: "content.u01eval.q2.instruction",
      hintKey: "content.u01eval.q2.hint",
      strongHintKey: "content.u01eval.q2.strongHint",
      exercise: {
        kind: "number-words-match",
        id: "u01eval-q2",
        items: [{ value: 45210, direction: "digits-to-words", distractors: [45120, 45201, 54210] }],
      },
    },
    {
      titleKey: "content.u01eval.q3.title",
      instructionKey: "content.u01eval.q3.instruction",
      hintKey: "content.u01eval.q3.hint",
      strongHintKey: "content.u01eval.q3.strongHint",
      exercise: {
        kind: "number-order",
        id: "u01eval-q3",
        values: [81250, 18520, 80125, 81025],
        direction: "ascending",
      },
    },
    {
      titleKey: "content.u01eval.q4.title",
      instructionKey: "content.u01eval.q4.instruction",
      hintKey: "content.u01eval.q4.hint",
      strongHintKey: "content.u01eval.q4.strongHint",
      exercise: {
        kind: "round-to-target",
        id: "u01eval-q4",
        items: [{ value: 24638, roundTo: 1000, distractor: 24000 }],
      },
    },
  ],
};
