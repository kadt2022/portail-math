import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppRouter } from "../../app/AppRouter";
import { i18next } from "../../i18n/i18n";
import { completeLearningStep, createEmptyCourseProgress } from "../course-engine/course-progress";
import { createLocalCourseProgressStorage } from "../course-engine/progress-storage";
import { PRIMARY_TWO_COURSE, PRIMARY_TWO_MODULES } from "./course-catalogue";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<AppRouter />);
}

describe("Pages du parcours de 2e primaire", () => {
  beforeEach(async () => {
    cleanup();
    localStorage.clear();
    await i18next.changeLanguage("fr");
    window.history.pushState({}, "", "/app");
  });

  afterEach(() => cleanup());

  it("affiche les 10 modules et garde 40 comme dénominateur", () => {
    renderAt("/app/apprentissages/primaire/2/mathematiques");

    expect(screen.getByRole("heading", { level: 1, name: "2e primaire" })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(10);
    expect(screen.getByText("0 / 40 leçons")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /commencer mon parcours/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /voir le module/i })).toHaveLength(9);
    expect(screen.getByRole("complementary", { name: /Yamba.*à ton rythme/i })).toBeInTheDocument();
    for (const card of screen.getAllByRole("article")) {
      expect(within(card).queryByText("Yamba")).not.toBeInTheDocument();
    }
  });

  it("montre les quatre leçons et l’évaluation du module 1, une seule étant disponible", () => {
    renderAt("/app/apprentissages/primaire/2/mathematiques/modules/MATH-2P-U01");

    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(5);
    expect(within(articles[0]).getByRole("link", { name: /commencer/i })).toBeInTheDocument();
    expect(articles.slice(1).every((article) => within(article).queryByRole("link") === null)).toBe(true);
    expect(screen.getAllByText("À venir").length).toBeGreaterThanOrEqual(4);
  });

  it("ne valide pas l’étape de comptage vide, puis enregistre les 18 graines réellement comptées", async () => {
    const user = userEvent.setup();
    renderAt(
      "/app/apprentissages/primaire/2/mathematiques/modules/MATH-2P-U01/lecons/MATH-2P-U01-L01",
    );
    await waitFor(() => expect(screen.getAllByRole("button", { name: /compter la graine/i })).toHaveLength(18));

    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    let stored = createLocalCourseProgressStorage(localStorage, PRIMARY_TWO_COURSE.id).load();
    expect(stored.items["MATH-2P-U01-L01"].completedStepIds).toEqual([]);

    for (const seed of screen.getAllByRole("button", { name: /compter la graine/i })) {
      fireEvent.click(seed);
    }
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));

    expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
    stored = createLocalCourseProgressStorage(localStorage, PRIMARY_TWO_COURSE.id).load();
    expect(stored.items["MATH-2P-U01-L01"].completedStepIds).toEqual([
      "MATH-2P-U01-L01-S01",
    ]);
    expect(stored.items["MATH-2P-U01-L01"].currentStepId).toBe("MATH-2P-U01-L01-S02");
  });

  it("reprend Je manipule et refuse une composition vide de 17", async () => {
    const lesson = PRIMARY_TWO_MODULES[0].lessons[0];
    const afterDiscover = completeLearningStep(
      createEmptyCourseProgress(PRIMARY_TWO_COURSE.id),
      lesson,
      lesson.steps[0].id,
      true,
    );
    createLocalCourseProgressStorage(localStorage, PRIMARY_TWO_COURSE.id).save(afterDiscover);
    const user = userEvent.setup();

    renderAt(
      "/app/apprentissages/primaire/2/mathematiques/modules/MATH-2P-U01/lecons/MATH-2P-U01-L01",
    );
    expect(await screen.findByRole("heading", { name: /forme le nombre 17/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));

    expect(screen.getByText(/cherche d’abord une dizaine/i)).toBeInTheDocument();
    const stored = createLocalCourseProgressStorage(localStorage, PRIMARY_TWO_COURSE.id).load();
    expect(stored.items[lesson.id].currentStepId).toBe(lesson.steps[1].id);
    expect(stored.items[lesson.id].completedStepIds).toEqual([lesson.steps[0].id]);
  });

  it("affiche 1 / 40, 2,5 % et 1 / 4 après la première leçon, sans Leçon suivante", () => {
    const lesson = PRIMARY_TWO_MODULES[0].lessons[0];
    const completed = lesson.steps.reduce(
      (progress, step) => completeLearningStep(progress, lesson, step.id, true),
      createEmptyCourseProgress(PRIMARY_TWO_COURSE.id),
    );
    createLocalCourseProgressStorage(localStorage, PRIMARY_TWO_COURSE.id).save(completed);

    renderAt("/app/apprentissages/primaire/2/mathematiques");
    expect(screen.getByText("1 / 40 leçons")).toBeInTheDocument();
    expect(screen.getByText("2,5 %")).toBeInTheDocument();
    expect(within(screen.getAllByRole("article")[0]).getByText("1 / 4 leçons")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /retour à mes modules/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /leçon suivante/i })).not.toBeInTheDocument();
  });

  it("garde la zone visuelle et les actions dans le DOM à 320 px", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
    window.dispatchEvent(new Event("resize"));
    renderAt(
      "/app/apprentissages/primaire/2/mathematiques/modules/MATH-2P-U01/lecons/MATH-2P-U01-L01",
    );

    expect(await screen.findByRole("heading", { name: /compte les 18 graines/i })).toBeVisible();
    expect(screen.getByRole("heading", { name: "À compter" })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Déjà comptées" })).toBeVisible();
    expect(screen.getByRole("link", { name: /retour au module/i })).toBeVisible();
    expect(screen.getByRole("complementary", { name: /Yamba.*première étape/i })).toBeVisible();
  });

  it("affiche l’accompagnement de l’accueil en anglais", async () => {
    await i18next.changeLanguage("en");
    renderAt("/app/apprentissages/primaire/2/mathematiques");

    expect(screen.getByRole("complementary", { name: /Yamba.*at your pace/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start my learning path/i })).toBeInTheDocument();
  });

  it("signale la traduction pédagogique anglaise manquante sans démarrer la leçon", async () => {
    await i18next.changeLanguage("en");
    renderAt(
      "/app/apprentissages/primaire/2/mathematiques/modules/MATH-2P-U01/lecons/MATH-2P-U01-L01",
    );

    expect(screen.getByRole("heading", { name: /content coming soon in english/i })).toBeInTheDocument();
    expect(createLocalCourseProgressStorage(localStorage, PRIMARY_TWO_COURSE.id).load().items).toEqual({});
  });
});
