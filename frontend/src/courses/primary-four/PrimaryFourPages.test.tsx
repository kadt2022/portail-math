import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppRouter } from "../../app/AppRouter";
import { i18next } from "../../i18n/i18n";
import { completeLearningStep, createEmptyCourseProgress } from "../course-engine/course-progress";
import { createLocalCourseProgressStorage } from "../course-engine/progress-storage";
import { PRIMARY_FOUR_COURSE, PRIMARY_FOUR_MODULES } from "./course-catalogue";
import { formatNumber } from "./number-words";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<AppRouter />);
}

describe("Pages du parcours de 4e primaire", () => {
  beforeEach(async () => {
    cleanup();
    localStorage.clear();
    await i18next.changeLanguage("fr");
    window.history.pushState({}, "", "/app");
  });

  afterEach(() => cleanup());

  it("affiche les 10 modules et garde 40 comme dénominateur", () => {
    renderAt("/app/apprentissages/primaire/4/mathematiques");

    expect(screen.getByRole("heading", { level: 1, name: "4e primaire" })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(10);
    expect(screen.getByText("0 / 40 leçons")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /commencer mon parcours/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /voir le module/i })).toHaveLength(9);
    expect(screen.getByRole("complementary", { name: /Yamba.*4e primaire/i })).toBeInTheDocument();
  });

  it("montre les quatre leçons et l'évaluation du module 1, toutes disponibles", () => {
    renderAt("/app/apprentissages/primaire/4/mathematiques/modules/MATH-4P-U01");

    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(5);
    for (const article of articles) {
      expect(within(article).getByRole("link", { name: /commencer/i })).toBeInTheDocument();
    }
  });

  it("affiche le module 2 comme à venir, sans aucune leçon accessible", () => {
    renderAt("/app/apprentissages/primaire/4/mathematiques/modules/MATH-4P-U02");

    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(5);
    for (const article of articles) {
      expect(within(article).getAllByText("À venir").length).toBeGreaterThan(0);
      expect(within(article).queryByRole("link")).not.toBeInTheDocument();
    }
  });

  it("distingue À commencer, En cours et Terminé sur la page du module 1", () => {
    const [l1, l2] = PRIMARY_FOUR_MODULES[0].lessons;
    let progress = l1.steps.reduce(
      (current, step) => completeLearningStep(current, l1, step.id, true),
      createEmptyCourseProgress(PRIMARY_FOUR_COURSE.id),
    );
    progress = completeLearningStep(progress, l2, l2.steps[0].id, true);
    createLocalCourseProgressStorage(localStorage, PRIMARY_FOUR_COURSE.id).save(progress);

    renderAt("/app/apprentissages/primaire/4/mathematiques/modules/MATH-4P-U01");
    const articles = screen.getAllByRole("article");
    expect(within(articles[0]).getByText("Terminé")).toBeInTheDocument();
    expect(within(articles[0]).getByRole("link", { name: /revoir/i })).toBeInTheDocument();
    expect(within(articles[1]).getByText("En cours")).toBeInTheDocument();
    expect(within(articles[1]).getByRole("link", { name: /reprendre/i })).toBeInTheDocument();
    expect(within(articles[2]).getByText("À commencer")).toBeInTheDocument();
  });

  it(
    "termine la première leçon (valeur de position) en résolvant chacune de ses neuf étapes",
    async () => {
      const user = userEvent.setup();
      renderAt(
        "/app/apprentissages/primaire/4/mathematiques/modules/MATH-4P-U01/lecons/MATH-4P-U01-L01",
      );

      // Situation de départ
      expect(await screen.findByText(/24 638 graines/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /j.ai compris, je continue/i }));

      // Je découvre (figure tactile chiffre -> valeur)
      expect(await screen.findByText(/chaque rang vaut dix fois/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /^DM/ }));
      expect(screen.getByText("2 = 20 000")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /j.ai compris, je continue/i }));

      // Je manipule : forme 24 638 (2 DM, 4 UM, 6 C, 3 D, 8 U)
      expect(await screen.findByRole("heading", { name: /forme le nombre 24 638/i })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(screen.getByText(/combien de paquets de 10 000/i)).toBeInTheDocument();

      for (let i = 0; i < 2; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à DM" }));
      }
      for (let i = 0; i < 4; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à UM" }));
      }
      for (let i = 0; i < 6; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à C" }));
      }
      for (let i = 0; i < 3; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à D" }));
      }
      for (let i = 0; i < 8; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à U" }));
      }
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /continuer/i }));

      // Exemple guidé
      expect(await screen.findByText(/décompose 53 207/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /j.ai compris, je continue/i }));

      // Je m'entraîne : décompose 40 916 (4 DM, 0 UM, 9 C, 1 D, 6 U)
      expect(await screen.findByRole("heading", { name: /décompose 40 916/i })).toBeInTheDocument();
      for (let i = 0; i < 4; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à DM" }));
      }
      for (let i = 0; i < 9; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à C" }));
      }
      await user.click(screen.getByRole("button", { name: "Ajouter un compteur à D" }));
      for (let i = 0; i < 6; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à U" }));
      }
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /continuer/i }));

      // Je réfléchis : 2 DM, 7 UM, 0 C, 5 D, 3 U -> 27053
      expect(await screen.findByText(/2 dizaines de mille, 7 unités de mille/i)).toBeInTheDocument();
      await user.type(screen.getByRole("spinbutton"), "27053");
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /continuer/i }));

      // Mini-jeu : livre 78 402 (7 DM, 8 UM, 4 C, 0 D, 2 U)
      expect(await screen.findByRole("heading", { name: /livre chaque chiffre à son rang/i })).toBeInTheDocument();
      for (let i = 0; i < 7; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à DM" }));
      }
      for (let i = 0; i < 8; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à UM" }));
      }
      for (let i = 0; i < 4; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à C" }));
      }
      for (let i = 0; i < 2; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à U" }));
      }
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /continuer/i }));

      // Je retiens
      expect(await screen.findByText(/chaque rang vaut dix fois/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /j.ai compris, je continue/i }));

      // Je vérifie : valeur du chiffre 3 dans 63 020 -> 3000
      expect(await screen.findByText(/que vaut le chiffre 3/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "3 000" }));
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /terminer la leçon/i }));
      expect(await screen.findByRole("heading", { name: /leçon réussie/i })).toBeInTheDocument();

      const stored = createLocalCourseProgressStorage(localStorage, PRIMARY_FOUR_COURSE.id).load();
      expect(stored.items["MATH-4P-U01-L01"].completed).toBe(true);
    },
    20000,
  );

  it("affiche 1 / 40 leçons après la première leçon terminée", () => {
    const lesson = PRIMARY_FOUR_MODULES[0].lessons[0];
    const completed = lesson.steps.reduce(
      (progress, step) => completeLearningStep(progress, lesson, step.id, true),
      createEmptyCourseProgress(PRIMARY_FOUR_COURSE.id),
    );
    createLocalCourseProgressStorage(localStorage, PRIMARY_FOUR_COURSE.id).save(completed);

    renderAt("/app/apprentissages/primaire/4/mathematiques");
    expect(screen.getByText("1 / 40 leçons")).toBeInTheDocument();
    expect(within(screen.getAllByRole("article")[0]).getByText("1 / 4 leçons")).toBeInTheDocument();
  });

  it("revoit une leçon déjà terminée avec les coches affichées, sans repasser par les activités", async () => {
    const lesson = PRIMARY_FOUR_MODULES[0].lessons[0];
    const completed = lesson.steps.reduce(
      (progress, step) => completeLearningStep(progress, lesson, step.id, true),
      createEmptyCourseProgress(PRIMARY_FOUR_COURSE.id),
    );
    createLocalCourseProgressStorage(localStorage, PRIMARY_FOUR_COURSE.id).save(completed);

    renderAt(
      "/app/apprentissages/primaire/4/mathematiques/modules/MATH-4P-U01/lecons/MATH-4P-U01-L01",
    );

    expect(await screen.findByText(/24 638 graines/i)).toBeInTheDocument();
    expect(screen.getByText("✓ Terminé")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /j.ai compris, je continue/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continuer/i })).toBeInTheDocument();
  });

  it("garde la zone interactive et les actions dans le DOM à 320 px", async () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 320 });
    window.dispatchEvent(new Event("resize"));
    renderAt(
      "/app/apprentissages/primaire/4/mathematiques/modules/MATH-4P-U01/lecons/MATH-4P-U01-L01",
    );

    expect(await screen.findByText(/24 638 graines/i)).toBeVisible();
    expect(screen.getByRole("button", { name: /j.ai compris, je continue/i })).toBeVisible();
    expect(screen.getByRole("link", { name: /retour au module/i })).toBeVisible();
    expect(screen.getByRole("complementary", { name: /Yamba/i })).toBeVisible();
  });

  it("affiche l'accompagnement de l'accueil en anglais", async () => {
    await i18next.changeLanguage("en");
    renderAt("/app/apprentissages/primaire/4/mathematiques");

    expect(screen.getByRole("heading", { level: 1, name: "4th grade" })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /Yamba.*4th grade/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /start my learning path/i })).toBeInTheDocument();
  });

  it("publie la leçon 1 en anglais avec un contenu pédagogique traduit, sans repli français", async () => {
    await i18next.changeLanguage("en");
    renderAt(
      "/app/apprentissages/primaire/4/mathematiques/modules/MATH-4P-U01/lecons/MATH-4P-U01-L01",
    );

    expect(await screen.findByText(/24,638 selected seeds/i)).toBeInTheDocument();
    expect(screen.queryByText(/24 638 graines/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/content coming soon in english/i)).not.toBeInTheDocument();
  });

  it("propose une aide plus détaillée après plusieurs erreurs sur la même question", async () => {
    const user = userEvent.setup();
    renderAt(
      "/app/apprentissages/primaire/4/mathematiques/modules/MATH-4P-U01/lecons/MATH-4P-U01-L01",
    );

    await user.click(await screen.findByRole("button", { name: /j.ai compris, je continue/i }));
    await user.click(screen.getByRole("button", { name: /j.ai compris, je continue/i }));
    expect(await screen.findByRole("heading", { name: /forme le nombre 24 638/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(screen.getByText(/combien de paquets de 10 000/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(screen.getByText(/2 DM, 4 UM, 6 C, 3 D et 8 U/i)).toBeInTheDocument();
  });

  it(
    "termine la leçon 3 (comparer, ranger avec retrait d'une carte, encadrer)",
    async () => {
      const user = userEvent.setup();
      renderAt(
        "/app/apprentissages/primaire/4/mathematiques/modules/MATH-4P-U01/lecons/MATH-4P-U01-L03",
      );

      await user.click(await screen.findByRole("button", { name: /j.ai compris, je continue/i }));
      await user.click(screen.getByRole("button", { name: /j.ai compris, je continue/i }));

      // Je manipule : construis 47 350 puis 47 530
      expect(await screen.findByRole("heading", { name: /construis puis compare/i })).toBeInTheDocument();
      for (let i = 0; i < 4; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à DM" }));
      }
      for (let i = 0; i < 7; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à UM" }));
      }
      for (let i = 0; i < 3; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à C" }));
      }
      for (let i = 0; i < 5; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à D" }));
      }
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));

      await screen.findByText("2 / 2");
      for (let i = 0; i < 4; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à DM" }));
      }
      for (let i = 0; i < 7; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à UM" }));
      }
      for (let i = 0; i < 5; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à C" }));
      }
      for (let i = 0; i < 3; i += 1) {
        await user.click(screen.getByRole("button", { name: "Ajouter un compteur à D" }));
      }
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /continuer/i }));

      // Exemple guidé
      await user.click(await screen.findByRole("button", { name: /j.ai compris, je continue/i }));

      // Je m'entraîne : 52 400 > 52 040 puis 47 350 < 47 530
      expect(await screen.findByRole("heading", { name: /compare les nombres/i })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "plus grand que" }));
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      await screen.findByText("2 / 2");
      await user.click(screen.getByRole("button", { name: "plus petit que" }));
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /continuer/i }));

      // Je réfléchis : range 81 250, 18 520, 80 125, 81 025
      expect(await screen.findByRole("heading", { name: /range les nombres/i })).toBeInTheDocument();
      for (const value of [18520, 80125, 81025, 81250]) {
        await user.click(screen.getByRole("button", { name: `Placer le nombre ${formatNumber(value, "fr")}` }));
      }
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /continuer/i }));

      // Mini-jeu : construis la plus grande réserve
      expect(await screen.findByRole("heading", { name: /construis la plus grande réserve/i })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "plus grand que" }));
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      await screen.findByText("2 / 2");
      await user.click(screen.getByRole("button", { name: "plus petit que" }));
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /continuer/i }));

      // Je retiens
      await user.click(await screen.findByRole("button", { name: /j.ai compris, je continue/i }));

      // Je vérifie : un nombre entre 9 995 et 10 005
      expect(await screen.findByText(/trouve un nombre compris entre 9 995 et 10 005/i)).toBeInTheDocument();
      await user.type(screen.getByRole("spinbutton"), "10000");
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /terminer la leçon/i }));
      expect(await screen.findByRole("heading", { name: /leçon réussie/i })).toBeInTheDocument();
    },
    20000,
  );

  it(
    "termine la leçon 4 (suites et arrondis) au millier et à la dizaine de mille",
    async () => {
      const user = userEvent.setup();
      renderAt(
        "/app/apprentissages/primaire/4/mathematiques/modules/MATH-4P-U01/lecons/MATH-4P-U01-L04",
      );

      await user.click(await screen.findByRole("button", { name: /j.ai compris, je continue/i }));
      await user.click(screen.getByRole("button", { name: /j.ai compris, je continue/i }));

      // Je manipule : 15 000, 20 000, 25 000, __ -> 30 000
      expect(await screen.findByRole("heading", { name: /continue la suite/i })).toBeInTheDocument();
      await user.type(screen.getByRole("spinbutton"), "30000");
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /continuer/i }));

      // Exemple guidé
      await user.click(await screen.findByRole("button", { name: /j.ai compris, je continue/i }));

      // Je m'entraîne : 3 000, 3 500, __, 4 500 -> 4 000
      expect(await screen.findByRole("heading", { name: /complète la suite/i })).toBeInTheDocument();
      await user.type(screen.getByRole("spinbutton"), "4000");
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /continuer/i }));

      // Je réfléchis : arrondis 24 638 au millier (essaie 24 000 d'abord, puis corrige avec 25 000)
      expect(await screen.findByRole("heading", { name: /arrondis au millier/i })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "24 000" }));
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(screen.getByText(/regarde le chiffre des centaines/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "25 000" }));
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /continuer/i }));

      // Mini-jeu : atteins la borne la plus proche (47 350 -> 50 000)
      expect(await screen.findByRole("heading", { name: /atteins la borne la plus proche/i })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "50 000" }));
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: /continuer/i }));

      // Je retiens
      await user.click(await screen.findByRole("button", { name: /j.ai compris, je continue/i }));

      // Je vérifie : arrondis 63 020 à la centaine -> 63 000
      expect(await screen.findByRole("heading", { name: /arrondis à la centaine/i })).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "63 000" }));
      await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
      expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /terminer la leçon/i }));
      expect(await screen.findByRole("heading", { name: /leçon réussie/i })).toBeInTheDocument();
    },
    20000,
  );

  it("affiche une page d'erreur pour un module ou une leçon introuvable", () => {
    renderAt("/app/apprentissages/primaire/4/mathematiques/modules/MATH-4P-U99");
    expect(screen.getByRole("heading", { name: /module n'existe pas/i })).toBeInTheDocument();

    renderAt(
      "/app/apprentissages/primaire/4/mathematiques/modules/MATH-4P-U01/lecons/MATH-4P-U01-L99",
    );
    expect(screen.getByRole("heading", { name: /leçon n'est pas disponible/i })).toBeInTheDocument();
  });

  it("complète l'évaluation de l'unité 1 puis enregistre l'auto-évaluation", async () => {
    const [l1, l2, l3, l4] = PRIMARY_FOUR_MODULES[0].lessons;
    let progress = createEmptyCourseProgress(PRIMARY_FOUR_COURSE.id);
    for (const lesson of [l1, l2, l3, l4]) {
      progress = lesson.steps.reduce((current, step) => completeLearningStep(current, lesson, step.id, true), progress);
    }
    createLocalCourseProgressStorage(localStorage, PRIMARY_FOUR_COURSE.id).save(progress);

    const user = userEvent.setup();
    renderAt(
      "/app/apprentissages/primaire/4/mathematiques/modules/MATH-4P-U01/lecons/MATH-4P-U01-EVAL",
    );

    expect(await screen.findByText(/3 dizaines de mille, 5 unités de mille/i)).toBeInTheDocument();
    await user.type(screen.getByRole("spinbutton"), "35027");
    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    await user.click(await screen.findByRole("button", { name: /continuer/i }));

    expect(await screen.findByRole("heading", { name: /question 2/i })).toBeInTheDocument();
    await user.click(screen.getByText("quarante-cinq mille deux cent dix", { selector: "button" }));
    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    await user.click(await screen.findByRole("button", { name: /continuer/i }));

    expect(await screen.findByRole("heading", { name: /question 3/i })).toBeInTheDocument();
    for (const value of [18520, 80125, 81025, 81250]) {
      await user.click(screen.getByRole("button", { name: `Placer le nombre ${formatNumber(value, "fr")}` }));
    }
    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    await user.click(await screen.findByRole("button", { name: /continuer/i }));

    expect(await screen.findByRole("heading", { name: /question 4/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "25 000" }));
    await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    await user.click(await screen.findByRole("button", { name: /continuer/i }));

    expect(await screen.findByRole("heading", { name: /comment as-tu réussi/i })).toBeInTheDocument();
    const finishButton = screen.getByRole("button", { name: /valider mon auto-évaluation/i });
    expect(finishButton).toBeDisabled();
    await user.click(screen.getByLabelText(/réussi seul/i));
    expect(finishButton).toBeEnabled();
    await user.click(finishButton);

    expect(await screen.findByRole("heading", { name: /évaluation réussie/i })).toBeInTheDocument();
    const stored = createLocalCourseProgressStorage(localStorage, PRIMARY_FOUR_COURSE.id).load();
    expect(stored.items["MATH-4P-U01-EVAL"].completed).toBe(true);

    // L'unité 1 est intégralement terminée : l'action principale propose le module suivant.
    renderAt("/app/apprentissages/primaire/4/mathematiques");
    expect(screen.getByRole("link", { name: /module suivant/i })).toHaveAttribute(
      "href",
      "/app/apprentissages/primaire/4/mathematiques/modules/MATH-4P-U02",
    );
  });

  it("propose le module 4e primaire depuis le menu de navigation", async () => {
    const user = userEvent.setup();
    renderAt("/app");
    await user.click(screen.getByRole("button", { name: /cours primaires/i }));
    expect(screen.getByRole("link", { name: /4e primaire/i })).toHaveAttribute(
      "href",
      "/app/apprentissages/primaire/4/mathematiques",
    );
  });
});
