import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18next } from "../../../i18n/i18n";
import { PRIMARY_THREE_EVALUATION_CONTENT, PRIMARY_THREE_LESSON_CONTENT } from "../content";
import type { ExerciseStepContent } from "../content/lesson-content";
import { InteractiveExercise } from "./InteractiveExercise";

const t = (key: string, options?: Record<string, unknown>) => i18next.t(key, { ns: "primaryThree", lng: "fr", ...options }) as string;

function lessonStep(lessonId: string, step: "manipulate" | "practice" | "reflect" | "play" | "check") {
  return PRIMARY_THREE_LESSON_CONTENT[lessonId][step];
}

function renderStep(step: ExerciseStepContent, completed = false) {
  const onValidated = vi.fn();
  render(<InteractiveExercise {...step} completed={completed} onValidated={onValidated} />);
  return onValidated;
}

async function validate(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
}

describe("Nouveaux exercices interactifs de la 3e primaire", () => {
  beforeEach(async () => {
    cleanup();
    await i18next.changeLanguage("fr");
  });

  afterEach(() => cleanup());

  it("refuse une mauvaise réponse à choix textuel puis accepte la bonne", async () => {
    const user = userEvent.setup();
    const step = lessonStep("MATH-3P-U07-L01", "reflect");
    const exercise = step.exercise;
    if (exercise.kind !== "text-choice") throw new Error("text-choice attendu");
    const onValidated = renderStep(step);

    const wrong = exercise.choiceKeys.findIndex((_, index) => index !== exercise.answerIndex);
    await user.click(screen.getByRole("button", { name: t(exercise.choiceKeys[wrong]) }));
    await validate(user);
    expect(onValidated).not.toHaveBeenCalled();
    expect(screen.getByText(t(step.hintKey))).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: t(exercise.choiceKeys[exercise.answerIndex]) }));
    await validate(user);
    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("repart d'une réponse vide quand deux questions numériques se suivent", async () => {
    const user = userEvent.setup();
    const first = lessonStep("MATH-3P-U02-L01", "practice");
    const second = lessonStep("MATH-3P-U02-L01", "reflect");
    const onValidated = vi.fn();
    const { rerender } = render(<InteractiveExercise {...first} completed={false} onValidated={onValidated} />);

    await user.type(screen.getByRole("spinbutton"), "165");
    rerender(<InteractiveExercise {...second} completed={false} onValidated={onValidated} />);
    expect(screen.getByRole("spinbutton")).toHaveValue(null);
  });

  it("affiche l'indice renforcé à la deuxième erreur", async () => {
    const user = userEvent.setup();
    const step = lessonStep("MATH-3P-U07-L01", "reflect");
    renderStep(step);
    await validate(user);
    await validate(user);
    expect(screen.getByText(t(step.strongHintKey))).toBeInTheDocument();
  });

  it("construit 6 groupes de 5 avec les compteurs", async () => {
    const user = userEvent.setup();
    const onValidated = renderStep(lessonStep("MATH-3P-U04-L01", "manipulate"));

    await validate(user);
    expect(onValidated).not.toHaveBeenCalled();

    for (let index = 0; index < 5; index += 1) await user.click(screen.getByRole("button", { name: "Ajouter un groupe" }));
    for (let index = 0; index < 4; index += 1) await user.click(screen.getByRole("button", { name: "Ajouter un objet dans chaque groupe" }));
    expect(screen.getByText("6 groupes de 5 font 30")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Enlever un groupe" }));
    await user.click(screen.getByRole("button", { name: "Ajouter un groupe" }));
    await validate(user);
    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("partage 26 oranges, masque les compteurs et vérifie les réponses écrites", async () => {
    const user = userEvent.setup();
    const onValidated = renderStep(lessonStep("MATH-3P-U04-L04", "manipulate"));

    for (let mango = 1; mango <= 23; mango += 1) {
      await user.click(screen.getByRole("button", { name: `Sélectionner l'orange ${mango}` }));
      await user.click(screen.getByRole("button", { name: `Déposer dans Panier ${((mango - 1) % 4) + 1}` }));
    }
    expect(screen.queryByText(/Panier 1 :/)).not.toBeInTheDocument();
    await validate(user);
    expect(onValidated).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Sélectionner l'orange 24" }));
    await user.click(screen.getByRole("button", { name: "Déposer dans Panier 4" }));
    await user.type(screen.getByRole("spinbutton", { name: "Nombre d'oranges dans chaque panier" }), "5");
    await user.type(screen.getByRole("spinbutton", { name: "Nombre d'oranges dans le panier de départ" }), "2");
    await validate(user);
    expect(onValidated).not.toHaveBeenCalled();

    const perBasket = screen.getByRole("spinbutton", { name: "Nombre d'oranges dans chaque panier" });
    await user.clear(perBasket);
    await user.type(perBasket, "6");
    await validate(user);
    expect(onValidated).toHaveBeenCalledOnce();
  }, 30000);

  it("explique pourquoi les deux oranges restantes ne peuvent pas être distribuées", async () => {
    const user = userEvent.setup();
    const step = lessonStep("MATH-3P-U04-L04", "reflect");
    const exercise = step.exercise;
    if (exercise.kind !== "text-choice") throw new Error("text-choice attendu");
    const onValidated = renderStep(step);

    await user.click(screen.getByRole("button", { name: t(exercise.choiceKeys[1]) }));
    await validate(user);
    expect(onValidated).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: t(exercise.choiceKeys[0]) }));
    await validate(user);
    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("forme 2 000 FC avec des cartes et refuse trop de cartes", async () => {
    const user = userEvent.setup();
    const onValidated = renderStep(lessonStep("MATH-3P-U06-L01", "manipulate"));

    await user.click(screen.getByRole("button", { name: "Poser une carte de 1000 FC" }));
    await validate(user);
    expect(onValidated).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Poser une carte de 1000 FC" }));
    expect(screen.getByText("Total posé : 2000 FC avec 2 cartes")).toBeInTheDocument();
    await validate(user);
    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("limite le nombre de cartes quand la consigne le demande", async () => {
    const user = userEvent.setup();
    const onValidated = renderStep(lessonStep("MATH-3P-U06-L01", "play"));

    // 3 × 500 + 2 × 100 = 1 700 FC, mais avec 5 cartes : refusé.
    for (let index = 0; index < 3; index += 1) await user.click(screen.getByRole("button", { name: "Poser une carte de 500 FC" }));
    for (let index = 0; index < 2; index += 1) await user.click(screen.getByRole("button", { name: "Poser une carte de 100 FC" }));
    expect(screen.getByText("Total posé : 1700 FC avec 5 cartes")).toBeInTheDocument();
    await validate(user);
    expect(onValidated).not.toHaveBeenCalled();
    expect(screen.getByText(/4 cartes au plus/)).toBeInTheDocument();

    // 1 000 + 500 + 100 + 100 = 1 700 FC avec 4 cartes : accepté.
    for (let index = 0; index < 2; index += 1) await user.click(screen.getByRole("button", { name: "Retirer une carte de 500 FC" }));
    await user.click(screen.getByRole("button", { name: "Poser une carte de 1000 FC" }));
    await validate(user);
    expect(onValidated).toHaveBeenCalledOnce();
  }, 30000);

  it("colorie la moitié d'une bande de quatre parts", async () => {
    const user = userEvent.setup();
    const onValidated = renderStep(lessonStep("MATH-3P-U05-L01", "manipulate"));

    await user.click(screen.getByRole("button", { name: "Part 1" }));
    await validate(user);
    expect(onValidated).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Part 2" }));
    await user.click(screen.getByRole("button", { name: "Part 3" }));
    await user.click(screen.getByRole("button", { name: "Part 3" }));
    expect(screen.getByText("Parts coloriées : 2 sur 4")).toBeInTheDocument();
    await validate(user);
    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("règle l'horloge sur 8 h 15", async () => {
    const user = userEvent.setup();
    const onValidated = renderStep(lessonStep("MATH-3P-U09-L01", "manipulate"));

    await validate(user);
    expect(onValidated).not.toHaveBeenCalled();
    for (let index = 0; index < 4; index += 1) await user.click(screen.getByRole("button", { name: "Enlever une heure" }));
    for (let index = 0; index < 3; index += 1) await user.click(screen.getByRole("button", { name: "Ajouter 5 minutes" }));
    expect(screen.getByRole("status", { name: "Minutes" }).textContent).toBe("15");
    await validate(user);
    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("guide le pion sur le quadrillage sans sortir de la carte", async () => {
    const user = userEvent.setup();
    const onValidated = renderStep(lessonStep("MATH-3P-U08-L04", "manipulate"));

    await user.click(screen.getByRole("button", { name: "Gauche" }));
    await user.click(screen.getByRole("button", { name: "Bas" }));
    expect(screen.getByText("Déplacements : 0")).toBeInTheDocument();

    for (let index = 0; index < 3; index += 1) await user.click(screen.getByRole("button", { name: "Droite" }));
    await validate(user);
    expect(onValidated).not.toHaveBeenCalled();
    for (let index = 0; index < 2; index += 1) await user.click(screen.getByRole("button", { name: "Haut" }));
    expect(screen.getByText("Déplacements : 5")).toBeInTheDocument();
    await validate(user);
    expect(onValidated).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Revenir au départ" }));
    expect(screen.getByText("Déplacements : 0")).toBeInTheDocument();
  });

  it("remet les étapes d'un horaire dans l'ordre et permet de retirer une étape", async () => {
    const user = userEvent.setup();
    const step = lessonStep("MATH-3P-U09-L04", "manipulate");
    const exercise = step.exercise;
    if (exercise.kind !== "step-order") throw new Error("step-order attendu");
    const onValidated = renderStep(step);

    const labels = exercise.stepKeys.map((key) => t(key));
    await user.click(screen.getByRole("button", { name: labels[1] }));
    await validate(user);
    expect(onValidated).not.toHaveBeenCalled();

    await user.click(within(screen.getByRole("list", { name: "Étapes déjà rangées" })).getByRole("button", { name: `Retirer l'étape : ${labels[1]}` }));
    for (const label of labels) await user.click(screen.getByRole("button", { name: label }));
    await validate(user);
    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("pose une addition en colonnes et vérifie chaque chiffre du résultat", async () => {
    const user = userEvent.setup();
    const onValidated = renderStep(lessonStep("MATH-3P-U02-L02", "manipulate"));

    await user.type(screen.getByRole("textbox", { name: "Chiffre des unités" }), "7");
    await user.type(screen.getByRole("textbox", { name: "Chiffre des dizaines" }), "7");
    await validate(user);
    expect(onValidated).not.toHaveBeenCalled();

    await user.type(screen.getByRole("textbox", { name: "Chiffre des centaines" }), "x3");
    expect(screen.getByRole("textbox", { name: "Chiffre des centaines" })).toHaveValue("3");
    await validate(user);
    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("pose une multiplication en colonnes", async () => {
    const user = userEvent.setup();
    const onValidated = renderStep(lessonStep("MATH-3P-U04-L03", "practice"));

    await user.type(screen.getByRole("textbox", { name: "Chiffre des unités" }), "4");
    await user.type(screen.getByRole("textbox", { name: "Chiffre des dizaines" }), "8");
    await validate(user);
    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("pose une soustraction en colonnes", async () => {
    const user = userEvent.setup();
    const onValidated = renderStep(lessonStep("MATH-3P-U03-L02", "practice"));

    await user.type(screen.getByRole("textbox", { name: "Chiffre des unités" }), "3");
    await user.type(screen.getByRole("textbox", { name: "Chiffre des dizaines" }), "2");
    await user.type(screen.getByRole("textbox", { name: "Chiffre des centaines" }), "5");
    await validate(user);
    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("affiche l'unité à côté de la réponse et la règle graduée", async () => {
    const user = userEvent.setup();
    const onValidated = renderStep(lessonStep("MATH-3P-U07-L01", "check"));

    expect(screen.getByRole("img", { name: /règle/i })).toBeInTheDocument();
    expect(screen.getByText("cm", { selector: "span" })).toBeInTheDocument();
    await user.type(screen.getByRole("spinbutton"), "9");
    await validate(user);
    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("affiche un tableau et un pictogramme lisibles", () => {
    renderStep(lessonStep("MATH-3P-U10-L01", "manipulate"));
    expect(screen.getByRole("columnheader", { name: "Votes" })).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "Mangue" })).toBeInTheDocument();
    cleanup();

    renderStep(lessonStep("MATH-3P-U10-L01", "practice"));
    expect(screen.getByRole("group", { name: "Pictogramme" })).toBeInTheDocument();
    expect(screen.getByText("1 dessin vaut 2 votes")).toBeInTheDocument();
    expect(screen.getByLabelText("3 symboles")).toBeInTheDocument();
  });

  it("affiche les illustrations de bande, d'horloge, de rectangle et de solides", () => {
    renderStep(lessonStep("MATH-3P-U05-L03", "manipulate"));
    expect(screen.getAllByRole("img", { name: /bande de/i })).toHaveLength(2);
    cleanup();

    renderStep(lessonStep("MATH-3P-U09-L01", "check"));
    expect(screen.getByRole("img", { name: /horloge/i })).toBeInTheDocument();
    cleanup();

    renderStep(lessonStep("MATH-3P-U07-L04", "practice"));
    expect(screen.getByLabelText("Rectangle avec ses deux dimensions")).toBeInTheDocument();
    cleanup();

    for (const [lessonId, name] of [
      ["MATH-3P-U08-L01", /segment/i],
      ["MATH-3P-U08-L03", /cube/i],
    ] as const) {
      renderStep(lessonStep(lessonId, "manipulate"));
      expect(screen.getByRole("img", { name })).toBeInTheDocument();
      cleanup();
    }
  });

  it("affiche chaque étape déjà réussie sans bouton de validation", () => {
    const steps = [
      ...Object.values(PRIMARY_THREE_LESSON_CONTENT).flatMap((content) => [content.manipulate, content.practice, content.reflect, content.play, content.check]),
      ...Object.values(PRIMARY_THREE_EVALUATION_CONTENT).flatMap((content) => content.items),
    ];
    for (const step of steps) {
      const onValidated = renderStep(step, true);
      expect(onValidated).not.toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: /vérifier ma réponse/i })).not.toBeInTheDocument();
      cleanup();
    }
  }, 60000);
});
