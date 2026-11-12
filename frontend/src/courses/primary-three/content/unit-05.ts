import { step, type EvaluationContent, type LessonContent } from "./lesson-content";

export const UNIT_05_LESSON_CONTENT: Record<string, LessonContent> = {
  "MATH-3P-U05-L01": {
    objectiveKey: "content.u05l01.objective",
    situationKey: "content.u05l01.situation",
    discoverKey: "content.u05l01.discover",
    manipulate: step("content.u05l01.manipulate", "content.u05l01.manipulate.instruction", {
        kind: "fraction-shade",
        id: "u05l01-manipulate",
        parts: 4,
        shaded: 2,
      }),
    exampleMethodKey: "content.method",
    examplePromptKeys: [
      "content.u05l01.example.easy",
      "content.u05l01.example.medium",
      "content.u05l01.example.reflection",
    ],
    practice: step("content.u05l01.practice", "content.common.instruction.numeric", {
        kind: "numeric-question",
        id: "u05l01-practice",
        promptKey: "content.u05l01.practice.prompt",
        answer: 2,
      }),
    reflect: step("content.u05l01.reflect", "content.common.instruction.choice", {
        kind: "text-choice",
        id: "u05l01-reflect",
        promptKey: "content.u05l01.reflect.prompt",
        choiceKeys: ["content.u05l01.reflect.c0","content.u05l01.reflect.c1","content.u05l01.reflect.c2"],
        answerIndex: 0,
      }),
    play: step("content.u05l01.play", "content.common.instruction.choice", {
        kind: "text-choice",
        id: "u05l01-play",
        promptKey: "content.u05l01.play.prompt",
        choiceKeys: ["content.u05l01.play.c0","content.u05l01.play.c1","content.u05l01.play.c2"],
        answerIndex: 0,
      }, "content.u05l01.play.title"),
    rememberKey: "content.u05l01.remember",
    check: step("content.u05l01.check", "content.common.instruction.numeric", {
        kind: "numeric-question",
        id: "u05l01-check",
        promptKey: "content.u05l01.check.prompt",
        answer: 4,
      }),
  },
  "MATH-3P-U05-L02": {
    objectiveKey: "content.u05l02.objective",
    situationKey: "content.u05l02.situation",
    discoverKey: "content.u05l02.discover",
    manipulate: step("content.u05l02.manipulate", "content.u05l02.manipulate.instruction", {
        kind: "fraction-shade",
        id: "u05l02-manipulate",
        parts: 4,
        shaded: 1,
      }),
    exampleMethodKey: "content.method",
    examplePromptKeys: [
      "content.u05l02.example.easy",
      "content.u05l02.example.medium",
      "content.u05l02.example.reflection",
    ],
    practice: step("content.u05l02.practice", "content.common.instruction.numeric", {
        kind: "numeric-question",
        id: "u05l02-practice",
        promptKey: "content.u05l02.practice.prompt",
        answer: 4,
      }),
    reflect: step("content.u05l02.reflect", "content.common.instruction.choice", {
        kind: "text-choice",
        id: "u05l02-reflect",
        promptKey: "content.u05l02.reflect.prompt",
        choiceKeys: ["content.u05l02.reflect.c0","content.u05l02.reflect.c1","content.u05l02.reflect.c2"],
        answerIndex: 0,
      }),
    play: step("content.u05l02.play", "content.common.instruction.choice", {
        kind: "text-choice",
        id: "u05l02-play",
        promptKey: "content.u05l02.play.prompt",
        choiceKeys: ["content.u05l02.play.c0","content.u05l02.play.c1","content.u05l02.play.c2"],
        answerIndex: 0,
        visual: {
          kind: "fraction-bars",
          bars: [
            {
              parts: 3,
              shaded: 1,
            },
          ],
        },
      }, "content.u05l02.play.title"),
    rememberKey: "content.u05l02.remember",
    check: step("content.u05l02.check", "content.common.instruction.numeric", {
        kind: "numeric-question",
        id: "u05l02-check",
        promptKey: "content.u05l02.check.prompt",
        answer: 5,
      }),
  },
  "MATH-3P-U05-L03": {
    objectiveKey: "content.u05l03.objective",
    situationKey: "content.u05l03.situation",
    discoverKey: "content.u05l03.discover",
    manipulate: step("content.u05l03.manipulate", "content.common.instruction.choice", {
        kind: "text-choice",
        id: "u05l03-manipulate",
        promptKey: "content.u05l03.manipulate.prompt",
        choiceKeys: [
          "content.u05l03.manipulate.c0",
          "content.u05l03.manipulate.c1",
          "content.u05l03.manipulate.c2",
        ],
        answerIndex: 0,
        visual: {
          kind: "fraction-bars",
          bars: [
            {
              parts: 2,
              shaded: 1,
            },
            {
              parts: 4,
              shaded: 1,
            },
          ],
        },
      }),
    exampleMethodKey: "content.method",
    examplePromptKeys: [
      "content.u05l03.example.easy",
      "content.u05l03.example.medium",
      "content.u05l03.example.reflection",
    ],
    practice: step("content.u05l03.practice", "content.common.instruction.choice", {
        kind: "text-choice",
        id: "u05l03-practice",
        promptKey: "content.u05l03.practice.prompt",
        choiceKeys: ["content.u05l03.practice.c0","content.u05l03.practice.c1","content.u05l03.practice.c2"],
        answerIndex: 0,
      }),
    reflect: step("content.u05l03.reflect", "content.common.instruction.choice", {
        kind: "text-choice",
        id: "u05l03-reflect",
        promptKey: "content.u05l03.reflect.prompt",
        choiceKeys: ["content.u05l03.reflect.c0","content.u05l03.reflect.c1","content.u05l03.reflect.c2"],
        answerIndex: 0,
      }),
    play: step("content.u05l03.play", "content.common.instruction.choice", {
        kind: "text-choice",
        id: "u05l03-play",
        promptKey: "content.u05l03.play.prompt",
        choiceKeys: ["content.u05l03.play.c0","content.u05l03.play.c1","content.u05l03.play.c2"],
        answerIndex: 1,
        visual: {
          kind: "fraction-bars",
          bars: [
            {
              parts: 3,
              shaded: 1,
            },
            {
              parts: 4,
              shaded: 1,
            },
          ],
        },
      }, "content.u05l03.play.title"),
    rememberKey: "content.u05l03.remember",
    check: step("content.u05l03.check", "content.common.instruction.choice", {
        kind: "text-choice",
        id: "u05l03-check",
        promptKey: "content.u05l03.check.prompt",
        choiceKeys: ["content.u05l03.check.c0","content.u05l03.check.c1","content.u05l03.check.c2"],
        answerIndex: 2,
      }),
  },
  "MATH-3P-U05-L04": {
    objectiveKey: "content.u05l04.objective",
    situationKey: "content.u05l04.situation",
    discoverKey: "content.u05l04.discover",
    manipulate: step("content.u05l04.manipulate", "content.u05l04.manipulate.instruction", {
        kind: "share-tokens",
        id: "u05l04-manipulate",
        total: 15,
        bowls: 3,
      }),
    exampleMethodKey: "content.method",
    examplePromptKeys: [
      "content.u05l04.example.easy",
      "content.u05l04.example.medium",
      "content.u05l04.example.reflection",
    ],
    practice: step("content.u05l04.practice", "content.common.instruction.numeric", {
        kind: "numeric-question",
        id: "u05l04-practice",
        promptKey: "content.u05l04.practice.prompt",
        answer: 8,
      }),
    reflect: step("content.u05l04.reflect", "content.common.instruction.numeric", {
        kind: "numeric-question",
        id: "u05l04-reflect",
        promptKey: "content.u05l04.reflect.prompt",
        answer: 8,
      }),
    play: step("content.u05l04.play", "content.u05l04.play.instruction", {
        kind: "share-tokens",
        id: "u05l04-play",
        total: 20,
        bowls: 4,
      }, "content.u05l04.play.title"),
    rememberKey: "content.u05l04.remember",
    check: step("content.u05l04.check", "content.common.instruction.numeric", {
        kind: "numeric-question",
        id: "u05l04-check",
        promptKey: "content.u05l04.check.prompt",
        answer: 6,
      }),
  },
};

export const UNIT_05_EVALUATION: EvaluationContent = {
  introKey: "content.u05eval.intro",
  items: [
    step("content.u05eval.q1", "content.common.instruction.numeric", {
        kind: "numeric-question",
        id: "u05eval-q1",
        promptKey: "content.u05eval.q1.prompt",
        answer: 4,
      }, "content.common.title.question"),
    step("content.u05eval.q2", "content.common.instruction.numeric", {
        kind: "numeric-question",
        id: "u05eval-q2",
        promptKey: "content.u05eval.q2.prompt",
        answer: 5,
      }, "content.common.title.question"),
    step("content.u05eval.q3", "content.common.instruction.choice", {
        kind: "text-choice",
        id: "u05eval-q3",
        promptKey: "content.u05eval.q3.prompt",
        choiceKeys: ["content.u05eval.q3.c0","content.u05eval.q3.c1","content.u05eval.q3.c2"],
        answerIndex: 2,
      }, "content.common.title.question"),
    step("content.u05eval.q4", "content.common.instruction.numeric", {
        kind: "numeric-question",
        id: "u05eval-q4",
        promptKey: "content.u05eval.q4.prompt",
        answer: 6,
      }, "content.common.title.question"),
  ],
};
