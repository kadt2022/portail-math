import { describe, expect, it } from "vitest";

import { i18next } from "../../../i18n/i18n";
import { PRIMARY_THREE_MODULES } from "../course-catalogue";
import type { Exercise } from "../exercises/exercise-types";
import type { ExerciseStepContent } from "./lesson-content";
import { PRIMARY_THREE_EVALUATION_CONTENT, PRIMARY_THREE_LESSON_CONTENT } from "./index";

function collectKeys(value: unknown, keys: Set<string>) {
  if (typeof value === "string") {
    if (value.startsWith("content.") || value.startsWith("exercise.")) keys.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectKeys(item, keys));
  }
}

function lessonSteps(content: (typeof PRIMARY_THREE_LESSON_CONTENT)[string]): ExerciseStepContent[] {
  return [content.manipulate, content.practice, content.reflect, content.play, content.check];
}

const ALL_STEPS: { label: string; step: ExerciseStepContent }[] = [
  ...Object.entries(PRIMARY_THREE_LESSON_CONTENT).flatMap(([id, content]) =>
    lessonSteps(content).map((step, index) => ({ label: `${id}#${index}`, step })),
  ),
  ...Object.entries(PRIMARY_THREE_EVALUATION_CONTENT).flatMap(([id, content]) =>
    content.items.map((step, index) => ({ label: `${id}#q${index + 1}`, step })),
  ),
];

function expectedNumericResult(exercise: Extract<Exercise, { kind: "column-calc" }>) {
  if (exercise.operation === "+") return exercise.left + exercise.right;
  if (exercise.operation === "-") return exercise.left - exercise.right;
  return exercise.left * exercise.right;
}

function checkExercise(exercise: Exercise) {
  switch (exercise.kind) {
    case "text-choice":
      expect(exercise.choiceKeys.length).toBeGreaterThanOrEqual(2);
      expect(exercise.answerIndex).toBeGreaterThanOrEqual(0);
      expect(exercise.answerIndex).toBeLessThan(exercise.choiceKeys.length);
      break;
    case "numeric-question":
      if (exercise.choices) expect(exercise.choices).toContain(exercise.answer);
      break;
    case "column-calc": {
      const result = expectedNumericResult(exercise);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(String(result).length).toBeLessThanOrEqual(4);
      break;
    }
    case "equal-groups":
      expect(exercise.groups).toBeGreaterThanOrEqual(1);
      expect(exercise.groups).toBeLessThanOrEqual(10);
      expect(exercise.perGroup).toBeGreaterThanOrEqual(1);
      expect(exercise.perGroup).toBeLessThanOrEqual(10);
      break;
    case "share-tokens":
      expect(exercise.bowls).toBeGreaterThan(1);
      expect(exercise.total).toBeGreaterThanOrEqual(exercise.bowls);
      break;
    case "money-build": {
      // La somme doit être atteignable, avec le nombre de cartes autorisé s'il y en a un.
      let minCards = Infinity;
      const explore = (remaining: number, count: number, from: number) => {
        if (remaining === 0) minCards = Math.min(minCards, count);
        if (remaining <= 0 || count > 20) return;
        for (let index = from; index < exercise.cards.length; index += 1) {
          explore(remaining - exercise.cards[index], count + 1, index);
        }
      };
      explore(exercise.target, 0, 0);
      expect(minCards).toBeLessThanOrEqual(exercise.maxCards ?? 20);
      break;
    }
    case "fraction-shade":
      expect(exercise.shaded).toBeGreaterThanOrEqual(1);
      expect(exercise.shaded).toBeLessThanOrEqual(exercise.parts);
      break;
    case "clock-set":
      expect(exercise.hours).toBeGreaterThanOrEqual(1);
      expect(exercise.hours).toBeLessThanOrEqual(12);
      expect(exercise.minutes % 5).toBe(0);
      break;
    case "grid-route":
      for (const [column, row] of [exercise.start, exercise.target]) {
        expect(column).toBeGreaterThanOrEqual(0);
        expect(column).toBeLessThan(exercise.columns);
        expect(row).toBeGreaterThanOrEqual(0);
        expect(row).toBeLessThan(exercise.rows);
      }
      break;
    case "step-order":
      expect(exercise.stepKeys.length).toBeGreaterThanOrEqual(2);
      break;
    default:
      break;
  }
}

describe("Contenu du parcours de 3e primaire", () => {
  it("fournit un contenu pour chacune des 40 leçons et des 10 évaluations", () => {
    for (const module of PRIMARY_THREE_MODULES) {
      for (const lesson of module.lessons) {
        expect(PRIMARY_THREE_LESSON_CONTENT[lesson.id], lesson.id).toBeDefined();
      }
      expect(PRIMARY_THREE_EVALUATION_CONTENT[module.evaluation.id], module.evaluation.id).toBeDefined();
      expect(PRIMARY_THREE_EVALUATION_CONTENT[module.evaluation.id].items).toHaveLength(4);
    }
    expect(Object.keys(PRIMARY_THREE_LESSON_CONTENT)).toHaveLength(40);
    expect(Object.keys(PRIMARY_THREE_EVALUATION_CONTENT)).toHaveLength(10);
  });

  it("définit chaque texte utilisé en français et en anglais", () => {
    const keys = new Set<string>();
    collectKeys(PRIMARY_THREE_LESSON_CONTENT, keys);
    collectKeys(PRIMARY_THREE_EVALUATION_CONTENT, keys);
    for (const module of PRIMARY_THREE_MODULES) {
      keys.add(module.titleKey);
      module.lessons.forEach((lesson) => keys.add(lesson.titleKey));
      keys.add(module.evaluation.titleKey);
    }

    expect(keys.size).toBeGreaterThan(500);
    const missing: string[] = [];
    for (const key of keys) {
      for (const lng of ["fr", "en"]) {
        if (!i18next.exists(key, { lng, ns: "primaryThree" })) missing.push(`${lng}:${key}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("garde des exercices cohérents et réalisables", () => {
    expect(ALL_STEPS.length).toBe(40 * 5 + 10 * 4);
    for (const { label, step } of ALL_STEPS) {
      expect(() => checkExercise(step.exercise), label).not.toThrow();
    }
  });

  it("donne un identifiant unique à chaque exercice", () => {
    const ids = ALL_STEPS.map(({ step }) => step.exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("ne place pas toujours la bonne réponse en première position", () => {
    const positions = new Set(
      ALL_STEPS.flatMap(({ step }) => (step.exercise.kind === "text-choice" ? [step.exercise.answerIndex] : [])),
    );
    expect(positions.size).toBeGreaterThan(1);
  });
});
