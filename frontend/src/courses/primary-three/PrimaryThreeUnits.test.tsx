import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, beforeAll } from "vitest";

import { AppRouter } from "../../app/AppRouter";
import { preloadRoutes } from "../../app/LazyRoute";
import { i18next } from "../../i18n/i18n";
import { completeLearningStep, createEmptyCourseProgress } from "../course-engine/course-progress";
import { resetSessionCourseProgress, setSessionCourseProgress } from "../course-engine/useCourseProgress";
import { PRIMARY_THREE_EVALUATION_CONTENT, PRIMARY_THREE_LESSON_CONTENT } from "./content";
import { PRIMARY_THREE_COURSE, PRIMARY_THREE_MODULES } from "./course-catalogue";

// Les pages sont chargées à la demande (LEO-PERF-02) : on les précharge pour garder des tests synchrones.
beforeAll(() => preloadRoutes());

const BASE = "/app/apprentissages/primaire/3/mathematiques/modules";
type User = ReturnType<typeof userEvent.setup>;

const t = (key: string) => i18next.t(key, { ns: "primaryThree", lng: "fr" }) as string;

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<AppRouter />);
}

async function confirm(user: User) {
  await user.click(await screen.findByRole("button", { name: /j.ai compris, je continue/i }));
}

async function checkAnswer(user: User) {
  await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
  expect(await screen.findByText(/activité est réussie/i)).toBeInTheDocument();
}

async function next(user: User) {
  await user.click(screen.getByRole("button", { name: /continuer/i }));
}

async function answerNumber(user: User, value: string) {
  await user.type(await screen.findByRole("spinbutton"), value);
  await checkAnswer(user);
}

async function answerChoice(user: User, label: string) {
  await user.click(await screen.findByRole("button", { name: label }));
  await checkAnswer(user);
}

function correctChoiceLabel(step: { exercise: { kind: string; choiceKeys?: readonly string[]; answerIndex?: number } }) {
  if (step.exercise.kind !== "text-choice" || !step.exercise.choiceKeys || step.exercise.answerIndex === undefined) {
    throw new Error("text-choice attendu");
  }
  return t(step.exercise.choiceKeys[step.exercise.answerIndex]);
}

function completeUnit(unitIndex: number) {
  let progress = createEmptyCourseProgress(PRIMARY_THREE_COURSE.id);
  for (const module of PRIMARY_THREE_MODULES.slice(0, unitIndex)) {
    for (const lesson of module.lessons) {
      progress = lesson.steps.reduce((current, step) => completeLearningStep(current, lesson, step.id, true), progress);
    }
  }
  setSessionCourseProgress(progress);
}

describe("Parcours complet des unités 2 à 10 de la 3e primaire", () => {
  beforeEach(async () => {
    cleanup();
    resetSessionCourseProgress();
    localStorage.clear();
    await i18next.changeLanguage("fr");
  });

  afterEach(() => cleanup());

  it(
    "termine la leçon 1 de l'unité 2 (calcul mental) en neuf étapes",
    async () => {
      const user = userEvent.setup();
      renderAt(`${BASE}/MATH-3P-U02/lecons/MATH-3P-U02-L01`);

      expect(await screen.findByText(/120 bouchons puis 35 autres/i)).toBeInTheDocument();
      await confirm(user);
      await confirm(user);

      // Je manipule : 230 + 40 + 6 = 276
      expect(await screen.findByRole("heading", { name: /je manipule/i })).toBeInTheDocument();
      for (const [label, count] of [["Centaines", 2], ["Dizaines", 7], ["Unités", 6]] as const) {
        for (let index = 0; index < count; index += 1) {
          await user.click(screen.getByRole("button", { name: `Ajouter une plaque ou un bâtonnet à ${label}` }));
        }
      }
      await checkAnswer(user);
      await next(user);

      await confirm(user);

      await answerNumber(user, "165");
      await next(user);
      await answerNumber(user, "204");
      await next(user);

      // Mini-jeu : choisir les bons bonds
      await answerChoice(user, correctChoiceLabel(PRIMARY_THREE_LESSON_CONTENT["MATH-3P-U02-L01"].play));
      await next(user);

      await confirm(user);

      // Je vérifie : le bon résultat parmi trois propositions
      await answerChoice(user, "155");
      await user.click(screen.getByRole("button", { name: /terminer la leçon/i }));
      expect(await screen.findByRole("heading", { name: /leçon réussie/i })).toBeInTheDocument();
    },
    30000,
  );

  it(
    "passe l'évaluation de l'unité 2 puis enchaîne vers l'unité 3",
    async () => {
      completeUnit(2);
      const user = userEvent.setup();
      renderAt(`${BASE}/MATH-3P-U02/lecons/MATH-3P-U02-EVAL`);

      expect(await screen.findByText(/145 \+ 20/)).toBeInTheDocument();
      for (const answer of ["165", "577", "435", "55"]) {
        await answerNumber(user, answer);
        await next(user);
      }
      await user.click(await screen.findByLabelText(/réussi seul/i));
      await user.click(screen.getByRole("button", { name: /valider mon auto-évaluation/i }));

      expect(await screen.findByRole("heading", { name: /évaluation réussie/i })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /module suivant/i })).toHaveAttribute("href", `${BASE}/MATH-3P-U03`);
    },
    30000,
  );

  it(
    "joue une leçon de multiplication avec des groupes égaux puis la table de 5",
    async () => {
      const user = userEvent.setup();
      renderAt(`${BASE}/MATH-3P-U04/lecons/MATH-3P-U04-L01`);

      await confirm(user);
      await confirm(user);

      for (let index = 0; index < 5; index += 1) await user.click(await screen.findByRole("button", { name: "Ajouter un groupe" }));
      for (let index = 0; index < 4; index += 1) await user.click(screen.getByRole("button", { name: "Ajouter un objet dans chaque groupe" }));
      await checkAnswer(user);
      await next(user);

      await confirm(user);
      await answerNumber(user, "14");
      await next(user);
      await answerNumber(user, "9");
      await next(user);

      // Mini-jeu : 4 rangées de 10
      for (let index = 0; index < 3; index += 1) await user.click(await screen.findByRole("button", { name: "Ajouter un groupe" }));
      for (let index = 0; index < 9; index += 1) await user.click(screen.getByRole("button", { name: "Ajouter un objet dans chaque groupe" }));
      await checkAnswer(user);
      await next(user);

      await confirm(user);
      await answerChoice(user, "40");
      await user.click(screen.getByRole("button", { name: /terminer la leçon/i }));
      expect(await screen.findByRole("heading", { name: /leçon réussie/i })).toBeInTheDocument();
    },
    30000,
  );

  it(
    "propose en anglais les textes de la leçon de monnaie",
    async () => {
      await i18next.changeLanguage("en");
      renderAt(`${BASE}/MATH-3P-U06/lecons/MATH-3P-U06-L03`);

      expect(await screen.findByText(/costs 2,650 FC and you hand over 3,000 FC/i)).toBeInTheDocument();
      expect(screen.queryByText(/indisponible|unavailable in English/i)).not.toBeInTheDocument();
    },
    15000,
  );

  it(
    "termine l'évaluation de l'unité 10 sans proposer de module suivant",
    async () => {
      completeUnit(10);
      const user = userEvent.setup();
      renderAt(`${BASE}/MATH-3P-U10/lecons/MATH-3P-U10-EVAL`);

      const items = PRIMARY_THREE_EVALUATION_CONTENT["MATH-3P-U10-EVAL"].items;
      expect(await screen.findByText(/7 enfants choisissent A et 5 choisissent B/i)).toBeInTheDocument();
      await answerNumber(user, "2");
      await next(user);
      await answerNumber(user, "33");
      await next(user);
      await answerChoice(user, correctChoiceLabel(items[2]));
      await next(user);
      await answerChoice(user, correctChoiceLabel(items[3]));
      await next(user);
      await user.click(await screen.findByLabelText(/réussi avec un schéma/i));
      await user.click(screen.getByRole("button", { name: /valider mon auto-évaluation/i }));

      expect(await screen.findByRole("heading", { name: /évaluation réussie/i })).toBeInTheDocument();
      expect(screen.queryByRole("link", { name: /module suivant/i })).not.toBeInTheDocument();
    },
    30000,
  );
});
