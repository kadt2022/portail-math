import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { moduleContinueIn, nextStopIn } from "../components/journey/journey";
import { i18next } from "../../i18n/i18n";
import { lessonPath, PRIMARY_ONE_BASE_PATH, PRIMARY_ONE_FINAL, PRIMARY_ONE_MODULES, type LearningItem } from "./course-catalogue";
import { completeLearningStep, createEmptyCourseProgress, getLearningState, startLearningItem, type CourseProgress } from "./course-progress";
import { PRIMARY_ONE_JOURNEY, PrimaryOneCompletion, PrimaryOneModuleContinue } from "./PrimaryOneJourney";

// Chemin de l'enfant en 1re primaire : leçon après leçon, évaluation, module
// suivant, jusqu'au bilan final.

const ids = PRIMARY_ONE_JOURNEY.map((stop) => stop.item.id);

function complete(progress: CourseProgress, item: LearningItem) {
  let next = startLearningItem(progress, item);
  for (const step of item.steps) next = completeLearningStep(next, item, step.id);
  return next;
}

describe("Chemin de 1re primaire", () => {
  it("parcourt les 40 leçons, les 10 évaluations puis le bilan final", () => {
    expect(ids).toHaveLength(40 + 10 + 1);
    expect(ids.at(-1)).toBe(PRIMARY_ONE_FINAL.id);
  });

  it("passe d’une leçon à l’autre, à l’évaluation, puis au module suivant", () => {
    const [first, second] = PRIMARY_ONE_MODULES;
    expect(nextStopIn(PRIMARY_ONE_JOURNEY, first.lessons[0].id)?.item.id).toBe(first.lessons[1].id);
    expect(nextStopIn(PRIMARY_ONE_JOURNEY, first.lessons.at(-1)?.id ?? "")?.item.id).toBe(first.evaluation.id);
    expect(nextStopIn(PRIMARY_ONE_JOURNEY, first.evaluation.id)?.item.id).toBe(second.lessons[0].id);
    // Modules de 5 leçons (5 et 6) et module 10 de 2 leçons suivis du bilan.
    const fifth = PRIMARY_ONE_MODULES[4];
    expect(nextStopIn(PRIMARY_ONE_JOURNEY, fifth.lessons[4].id)?.item.id).toBe(fifth.evaluation.id);
    expect(nextStopIn(PRIMARY_ONE_JOURNEY, PRIMARY_ONE_MODULES[9].evaluation.id)?.item.id).toBe(PRIMARY_ONE_FINAL.id);
    expect(nextStopIn(PRIMARY_ONE_JOURNEY, PRIMARY_ONE_FINAL.id)).toBeUndefined();
  });

  it("le bouton du module passe de Commencer à Module suivant", () => {
    const module = PRIMARY_ONE_MODULES[2];
    let progress = createEmptyCourseProgress();
    expect(moduleContinueIn(PRIMARY_ONE_JOURNEY, module.id, (item) => getLearningState(progress, item))).toMatchObject({ type: "start" });
    for (const item of [...module.lessons, module.evaluation]) progress = complete(progress, item);
    expect(moduleContinueIn(PRIMARY_ONE_JOURNEY, module.id, (item) => getLearningState(progress, item))).toMatchObject({
      type: "next-module",
      stop: { item: { id: PRIMARY_ONE_MODULES[3].lessons[0].id } },
    });
  });
});

describe("Écrans de 1re primaire", () => {
  beforeEach(async () => {
    cleanup();
    await i18next.changeLanguage("fr");
  });
  afterEach(() => cleanup());

  it("fête le module après l’évaluation et mène au module suivant", () => {
    const module = PRIMARY_ONE_MODULES[0];
    let progress = createEmptyCourseProgress();
    for (const item of [...module.lessons, module.evaluation]) progress = complete(progress, item);
    render(
      <MemoryRouter>
        <PrimaryOneCompletion module={module} item={module.evaluation} progress={progress} title="Bravo" modulePath="/module" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Module 1 réussi !" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continuer/i })).toHaveAttribute("href", lessonPath(PRIMARY_ONE_MODULES[1].id, PRIMARY_ONE_MODULES[1].lessons[0].id));
    expect(screen.getByRole("navigation", { name: /mon chemin dans le module 1/i })).toBeInTheDocument();
  });

  it("annonce la fin de la 1re primaire après le bilan", () => {
    const module = PRIMARY_ONE_MODULES[9];
    render(
      <MemoryRouter>
        <PrimaryOneCompletion module={module} item={PRIMARY_ONE_FINAL} progress={complete(createEmptyCourseProgress(), PRIMARY_ONE_FINAL)} title="Bravo" modulePath="/module" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Tu as terminé la 1re primaire !" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /retour au parcours/i })).toHaveAttribute("href", PRIMARY_ONE_BASE_PATH);
  });

  it("propose de commencer le module en haut de sa page", () => {
    const module = PRIMARY_ONE_MODULES[1];
    render(
      <MemoryRouter>
        <PrimaryOneModuleContinue module={module} progress={createEmptyCourseProgress()} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /commencer/i })).toHaveAttribute("href", lessonPath(module.id, module.lessons[0].id));
  });
});
