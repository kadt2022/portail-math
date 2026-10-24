import type { Question } from "./exercise-model";

export interface LessonContent {
  sourcePage: number;
  manipulate: readonly Question[];
  practice: readonly Question[];
  play: readonly Question[];
  remember: readonly Question[];
}

export const LESSON_CONTENT: Record<string, LessonContent> = {
  "MATH-1P-U01-L01": {
    "sourcePage": 5,
    "manipulate": [
      {
        "kind": "select",
        "cards": [
          {
            "label": "Bouchon rouge 1",
            "shape": "circle",
            "color": "#b83930",
            "size": 48
          },
          {
            "label": "Bouchon bleu",
            "shape": "circle",
            "color": "#205b9a",
            "size": 48
          },
          {
            "label": "Bouchon rouge 2",
            "shape": "circle",
            "color": "#b83930",
            "size": 48
          },
          {
            "label": "Bouchon jaune",
            "shape": "circle",
            "color": "#bb8500",
            "size": 48
          }
        ],
        "answers": [
          0,
          2
        ],
        "id": "MATH-1P-U01-L01-manipulate",
        "promptKey": "questions.MATH-1P-U01-L01-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U01-L01-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U01-L01-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U01-L01"
      }
    ],
    "practice": [
      {
        "kind": "select",
        "cards": [
          {
            "label": "Rond 1",
            "shape": "circle",
            "color": "#18775c",
            "size": 48
          },
          {
            "label": "Rond 2",
            "shape": "circle",
            "color": "#18775c",
            "size": 48
          },
          {
            "label": "Carré",
            "shape": "square",
            "color": "#18775c",
            "size": 48
          },
          {
            "label": "Rond 3",
            "shape": "circle",
            "color": "#18775c",
            "size": 48
          }
        ],
        "answers": [
          2
        ],
        "id": "MATH-1P-U01-L01-practice-1",
        "promptKey": "questions.MATH-1P-U01-L01-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U01-L01-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U01-L01-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U01-L01"
      },
      {
        "kind": "choice",
        "choices": [
          "Même couleur, tailles différentes",
          "Même taille, couleurs différentes",
          "Tout est différent"
        ],
        "answers": [
          "Même couleur, tailles différentes"
        ],
        "cards": [
          {
            "label": "Petite mangue verte",
            "shape": "circle",
            "color": "#18775c",
            "size": 30
          },
          {
            "label": "Grande mangue verte",
            "shape": "circle",
            "color": "#18775c",
            "size": 64
          }
        ],
        "id": "MATH-1P-U01-L01-practice-2",
        "promptKey": "questions.MATH-1P-U01-L01-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U01-L01-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U01-L01-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U01-L01"
      },
      {
        "kind": "select",
        "cards": [
          {
            "label": "Petit cercle",
            "shape": "circle",
            "color": "#18775c",
            "size": 28
          },
          {
            "label": "Grand cercle",
            "shape": "circle",
            "color": "#18775c",
            "size": 64
          },
          {
            "label": "Carré",
            "shape": "square",
            "color": "#18775c",
            "size": 48
          }
        ],
        "answers": [
          0,
          1
        ],
        "id": "MATH-1P-U01-L01-practice-3",
        "promptKey": "questions.MATH-1P-U01-L01-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U01-L01-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U01-L01-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U01-L01"
      }
    ],
    "play": [
      {
        "kind": "select",
        "cards": [
          {
            "label": "Cercle 1",
            "shape": "circle",
            "color": "#18775c",
            "size": 48
          },
          {
            "label": "Triangle",
            "shape": "triangle",
            "color": "#18775c",
            "size": 48
          },
          {
            "label": "Cercle 2",
            "shape": "circle",
            "color": "#18775c",
            "size": 48
          }
        ],
        "answers": [
          0,
          2
        ],
        "id": "MATH-1P-U01-L01-play",
        "promptKey": "questions.MATH-1P-U01-L01-play.prompt",
        "hintKey": "questions.MATH-1P-U01-L01-play.hint",
        "explanationKey": "questions.MATH-1P-U01-L01-play.explanation",
        "reviewLessonId": "MATH-1P-U01-L01"
      }
    ],
    "remember": [
      {
        "kind": "select",
        "cards": [
          {
            "label": "Petit cercle",
            "shape": "circle",
            "color": "#18775c",
            "size": 28
          },
          {
            "label": "Grand cercle",
            "shape": "circle",
            "color": "#18775c",
            "size": 64
          },
          {
            "label": "Carré",
            "shape": "square",
            "color": "#18775c",
            "size": 48
          }
        ],
        "answers": [
          0,
          1
        ],
        "id": "MATH-1P-U01-L01-check",
        "promptKey": "questions.MATH-1P-U01-L01-check.prompt",
        "hintKey": "questions.MATH-1P-U01-L01-check.hint",
        "explanationKey": "questions.MATH-1P-U01-L01-check.explanation",
        "reviewLessonId": "MATH-1P-U01-L01"
      }
    ]
  },
  "MATH-1P-U01-L02": {
    "sourcePage": 6,
    "manipulate": [
      {
        "kind": "select",
        "cards": [
          {
            "label": "Bouchon rouge 1",
            "shape": "circle",
            "color": "#b83930",
            "size": 48
          },
          {
            "label": "Bouchon bleu",
            "shape": "circle",
            "color": "#205b9a",
            "size": 48
          },
          {
            "label": "Bouchon rouge 2",
            "shape": "circle",
            "color": "#b83930",
            "size": 48
          },
          {
            "label": "Bouchon jaune",
            "shape": "circle",
            "color": "#bb8500",
            "size": 48
          }
        ],
        "answers": [
          0,
          2
        ],
        "id": "MATH-1P-U01-L02-manipulate",
        "promptKey": "questions.MATH-1P-U01-L02-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U01-L02-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U01-L02-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U01-L02"
      }
    ],
    "practice": [
      {
        "kind": "select",
        "cards": [
          {
            "label": "Cercle rouge",
            "shape": "circle",
            "color": "#b83930",
            "size": 48
          },
          {
            "label": "Carré bleu",
            "shape": "square",
            "color": "#205b9a",
            "size": 48
          },
          {
            "label": "Cercle bleu",
            "shape": "circle",
            "color": "#205b9a",
            "size": 48
          }
        ],
        "answers": [
          0,
          2
        ],
        "id": "MATH-1P-U01-L02-practice-1",
        "promptKey": "questions.MATH-1P-U01-L02-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U01-L02-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U01-L02-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U01-L02"
      },
      {
        "kind": "select",
        "cards": [
          {
            "label": "Cercle rouge",
            "shape": "circle",
            "color": "#b83930",
            "size": 48
          },
          {
            "label": "Carré bleu",
            "shape": "square",
            "color": "#205b9a",
            "size": 48
          },
          {
            "label": "Cercle bleu",
            "shape": "circle",
            "color": "#205b9a",
            "size": 48
          }
        ],
        "answers": [
          1,
          2
        ],
        "id": "MATH-1P-U01-L02-practice-2",
        "promptKey": "questions.MATH-1P-U01-L02-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U01-L02-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U01-L02-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U01-L02"
      },
      {
        "kind": "choice",
        "choices": [
          "Oui",
          "Non"
        ],
        "answers": [
          "Oui"
        ],
        "id": "MATH-1P-U01-L02-practice-3",
        "promptKey": "questions.MATH-1P-U01-L02-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U01-L02-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U01-L02-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U01-L02"
      }
    ],
    "play": [
      {
        "kind": "select",
        "cards": [
          {
            "label": "Bouchon rouge 1",
            "shape": "circle",
            "color": "#b83930",
            "size": 48
          },
          {
            "label": "Bouchon bleu",
            "shape": "circle",
            "color": "#205b9a",
            "size": 48
          },
          {
            "label": "Bouchon rouge 2",
            "shape": "circle",
            "color": "#b83930",
            "size": 48
          },
          {
            "label": "Bouchon jaune",
            "shape": "circle",
            "color": "#bb8500",
            "size": 48
          }
        ],
        "answers": [
          1
        ],
        "id": "MATH-1P-U01-L02-play",
        "promptKey": "questions.MATH-1P-U01-L02-play.prompt",
        "hintKey": "questions.MATH-1P-U01-L02-play.hint",
        "explanationKey": "questions.MATH-1P-U01-L02-play.explanation",
        "reviewLessonId": "MATH-1P-U01-L02"
      }
    ],
    "remember": [
      {
        "kind": "choice",
        "choices": [
          "Oui",
          "Non"
        ],
        "answers": [
          "Oui"
        ],
        "id": "MATH-1P-U01-L02-check",
        "promptKey": "questions.MATH-1P-U01-L02-check.prompt",
        "hintKey": "questions.MATH-1P-U01-L02-check.hint",
        "explanationKey": "questions.MATH-1P-U01-L02-check.explanation",
        "reviewLessonId": "MATH-1P-U01-L02"
      }
    ]
  },
  "MATH-1P-U01-L03": {
    "sourcePage": 7,
    "manipulate": [
      {
        "kind": "order",
        "values": [
          "grand",
          "petit",
          "moyen"
        ],
        "answer": [
          "petit",
          "moyen",
          "grand"
        ],
        "lengths": [
          6,
          2,
          4
        ],
        "id": "MATH-1P-U01-L03-manipulate",
        "promptKey": "questions.MATH-1P-U01-L03-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U01-L03-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U01-L03-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U01-L03"
      }
    ],
    "practice": [
      {
        "kind": "order",
        "values": [
          "grand",
          "petit",
          "moyen"
        ],
        "answer": [
          "petit",
          "moyen",
          "grand"
        ],
        "lengths": [
          6,
          2,
          4
        ],
        "id": "MATH-1P-U01-L03-practice-1",
        "promptKey": "questions.MATH-1P-U01-L03-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U01-L03-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U01-L03-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U01-L03"
      },
      {
        "kind": "order",
        "values": [
          "2",
          "5",
          "3"
        ],
        "answer": [
          "2",
          "3",
          "5"
        ],
        "lengths": [
          2,
          5,
          3
        ],
        "id": "MATH-1P-U01-L03-practice-2",
        "promptKey": "questions.MATH-1P-U01-L03-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U01-L03-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U01-L03-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U01-L03"
      },
      {
        "kind": "choice",
        "choices": [
          "L’un ou l’autre",
          "Toujours le rouge",
          "Toujours le bleu"
        ],
        "answers": [
          "L’un ou l’autre"
        ],
        "id": "MATH-1P-U01-L03-practice-3",
        "promptKey": "questions.MATH-1P-U01-L03-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U01-L03-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U01-L03-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U01-L03"
      }
    ],
    "play": [
      {
        "kind": "order",
        "values": [
          "grand",
          "petit",
          "moyen"
        ],
        "answer": [
          "petit",
          "moyen",
          "grand"
        ],
        "lengths": [
          6,
          2,
          4
        ],
        "id": "MATH-1P-U01-L03-play",
        "promptKey": "questions.MATH-1P-U01-L03-play.prompt",
        "hintKey": "questions.MATH-1P-U01-L03-play.hint",
        "explanationKey": "questions.MATH-1P-U01-L03-play.explanation",
        "reviewLessonId": "MATH-1P-U01-L03"
      }
    ],
    "remember": [
      {
        "kind": "choice",
        "choices": [
          "L’un ou l’autre",
          "Toujours le rouge",
          "Toujours le bleu"
        ],
        "answers": [
          "L’un ou l’autre"
        ],
        "id": "MATH-1P-U01-L03-check",
        "promptKey": "questions.MATH-1P-U01-L03-check.prompt",
        "hintKey": "questions.MATH-1P-U01-L03-check.hint",
        "explanationKey": "questions.MATH-1P-U01-L03-check.explanation",
        "reviewLessonId": "MATH-1P-U01-L03"
      }
    ]
  },
  "MATH-1P-U01-L04": {
    "sourcePage": 8,
    "manipulate": [
      {
        "kind": "choice",
        "choices": [
          "graine, bouchon",
          "bouchon, graine",
          "graine, graine"
        ],
        "answers": [
          "graine, bouchon"
        ],
        "id": "MATH-1P-U01-L04-manipulate",
        "promptKey": "questions.MATH-1P-U01-L04-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U01-L04-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U01-L04-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U01-L04"
      }
    ],
    "practice": [
      {
        "kind": "choice",
        "choices": [
          "● puis ■",
          "■ puis ●",
          "● puis ●"
        ],
        "answers": [
          "● puis ■"
        ],
        "id": "MATH-1P-U01-L04-practice-1",
        "promptKey": "questions.MATH-1P-U01-L04-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U01-L04-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U01-L04-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U01-L04"
      },
      {
        "kind": "choice",
        "choices": [
          "petit",
          "grand"
        ],
        "answers": [
          "petit"
        ],
        "id": "MATH-1P-U01-L04-practice-2",
        "promptKey": "questions.MATH-1P-U01-L04-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U01-L04-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U01-L04-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U01-L04"
      },
      {
        "kind": "pattern",
        "id": "MATH-1P-U01-L04-practice-3",
        "promptKey": "questions.MATH-1P-U01-L04-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U01-L04-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U01-L04-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U01-L04"
      }
    ],
    "play": [
      {
        "kind": "choice",
        "choices": [
          "● puis ■",
          "■ puis ●",
          "● puis ●"
        ],
        "answers": [
          "● puis ■"
        ],
        "id": "MATH-1P-U01-L04-play",
        "promptKey": "questions.MATH-1P-U01-L04-play.prompt",
        "hintKey": "questions.MATH-1P-U01-L04-play.hint",
        "explanationKey": "questions.MATH-1P-U01-L04-play.explanation",
        "reviewLessonId": "MATH-1P-U01-L04"
      }
    ],
    "remember": [
      {
        "kind": "pattern",
        "id": "MATH-1P-U01-L04-check",
        "promptKey": "questions.MATH-1P-U01-L04-check.prompt",
        "hintKey": "questions.MATH-1P-U01-L04-check.hint",
        "explanationKey": "questions.MATH-1P-U01-L04-check.explanation",
        "reviewLessonId": "MATH-1P-U01-L04"
      }
    ]
  },
  "MATH-1P-U02-L01": {
    "sourcePage": 11,
    "manipulate": [
      {
        "kind": "build",
        "target": 3,
        "id": "MATH-1P-U02-L01-manipulate",
        "promptKey": "questions.MATH-1P-U02-L01-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U02-L01-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U02-L01-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U02-L01"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 2,
        "visual": [
          2
        ],
        "symbol": "+",
        "id": "MATH-1P-U02-L01-practice-1",
        "promptKey": "questions.MATH-1P-U02-L01-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U02-L01-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U02-L01-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U02-L01"
      },
      {
        "kind": "build",
        "target": 3,
        "token": "🐟",
        "id": "MATH-1P-U02-L01-practice-2",
        "promptKey": "questions.MATH-1P-U02-L01-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U02-L01-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U02-L01-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U02-L01"
      },
      {
        "kind": "split",
        "total": 3,
        "ways": 2,
        "id": "MATH-1P-U02-L01-practice-3",
        "promptKey": "questions.MATH-1P-U02-L01-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U02-L01-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U02-L01-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U02-L01"
      }
    ],
    "play": [
      {
        "kind": "build",
        "target": 3,
        "token": "🥭",
        "id": "MATH-1P-U02-L01-play",
        "promptKey": "questions.MATH-1P-U02-L01-play.prompt",
        "hintKey": "questions.MATH-1P-U02-L01-play.hint",
        "explanationKey": "questions.MATH-1P-U02-L01-play.explanation",
        "reviewLessonId": "MATH-1P-U02-L01"
      }
    ],
    "remember": [
      {
        "kind": "split",
        "total": 3,
        "ways": 2,
        "id": "MATH-1P-U02-L01-check",
        "promptKey": "questions.MATH-1P-U02-L01-check.prompt",
        "hintKey": "questions.MATH-1P-U02-L01-check.hint",
        "explanationKey": "questions.MATH-1P-U02-L01-check.explanation",
        "reviewLessonId": "MATH-1P-U02-L01"
      }
    ]
  },
  "MATH-1P-U02-L02": {
    "sourcePage": 12,
    "manipulate": [
      {
        "kind": "build",
        "target": 5,
        "initial": 4,
        "id": "MATH-1P-U02-L02-manipulate",
        "promptKey": "questions.MATH-1P-U02-L02-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U02-L02-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U02-L02-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U02-L02"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 4,
        "id": "MATH-1P-U02-L02-practice-1",
        "promptKey": "questions.MATH-1P-U02-L02-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U02-L02-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U02-L02-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U02-L02"
      },
      {
        "kind": "remove",
        "total": 5,
        "remove": 1,
        "token": "🥭",
        "id": "MATH-1P-U02-L02-practice-2",
        "promptKey": "questions.MATH-1P-U02-L02-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U02-L02-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U02-L02-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U02-L02"
      },
      {
        "kind": "split",
        "total": 5,
        "ways": 1,
        "id": "MATH-1P-U02-L02-practice-3",
        "promptKey": "questions.MATH-1P-U02-L02-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U02-L02-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U02-L02-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U02-L02"
      }
    ],
    "play": [
      {
        "kind": "build",
        "target": 4,
        "token": "🥭",
        "id": "MATH-1P-U02-L02-play",
        "promptKey": "questions.MATH-1P-U02-L02-play.prompt",
        "hintKey": "questions.MATH-1P-U02-L02-play.hint",
        "explanationKey": "questions.MATH-1P-U02-L02-play.explanation",
        "reviewLessonId": "MATH-1P-U02-L02"
      }
    ],
    "remember": [
      {
        "kind": "split",
        "total": 5,
        "ways": 1,
        "id": "MATH-1P-U02-L02-check",
        "promptKey": "questions.MATH-1P-U02-L02-check.prompt",
        "hintKey": "questions.MATH-1P-U02-L02-check.hint",
        "explanationKey": "questions.MATH-1P-U02-L02-check.explanation",
        "reviewLessonId": "MATH-1P-U02-L02"
      }
    ]
  },
  "MATH-1P-U02-L03": {
    "sourcePage": 13,
    "manipulate": [
      {
        "kind": "remove",
        "total": 3,
        "remove": 3,
        "id": "MATH-1P-U02-L03-manipulate",
        "promptKey": "questions.MATH-1P-U02-L03-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U02-L03-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U02-L03-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U02-L03"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 0,
        "id": "MATH-1P-U02-L03-practice-1",
        "promptKey": "questions.MATH-1P-U02-L03-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U02-L03-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U02-L03-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U02-L03"
      },
      {
        "kind": "number",
        "answer": 3,
        "id": "MATH-1P-U02-L03-practice-2",
        "promptKey": "questions.MATH-1P-U02-L03-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U02-L03-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U02-L03-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U02-L03"
      },
      {
        "kind": "remove",
        "total": 2,
        "remove": 2,
        "id": "MATH-1P-U02-L03-practice-3",
        "promptKey": "questions.MATH-1P-U02-L03-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U02-L03-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U02-L03-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U02-L03"
      }
    ],
    "play": [
      {
        "kind": "remove",
        "total": 4,
        "remove": 4,
        "id": "MATH-1P-U02-L03-play",
        "promptKey": "questions.MATH-1P-U02-L03-play.prompt",
        "hintKey": "questions.MATH-1P-U02-L03-play.hint",
        "explanationKey": "questions.MATH-1P-U02-L03-play.explanation",
        "reviewLessonId": "MATH-1P-U02-L03"
      }
    ],
    "remember": [
      {
        "kind": "remove",
        "total": 2,
        "remove": 2,
        "id": "MATH-1P-U02-L03-check",
        "promptKey": "questions.MATH-1P-U02-L03-check.prompt",
        "hintKey": "questions.MATH-1P-U02-L03-check.hint",
        "explanationKey": "questions.MATH-1P-U02-L03-check.explanation",
        "reviewLessonId": "MATH-1P-U02-L03"
      }
    ]
  },
  "MATH-1P-U02-L04": {
    "sourcePage": 14,
    "manipulate": [
      {
        "kind": "build",
        "target": 4,
        "id": "MATH-1P-U02-L04-manipulate",
        "promptKey": "questions.MATH-1P-U02-L04-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U02-L04-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U02-L04-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U02-L04"
      }
    ],
    "practice": [
      {
        "kind": "choice",
        "choices": [
          "0",
          "2",
          "4",
          "5"
        ],
        "answers": [
          "4"
        ],
        "id": "MATH-1P-U02-L04-practice-1",
        "promptKey": "questions.MATH-1P-U02-L04-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U02-L04-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U02-L04-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U02-L04"
      },
      {
        "kind": "order",
        "values": [
          "3",
          "0",
          "5",
          "1",
          "4",
          "2"
        ],
        "answer": [
          "0",
          "1",
          "2",
          "3",
          "4",
          "5"
        ],
        "id": "MATH-1P-U02-L04-practice-2",
        "promptKey": "questions.MATH-1P-U02-L04-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U02-L04-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U02-L04-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U02-L04"
      },
      {
        "kind": "order",
        "values": [
          "4",
          "2"
        ],
        "answer": [
          "2",
          "4"
        ],
        "id": "MATH-1P-U02-L04-practice-3",
        "promptKey": "questions.MATH-1P-U02-L04-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U02-L04-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U02-L04-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U02-L04"
      }
    ],
    "play": [
      {
        "kind": "build",
        "target": 5,
        "id": "MATH-1P-U02-L04-play",
        "promptKey": "questions.MATH-1P-U02-L04-play.prompt",
        "hintKey": "questions.MATH-1P-U02-L04-play.hint",
        "explanationKey": "questions.MATH-1P-U02-L04-play.explanation",
        "reviewLessonId": "MATH-1P-U02-L04"
      }
    ],
    "remember": [
      {
        "kind": "order",
        "values": [
          "4",
          "2"
        ],
        "answer": [
          "2",
          "4"
        ],
        "id": "MATH-1P-U02-L04-check",
        "promptKey": "questions.MATH-1P-U02-L04-check.prompt",
        "hintKey": "questions.MATH-1P-U02-L04-check.hint",
        "explanationKey": "questions.MATH-1P-U02-L04-check.explanation",
        "reviewLessonId": "MATH-1P-U02-L04"
      }
    ]
  },
  "MATH-1P-U03-L01": {
    "sourcePage": 17,
    "manipulate": [
      {
        "kind": "build",
        "target": 7,
        "initial": 5,
        "fixed": 5,
        "id": "MATH-1P-U03-L01-manipulate",
        "promptKey": "questions.MATH-1P-U03-L01-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U03-L01-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U03-L01-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U03-L01"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 6,
        "visual": [
          5,
          1
        ],
        "symbol": "+",
        "id": "MATH-1P-U03-L01-practice-1",
        "promptKey": "questions.MATH-1P-U03-L01-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U03-L01-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U03-L01-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U03-L01"
      },
      {
        "kind": "number",
        "answer": 2,
        "visual": [
          5,
          2
        ],
        "symbol": "+",
        "id": "MATH-1P-U03-L01-practice-2",
        "promptKey": "questions.MATH-1P-U03-L01-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U03-L01-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U03-L01-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U03-L01"
      },
      {
        "kind": "split",
        "total": 6,
        "ways": 1,
        "id": "MATH-1P-U03-L01-practice-3",
        "promptKey": "questions.MATH-1P-U03-L01-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U03-L01-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U03-L01-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U03-L01"
      }
    ],
    "play": [
      {
        "kind": "build",
        "target": 6,
        "initial": 5,
        "fixed": 5,
        "token": "▰",
        "id": "MATH-1P-U03-L01-play",
        "promptKey": "questions.MATH-1P-U03-L01-play.prompt",
        "hintKey": "questions.MATH-1P-U03-L01-play.hint",
        "explanationKey": "questions.MATH-1P-U03-L01-play.explanation",
        "reviewLessonId": "MATH-1P-U03-L01"
      }
    ],
    "remember": [
      {
        "kind": "split",
        "total": 6,
        "ways": 1,
        "id": "MATH-1P-U03-L01-check",
        "promptKey": "questions.MATH-1P-U03-L01-check.prompt",
        "hintKey": "questions.MATH-1P-U03-L01-check.hint",
        "explanationKey": "questions.MATH-1P-U03-L01-check.explanation",
        "reviewLessonId": "MATH-1P-U03-L01"
      }
    ]
  },
  "MATH-1P-U03-L02": {
    "sourcePage": 18,
    "manipulate": [
      {
        "kind": "split",
        "total": 10,
        "ways": 1,
        "equal": true,
        "id": "MATH-1P-U03-L02-manipulate",
        "promptKey": "questions.MATH-1P-U03-L02-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U03-L02-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U03-L02-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U03-L02"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 9,
        "id": "MATH-1P-U03-L02-practice-1",
        "promptKey": "questions.MATH-1P-U03-L02-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U03-L02-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U03-L02-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U03-L02"
      },
      {
        "kind": "number",
        "answer": 8,
        "visual": [
          5,
          3
        ],
        "symbol": "+",
        "id": "MATH-1P-U03-L02-practice-2",
        "promptKey": "questions.MATH-1P-U03-L02-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U03-L02-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U03-L02-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U03-L02"
      },
      {
        "kind": "split",
        "total": 10,
        "ways": 1,
        "equal": true,
        "id": "MATH-1P-U03-L02-practice-3",
        "promptKey": "questions.MATH-1P-U03-L02-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U03-L02-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U03-L02-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U03-L02"
      }
    ],
    "play": [
      {
        "kind": "build",
        "target": 10,
        "token": "●",
        "id": "MATH-1P-U03-L02-play",
        "promptKey": "questions.MATH-1P-U03-L02-play.prompt",
        "hintKey": "questions.MATH-1P-U03-L02-play.hint",
        "explanationKey": "questions.MATH-1P-U03-L02-play.explanation",
        "reviewLessonId": "MATH-1P-U03-L02"
      }
    ],
    "remember": [
      {
        "kind": "split",
        "total": 10,
        "ways": 1,
        "equal": true,
        "id": "MATH-1P-U03-L02-check",
        "promptKey": "questions.MATH-1P-U03-L02-check.prompt",
        "hintKey": "questions.MATH-1P-U03-L02-check.hint",
        "explanationKey": "questions.MATH-1P-U03-L02-check.explanation",
        "reviewLessonId": "MATH-1P-U03-L02"
      }
    ]
  },
  "MATH-1P-U03-L03": {
    "sourcePage": 19,
    "manipulate": [
      {
        "kind": "order",
        "values": [
          "5",
          "2",
          "8",
          "3",
          "7",
          "4",
          "6"
        ],
        "answer": [
          "2",
          "3",
          "4",
          "5",
          "6",
          "7",
          "8"
        ],
        "id": "MATH-1P-U03-L03-manipulate",
        "promptKey": "questions.MATH-1P-U03-L03-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U03-L03-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U03-L03-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U03-L03"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 7,
        "id": "MATH-1P-U03-L03-practice-1",
        "promptKey": "questions.MATH-1P-U03-L03-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U03-L03-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U03-L03-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U03-L03"
      },
      {
        "kind": "number",
        "answer": 8,
        "id": "MATH-1P-U03-L03-practice-2",
        "promptKey": "questions.MATH-1P-U03-L03-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U03-L03-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U03-L03-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U03-L03"
      },
      {
        "kind": "order",
        "values": [
          "7",
          "8"
        ],
        "answer": [
          "8",
          "7"
        ],
        "id": "MATH-1P-U03-L03-practice-3",
        "promptKey": "questions.MATH-1P-U03-L03-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U03-L03-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U03-L03-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U03-L03"
      }
    ],
    "play": [
      {
        "kind": "path",
        "target": [
          3,
          2
        ],
        "start": [
          1,
          2
        ],
        "id": "MATH-1P-U03-L03-play",
        "promptKey": "questions.MATH-1P-U03-L03-play.prompt",
        "hintKey": "questions.MATH-1P-U03-L03-play.hint",
        "explanationKey": "questions.MATH-1P-U03-L03-play.explanation",
        "reviewLessonId": "MATH-1P-U03-L03"
      }
    ],
    "remember": [
      {
        "kind": "order",
        "values": [
          "7",
          "8"
        ],
        "answer": [
          "8",
          "7"
        ],
        "id": "MATH-1P-U03-L03-check",
        "promptKey": "questions.MATH-1P-U03-L03-check.prompt",
        "hintKey": "questions.MATH-1P-U03-L03-check.hint",
        "explanationKey": "questions.MATH-1P-U03-L03-check.explanation",
        "reviewLessonId": "MATH-1P-U03-L03"
      }
    ]
  },
  "MATH-1P-U03-L04": {
    "sourcePage": 20,
    "manipulate": [
      {
        "kind": "split",
        "total": 8,
        "ways": 2,
        "id": "MATH-1P-U03-L04-manipulate",
        "promptKey": "questions.MATH-1P-U03-L04-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U03-L04-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U03-L04-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U03-L04"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 1,
        "id": "MATH-1P-U03-L04-practice-1",
        "promptKey": "questions.MATH-1P-U03-L04-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U03-L04-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U03-L04-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U03-L04"
      },
      {
        "kind": "split",
        "total": 9,
        "ways": 2,
        "id": "MATH-1P-U03-L04-practice-2",
        "promptKey": "questions.MATH-1P-U03-L04-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U03-L04-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U03-L04-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U03-L04"
      },
      {
        "kind": "split",
        "total": 10,
        "ways": 1,
        "equal": true,
        "id": "MATH-1P-U03-L04-practice-3",
        "promptKey": "questions.MATH-1P-U03-L04-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U03-L04-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U03-L04-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U03-L04"
      }
    ],
    "play": [
      {
        "kind": "split",
        "total": 7,
        "ways": 1,
        "id": "MATH-1P-U03-L04-play",
        "promptKey": "questions.MATH-1P-U03-L04-play.prompt",
        "hintKey": "questions.MATH-1P-U03-L04-play.hint",
        "explanationKey": "questions.MATH-1P-U03-L04-play.explanation",
        "reviewLessonId": "MATH-1P-U03-L04"
      }
    ],
    "remember": [
      {
        "kind": "split",
        "total": 10,
        "ways": 1,
        "equal": true,
        "id": "MATH-1P-U03-L04-check",
        "promptKey": "questions.MATH-1P-U03-L04-check.prompt",
        "hintKey": "questions.MATH-1P-U03-L04-check.hint",
        "explanationKey": "questions.MATH-1P-U03-L04-check.explanation",
        "reviewLessonId": "MATH-1P-U03-L04"
      }
    ]
  },
  "MATH-1P-U04-L01": {
    "sourcePage": 23,
    "manipulate": [
      {
        "kind": "pair",
        "left": 4,
        "right": 3,
        "answer": "Plus de bouchons",
        "choices": [
          "Plus de bouchons",
          "Autant",
          "Moins de bouchons"
        ],
        "id": "MATH-1P-U04-L01-manipulate",
        "promptKey": "questions.MATH-1P-U04-L01-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U04-L01-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U04-L01-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U04-L01"
      }
    ],
    "practice": [
      {
        "kind": "choice",
        "choices": [
          "Autant",
          "Plus de mangues",
          "Moins de mangues"
        ],
        "answers": [
          "Autant"
        ],
        "id": "MATH-1P-U04-L01-practice-1",
        "promptKey": "questions.MATH-1P-U04-L01-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U04-L01-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U04-L01-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U04-L01"
      },
      {
        "kind": "choice",
        "choices": [
          "Plus de craies",
          "Plus d’élèves",
          "Autant"
        ],
        "answers": [
          "Plus de craies"
        ],
        "id": "MATH-1P-U04-L01-practice-2",
        "promptKey": "questions.MATH-1P-U04-L01-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U04-L01-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U04-L01-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U04-L01"
      },
      {
        "kind": "build",
        "target": 5,
        "initial": 3,
        "fixed": 3,
        "id": "MATH-1P-U04-L01-practice-3",
        "promptKey": "questions.MATH-1P-U04-L01-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U04-L01-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U04-L01-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U04-L01"
      }
    ],
    "play": [
      {
        "kind": "build",
        "target": 4,
        "initial": 2,
        "id": "MATH-1P-U04-L01-play",
        "promptKey": "questions.MATH-1P-U04-L01-play.prompt",
        "hintKey": "questions.MATH-1P-U04-L01-play.hint",
        "explanationKey": "questions.MATH-1P-U04-L01-play.explanation",
        "reviewLessonId": "MATH-1P-U04-L01"
      }
    ],
    "remember": [
      {
        "kind": "build",
        "target": 5,
        "initial": 3,
        "fixed": 3,
        "id": "MATH-1P-U04-L01-check",
        "promptKey": "questions.MATH-1P-U04-L01-check.prompt",
        "hintKey": "questions.MATH-1P-U04-L01-check.hint",
        "explanationKey": "questions.MATH-1P-U04-L01-check.explanation",
        "reviewLessonId": "MATH-1P-U04-L01"
      }
    ]
  },
  "MATH-1P-U04-L02": {
    "sourcePage": 24,
    "manipulate": [
      {
        "kind": "split",
        "total": 6,
        "ways": 1,
        "equal": true,
        "id": "MATH-1P-U04-L02-manipulate",
        "promptKey": "questions.MATH-1P-U04-L02-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U04-L02-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U04-L02-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U04-L02"
      }
    ],
    "practice": [
      {
        "kind": "choice",
        "choices": [
          "<",
          "=",
          ">"
        ],
        "answers": [
          "="
        ],
        "id": "MATH-1P-U04-L02-practice-1",
        "promptKey": "questions.MATH-1P-U04-L02-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U04-L02-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U04-L02-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U04-L02"
      },
      {
        "kind": "choice",
        "choices": [
          "<",
          "=",
          ">"
        ],
        "answers": [
          "="
        ],
        "id": "MATH-1P-U04-L02-practice-2",
        "promptKey": "questions.MATH-1P-U04-L02-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U04-L02-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U04-L02-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U04-L02"
      },
      {
        "kind": "split",
        "total": 4,
        "ways": 1,
        "id": "MATH-1P-U04-L02-practice-3",
        "promptKey": "questions.MATH-1P-U04-L02-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U04-L02-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U04-L02-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U04-L02"
      }
    ],
    "play": [
      {
        "kind": "choice",
        "choices": [
          "3 = 3",
          "3 = 4",
          "2 = 5"
        ],
        "answers": [
          "3 = 3"
        ],
        "id": "MATH-1P-U04-L02-play",
        "promptKey": "questions.MATH-1P-U04-L02-play.prompt",
        "hintKey": "questions.MATH-1P-U04-L02-play.hint",
        "explanationKey": "questions.MATH-1P-U04-L02-play.explanation",
        "reviewLessonId": "MATH-1P-U04-L02"
      }
    ],
    "remember": [
      {
        "kind": "split",
        "total": 4,
        "ways": 1,
        "id": "MATH-1P-U04-L02-check",
        "promptKey": "questions.MATH-1P-U04-L02-check.prompt",
        "hintKey": "questions.MATH-1P-U04-L02-check.hint",
        "explanationKey": "questions.MATH-1P-U04-L02-check.explanation",
        "reviewLessonId": "MATH-1P-U04-L02"
      }
    ]
  },
  "MATH-1P-U04-L03": {
    "sourcePage": 25,
    "manipulate": [
      {
        "kind": "choice",
        "choices": [
          "<",
          "=",
          ">"
        ],
        "answers": [
          ">"
        ],
        "cards": [
          {
            "label": "6 graines",
            "shape": "circle",
            "color": "#18775c",
            "size": 48
          },
          {
            "label": "3 graines",
            "shape": "circle",
            "color": "#18775c",
            "size": 48
          }
        ],
        "id": "MATH-1P-U04-L03-manipulate",
        "promptKey": "questions.MATH-1P-U04-L03-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U04-L03-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U04-L03-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U04-L03"
      }
    ],
    "practice": [
      {
        "kind": "choice",
        "choices": [
          "<",
          "=",
          ">"
        ],
        "answers": [
          ">"
        ],
        "id": "MATH-1P-U04-L03-practice-1",
        "promptKey": "questions.MATH-1P-U04-L03-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U04-L03-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U04-L03-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U04-L03"
      },
      {
        "kind": "choice",
        "choices": [
          "<",
          "=",
          ">"
        ],
        "answers": [
          "<"
        ],
        "id": "MATH-1P-U04-L03-practice-2",
        "promptKey": "questions.MATH-1P-U04-L03-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U04-L03-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U04-L03-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U04-L03"
      },
      {
        "kind": "choice",
        "choices": [
          "5",
          "6",
          "7",
          "8"
        ],
        "answers": [
          "6",
          "7"
        ],
        "id": "MATH-1P-U04-L03-practice-3",
        "promptKey": "questions.MATH-1P-U04-L03-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U04-L03-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U04-L03-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U04-L03"
      }
    ],
    "play": [
      {
        "kind": "choice",
        "choices": [
          "6 > 3",
          "6 < 3",
          "6 = 3"
        ],
        "answers": [
          "6 > 3"
        ],
        "id": "MATH-1P-U04-L03-play",
        "promptKey": "questions.MATH-1P-U04-L03-play.prompt",
        "hintKey": "questions.MATH-1P-U04-L03-play.hint",
        "explanationKey": "questions.MATH-1P-U04-L03-play.explanation",
        "reviewLessonId": "MATH-1P-U04-L03"
      }
    ],
    "remember": [
      {
        "kind": "choice",
        "choices": [
          "5",
          "6",
          "7",
          "8"
        ],
        "answers": [
          "6",
          "7"
        ],
        "id": "MATH-1P-U04-L03-check",
        "promptKey": "questions.MATH-1P-U04-L03-check.prompt",
        "hintKey": "questions.MATH-1P-U04-L03-check.hint",
        "explanationKey": "questions.MATH-1P-U04-L03-check.explanation",
        "reviewLessonId": "MATH-1P-U04-L03"
      }
    ]
  },
  "MATH-1P-U04-L04": {
    "sourcePage": 26,
    "manipulate": [
      {
        "kind": "order",
        "values": [
          "5",
          "2",
          "4"
        ],
        "answer": [
          "2",
          "4",
          "5"
        ],
        "id": "MATH-1P-U04-L04-manipulate",
        "promptKey": "questions.MATH-1P-U04-L04-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U04-L04-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U04-L04-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U04-L04"
      }
    ],
    "practice": [
      {
        "kind": "order",
        "values": [
          "3",
          "1",
          "2"
        ],
        "answer": [
          "1",
          "2",
          "3"
        ],
        "id": "MATH-1P-U04-L04-practice-1",
        "promptKey": "questions.MATH-1P-U04-L04-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U04-L04-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U04-L04-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U04-L04"
      },
      {
        "kind": "order",
        "values": [
          "8",
          "5",
          "10",
          "6"
        ],
        "answer": [
          "5",
          "6",
          "8",
          "10"
        ],
        "id": "MATH-1P-U04-L04-practice-2",
        "promptKey": "questions.MATH-1P-U04-L04-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U04-L04-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U04-L04-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U04-L04"
      },
      {
        "kind": "number",
        "answer": 5,
        "id": "MATH-1P-U04-L04-practice-3",
        "promptKey": "questions.MATH-1P-U04-L04-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U04-L04-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U04-L04-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U04-L04"
      }
    ],
    "play": [
      {
        "kind": "order",
        "values": [
          "7",
          "2",
          "4",
          "1"
        ],
        "answer": [
          "1",
          "2",
          "4",
          "7"
        ],
        "id": "MATH-1P-U04-L04-play",
        "promptKey": "questions.MATH-1P-U04-L04-play.prompt",
        "hintKey": "questions.MATH-1P-U04-L04-play.hint",
        "explanationKey": "questions.MATH-1P-U04-L04-play.explanation",
        "reviewLessonId": "MATH-1P-U04-L04"
      }
    ],
    "remember": [
      {
        "kind": "number",
        "answer": 5,
        "id": "MATH-1P-U04-L04-check",
        "promptKey": "questions.MATH-1P-U04-L04-check.prompt",
        "hintKey": "questions.MATH-1P-U04-L04-check.hint",
        "explanationKey": "questions.MATH-1P-U04-L04-check.explanation",
        "reviewLessonId": "MATH-1P-U04-L04"
      }
    ]
  },
  "MATH-1P-U05-L01": {
    "sourcePage": 29,
    "manipulate": [
      {
        "kind": "build",
        "target": 5,
        "initial": 2,
        "fixed": 2,
        "token": "🥭",
        "id": "MATH-1P-U05-L01-manipulate",
        "promptKey": "questions.MATH-1P-U05-L01-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U05-L01-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U05-L01-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U05-L01"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 3,
        "visual": [
          1,
          2
        ],
        "symbol": "+",
        "id": "MATH-1P-U05-L01-practice-1",
        "promptKey": "questions.MATH-1P-U05-L01-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U05-L01-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U05-L01-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U05-L01"
      },
      {
        "kind": "number",
        "answer": 7,
        "visual": [
          4,
          3
        ],
        "symbol": "+",
        "id": "MATH-1P-U05-L01-practice-2",
        "promptKey": "questions.MATH-1P-U05-L01-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U05-L01-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U05-L01-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U05-L01"
      },
      {
        "kind": "split",
        "total": 6,
        "ways": 1,
        "id": "MATH-1P-U05-L01-practice-3",
        "promptKey": "questions.MATH-1P-U05-L01-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U05-L01-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U05-L01-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U05-L01"
      }
    ],
    "play": [
      {
        "kind": "split",
        "total": 5,
        "ways": 1,
        "id": "MATH-1P-U05-L01-play",
        "promptKey": "questions.MATH-1P-U05-L01-play.prompt",
        "hintKey": "questions.MATH-1P-U05-L01-play.hint",
        "explanationKey": "questions.MATH-1P-U05-L01-play.explanation",
        "reviewLessonId": "MATH-1P-U05-L01"
      }
    ],
    "remember": [
      {
        "kind": "split",
        "total": 6,
        "ways": 1,
        "id": "MATH-1P-U05-L01-check",
        "promptKey": "questions.MATH-1P-U05-L01-check.prompt",
        "hintKey": "questions.MATH-1P-U05-L01-check.hint",
        "explanationKey": "questions.MATH-1P-U05-L01-check.explanation",
        "reviewLessonId": "MATH-1P-U05-L01"
      }
    ]
  },
  "MATH-1P-U05-L02": {
    "sourcePage": 30,
    "manipulate": [
      {
        "kind": "build",
        "target": 5,
        "initial": 3,
        "fixed": 3,
        "token": "🐦",
        "id": "MATH-1P-U05-L02-manipulate",
        "promptKey": "questions.MATH-1P-U05-L02-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U05-L02-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U05-L02-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U05-L02"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 3,
        "visual": [
          2,
          1
        ],
        "symbol": "+",
        "id": "MATH-1P-U05-L02-practice-1",
        "promptKey": "questions.MATH-1P-U05-L02-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U05-L02-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U05-L02-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U05-L02"
      },
      {
        "kind": "number",
        "answer": 8,
        "visual": [
          5,
          3
        ],
        "symbol": "+",
        "id": "MATH-1P-U05-L02-practice-2",
        "promptKey": "questions.MATH-1P-U05-L02-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U05-L02-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U05-L02-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U05-L02"
      },
      {
        "kind": "number",
        "answer": 5,
        "id": "MATH-1P-U05-L02-practice-3",
        "promptKey": "questions.MATH-1P-U05-L02-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U05-L02-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U05-L02-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U05-L02"
      }
    ],
    "play": [
      {
        "kind": "build",
        "target": 8,
        "initial": 5,
        "fixed": 5,
        "token": "👤",
        "id": "MATH-1P-U05-L02-play",
        "promptKey": "questions.MATH-1P-U05-L02-play.prompt",
        "hintKey": "questions.MATH-1P-U05-L02-play.hint",
        "explanationKey": "questions.MATH-1P-U05-L02-play.explanation",
        "reviewLessonId": "MATH-1P-U05-L02"
      }
    ],
    "remember": [
      {
        "kind": "number",
        "answer": 5,
        "id": "MATH-1P-U05-L02-check",
        "promptKey": "questions.MATH-1P-U05-L02-check.prompt",
        "hintKey": "questions.MATH-1P-U05-L02-check.hint",
        "explanationKey": "questions.MATH-1P-U05-L02-check.explanation",
        "reviewLessonId": "MATH-1P-U05-L02"
      }
    ]
  },
  "MATH-1P-U05-L03": {
    "sourcePage": 31,
    "manipulate": [
      {
        "kind": "build",
        "target": 6,
        "initial": 4,
        "fixed": 4,
        "id": "MATH-1P-U05-L03-manipulate",
        "promptKey": "questions.MATH-1P-U05-L03-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U05-L03-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U05-L03-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U05-L03"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 4,
        "visual": [
          3,
          1
        ],
        "symbol": "+",
        "id": "MATH-1P-U05-L03-practice-1",
        "promptKey": "questions.MATH-1P-U05-L03-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U05-L03-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U05-L03-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U05-L03"
      },
      {
        "kind": "number",
        "answer": 9,
        "visual": [
          5,
          4
        ],
        "symbol": "+",
        "id": "MATH-1P-U05-L03-practice-2",
        "promptKey": "questions.MATH-1P-U05-L03-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U05-L03-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U05-L03-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U05-L03"
      },
      {
        "kind": "number",
        "answer": 5,
        "id": "MATH-1P-U05-L03-practice-3",
        "promptKey": "questions.MATH-1P-U05-L03-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U05-L03-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U05-L03-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U05-L03"
      }
    ],
    "play": [
      {
        "kind": "split",
        "total": 7,
        "ways": 1,
        "fixedLeft": 5,
        "id": "MATH-1P-U05-L03-play",
        "promptKey": "questions.MATH-1P-U05-L03-play.prompt",
        "hintKey": "questions.MATH-1P-U05-L03-play.hint",
        "explanationKey": "questions.MATH-1P-U05-L03-play.explanation",
        "reviewLessonId": "MATH-1P-U05-L03"
      }
    ],
    "remember": [
      {
        "kind": "number",
        "answer": 5,
        "id": "MATH-1P-U05-L03-check",
        "promptKey": "questions.MATH-1P-U05-L03-check.prompt",
        "hintKey": "questions.MATH-1P-U05-L03-check.hint",
        "explanationKey": "questions.MATH-1P-U05-L03-check.explanation",
        "reviewLessonId": "MATH-1P-U05-L03"
      }
    ]
  },
  "MATH-1P-U05-L04": {
    "sourcePage": 32,
    "manipulate": [
      {
        "kind": "split",
        "total": 8,
        "ways": 2,
        "id": "MATH-1P-U05-L04-manipulate",
        "promptKey": "questions.MATH-1P-U05-L04-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U05-L04-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U05-L04-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U05-L04"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 3,
        "id": "MATH-1P-U05-L04-practice-1",
        "promptKey": "questions.MATH-1P-U05-L04-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U05-L04-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U05-L04-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U05-L04"
      },
      {
        "kind": "split",
        "total": 7,
        "ways": 3,
        "id": "MATH-1P-U05-L04-practice-2",
        "promptKey": "questions.MATH-1P-U05-L04-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U05-L04-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U05-L04-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U05-L04"
      },
      {
        "kind": "choice",
        "choices": [
          "Oui",
          "Non"
        ],
        "answers": [
          "Oui"
        ],
        "id": "MATH-1P-U05-L04-practice-3",
        "promptKey": "questions.MATH-1P-U05-L04-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U05-L04-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U05-L04-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U05-L04"
      }
    ],
    "play": [
      {
        "kind": "split",
        "total": 8,
        "ways": 1,
        "id": "MATH-1P-U05-L04-play",
        "promptKey": "questions.MATH-1P-U05-L04-play.prompt",
        "hintKey": "questions.MATH-1P-U05-L04-play.hint",
        "explanationKey": "questions.MATH-1P-U05-L04-play.explanation",
        "reviewLessonId": "MATH-1P-U05-L04"
      }
    ],
    "remember": [
      {
        "kind": "choice",
        "choices": [
          "Oui",
          "Non"
        ],
        "answers": [
          "Oui"
        ],
        "id": "MATH-1P-U05-L04-check",
        "promptKey": "questions.MATH-1P-U05-L04-check.prompt",
        "hintKey": "questions.MATH-1P-U05-L04-check.hint",
        "explanationKey": "questions.MATH-1P-U05-L04-check.explanation",
        "reviewLessonId": "MATH-1P-U05-L04"
      }
    ]
  },
  "MATH-1P-U05-L05": {
    "sourcePage": 33,
    "manipulate": [
      {
        "kind": "build",
        "target": 10,
        "initial": 6,
        "fixed": 6,
        "id": "MATH-1P-U05-L05-manipulate",
        "promptKey": "questions.MATH-1P-U05-L05-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U05-L05-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U05-L05-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U05-L05"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 3,
        "id": "MATH-1P-U05-L05-practice-1",
        "promptKey": "questions.MATH-1P-U05-L05-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U05-L05-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U05-L05-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U05-L05"
      },
      {
        "kind": "number",
        "answer": 3,
        "id": "MATH-1P-U05-L05-practice-2",
        "promptKey": "questions.MATH-1P-U05-L05-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U05-L05-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U05-L05-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U05-L05"
      },
      {
        "kind": "number",
        "answer": 5,
        "id": "MATH-1P-U05-L05-practice-3",
        "promptKey": "questions.MATH-1P-U05-L05-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U05-L05-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U05-L05-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U05-L05"
      }
    ],
    "play": [
      {
        "kind": "build",
        "target": 10,
        "initial": 7,
        "fixed": 7,
        "token": "▰",
        "id": "MATH-1P-U05-L05-play",
        "promptKey": "questions.MATH-1P-U05-L05-play.prompt",
        "hintKey": "questions.MATH-1P-U05-L05-play.hint",
        "explanationKey": "questions.MATH-1P-U05-L05-play.explanation",
        "reviewLessonId": "MATH-1P-U05-L05"
      }
    ],
    "remember": [
      {
        "kind": "number",
        "answer": 5,
        "id": "MATH-1P-U05-L05-check",
        "promptKey": "questions.MATH-1P-U05-L05-check.prompt",
        "hintKey": "questions.MATH-1P-U05-L05-check.hint",
        "explanationKey": "questions.MATH-1P-U05-L05-check.explanation",
        "reviewLessonId": "MATH-1P-U05-L05"
      }
    ]
  },
  "MATH-1P-U06-L01": {
    "sourcePage": 36,
    "manipulate": [
      {
        "kind": "remove",
        "total": 5,
        "remove": 2,
        "token": "🍌",
        "id": "MATH-1P-U06-L01-manipulate",
        "promptKey": "questions.MATH-1P-U06-L01-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U06-L01-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U06-L01-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U06-L01"
      }
    ],
    "practice": [
      {
        "kind": "remove",
        "total": 4,
        "remove": 1,
        "token": "🥭",
        "id": "MATH-1P-U06-L01-practice-1",
        "promptKey": "questions.MATH-1P-U06-L01-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U06-L01-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U06-L01-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U06-L01"
      },
      {
        "kind": "remove",
        "total": 9,
        "remove": 3,
        "id": "MATH-1P-U06-L01-practice-2",
        "promptKey": "questions.MATH-1P-U06-L01-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U06-L01-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U06-L01-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U06-L01"
      },
      {
        "kind": "number",
        "answer": 7,
        "id": "MATH-1P-U06-L01-practice-3",
        "promptKey": "questions.MATH-1P-U06-L01-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U06-L01-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U06-L01-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U06-L01"
      }
    ],
    "play": [
      {
        "kind": "remove",
        "total": 9,
        "remove": 3,
        "token": "🥭",
        "id": "MATH-1P-U06-L01-play",
        "promptKey": "questions.MATH-1P-U06-L01-play.prompt",
        "hintKey": "questions.MATH-1P-U06-L01-play.hint",
        "explanationKey": "questions.MATH-1P-U06-L01-play.explanation",
        "reviewLessonId": "MATH-1P-U06-L01"
      }
    ],
    "remember": [
      {
        "kind": "number",
        "answer": 7,
        "id": "MATH-1P-U06-L01-check",
        "promptKey": "questions.MATH-1P-U06-L01-check.prompt",
        "hintKey": "questions.MATH-1P-U06-L01-check.hint",
        "explanationKey": "questions.MATH-1P-U06-L01-check.explanation",
        "reviewLessonId": "MATH-1P-U06-L01"
      }
    ]
  },
  "MATH-1P-U06-L02": {
    "sourcePage": 37,
    "manipulate": [
      {
        "kind": "remove",
        "total": 6,
        "remove": 2,
        "id": "MATH-1P-U06-L02-manipulate",
        "promptKey": "questions.MATH-1P-U06-L02-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U06-L02-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U06-L02-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U06-L02"
      }
    ],
    "practice": [
      {
        "kind": "remove",
        "total": 5,
        "remove": 1,
        "id": "MATH-1P-U06-L02-practice-1",
        "promptKey": "questions.MATH-1P-U06-L02-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U06-L02-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U06-L02-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U06-L02"
      },
      {
        "kind": "remove",
        "total": 8,
        "remove": 3,
        "id": "MATH-1P-U06-L02-practice-2",
        "promptKey": "questions.MATH-1P-U06-L02-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U06-L02-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U06-L02-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U06-L02"
      },
      {
        "kind": "number",
        "answer": 4,
        "id": "MATH-1P-U06-L02-practice-3",
        "promptKey": "questions.MATH-1P-U06-L02-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U06-L02-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U06-L02-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U06-L02"
      }
    ],
    "play": [
      {
        "kind": "remove",
        "total": 7,
        "remove": 2,
        "token": "🐟",
        "id": "MATH-1P-U06-L02-play",
        "promptKey": "questions.MATH-1P-U06-L02-play.prompt",
        "hintKey": "questions.MATH-1P-U06-L02-play.hint",
        "explanationKey": "questions.MATH-1P-U06-L02-play.explanation",
        "reviewLessonId": "MATH-1P-U06-L02"
      }
    ],
    "remember": [
      {
        "kind": "number",
        "answer": 4,
        "id": "MATH-1P-U06-L02-check",
        "promptKey": "questions.MATH-1P-U06-L02-check.prompt",
        "hintKey": "questions.MATH-1P-U06-L02-check.hint",
        "explanationKey": "questions.MATH-1P-U06-L02-check.explanation",
        "reviewLessonId": "MATH-1P-U06-L02"
      }
    ]
  },
  "MATH-1P-U06-L03": {
    "sourcePage": 38,
    "manipulate": [
      {
        "kind": "remove",
        "total": 8,
        "remove": 2,
        "id": "MATH-1P-U06-L03-manipulate",
        "promptKey": "questions.MATH-1P-U06-L03-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U06-L03-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U06-L03-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U06-L03"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 3,
        "visual": [
          5,
          2
        ],
        "symbol": "−",
        "id": "MATH-1P-U06-L03-practice-1",
        "promptKey": "questions.MATH-1P-U06-L03-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U06-L03-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U06-L03-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U06-L03"
      },
      {
        "kind": "number",
        "answer": 6,
        "visual": [
          10,
          4
        ],
        "symbol": "−",
        "id": "MATH-1P-U06-L03-practice-2",
        "promptKey": "questions.MATH-1P-U06-L03-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U06-L03-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U06-L03-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U06-L03"
      },
      {
        "kind": "number",
        "answer": 4,
        "id": "MATH-1P-U06-L03-practice-3",
        "promptKey": "questions.MATH-1P-U06-L03-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U06-L03-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U06-L03-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U06-L03"
      }
    ],
    "play": [
      {
        "kind": "remove",
        "total": 9,
        "remove": 4,
        "id": "MATH-1P-U06-L03-play",
        "promptKey": "questions.MATH-1P-U06-L03-play.prompt",
        "hintKey": "questions.MATH-1P-U06-L03-play.hint",
        "explanationKey": "questions.MATH-1P-U06-L03-play.explanation",
        "reviewLessonId": "MATH-1P-U06-L03"
      }
    ],
    "remember": [
      {
        "kind": "number",
        "answer": 4,
        "id": "MATH-1P-U06-L03-check",
        "promptKey": "questions.MATH-1P-U06-L03-check.prompt",
        "hintKey": "questions.MATH-1P-U06-L03-check.hint",
        "explanationKey": "questions.MATH-1P-U06-L03-check.explanation",
        "reviewLessonId": "MATH-1P-U06-L03"
      }
    ]
  },
  "MATH-1P-U06-L04": {
    "sourcePage": 39,
    "manipulate": [
      {
        "kind": "pair",
        "left": 7,
        "right": 4,
        "answer": "3",
        "id": "MATH-1P-U06-L04-manipulate",
        "promptKey": "questions.MATH-1P-U06-L04-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U06-L04-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U06-L04-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U06-L04"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 2,
        "visual": [
          5,
          3
        ],
        "symbol": "écart",
        "id": "MATH-1P-U06-L04-practice-1",
        "promptKey": "questions.MATH-1P-U06-L04-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U06-L04-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U06-L04-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U06-L04"
      },
      {
        "kind": "number",
        "answer": 3,
        "visual": [
          9,
          6
        ],
        "symbol": "écart",
        "id": "MATH-1P-U06-L04-practice-2",
        "promptKey": "questions.MATH-1P-U06-L04-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U06-L04-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U06-L04-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U06-L04"
      },
      {
        "kind": "number",
        "answer": 7,
        "id": "MATH-1P-U06-L04-practice-3",
        "promptKey": "questions.MATH-1P-U06-L04-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U06-L04-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U06-L04-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U06-L04"
      }
    ],
    "play": [
      {
        "kind": "pair",
        "left": 7,
        "right": 4,
        "answer": "3",
        "id": "MATH-1P-U06-L04-play",
        "promptKey": "questions.MATH-1P-U06-L04-play.prompt",
        "hintKey": "questions.MATH-1P-U06-L04-play.hint",
        "explanationKey": "questions.MATH-1P-U06-L04-play.explanation",
        "reviewLessonId": "MATH-1P-U06-L04"
      }
    ],
    "remember": [
      {
        "kind": "number",
        "answer": 7,
        "id": "MATH-1P-U06-L04-check",
        "promptKey": "questions.MATH-1P-U06-L04-check.prompt",
        "hintKey": "questions.MATH-1P-U06-L04-check.hint",
        "explanationKey": "questions.MATH-1P-U06-L04-check.explanation",
        "reviewLessonId": "MATH-1P-U06-L04"
      }
    ]
  },
  "MATH-1P-U06-L05": {
    "sourcePage": 40,
    "manipulate": [
      {
        "kind": "build",
        "target": 5,
        "initial": 3,
        "fixed": 3,
        "token": "👤",
        "id": "MATH-1P-U06-L05-manipulate",
        "promptKey": "questions.MATH-1P-U06-L05-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U06-L05-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U06-L05-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U06-L05"
      }
    ],
    "practice": [
      {
        "kind": "choice",
        "choices": [
          "6 + 2 = 8",
          "6 − 2 = 4",
          "6 = 2"
        ],
        "answers": [
          "6 − 2 = 4"
        ],
        "id": "MATH-1P-U06-L05-practice-1",
        "promptKey": "questions.MATH-1P-U06-L05-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U06-L05-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U06-L05-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U06-L05"
      },
      {
        "kind": "number",
        "answer": 7,
        "visual": [
          4,
          3
        ],
        "symbol": "+",
        "id": "MATH-1P-U06-L05-practice-2",
        "promptKey": "questions.MATH-1P-U06-L05-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U06-L05-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U06-L05-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U06-L05"
      },
      {
        "kind": "story",
        "total": 8,
        "remove": 3,
        "id": "MATH-1P-U06-L05-practice-3",
        "promptKey": "questions.MATH-1P-U06-L05-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U06-L05-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U06-L05-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U06-L05"
      }
    ],
    "play": [
      {
        "kind": "remove",
        "total": 6,
        "remove": 2,
        "token": "🥭",
        "id": "MATH-1P-U06-L05-play",
        "promptKey": "questions.MATH-1P-U06-L05-play.prompt",
        "hintKey": "questions.MATH-1P-U06-L05-play.hint",
        "explanationKey": "questions.MATH-1P-U06-L05-play.explanation",
        "reviewLessonId": "MATH-1P-U06-L05"
      }
    ],
    "remember": [
      {
        "kind": "story",
        "total": 8,
        "remove": 3,
        "id": "MATH-1P-U06-L05-check",
        "promptKey": "questions.MATH-1P-U06-L05-check.prompt",
        "hintKey": "questions.MATH-1P-U06-L05-check.hint",
        "explanationKey": "questions.MATH-1P-U06-L05-check.explanation",
        "reviewLessonId": "MATH-1P-U06-L05"
      }
    ]
  },
  "MATH-1P-U07-L01": {
    "sourcePage": 43,
    "manipulate": [
      {
        "kind": "tens",
        "target": 14,
        "id": "MATH-1P-U07-L01-manipulate",
        "promptKey": "questions.MATH-1P-U07-L01-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U07-L01-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U07-L01-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U07-L01"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 12,
        "visual": [
          10,
          2
        ],
        "symbol": "+",
        "id": "MATH-1P-U07-L01-practice-1",
        "promptKey": "questions.MATH-1P-U07-L01-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U07-L01-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U07-L01-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U07-L01"
      },
      {
        "kind": "number",
        "answer": 5,
        "id": "MATH-1P-U07-L01-practice-2",
        "promptKey": "questions.MATH-1P-U07-L01-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U07-L01-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U07-L01-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U07-L01"
      },
      {
        "kind": "number",
        "answer": 13,
        "id": "MATH-1P-U07-L01-practice-3",
        "promptKey": "questions.MATH-1P-U07-L01-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U07-L01-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U07-L01-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U07-L01"
      }
    ],
    "play": [
      {
        "kind": "tens",
        "target": 15,
        "id": "MATH-1P-U07-L01-play",
        "promptKey": "questions.MATH-1P-U07-L01-play.prompt",
        "hintKey": "questions.MATH-1P-U07-L01-play.hint",
        "explanationKey": "questions.MATH-1P-U07-L01-play.explanation",
        "reviewLessonId": "MATH-1P-U07-L01"
      }
    ],
    "remember": [
      {
        "kind": "number",
        "answer": 13,
        "id": "MATH-1P-U07-L01-check",
        "promptKey": "questions.MATH-1P-U07-L01-check.prompt",
        "hintKey": "questions.MATH-1P-U07-L01-check.hint",
        "explanationKey": "questions.MATH-1P-U07-L01-check.explanation",
        "reviewLessonId": "MATH-1P-U07-L01"
      }
    ]
  },
  "MATH-1P-U07-L02": {
    "sourcePage": 44,
    "manipulate": [
      {
        "kind": "tens",
        "target": 18,
        "id": "MATH-1P-U07-L02-manipulate",
        "promptKey": "questions.MATH-1P-U07-L02-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U07-L02-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U07-L02-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U07-L02"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 17,
        "visual": [
          10,
          7
        ],
        "symbol": "+",
        "id": "MATH-1P-U07-L02-practice-1",
        "promptKey": "questions.MATH-1P-U07-L02-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U07-L02-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U07-L02-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U07-L02"
      },
      {
        "kind": "order",
        "values": [
          "20",
          "18"
        ],
        "answer": [
          "18",
          "20"
        ],
        "id": "MATH-1P-U07-L02-practice-2",
        "promptKey": "questions.MATH-1P-U07-L02-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U07-L02-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U07-L02-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U07-L02"
      },
      {
        "kind": "number",
        "answer": 2,
        "id": "MATH-1P-U07-L02-practice-3",
        "promptKey": "questions.MATH-1P-U07-L02-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U07-L02-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U07-L02-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U07-L02"
      }
    ],
    "play": [
      {
        "kind": "build",
        "target": 20,
        "id": "MATH-1P-U07-L02-play",
        "promptKey": "questions.MATH-1P-U07-L02-play.prompt",
        "hintKey": "questions.MATH-1P-U07-L02-play.hint",
        "explanationKey": "questions.MATH-1P-U07-L02-play.explanation",
        "reviewLessonId": "MATH-1P-U07-L02"
      }
    ],
    "remember": [
      {
        "kind": "number",
        "answer": 2,
        "id": "MATH-1P-U07-L02-check",
        "promptKey": "questions.MATH-1P-U07-L02-check.prompt",
        "hintKey": "questions.MATH-1P-U07-L02-check.hint",
        "explanationKey": "questions.MATH-1P-U07-L02-check.explanation",
        "reviewLessonId": "MATH-1P-U07-L02"
      }
    ]
  },
  "MATH-1P-U07-L03": {
    "sourcePage": 45,
    "manipulate": [
      {
        "kind": "tens",
        "target": 16,
        "id": "MATH-1P-U07-L03-manipulate",
        "promptKey": "questions.MATH-1P-U07-L03-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U07-L03-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U07-L03-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U07-L03"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 4,
        "id": "MATH-1P-U07-L03-practice-1",
        "promptKey": "questions.MATH-1P-U07-L03-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U07-L03-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U07-L03-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U07-L03"
      },
      {
        "kind": "number",
        "answer": 19,
        "id": "MATH-1P-U07-L03-practice-2",
        "promptKey": "questions.MATH-1P-U07-L03-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U07-L03-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U07-L03-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U07-L03"
      },
      {
        "kind": "number",
        "answer": 20,
        "id": "MATH-1P-U07-L03-practice-3",
        "promptKey": "questions.MATH-1P-U07-L03-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U07-L03-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U07-L03-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U07-L03"
      }
    ],
    "play": [
      {
        "kind": "tens",
        "target": 10,
        "exchange": true,
        "id": "MATH-1P-U07-L03-play",
        "promptKey": "questions.MATH-1P-U07-L03-play.prompt",
        "hintKey": "questions.MATH-1P-U07-L03-play.hint",
        "explanationKey": "questions.MATH-1P-U07-L03-play.explanation",
        "reviewLessonId": "MATH-1P-U07-L03"
      }
    ],
    "remember": [
      {
        "kind": "number",
        "answer": 20,
        "id": "MATH-1P-U07-L03-check",
        "promptKey": "questions.MATH-1P-U07-L03-check.prompt",
        "hintKey": "questions.MATH-1P-U07-L03-check.hint",
        "explanationKey": "questions.MATH-1P-U07-L03-check.explanation",
        "reviewLessonId": "MATH-1P-U07-L03"
      }
    ]
  },
  "MATH-1P-U07-L04": {
    "sourcePage": 46,
    "manipulate": [
      {
        "kind": "split",
        "total": 10,
        "ways": 1,
        "equal": true,
        "id": "MATH-1P-U07-L04-manipulate",
        "promptKey": "questions.MATH-1P-U07-L04-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U07-L04-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U07-L04-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U07-L04"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 6,
        "visual": [
          3,
          3
        ],
        "symbol": "+",
        "id": "MATH-1P-U07-L04-practice-1",
        "promptKey": "questions.MATH-1P-U07-L04-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U07-L04-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U07-L04-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U07-L04"
      },
      {
        "kind": "split",
        "total": 12,
        "ways": 1,
        "equal": true,
        "id": "MATH-1P-U07-L04-practice-2",
        "promptKey": "questions.MATH-1P-U07-L04-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U07-L04-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U07-L04-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U07-L04"
      },
      {
        "kind": "split",
        "total": 14,
        "ways": 1,
        "equal": true,
        "id": "MATH-1P-U07-L04-practice-3",
        "promptKey": "questions.MATH-1P-U07-L04-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U07-L04-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U07-L04-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U07-L04"
      }
    ],
    "play": [
      {
        "kind": "split",
        "total": 10,
        "ways": 1,
        "equal": true,
        "id": "MATH-1P-U07-L04-play",
        "promptKey": "questions.MATH-1P-U07-L04-play.prompt",
        "hintKey": "questions.MATH-1P-U07-L04-play.hint",
        "explanationKey": "questions.MATH-1P-U07-L04-play.explanation",
        "reviewLessonId": "MATH-1P-U07-L04"
      }
    ],
    "remember": [
      {
        "kind": "split",
        "total": 14,
        "ways": 1,
        "equal": true,
        "id": "MATH-1P-U07-L04-check",
        "promptKey": "questions.MATH-1P-U07-L04-check.prompt",
        "hintKey": "questions.MATH-1P-U07-L04-check.hint",
        "explanationKey": "questions.MATH-1P-U07-L04-check.explanation",
        "reviewLessonId": "MATH-1P-U07-L04"
      }
    ]
  },
  "MATH-1P-U08-L01": {
    "sourcePage": 49,
    "manipulate": [
      {
        "kind": "align",
        "id": "MATH-1P-U08-L01-manipulate",
        "promptKey": "questions.MATH-1P-U08-L01-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U08-L01-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U08-L01-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U08-L01"
      }
    ],
    "practice": [
      {
        "kind": "choice",
        "choices": [
          "5 cases",
          "3 cases"
        ],
        "answers": [
          "5 cases"
        ],
        "id": "MATH-1P-U08-L01-practice-1",
        "promptKey": "questions.MATH-1P-U08-L01-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U08-L01-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U08-L01-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U08-L01"
      },
      {
        "kind": "order",
        "values": [
          "2",
          "6",
          "4"
        ],
        "answer": [
          "2",
          "4",
          "6"
        ],
        "lengths": [
          2,
          6,
          4
        ],
        "id": "MATH-1P-U08-L01-practice-2",
        "promptKey": "questions.MATH-1P-U08-L01-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U08-L01-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U08-L01-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U08-L01"
      },
      {
        "kind": "choice",
        "choices": [
          "Pour comparer les extrémités",
          "Pour changer la longueur"
        ],
        "answers": [
          "Pour comparer les extrémités"
        ],
        "id": "MATH-1P-U08-L01-practice-3",
        "promptKey": "questions.MATH-1P-U08-L01-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U08-L01-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U08-L01-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U08-L01"
      }
    ],
    "play": [
      {
        "kind": "align",
        "id": "MATH-1P-U08-L01-play",
        "promptKey": "questions.MATH-1P-U08-L01-play.prompt",
        "hintKey": "questions.MATH-1P-U08-L01-play.hint",
        "explanationKey": "questions.MATH-1P-U08-L01-play.explanation",
        "reviewLessonId": "MATH-1P-U08-L01"
      }
    ],
    "remember": [
      {
        "kind": "choice",
        "choices": [
          "Pour comparer les extrémités",
          "Pour changer la longueur"
        ],
        "answers": [
          "Pour comparer les extrémités"
        ],
        "id": "MATH-1P-U08-L01-check",
        "promptKey": "questions.MATH-1P-U08-L01-check.prompt",
        "hintKey": "questions.MATH-1P-U08-L01-check.hint",
        "explanationKey": "questions.MATH-1P-U08-L01-check.explanation",
        "reviewLessonId": "MATH-1P-U08-L01"
      }
    ]
  },
  "MATH-1P-U08-L02": {
    "sourcePage": 50,
    "manipulate": [
      {
        "kind": "measure",
        "units": 4,
        "id": "MATH-1P-U08-L02-manipulate",
        "promptKey": "questions.MATH-1P-U08-L02-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U08-L02-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U08-L02-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U08-L02"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 4,
        "visual": [
          4
        ],
        "symbol": "+",
        "id": "MATH-1P-U08-L02-practice-1",
        "promptKey": "questions.MATH-1P-U08-L02-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U08-L02-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U08-L02-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U08-L02"
      },
      {
        "kind": "choice",
        "choices": [
          "Oui",
          "Non"
        ],
        "answers": [
          "Non"
        ],
        "id": "MATH-1P-U08-L02-practice-2",
        "promptKey": "questions.MATH-1P-U08-L02-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U08-L02-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U08-L02-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U08-L02"
      },
      {
        "kind": "choice",
        "choices": [
          "Oui",
          "Non"
        ],
        "answers": [
          "Non"
        ],
        "id": "MATH-1P-U08-L02-practice-3",
        "promptKey": "questions.MATH-1P-U08-L02-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U08-L02-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U08-L02-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U08-L02"
      }
    ],
    "play": [
      {
        "kind": "measure",
        "units": 5,
        "id": "MATH-1P-U08-L02-play",
        "promptKey": "questions.MATH-1P-U08-L02-play.prompt",
        "hintKey": "questions.MATH-1P-U08-L02-play.hint",
        "explanationKey": "questions.MATH-1P-U08-L02-play.explanation",
        "reviewLessonId": "MATH-1P-U08-L02"
      }
    ],
    "remember": [
      {
        "kind": "choice",
        "choices": [
          "Oui",
          "Non"
        ],
        "answers": [
          "Non"
        ],
        "id": "MATH-1P-U08-L02-check",
        "promptKey": "questions.MATH-1P-U08-L02-check.prompt",
        "hintKey": "questions.MATH-1P-U08-L02-check.hint",
        "explanationKey": "questions.MATH-1P-U08-L02-check.explanation",
        "reviewLessonId": "MATH-1P-U08-L02"
      }
    ]
  },
  "MATH-1P-U08-L03": {
    "sourcePage": 51,
    "manipulate": [
      {
        "kind": "balance",
        "id": "MATH-1P-U08-L03-manipulate",
        "promptKey": "questions.MATH-1P-U08-L03-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U08-L03-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U08-L03-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U08-L03"
      }
    ],
    "practice": [
      {
        "kind": "choice",
        "choices": [
          "La pierre",
          "La feuille"
        ],
        "answers": [
          "La pierre"
        ],
        "id": "MATH-1P-U08-L03-practice-1",
        "promptKey": "questions.MATH-1P-U08-L03-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U08-L03-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U08-L03-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U08-L03"
      },
      {
        "kind": "choice",
        "choices": [
          "Oui",
          "Non"
        ],
        "answers": [
          "Oui"
        ],
        "id": "MATH-1P-U08-L03-practice-2",
        "promptKey": "questions.MATH-1P-U08-L03-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U08-L03-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U08-L03-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U08-L03"
      },
      {
        "kind": "choice",
        "choices": [
          "Les matières ont des masses différentes",
          "Le plus gros est toujours le plus lourd"
        ],
        "answers": [
          "Les matières ont des masses différentes"
        ],
        "id": "MATH-1P-U08-L03-practice-3",
        "promptKey": "questions.MATH-1P-U08-L03-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U08-L03-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U08-L03-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U08-L03"
      }
    ],
    "play": [
      {
        "kind": "balance",
        "id": "MATH-1P-U08-L03-play",
        "promptKey": "questions.MATH-1P-U08-L03-play.prompt",
        "hintKey": "questions.MATH-1P-U08-L03-play.hint",
        "explanationKey": "questions.MATH-1P-U08-L03-play.explanation",
        "reviewLessonId": "MATH-1P-U08-L03"
      }
    ],
    "remember": [
      {
        "kind": "choice",
        "choices": [
          "Les matières ont des masses différentes",
          "Le plus gros est toujours le plus lourd"
        ],
        "answers": [
          "Les matières ont des masses différentes"
        ],
        "id": "MATH-1P-U08-L03-check",
        "promptKey": "questions.MATH-1P-U08-L03-check.prompt",
        "hintKey": "questions.MATH-1P-U08-L03-check.hint",
        "explanationKey": "questions.MATH-1P-U08-L03-check.explanation",
        "reviewLessonId": "MATH-1P-U08-L03"
      }
    ]
  },
  "MATH-1P-U08-L04": {
    "sourcePage": 52,
    "manipulate": [
      {
        "kind": "capacity",
        "targets": [
          4,
          6
        ],
        "id": "MATH-1P-U08-L04-manipulate",
        "promptKey": "questions.MATH-1P-U08-L04-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U08-L04-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U08-L04-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U08-L04"
      }
    ],
    "practice": [
      {
        "kind": "choice",
        "choices": [
          "Oui",
          "Non"
        ],
        "answers": [
          "Oui"
        ],
        "id": "MATH-1P-U08-L04-practice-1",
        "promptKey": "questions.MATH-1P-U08-L04-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U08-L04-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U08-L04-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U08-L04"
      },
      {
        "kind": "choice",
        "choices": [
          "Le bol de 4 tasses",
          "Le bol de 6 tasses"
        ],
        "answers": [
          "Le bol de 6 tasses"
        ],
        "id": "MATH-1P-U08-L04-practice-2",
        "promptKey": "questions.MATH-1P-U08-L04-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U08-L04-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U08-L04-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U08-L04"
      },
      {
        "kind": "choice",
        "choices": [
          "Pour garder la même unité",
          "Pour changer la mesure"
        ],
        "answers": [
          "Pour garder la même unité"
        ],
        "id": "MATH-1P-U08-L04-practice-3",
        "promptKey": "questions.MATH-1P-U08-L04-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U08-L04-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U08-L04-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U08-L04"
      }
    ],
    "play": [
      {
        "kind": "capacity",
        "targets": [
          4,
          6
        ],
        "id": "MATH-1P-U08-L04-play",
        "promptKey": "questions.MATH-1P-U08-L04-play.prompt",
        "hintKey": "questions.MATH-1P-U08-L04-play.hint",
        "explanationKey": "questions.MATH-1P-U08-L04-play.explanation",
        "reviewLessonId": "MATH-1P-U08-L04"
      }
    ],
    "remember": [
      {
        "kind": "choice",
        "choices": [
          "Pour garder la même unité",
          "Pour changer la mesure"
        ],
        "answers": [
          "Pour garder la même unité"
        ],
        "id": "MATH-1P-U08-L04-check",
        "promptKey": "questions.MATH-1P-U08-L04-check.prompt",
        "hintKey": "questions.MATH-1P-U08-L04-check.hint",
        "explanationKey": "questions.MATH-1P-U08-L04-check.explanation",
        "reviewLessonId": "MATH-1P-U08-L04"
      }
    ]
  },
  "MATH-1P-U09-L01": {
    "sourcePage": 55,
    "manipulate": [
      {
        "kind": "trace",
        "id": "MATH-1P-U09-L01-manipulate",
        "promptKey": "questions.MATH-1P-U09-L01-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U09-L01-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U09-L01-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U09-L01"
      }
    ],
    "practice": [
      {
        "kind": "choice",
        "choices": [
          "Droit",
          "Courbe"
        ],
        "answers": [
          "Droit"
        ],
        "id": "MATH-1P-U09-L01-practice-1",
        "promptKey": "questions.MATH-1P-U09-L01-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U09-L01-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U09-L01-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U09-L01"
      },
      {
        "kind": "choice",
        "choices": [
          "Ouverte",
          "Fermée"
        ],
        "answers": [
          "Fermée"
        ],
        "id": "MATH-1P-U09-L01-practice-2",
        "promptKey": "questions.MATH-1P-U09-L01-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U09-L01-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U09-L01-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U09-L01"
      },
      {
        "kind": "trace",
        "id": "MATH-1P-U09-L01-practice-3",
        "promptKey": "questions.MATH-1P-U09-L01-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U09-L01-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U09-L01-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U09-L01"
      }
    ],
    "play": [
      {
        "kind": "choice",
        "choices": [
          "Ligne droite ─",
          "Courbe ouverte ∿",
          "Courbe fermée ○"
        ],
        "answers": [
          "Courbe ouverte ∿"
        ],
        "id": "MATH-1P-U09-L01-play",
        "promptKey": "questions.MATH-1P-U09-L01-play.prompt",
        "hintKey": "questions.MATH-1P-U09-L01-play.hint",
        "explanationKey": "questions.MATH-1P-U09-L01-play.explanation",
        "reviewLessonId": "MATH-1P-U09-L01"
      }
    ],
    "remember": [
      {
        "kind": "trace",
        "id": "MATH-1P-U09-L01-check",
        "promptKey": "questions.MATH-1P-U09-L01-check.prompt",
        "hintKey": "questions.MATH-1P-U09-L01-check.hint",
        "explanationKey": "questions.MATH-1P-U09-L01-check.explanation",
        "reviewLessonId": "MATH-1P-U09-L01"
      }
    ]
  },
  "MATH-1P-U09-L02": {
    "sourcePage": 56,
    "manipulate": [
      {
        "kind": "select",
        "cards": [
          {
            "label": "Triangle",
            "shape": "triangle",
            "color": "#18775c",
            "size": 48
          },
          {
            "label": "Carré",
            "shape": "square",
            "color": "#18775c",
            "size": 48
          },
          {
            "label": "Cercle",
            "shape": "circle",
            "color": "#18775c",
            "size": 48
          },
          {
            "label": "Rectangle",
            "shape": "rectangle",
            "color": "#18775c",
            "size": 48
          }
        ],
        "answers": [
          0
        ],
        "id": "MATH-1P-U09-L02-manipulate",
        "promptKey": "questions.MATH-1P-U09-L02-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U09-L02-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U09-L02-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U09-L02"
      }
    ],
    "practice": [
      {
        "kind": "choice",
        "choices": [
          "Triangle △",
          "Carré □",
          "Cercle ○"
        ],
        "answers": [
          "Triangle △"
        ],
        "id": "MATH-1P-U09-L02-practice-1",
        "promptKey": "questions.MATH-1P-U09-L02-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U09-L02-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U09-L02-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U09-L02"
      },
      {
        "kind": "choice",
        "choices": [
          "Carré □",
          "Cercle ○"
        ],
        "answers": [
          "Carré □"
        ],
        "id": "MATH-1P-U09-L02-practice-2",
        "promptKey": "questions.MATH-1P-U09-L02-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U09-L02-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U09-L02-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U09-L02"
      },
      {
        "kind": "choice",
        "choices": [
          "Oui",
          "Non"
        ],
        "answers": [
          "Oui"
        ],
        "id": "MATH-1P-U09-L02-practice-3",
        "promptKey": "questions.MATH-1P-U09-L02-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U09-L02-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U09-L02-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U09-L02"
      }
    ],
    "play": [
      {
        "kind": "house",
        "id": "MATH-1P-U09-L02-play",
        "promptKey": "questions.MATH-1P-U09-L02-play.prompt",
        "hintKey": "questions.MATH-1P-U09-L02-play.hint",
        "explanationKey": "questions.MATH-1P-U09-L02-play.explanation",
        "reviewLessonId": "MATH-1P-U09-L02"
      }
    ],
    "remember": [
      {
        "kind": "choice",
        "choices": [
          "Oui",
          "Non"
        ],
        "answers": [
          "Oui"
        ],
        "id": "MATH-1P-U09-L02-check",
        "promptKey": "questions.MATH-1P-U09-L02-check.prompt",
        "hintKey": "questions.MATH-1P-U09-L02-check.hint",
        "explanationKey": "questions.MATH-1P-U09-L02-check.explanation",
        "reviewLessonId": "MATH-1P-U09-L02"
      }
    ]
  },
  "MATH-1P-U09-L03": {
    "sourcePage": 57,
    "manipulate": [
      {
        "kind": "position",
        "answer": "gauche",
        "id": "MATH-1P-U09-L03-manipulate",
        "promptKey": "questions.MATH-1P-U09-L03-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U09-L03-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U09-L03-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U09-L03"
      }
    ],
    "practice": [
      {
        "kind": "choice",
        "choices": [
          "En haut",
          "En bas"
        ],
        "answers": [
          "En haut"
        ],
        "id": "MATH-1P-U09-L03-practice-1",
        "promptKey": "questions.MATH-1P-U09-L03-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U09-L03-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U09-L03-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U09-L03"
      },
      {
        "kind": "position",
        "answer": "droite",
        "id": "MATH-1P-U09-L03-practice-2",
        "promptKey": "questions.MATH-1P-U09-L03-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U09-L03-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U09-L03-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U09-L03"
      },
      {
        "kind": "choice",
        "choices": [
          "Oui",
          "Non"
        ],
        "answers": [
          "Non"
        ],
        "id": "MATH-1P-U09-L03-practice-3",
        "promptKey": "questions.MATH-1P-U09-L03-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U09-L03-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U09-L03-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U09-L03"
      }
    ],
    "play": [
      {
        "kind": "path",
        "target": [
          3,
          1
        ],
        "start": [
          1,
          2
        ],
        "id": "MATH-1P-U09-L03-play",
        "promptKey": "questions.MATH-1P-U09-L03-play.prompt",
        "hintKey": "questions.MATH-1P-U09-L03-play.hint",
        "explanationKey": "questions.MATH-1P-U09-L03-play.explanation",
        "reviewLessonId": "MATH-1P-U09-L03"
      }
    ],
    "remember": [
      {
        "kind": "choice",
        "choices": [
          "Oui",
          "Non"
        ],
        "answers": [
          "Non"
        ],
        "id": "MATH-1P-U09-L03-check",
        "promptKey": "questions.MATH-1P-U09-L03-check.prompt",
        "hintKey": "questions.MATH-1P-U09-L03-check.hint",
        "explanationKey": "questions.MATH-1P-U09-L03-check.explanation",
        "reviewLessonId": "MATH-1P-U09-L03"
      }
    ]
  },
  "MATH-1P-U09-L04": {
    "sourcePage": 58,
    "manipulate": [
      {
        "kind": "path",
        "target": [
          2,
          1
        ],
        "start": [
          0,
          2
        ],
        "id": "MATH-1P-U09-L04-manipulate",
        "promptKey": "questions.MATH-1P-U09-L04-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U09-L04-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U09-L04-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U09-L04"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 3,
        "id": "MATH-1P-U09-L04-practice-1",
        "promptKey": "questions.MATH-1P-U09-L04-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U09-L04-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U09-L04-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U09-L04"
      },
      {
        "kind": "number",
        "answer": 4,
        "id": "MATH-1P-U09-L04-practice-2",
        "promptKey": "questions.MATH-1P-U09-L04-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U09-L04-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U09-L04-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U09-L04"
      },
      {
        "kind": "choice",
        "choices": [
          "Oui",
          "Non"
        ],
        "answers": [
          "Oui"
        ],
        "id": "MATH-1P-U09-L04-practice-3",
        "promptKey": "questions.MATH-1P-U09-L04-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U09-L04-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U09-L04-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U09-L04"
      }
    ],
    "play": [
      {
        "kind": "path",
        "target": [
          4,
          0
        ],
        "start": [
          0,
          2
        ],
        "walls": [
          "1:1",
          "2:1",
          "3:1"
        ],
        "id": "MATH-1P-U09-L04-play",
        "promptKey": "questions.MATH-1P-U09-L04-play.prompt",
        "hintKey": "questions.MATH-1P-U09-L04-play.hint",
        "explanationKey": "questions.MATH-1P-U09-L04-play.explanation",
        "reviewLessonId": "MATH-1P-U09-L04"
      }
    ],
    "remember": [
      {
        "kind": "choice",
        "choices": [
          "Oui",
          "Non"
        ],
        "answers": [
          "Oui"
        ],
        "id": "MATH-1P-U09-L04-check",
        "promptKey": "questions.MATH-1P-U09-L04-check.prompt",
        "hintKey": "questions.MATH-1P-U09-L04-check.hint",
        "explanationKey": "questions.MATH-1P-U09-L04-check.explanation",
        "reviewLessonId": "MATH-1P-U09-L04"
      }
    ]
  },
  "MATH-1P-U10-L01": {
    "sourcePage": 61,
    "manipulate": [
      {
        "kind": "order",
        "values": [
          "soir",
          "matin",
          "après-midi"
        ],
        "answer": [
          "matin",
          "après-midi",
          "soir"
        ],
        "id": "MATH-1P-U10-L01-manipulate",
        "promptKey": "questions.MATH-1P-U10-L01-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U10-L01-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U10-L01-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U10-L01"
      }
    ],
    "practice": [
      {
        "kind": "choice",
        "choices": [
          "Lundi",
          "Mercredi",
          "Dimanche"
        ],
        "answers": [
          "Mercredi"
        ],
        "id": "MATH-1P-U10-L01-practice-1",
        "promptKey": "questions.MATH-1P-U10-L01-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U10-L01-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U10-L01-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U10-L01"
      },
      {
        "kind": "order",
        "values": [
          "soir",
          "matin",
          "après-midi"
        ],
        "answer": [
          "matin",
          "après-midi",
          "soir"
        ],
        "id": "MATH-1P-U10-L01-practice-2",
        "promptKey": "questions.MATH-1P-U10-L01-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U10-L01-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U10-L01-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U10-L01"
      },
      {
        "kind": "choice",
        "choices": [
          "Jeudi",
          "Samedi",
          "Dimanche"
        ],
        "answers": [
          "Samedi"
        ],
        "id": "MATH-1P-U10-L01-practice-3",
        "promptKey": "questions.MATH-1P-U10-L01-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U10-L01-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U10-L01-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U10-L01"
      }
    ],
    "play": [
      {
        "kind": "order",
        "values": [
          "🌙 nuit",
          "☀ matin",
          "🌅 soir"
        ],
        "answer": [
          "☀ matin",
          "🌅 soir",
          "🌙 nuit"
        ],
        "id": "MATH-1P-U10-L01-play",
        "promptKey": "questions.MATH-1P-U10-L01-play.prompt",
        "hintKey": "questions.MATH-1P-U10-L01-play.hint",
        "explanationKey": "questions.MATH-1P-U10-L01-play.explanation",
        "reviewLessonId": "MATH-1P-U10-L01"
      }
    ],
    "remember": [
      {
        "kind": "choice",
        "choices": [
          "Jeudi",
          "Samedi",
          "Dimanche"
        ],
        "answers": [
          "Samedi"
        ],
        "id": "MATH-1P-U10-L01-check",
        "promptKey": "questions.MATH-1P-U10-L01-check.prompt",
        "hintKey": "questions.MATH-1P-U10-L01-check.hint",
        "explanationKey": "questions.MATH-1P-U10-L01-check.explanation",
        "reviewLessonId": "MATH-1P-U10-L01"
      }
    ]
  },
  "MATH-1P-U10-L02": {
    "sourcePage": 62,
    "manipulate": [
      {
        "kind": "remove",
        "total": 8,
        "remove": 3,
        "token": "🍅",
        "id": "MATH-1P-U10-L02-manipulate",
        "promptKey": "questions.MATH-1P-U10-L02-manipulate.prompt",
        "hintKey": "questions.MATH-1P-U10-L02-manipulate.hint",
        "explanationKey": "questions.MATH-1P-U10-L02-manipulate.explanation",
        "reviewLessonId": "MATH-1P-U10-L02"
      }
    ],
    "practice": [
      {
        "kind": "number",
        "answer": 6,
        "visual": [
          4,
          2
        ],
        "symbol": "+",
        "id": "MATH-1P-U10-L02-practice-1",
        "promptKey": "questions.MATH-1P-U10-L02-practice-1.prompt",
        "hintKey": "questions.MATH-1P-U10-L02-practice-1.hint",
        "explanationKey": "questions.MATH-1P-U10-L02-practice-1.explanation",
        "reviewLessonId": "MATH-1P-U10-L02"
      },
      {
        "kind": "split",
        "total": 12,
        "ways": 1,
        "equal": true,
        "id": "MATH-1P-U10-L02-practice-2",
        "promptKey": "questions.MATH-1P-U10-L02-practice-2.prompt",
        "hintKey": "questions.MATH-1P-U10-L02-practice-2.hint",
        "explanationKey": "questions.MATH-1P-U10-L02-practice-2.explanation",
        "reviewLessonId": "MATH-1P-U10-L02"
      },
      {
        "kind": "number",
        "answer": 5,
        "id": "MATH-1P-U10-L02-practice-3",
        "promptKey": "questions.MATH-1P-U10-L02-practice-3.prompt",
        "hintKey": "questions.MATH-1P-U10-L02-practice-3.hint",
        "explanationKey": "questions.MATH-1P-U10-L02-practice-3.explanation",
        "reviewLessonId": "MATH-1P-U10-L02"
      }
    ],
    "play": [
      {
        "kind": "remove",
        "total": 8,
        "remove": 3,
        "token": "🍅",
        "id": "MATH-1P-U10-L02-play",
        "promptKey": "questions.MATH-1P-U10-L02-play.prompt",
        "hintKey": "questions.MATH-1P-U10-L02-play.hint",
        "explanationKey": "questions.MATH-1P-U10-L02-play.explanation",
        "reviewLessonId": "MATH-1P-U10-L02"
      }
    ],
    "remember": [
      {
        "kind": "number",
        "answer": 5,
        "id": "MATH-1P-U10-L02-check",
        "promptKey": "questions.MATH-1P-U10-L02-check.prompt",
        "hintKey": "questions.MATH-1P-U10-L02-check.hint",
        "explanationKey": "questions.MATH-1P-U10-L02-check.explanation",
        "reviewLessonId": "MATH-1P-U10-L02"
      }
    ]
  }
};

export const EVALUATIONS: Record<string, readonly Question[]> = {
  "MATH-1P-U01-EVAL": [
    {
      "kind": "choice",
      "choices": [
        "Même couleur, tailles différentes",
        "Même taille, couleurs différentes",
        "Tout est différent"
      ],
      "answers": [
        "Même couleur, tailles différentes"
      ],
      "cards": [
        {
          "label": "Petite mangue verte",
          "shape": "circle",
          "color": "#18775c",
          "size": 30
        },
        {
          "label": "Grande mangue verte",
          "shape": "circle",
          "color": "#18775c",
          "size": 64
        }
      ],
      "id": "MATH-1P-U01-EVAL-Q1",
      "promptKey": "questions.MATH-1P-U01-L01-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U01-L01-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U01-L01-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U01-L01"
    },
    {
      "kind": "select",
      "cards": [
        {
          "label": "Cercle rouge",
          "shape": "circle",
          "color": "#b83930",
          "size": 48
        },
        {
          "label": "Carré bleu",
          "shape": "square",
          "color": "#205b9a",
          "size": 48
        },
        {
          "label": "Cercle bleu",
          "shape": "circle",
          "color": "#205b9a",
          "size": 48
        }
      ],
      "answers": [
        1,
        2
      ],
      "id": "MATH-1P-U01-EVAL-Q2",
      "promptKey": "questions.MATH-1P-U01-L02-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U01-L02-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U01-L02-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U01-L02"
    },
    {
      "kind": "order",
      "values": [
        "2",
        "5",
        "3"
      ],
      "answer": [
        "2",
        "3",
        "5"
      ],
      "lengths": [
        2,
        5,
        3
      ],
      "id": "MATH-1P-U01-EVAL-Q3",
      "promptKey": "questions.MATH-1P-U01-L03-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U01-L03-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U01-L03-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U01-L03"
    },
    {
      "kind": "choice",
      "choices": [
        "petit",
        "grand"
      ],
      "answers": [
        "petit"
      ],
      "id": "MATH-1P-U01-EVAL-Q4",
      "promptKey": "questions.MATH-1P-U01-L04-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U01-L04-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U01-L04-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U01-L04"
    }
  ],
  "MATH-1P-U02-EVAL": [
    {
      "kind": "build",
      "target": 3,
      "token": "🐟",
      "id": "MATH-1P-U02-EVAL-Q1",
      "promptKey": "questions.MATH-1P-U02-L01-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U02-L01-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U02-L01-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U02-L01"
    },
    {
      "kind": "remove",
      "total": 5,
      "remove": 1,
      "token": "🥭",
      "id": "MATH-1P-U02-EVAL-Q2",
      "promptKey": "questions.MATH-1P-U02-L02-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U02-L02-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U02-L02-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U02-L02"
    },
    {
      "kind": "number",
      "answer": 3,
      "id": "MATH-1P-U02-EVAL-Q3",
      "promptKey": "questions.MATH-1P-U02-L03-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U02-L03-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U02-L03-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U02-L03"
    },
    {
      "kind": "order",
      "values": [
        "3",
        "0",
        "5",
        "1",
        "4",
        "2"
      ],
      "answer": [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5"
      ],
      "id": "MATH-1P-U02-EVAL-Q4",
      "promptKey": "questions.MATH-1P-U02-L04-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U02-L04-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U02-L04-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U02-L04"
    }
  ],
  "MATH-1P-U03-EVAL": [
    {
      "kind": "number",
      "answer": 2,
      "visual": [
        5,
        2
      ],
      "symbol": "+",
      "id": "MATH-1P-U03-EVAL-Q1",
      "promptKey": "questions.MATH-1P-U03-L01-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U03-L01-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U03-L01-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U03-L01"
    },
    {
      "kind": "number",
      "answer": 8,
      "visual": [
        5,
        3
      ],
      "symbol": "+",
      "id": "MATH-1P-U03-EVAL-Q2",
      "promptKey": "questions.MATH-1P-U03-L02-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U03-L02-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U03-L02-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U03-L02"
    },
    {
      "kind": "number",
      "answer": 8,
      "id": "MATH-1P-U03-EVAL-Q3",
      "promptKey": "questions.MATH-1P-U03-L03-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U03-L03-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U03-L03-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U03-L03"
    },
    {
      "kind": "split",
      "total": 9,
      "ways": 2,
      "id": "MATH-1P-U03-EVAL-Q4",
      "promptKey": "questions.MATH-1P-U03-L04-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U03-L04-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U03-L04-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U03-L04"
    }
  ],
  "MATH-1P-U04-EVAL": [
    {
      "kind": "choice",
      "choices": [
        "Plus de craies",
        "Plus d’élèves",
        "Autant"
      ],
      "answers": [
        "Plus de craies"
      ],
      "id": "MATH-1P-U04-EVAL-Q1",
      "promptKey": "questions.MATH-1P-U04-L01-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U04-L01-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U04-L01-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U04-L01"
    },
    {
      "kind": "choice",
      "choices": [
        "<",
        "=",
        ">"
      ],
      "answers": [
        "="
      ],
      "id": "MATH-1P-U04-EVAL-Q2",
      "promptKey": "questions.MATH-1P-U04-L02-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U04-L02-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U04-L02-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U04-L02"
    },
    {
      "kind": "choice",
      "choices": [
        "<",
        "=",
        ">"
      ],
      "answers": [
        "<"
      ],
      "id": "MATH-1P-U04-EVAL-Q3",
      "promptKey": "questions.MATH-1P-U04-L03-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U04-L03-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U04-L03-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U04-L03"
    },
    {
      "kind": "order",
      "values": [
        "8",
        "5",
        "10",
        "6"
      ],
      "answer": [
        "5",
        "6",
        "8",
        "10"
      ],
      "id": "MATH-1P-U04-EVAL-Q4",
      "promptKey": "questions.MATH-1P-U04-L04-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U04-L04-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U04-L04-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U04-L04"
    }
  ],
  "MATH-1P-U05-EVAL": [
    {
      "kind": "number",
      "answer": 7,
      "visual": [
        4,
        3
      ],
      "symbol": "+",
      "id": "MATH-1P-U05-EVAL-Q1",
      "promptKey": "questions.MATH-1P-U05-L01-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U05-L01-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U05-L01-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U05-L01"
    },
    {
      "kind": "number",
      "answer": 8,
      "visual": [
        5,
        3
      ],
      "symbol": "+",
      "id": "MATH-1P-U05-EVAL-Q2",
      "promptKey": "questions.MATH-1P-U05-L02-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U05-L02-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U05-L02-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U05-L02"
    },
    {
      "kind": "number",
      "answer": 9,
      "visual": [
        5,
        4
      ],
      "symbol": "+",
      "id": "MATH-1P-U05-EVAL-Q3",
      "promptKey": "questions.MATH-1P-U05-L03-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U05-L03-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U05-L03-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U05-L03"
    },
    {
      "kind": "split",
      "total": 7,
      "ways": 3,
      "id": "MATH-1P-U05-EVAL-Q4",
      "promptKey": "questions.MATH-1P-U05-L04-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U05-L04-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U05-L04-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U05-L04"
    },
    {
      "kind": "number",
      "answer": 3,
      "id": "MATH-1P-U05-EVAL-Q5",
      "promptKey": "questions.MATH-1P-U05-L05-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U05-L05-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U05-L05-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U05-L05"
    }
  ],
  "MATH-1P-U06-EVAL": [
    {
      "kind": "remove",
      "total": 9,
      "remove": 3,
      "id": "MATH-1P-U06-EVAL-Q1",
      "promptKey": "questions.MATH-1P-U06-L01-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U06-L01-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U06-L01-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U06-L01"
    },
    {
      "kind": "remove",
      "total": 8,
      "remove": 3,
      "id": "MATH-1P-U06-EVAL-Q2",
      "promptKey": "questions.MATH-1P-U06-L02-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U06-L02-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U06-L02-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U06-L02"
    },
    {
      "kind": "number",
      "answer": 6,
      "visual": [
        10,
        4
      ],
      "symbol": "−",
      "id": "MATH-1P-U06-EVAL-Q3",
      "promptKey": "questions.MATH-1P-U06-L03-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U06-L03-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U06-L03-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U06-L03"
    },
    {
      "kind": "number",
      "answer": 3,
      "visual": [
        9,
        6
      ],
      "symbol": "écart",
      "id": "MATH-1P-U06-EVAL-Q4",
      "promptKey": "questions.MATH-1P-U06-L04-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U06-L04-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U06-L04-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U06-L04"
    },
    {
      "kind": "number",
      "answer": 7,
      "visual": [
        4,
        3
      ],
      "symbol": "+",
      "id": "MATH-1P-U06-EVAL-Q5",
      "promptKey": "questions.MATH-1P-U06-L05-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U06-L05-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U06-L05-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U06-L05"
    }
  ],
  "MATH-1P-U07-EVAL": [
    {
      "kind": "number",
      "answer": 5,
      "id": "MATH-1P-U07-EVAL-Q1",
      "promptKey": "questions.MATH-1P-U07-L01-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U07-L01-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U07-L01-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U07-L01"
    },
    {
      "kind": "order",
      "values": [
        "20",
        "18"
      ],
      "answer": [
        "18",
        "20"
      ],
      "id": "MATH-1P-U07-EVAL-Q2",
      "promptKey": "questions.MATH-1P-U07-L02-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U07-L02-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U07-L02-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U07-L02"
    },
    {
      "kind": "number",
      "answer": 19,
      "id": "MATH-1P-U07-EVAL-Q3",
      "promptKey": "questions.MATH-1P-U07-L03-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U07-L03-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U07-L03-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U07-L03"
    },
    {
      "kind": "split",
      "total": 12,
      "ways": 1,
      "equal": true,
      "id": "MATH-1P-U07-EVAL-Q4",
      "promptKey": "questions.MATH-1P-U07-L04-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U07-L04-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U07-L04-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U07-L04"
    }
  ],
  "MATH-1P-U08-EVAL": [
    {
      "kind": "order",
      "values": [
        "2",
        "6",
        "4"
      ],
      "answer": [
        "2",
        "4",
        "6"
      ],
      "lengths": [
        2,
        6,
        4
      ],
      "id": "MATH-1P-U08-EVAL-Q1",
      "promptKey": "questions.MATH-1P-U08-L01-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U08-L01-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U08-L01-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U08-L01"
    },
    {
      "kind": "choice",
      "choices": [
        "Oui",
        "Non"
      ],
      "answers": [
        "Non"
      ],
      "id": "MATH-1P-U08-EVAL-Q2",
      "promptKey": "questions.MATH-1P-U08-L02-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U08-L02-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U08-L02-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U08-L02"
    },
    {
      "kind": "choice",
      "choices": [
        "Oui",
        "Non"
      ],
      "answers": [
        "Oui"
      ],
      "id": "MATH-1P-U08-EVAL-Q3",
      "promptKey": "questions.MATH-1P-U08-L03-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U08-L03-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U08-L03-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U08-L03"
    },
    {
      "kind": "choice",
      "choices": [
        "Le bol de 4 tasses",
        "Le bol de 6 tasses"
      ],
      "answers": [
        "Le bol de 6 tasses"
      ],
      "id": "MATH-1P-U08-EVAL-Q4",
      "promptKey": "questions.MATH-1P-U08-L04-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U08-L04-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U08-L04-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U08-L04"
    }
  ],
  "MATH-1P-U09-EVAL": [
    {
      "kind": "choice",
      "choices": [
        "Ouverte",
        "Fermée"
      ],
      "answers": [
        "Fermée"
      ],
      "id": "MATH-1P-U09-EVAL-Q1",
      "promptKey": "questions.MATH-1P-U09-L01-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U09-L01-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U09-L01-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U09-L01"
    },
    {
      "kind": "choice",
      "choices": [
        "Carré □",
        "Cercle ○"
      ],
      "answers": [
        "Carré □"
      ],
      "id": "MATH-1P-U09-EVAL-Q2",
      "promptKey": "questions.MATH-1P-U09-L02-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U09-L02-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U09-L02-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U09-L02"
    },
    {
      "kind": "position",
      "answer": "droite",
      "id": "MATH-1P-U09-EVAL-Q3",
      "promptKey": "questions.MATH-1P-U09-L03-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U09-L03-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U09-L03-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U09-L03"
    },
    {
      "kind": "number",
      "answer": 4,
      "id": "MATH-1P-U09-EVAL-Q4",
      "promptKey": "questions.MATH-1P-U09-L04-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U09-L04-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U09-L04-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U09-L04"
    }
  ],
  "MATH-1P-U10-EVAL": [
    {
      "kind": "order",
      "values": [
        "soir",
        "matin",
        "après-midi"
      ],
      "answer": [
        "matin",
        "après-midi",
        "soir"
      ],
      "id": "MATH-1P-U10-EVAL-Q1",
      "promptKey": "questions.MATH-1P-U10-L01-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U10-L01-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U10-L01-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U10-L01"
    },
    {
      "kind": "split",
      "total": 12,
      "ways": 1,
      "equal": true,
      "id": "MATH-1P-U10-EVAL-Q2",
      "promptKey": "questions.MATH-1P-U10-L02-practice-2.prompt",
      "hintKey": "questions.MATH-1P-U10-L02-practice-2.hint",
      "explanationKey": "questions.MATH-1P-U10-L02-practice-2.explanation",
      "reviewLessonId": "MATH-1P-U10-L02"
    }
  ],
  "MATH-1P-FINAL": [
    {
      "kind": "order",
      "values": [
        "9",
        "4",
        "7",
        "2"
      ],
      "answer": [
        "2",
        "4",
        "7",
        "9"
      ],
      "id": "MATH-1P-FINAL-Q1",
      "promptKey": "questions.MATH-1P-U04-L04-final-1.prompt",
      "hintKey": "questions.MATH-1P-U04-L04-final-1.hint",
      "explanationKey": "questions.MATH-1P-U04-L04-final-1.explanation",
      "reviewLessonId": "MATH-1P-U04-L04"
    },
    {
      "kind": "number",
      "answer": 4,
      "id": "MATH-1P-FINAL-Q2",
      "promptKey": "questions.MATH-1P-U05-L05-final-2.prompt",
      "hintKey": "questions.MATH-1P-U05-L05-final-2.hint",
      "explanationKey": "questions.MATH-1P-U05-L05-final-2.explanation",
      "reviewLessonId": "MATH-1P-U05-L05"
    },
    {
      "kind": "number",
      "answer": 12,
      "visual": [
        15,
        3
      ],
      "symbol": "−",
      "id": "MATH-1P-FINAL-Q3",
      "promptKey": "questions.MATH-1P-U06-L03-final-3.prompt",
      "hintKey": "questions.MATH-1P-U06-L03-final-3.hint",
      "explanationKey": "questions.MATH-1P-U06-L03-final-3.explanation",
      "reviewLessonId": "MATH-1P-U06-L03"
    },
    {
      "kind": "split",
      "total": 10,
      "ways": 1,
      "equal": true,
      "id": "MATH-1P-FINAL-Q4",
      "promptKey": "questions.MATH-1P-U07-L04-final-4.prompt",
      "hintKey": "questions.MATH-1P-U07-L04-final-4.hint",
      "explanationKey": "questions.MATH-1P-U07-L04-final-4.explanation",
      "reviewLessonId": "MATH-1P-U07-L04"
    },
    {
      "kind": "choice",
      "choices": [
        "Lundi",
        "Samedi",
        "Mardi"
      ],
      "answers": [
        "Lundi"
      ],
      "id": "MATH-1P-FINAL-Q5",
      "promptKey": "questions.MATH-1P-U10-L01-final-5.prompt",
      "hintKey": "questions.MATH-1P-U10-L01-final-5.hint",
      "explanationKey": "questions.MATH-1P-U10-L01-final-5.explanation",
      "reviewLessonId": "MATH-1P-U10-L01"
    },
    {
      "kind": "choice",
      "choices": [
        "7 bâtonnets",
        "5 bâtonnets"
      ],
      "answers": [
        "7 bâtonnets"
      ],
      "id": "MATH-1P-FINAL-Q6",
      "promptKey": "questions.MATH-1P-U08-L01-final-6.prompt",
      "hintKey": "questions.MATH-1P-U08-L01-final-6.hint",
      "explanationKey": "questions.MATH-1P-U08-L01-final-6.explanation",
      "reviewLessonId": "MATH-1P-U08-L01"
    },
    {
      "kind": "choice",
      "choices": [
        "Triangle △",
        "Carré □",
        "Cercle ○"
      ],
      "answers": [
        "Triangle △"
      ],
      "id": "MATH-1P-FINAL-Q7",
      "promptKey": "questions.MATH-1P-U09-L02-final-7.prompt",
      "hintKey": "questions.MATH-1P-U09-L02-final-7.hint",
      "explanationKey": "questions.MATH-1P-U09-L02-final-7.explanation",
      "reviewLessonId": "MATH-1P-U09-L02"
    },
    {
      "kind": "remove",
      "total": 8,
      "remove": 2,
      "token": "🥭",
      "id": "MATH-1P-FINAL-Q8",
      "promptKey": "questions.MATH-1P-U06-L01-final-8.prompt",
      "hintKey": "questions.MATH-1P-U06-L01-final-8.hint",
      "explanationKey": "questions.MATH-1P-U06-L01-final-8.explanation",
      "reviewLessonId": "MATH-1P-U06-L01"
    }
  ]
};
