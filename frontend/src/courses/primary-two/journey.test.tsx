import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, beforeAll } from "vitest";

import { AppRouter } from "../../app/AppRouter";
import { preloadRoutes } from "../../app/LazyRoute";
import { i18next } from "../../i18n/i18n";
import type { CourseItem } from "../course-engine/course-model";
import { completeLearningStep, createEmptyCourseProgress, startLearningItem, type CourseProgress } from "../course-engine/course-progress";
import { resetSessionCourseProgress } from "../course-engine/useCourseProgress";
import { INTERACTIVE_CONTENT } from "./content";
import { lessonPath, modulePath, PRIMARY_TWO_COURSE, PRIMARY_TWO_MODULES } from "./course-catalogue";
import { moduleContinue, nextStop, PRIMARY_TWO_JOURNEY } from "./journey";
import { PrimaryTwoCompletion } from "./JourneyNavigation";
import { solveActivity } from "./test-support/solve-activity";

// Les pages sont chargées à la demande (LEO-PERF-02) : on les précharge pour garder des tests synchrones.
beforeAll(() => preloadRoutes());

// L'enfant suit un seul chemin : leçon après leçon, puis l'évaluation, puis
// le module suivant, jusqu'au bilan. Ces tests vérifient chaque passage.

const ids = PRIMARY_TWO_JOURNEY.map((stop) => stop.item.id);
const at = (moduleNumber: number) => PRIMARY_TWO_MODULES[moduleNumber - 1];

function complete(progress: CourseProgress, item: CourseItem) {
  let next = startLearningItem(progress, item);
  for (const step of item.steps) next = completeLearningStep(next, item, step.id, true);
  return next;
}

describe("Chemin de 2e primaire", () => {
  it("enchaîne 4 leçons et l’évaluation par module, puis le bilan : 51 étapes", () => {
    expect(ids).toHaveLength(10 * 5 + 1);
    expect(ids.slice(0, 6)).toEqual([
      "MATH-2P-U01-L01",
      "MATH-2P-U01-L02",
      "MATH-2P-U01-L03",
      "MATH-2P-U01-L04",
      "MATH-2P-U01-EVAL",
      "MATH-2P-U02-L01",
    ]);
    expect(ids.at(-1)).toBe("MATH-2P-BILAN");
  });

  it("donne toujours l’élément suivant, y compris d’un module à l’autre", () => {
    expect(nextStop("MATH-2P-U01-L01")?.item.id).toBe("MATH-2P-U01-L02");
    expect(nextStop("MATH-2P-U01-L04")?.item.id).toBe("MATH-2P-U01-EVAL");
    expect(nextStop("MATH-2P-U01-EVAL")?.item.id).toBe("MATH-2P-U02-L01");
    expect(nextStop("MATH-2P-U09-EVAL")?.item.id).toBe("MATH-2P-U10-L01");
    expect(nextStop("MATH-2P-U10-EVAL")?.item.id).toBe("MATH-2P-BILAN");
    expect(nextStop("MATH-2P-BILAN")).toBeUndefined();
  });

  it("guide le bouton du module : commencer, reprendre, continuer, puis module suivant", () => {
    const module = at(2);
    let progress = createEmptyCourseProgress(PRIMARY_TWO_COURSE.id);
    expect(moduleContinue(progress, module)).toMatchObject({ type: "start", stop: { item: { id: "MATH-2P-U02-L01" } } });
    progress = startLearningItem(progress, module.lessons[0]);
    expect(moduleContinue(progress, module)).toMatchObject({ type: "resume", stop: { item: { id: "MATH-2P-U02-L01" } } });
    progress = complete(progress, module.lessons[0]);
    expect(moduleContinue(progress, module)).toMatchObject({ type: "continue", stop: { item: { id: "MATH-2P-U02-L02" } } });
    for (const item of [...module.lessons, module.evaluation]) progress = complete(progress, item);
    expect(moduleContinue(progress, module)).toMatchObject({ type: "next-module", stop: { item: { id: "MATH-2P-U03-L01" } } });
    let all = createEmptyCourseProgress(PRIMARY_TWO_COURSE.id);
    for (const stop of PRIMARY_TWO_JOURNEY) all = complete(all, stop.item);
    expect(moduleContinue(all, at(10))).toEqual({ type: "finished" });
  });
});

describe("Écran de fin", () => {
  beforeEach(async () => {
    cleanup();
    await i18next.changeLanguage("fr");
  });
  afterEach(() => cleanup());

  function renderCompletion(moduleNumber: number, item: CourseItem, progress: CourseProgress) {
    const module = at(moduleNumber);
    render(
      <MemoryRouter>
        <PrimaryTwoCompletion
          module={module}
          item={item}
          progress={progress}
          title="Titre de la leçon"
          basePath="/parcours"
          modulePath={modulePath(module.id)}
        />
      </MemoryRouter>,
    );
  }

  it("après la leçon 4 de Crochet, un seul gros bouton mène à l’évaluation du module", () => {
    const module = at(1);
    const progress = complete(createEmptyCourseProgress(PRIMARY_TWO_COURSE.id), module.lessons[3]);
    renderCompletion(1, module.lessons[3], progress);
    expect(screen.getByRole("link", { name: /continuer/i })).toHaveAttribute("href", lessonPath(module.id, "MATH-2P-U01-EVAL"));
    expect(screen.getByText("Évaluation du module 1")).toBeInTheDocument();
    expect(screen.queryByText(/arrive bientôt/i)).toBeNull();
    expect(screen.getByRole("link", { name: "Retour au module" })).toHaveAttribute("href", modulePath(module.id));
  });

  it("après l’évaluation, fête le module et mène à la première leçon du module suivant", () => {
    const module = at(2);
    let progress = createEmptyCourseProgress(PRIMARY_TWO_COURSE.id);
    for (const item of [...module.lessons, module.evaluation]) progress = complete(progress, item);
    renderCompletion(2, module.evaluation, progress);
    expect(screen.getByRole("heading", { level: 1, name: "Module 2 réussi !" })).toBeInTheDocument();
    expect(screen.getByText(/on passe au module 3/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /continuer/i })).toHaveAttribute("href", lessonPath("MATH-2P-U03", "MATH-2P-U03-L01"));
    const trail = screen.getByRole("navigation", { name: /mon chemin dans le module 2/i });
    expect(within(trail).getAllByRole("link")).toHaveLength(5);
    expect(within(trail).getAllByText("★")).toHaveLength(5);
  });

  it("après le bilan, annonce la fin du parcours sans cul-de-sac", () => {
    const module = at(10);
    const bilan = module.finalEvaluation as CourseItem;
    renderCompletion(10, bilan, complete(createEmptyCourseProgress(PRIMARY_TWO_COURSE.id), bilan));
    expect(screen.getByRole("heading", { level: 1, name: "Tu as terminé la 2e primaire !" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /retour au parcours/i })).toHaveAttribute("href", "/parcours");
  });
});

describe("Passage réel d’un module au suivant", () => {
  beforeEach(async () => {
    cleanup();
    resetSessionCourseProgress();
    await i18next.changeLanguage("fr");
  });
  afterEach(() => cleanup());

  it("de l’évaluation du module 3 à la première leçon du module 4, puis le bouton du module", async () => {
    const content = INTERACTIVE_CONTENT.find((entry) => entry.id === "MATH-2P-U03-EVAL");
    if (!content) throw new Error("évaluation U03 absente");
    window.history.pushState({}, "", `/app${lessonPath("MATH-2P-U03", content.id)}`);
    const { container } = render(<AppRouter />);
    await waitFor(() => expect(container.querySelector("#activity-title")).not.toBeNull());
    content.activities.forEach((activity, index) => {
      const panel = container.querySelector("section[aria-labelledby='activity-title']") as HTMLElement;
      solveActivity(panel, activity);
      fireEvent.click(screen.getByRole("button", { name: index === content.activities.length - 1 ? /terminer/i : /continuer/i }));
    });
    fireEvent.click(screen.getByRole("link", { name: /continuer/i }));
    await waitFor(() => expect(screen.getByRole("heading", { level: 1, name: "J'enlève des unités" })).toBeInTheDocument());
    const trail = screen.getByRole("navigation", { name: /mon chemin dans le module 4/i });
    expect(within(trail).getByRole("link", { current: "step" })).toHaveAccessibleName(/tu es ici/);

    window.history.pushState({}, "", `/app${modulePath("MATH-2P-U03")}`);
    cleanup();
    render(<AppRouter />);
    // L'évaluation est faite mais pas les leçons : le gros bouton du module ramène à la leçon 1.
    await waitFor(() => expect(screen.getByRole("heading", { level: 1, name: "J'additionne avec des stratégies" })).toBeInTheDocument());
    const hero = screen.getAllByRole("link", { name: /continuer/i }).find((link) => link.getAttribute("href")?.endsWith("MATH-2P-U03-L01"));
    expect(hero).toBeDefined();
  });
});
