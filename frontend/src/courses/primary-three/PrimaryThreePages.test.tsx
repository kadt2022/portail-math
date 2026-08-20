import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppRouter } from "../../app/AppRouter";
import { i18next } from "../../i18n/i18n";
import { completeLearningStep, createEmptyCourseProgress } from "../course-engine/course-progress";
import { createLocalCourseProgressStorage } from "../course-engine/progress-storage";
import { PRIMARY_THREE_COURSE, PRIMARY_THREE_MODULES } from "./course-catalogue";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<AppRouter />);
}

describe("Pages du parcours de 3e primaire", () => {
  beforeEach(async () => {
    cleanup();
    localStorage.clear();
    await i18next.changeLanguage("fr");
    window.history.pushState({}, "", "/app");
  });

  afterEach(() => cleanup());

  it("affiche les 10 modules et garde 40 comme dénominateur", () => {
    renderAt("/app/apprentissages/primaire/3/mathematiques");

    expect(screen.getByRole("heading", { level: 1, name: "3e primaire" })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(10);
    expect(screen.getByText("0 / 40 leçons")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /commencer mon parcours/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /voir le module/i })).toHaveLength(9);
    expect(screen.getByRole("complementary", { name: /Yamba.*degré moyen/i })).toBeInTheDocument();
  });

  it("montre les quatre leçons et l'évaluation du module 1, toutes disponibles", () => {
    renderAt("/app/apprentissages/primaire/3/mathematiques/modules/MATH-3P-U01");

    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(5);
    for (const article of articles) {
      expect(within(article).getByRole("link", { name: /commencer/i })).toBeInTheDocument();
    }
  });

  it("termine la première leçon en résolvant chacune de ses neuf étapes", async () => {
    const user = userEvent.setup();
    renderAt(
      "/app/apprentissages/primaire/3/mathematiques/modules/MATH-3P-U01/lecons/MATH-3P-U01-L01",
    );


    // Situation de départ
    expect(await screen.findByText(/246 graines/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /j.ai compris, je continue/i }));

    // Je découvre
    expect(await screen.findByText(/dix unités font une dizaine/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /j.ai compris, je continue/i }));

    // Je manipule : forme 324 (refuse une composition vide, puis valide 3 c / 2 d / 4 u)
    expect(await screen.findByRole("heading", { name: /forme le nombre 324/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(screen.getByText(/combien de plaques de 100/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ajouter une plaque ou un bâtonnet à centaines/i }));
    await user.click(screen.getByRole("button", { name: /ajouter une plaque ou un bâtonnet à centaines/i }));
    await user.click(screen.getByRole("button", { name: /ajouter une plaque ou un bâtonnet à centaines/i }));
    await user.click(screen.getByRole("button", { name: /ajouter une plaque ou un bâtonnet à dizaines/i }));
    await user.click(screen.getByRole("button", { name: /ajouter une plaque ou un bâtonnet à dizaines/i }));
    await user.click(screen.getByRole("button", { name: /ajouter une plaque ou un bâtonnet à unités/i }));
    await user.click(screen.getByRole("button", { name: /ajouter une plaque ou un bâtonnet à unités/i }));
    await user.click(screen.getByRole("button", { name: /ajouter une plaque ou un bâtonnet à unités/i }));
    await user.click(screen.getByRole("button", { name: /ajouter une plaque ou un bâtonnet à unités/i }));
    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();

    let stored = createLocalCourseProgressStorage(localStorage, PRIMARY_THREE_COURSE.id).load();
    expect(stored.items["MATH-3P-U01-L01"].completedStepIds).toEqual([
      "MATH-3P-U01-L01-S01",
      "MATH-3P-U01-L01-S02",
      "MATH-3P-U01-L01-S03",
    ]);

    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Exemple guidé
    expect(await screen.findByText(/décompose 572/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /j.ai compris, je continue/i }));

    // À toi de jouer : décompose 572
    expect(await screen.findByRole("heading", { name: /décompose 572/i })).toBeInTheDocument();
    for (let i = 0; i < 5; i += 1) {
      await user.click(screen.getByRole("button", { name: /ajouter une plaque ou un bâtonnet à centaines/i }));
    }
    for (let i = 0; i < 7; i += 1) {
      await user.click(screen.getByRole("button", { name: /ajouter une plaque ou un bâtonnet à dizaines/i }));
    }
    for (let i = 0; i < 2; i += 1) {
      await user.click(screen.getByRole("button", { name: /ajouter une plaque ou un bâtonnet à unités/i }));
    }
    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Je réfléchis : 8 centaines, 3 dizaines, 5 unités -> 835
    expect(await screen.findByText(/8 centaines, 3 dizaines et 5 unités/i)).toBeInTheDocument();
    await user.type(screen.getByRole("spinbutton"), "835");
    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Mini-jeu : livre 463
    expect(await screen.findByRole("heading", { name: /livre le bon dépôt/i })).toBeInTheDocument();
    for (let i = 0; i < 4; i += 1) {
      await user.click(screen.getByRole("button", { name: /ajouter une plaque ou un bâtonnet à centaines/i }));
    }
    for (let i = 0; i < 6; i += 1) {
      await user.click(screen.getByRole("button", { name: /ajouter une plaque ou un bâtonnet à dizaines/i }));
    }
    for (let i = 0; i < 3; i += 1) {
      await user.click(screen.getByRole("button", { name: /ajouter une plaque ou un bâtonnet à unités/i }));
    }
    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Je retiens
    expect(await screen.findByText(/dix unités font une dizaine/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /j.ai compris, je continue/i }));

    // Je vérifie : valeur du chiffre 6 dans 609 -> 600
    expect(await screen.findByText(/que vaut le chiffre 6/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "600" }));
    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /terminer la leçon/i }));
    expect(await screen.findByRole("heading", { name: /leçon réussie/i })).toBeInTheDocument();

    stored = createLocalCourseProgressStorage(localStorage, PRIMARY_THREE_COURSE.id).load();
    expect(stored.items["MATH-3P-U01-L01"].completed).toBe(true);
  }, 20000);

  it("affiche 1 / 40 leçons après la première leçon terminée", () => {
    const lesson = PRIMARY_THREE_MODULES[0].lessons[0];
    const completed = lesson.steps.reduce(
      (progress, step) => completeLearningStep(progress, lesson, step.id, true),
      createEmptyCourseProgress(PRIMARY_THREE_COURSE.id),
    );
    createLocalCourseProgressStorage(localStorage, PRIMARY_THREE_COURSE.id).save(completed);

    renderAt("/app/apprentissages/primaire/3/mathematiques");
    expect(screen.getByText("1 / 40 leçons")).toBeInTheDocument();
    expect(within(screen.getAllByRole("article")[0]).getByText("1 / 4 leçons")).toBeInTheDocument();
  });

  it("garde la zone interactive et les actions dans le DOM à 320 px", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
    window.dispatchEvent(new Event("resize"));
    renderAt(
      "/app/apprentissages/primaire/3/mathematiques/modules/MATH-3P-U01/lecons/MATH-3P-U01-L01",
    );

    expect(await screen.findByText(/246 graines/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /j.ai compris, je continue/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /retour au module/i })).toBeVisible();
    expect(screen.getByRole("complementary", { name: /Yamba/i })).toBeVisible();
  });

  it("affiche l'accompagnement de l'accueil en anglais", async () => {
    await i18next.changeLanguage("en");
    renderAt("/app/apprentissages/primaire/3/mathematiques");

    expect(screen.getByRole("heading", { level: 1, name: "3rd grade" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /Yamba.*middle grades/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start my learning path/i })).toBeInTheDocument();
  });

  it("publie la leçon 1 en anglais avec un contenu pédagogique traduit, sans repli français", async () => {
    await i18next.changeLanguage("en");
    renderAt(
      "/app/apprentissages/primaire/3/mathematiques/modules/MATH-3P-U01/lecons/MATH-3P-U01-L01",
    );

    expect(await screen.findByText(/246 seeds/i)).toBeInTheDocument();
    expect(screen.queryByText(/246 graines/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/content coming soon in english/i)).not.toBeInTheDocument();
  });

  it("propose une aide plus détaillée après plusieurs erreurs sur la même question", async () => {
    const user = userEvent.setup();
    renderAt(
      "/app/apprentissages/primaire/3/mathematiques/modules/MATH-3P-U01/lecons/MATH-3P-U01-L03",
    );

    await user.click(await screen.findByRole("button", { name: /j.ai compris, je continue/i }));
    await user.click(screen.getByRole("button", { name: /j.ai compris, je continue/i }));
    expect(await screen.findByRole("heading", { name: /construis puis compare/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(screen.getByText(/les centaines sont identiques/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(screen.getByText(/438 a 3 dizaines, 483 a 8 dizaines/i)).toBeInTheDocument();
  });

  it("complète l'évaluation de l'unité 1 puis enregistre l'auto-évaluation", async () => {
    const [l1, l2, l3, l4] = PRIMARY_THREE_MODULES[0].lessons;
    let progress = createEmptyCourseProgress(PRIMARY_THREE_COURSE.id);
    for (const lesson of [l1, l2, l3, l4]) {
      progress = lesson.steps.reduce((current, step) => completeLearningStep(current, lesson, step.id, true), progress);
    }
    createLocalCourseProgressStorage(localStorage, PRIMARY_THREE_COURSE.id).save(progress);

    const user = userEvent.setup();
    renderAt(
      "/app/apprentissages/primaire/3/mathematiques/modules/MATH-3P-U01/lecons/MATH-3P-U01-EVAL",
    );

    expect(await screen.findByText(/8 centaines, 3 dizaines et 5 unités/i)).toBeInTheDocument();
    await user.type(screen.getByRole("spinbutton"), "835");
    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    await user.click(await screen.findByRole("button", { name: /continuer/i }));

    expect(await screen.findByRole("heading", { name: /question 2/i })).toBeInTheDocument();
    await user.click(screen.getByText("neuf cent quatre", { selector: "button" }));
    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    await user.click(await screen.findByRole("button", { name: /continuer/i }));

    expect(await screen.findByRole("heading", { name: /question 3/i })).toBeInTheDocument();
    for (const value of [132, 213, 312, 321]) {
      await user.click(screen.getByRole("button", { name: `Placer le nombre ${value}` }));
    }
    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    await user.click(await screen.findByRole("button", { name: /continuer/i }));

    expect(await screen.findByRole("heading", { name: /question 4/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "60" }));
    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    await user.click(await screen.findByRole("button", { name: /continuer/i }));

    expect(await screen.findByRole("heading", { name: /comment as-tu réussi/i })).toBeInTheDocument();
    const finishButton = screen.getByRole("button", { name: /valider mon auto-évaluation/i });
    expect(finishButton).toBeDisabled();
    await user.click(screen.getByLabelText(/réussi seul/i));
    expect(finishButton).toBeEnabled();
    await user.click(finishButton);

    expect(await screen.findByRole("heading", { name: /évaluation réussie/i })).toBeInTheDocument();
    const stored = createLocalCourseProgressStorage(localStorage, PRIMARY_THREE_COURSE.id).load();
    expect(stored.items["MATH-3P-U01-EVAL"].completed).toBe(true);
  });

  it("propose le module 3e primaire depuis le menu de navigation", async () => {
    const user = userEvent.setup();
    renderAt("/app");
    await user.click(screen.getByRole("button", { name: /cours primaires/i }));
    expect(screen.getByRole("link", { name: /3e primaire/i })).toHaveAttribute(
      "href",
      "/app/apprentissages/primaire/3/mathematiques",
    );
  });
});
