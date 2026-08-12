import { act, render, screen, within } from "@testing-library/react";
import i18next from "i18next";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import {
  getLearningItems,
  PRIMARY_ONE_MODULES,
} from "./course-catalogue";
import {
  completeLearningStep,
  createEmptyCourseProgress,
  type CourseProgress,
} from "./course-progress";
import { PrimaryOneModulePage } from "./PrimaryOneModulePage";
import { createLocalCourseProgressStorage } from "./progress-storage";

function renderModule(moduleId: string) {
  return render(
    <MemoryRouter
      initialEntries={[
        `/apprentissages/primaire/1/mathematiques/modules/${moduleId}`,
      ]}
    >
      <Routes>
        <Route
          path="/apprentissages/primaire/1/mathematiques/modules/:moduleId"
          element={<PrimaryOneModulePage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

function completeItem(progress: CourseProgress, item: ReturnType<typeof getLearningItems>[number]) {
  return item.steps.reduce(
    (current, step) => completeLearningStep(current, item, step.id),
    progress,
  );
}

describe("Page d'un module de 1re primaire", () => {
  const moduleOne = PRIMARY_ONE_MODULES[0];

  beforeEach(async () => {
    localStorage.clear();
    await act(() => i18next.changeLanguage("fr"));
  });

  it("présente les quatre leçons et l'évaluation du Module 1", () => {
    renderModule(moduleOne.id);

    expect(
      screen.getByRole("heading", { level: 1, name: /j'observe et je range/i }),
    ).toBeInTheDocument();
    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(5);
    expect(within(cards[0]).getByRole("heading", { name: /même ou différent/i })).toBeInTheDocument();
    expect(within(cards[4]).getByRole("heading", { name: /évaluation du module/i })).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")).toHaveLength(6);
  });

  it("affiche Reprendre et la progression de la leçon commencée", () => {
    const firstLesson = moduleOne.lessons[0];
    const progress = completeLearningStep(
      createEmptyCourseProgress(),
      firstLesson,
      firstLesson.steps[0].id,
    );
    createLocalCourseProgressStorage(localStorage).save(progress);

    renderModule(moduleOne.id);

    const firstCard = screen.getAllByRole("article")[0];
    expect(within(firstCard).getByText("En cours")).toBeInTheDocument();
    expect(within(firstCard).getByText("1 étapes sur 3")).toBeInTheDocument();
    expect(within(firstCard).getByRole("link", { name: /reprendre/i })).toBeInTheDocument();
  });

  it("marque le module terminé et propose le module suivant", () => {
    const completedProgress = getLearningItems(moduleOne).reduce(
      completeItem,
      createEmptyCourseProgress(),
    );
    createLocalCourseProgressStorage(localStorage).save(completedProgress);

    renderModule(moduleOne.id);

    expect(screen.getAllByText("Terminé").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("4 leçons terminées sur 4")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /module suivant/i })).toHaveAttribute(
      "href",
      expect.stringContaining(PRIMARY_ONE_MODULES[1].id),
    );
  });

  it("signale clairement un module dont les activités restent à intégrer", () => {
    renderModule(PRIMARY_ONE_MODULES[1].id);

    expect(
      screen.getByRole("heading", { level: 1, name: /je compte jusqu'à 5/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /contenu pédagogique à compléter/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("affiche un retour sûr lorsqu'un identifiant de module est inconnu", () => {
    renderModule("MATH-1P-U99");

    expect(screen.getByRole("heading", { name: /ce module n'existe pas/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /retour au cours/i })).toBeInTheDocument();
  });
});
