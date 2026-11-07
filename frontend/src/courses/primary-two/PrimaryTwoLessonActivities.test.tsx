import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18next } from "../../i18n/i18n";
import type { LessonStepKind } from "../course-engine/course-model";
import { PrimaryTwoLessonActivity } from "./PrimaryTwoLessonActivities";

function renderActivity(kind: LessonStepKind, completed = false, lessonId?: string) {
  const onValidated = vi.fn();
  render(
    <PrimaryTwoLessonActivity
      kind={kind}
      lessonId={lessonId}
      completed={completed}
      onValidated={onValidated}
    />,
  );
  return onValidated;
}

describe("Activités interactives de la première leçon de 2e primaire", () => {
  beforeEach(async () => {
    cleanup();
    await i18next.changeLanguage("fr");
  });

  afterEach(() => cleanup());

  it("compose 17 avec les contrôles numériques et respecte leurs limites", () => {
    const onValidated = renderActivity("manipulate");
    const increaseButtons = screen.getAllByRole("button", { name: /ajouter un élément/i });
    const decreaseButtons = screen.getAllByRole("button", { name: /enlever un élément/i });

    expect(decreaseButtons[0]).toBeDisabled();
    expect(decreaseButtons[1]).toBeDisabled();

    fireEvent.click(increaseButtons[0]);
    fireEvent.click(increaseButtons[0]);
    expect(increaseButtons[0]).toBeDisabled();
    fireEvent.click(decreaseButtons[0]);

    for (let unit = 0; unit < 9; unit += 1) {
      fireEvent.click(increaseButtons[1]);
    }
    expect(increaseButtons[1]).toBeDisabled();
    fireEvent.click(decreaseButtons[1]);
    fireEvent.click(decreaseButtons[1]);

    expect(screen.getByLabelText("Paquets de 10")).toHaveTextContent("1");
    expect(screen.getByLabelText("Bâtonnets seuls")).toHaveTextContent("7");
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));

    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("refuse une stratégie au hasard puis valide le déplacement des objets", () => {
    const onValidated = renderActivity("understand");

    fireEvent.click(screen.getByLabelText(/je regarde vite/i));
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(screen.getByText(/sépare clairement ce qui est compté/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/je déplace chaque graine/i));
    expect(screen.queryByText(/sépare clairement ce qui est compté/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));

    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("corrige puis valide les trois exercices numériques", () => {
    const onValidated = renderActivity("practice");

    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(screen.getByText(/regarde les points par lignes/i)).toBeInTheDocument();

    const answers = screen.getAllByRole("spinbutton");
    fireEvent.change(answers[0], { target: { value: "12" } });
    fireEvent.change(answers[1], { target: { value: "3" } });
    fireEvent.change(answers[2], { target: { value: "16" } });
    expect(screen.queryByText(/regarde les points par lignes/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));

    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("replace toutes les cartes sur le sentier, y compris après un retrait", () => {
    const onValidated = renderActivity("play");

    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(screen.getByText(/regarde le nombre juste avant/i)).toBeInTheDocument();

    const placeCard = (card: number, before: number, after: number) => {
      fireEvent.click(screen.getByRole("button", { name: `Choisir la carte ${card}` }));
      expect(screen.getByText(`Carte ${card} sélectionnée`)).toBeInTheDocument();
      fireEvent.click(
        screen.getByRole("button", { name: `Maison vide entre ${before} et ${after}` }),
      );
    };

    placeCard(13, 12, 14);
    fireEvent.click(screen.getByRole("button", { name: /carte 13 placée entre 12 et 14/i }));
    fireEvent.click(screen.getByRole("button", { name: /maison vide entre 12 et 14/i }));
    placeCard(4, 3, 5);
    placeCard(19, 18, 20);
    placeCard(8, 7, 9);

    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("accepte aussi une carte glissée vers la bonne maison", () => {
    renderActivity("play");

    const card = screen.getByRole("button", { name: "Choisir la carte 4" });
    expect(card).toHaveAttribute("draggable", "true");
    fireEvent.drop(
      screen.getByRole("button", { name: "Maison vide entre 3 et 5" }),
      { dataTransfer: { getData: () => "4" } },
    );

    expect(screen.getByRole("button", { name: "Carte 4 placée entre 3 et 5" })).toBeInTheDocument();
  });

  it("refuse une mauvaise règle puis valide la règle à retenir", () => {
    const onValidated = renderActivity("remember");

    fireEvent.click(screen.getByLabelText(/je le laisse au milieu/i));
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(screen.getByText(/pense aux deux paniers/i)).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText(/je le déplace dans la zone/i));
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("affiche une activité terminée sans nouvelle action de validation", () => {
    const onValidated = renderActivity("play", true);

    expect(screen.getByText(/activité est réussie/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /vérifier ma réponse/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /choisir la carte/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /carte .* placée entre/i })).toHaveLength(4);
    expect(onValidated).not.toHaveBeenCalled();
  });

  it("retrouve le nombre entre 9 et 11 dans la deuxième leçon", () => {
    const onValidated = renderActivity("discover", false, "MATH-2P-U01-L02");

    fireEvent.click(screen.getByRole("button", { name: "10" }));
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));

    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("refuse de valider la suite de la deuxième leçon dans le désordre", () => {
    const onValidated = renderActivity("manipulate", false, "MATH-2P-U01-L02");

    fireEvent.click(screen.getByRole("button", { name: "7" }));
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(screen.getByText(/commence par 6/i)).toBeInTheDocument();
    expect(onValidated).not.toHaveBeenCalled();
  });

  it("libère une carte placée par erreur puis valide le bon ordre dans la deuxième leçon", () => {
    const onValidated = renderActivity("play", false, "MATH-2P-U01-L02");
    const slots = () => screen.getAllByRole("button", { name: /nombre entre/i });

    for (const [card, slot] of [["16", 0], ["19", 1], ["13", 2]] as const) {
      fireEvent.click(screen.getByRole("button", { name: card }));
      fireEvent.click(slots()[slot]);
    }
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(onValidated).not.toHaveBeenCalled();

    for (const slot of [0, 1, 2]) fireEvent.click(slots()[slot]);
    for (const [card, slot] of [["13", 0], ["16", 1], ["19", 2]] as const) {
      fireEvent.click(screen.getByRole("button", { name: card }));
      fireEvent.click(slots()[slot]);
    }
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("remplace la carte d'une case occupée quand une autre carte est choisie", () => {
    renderActivity("play", false, "MATH-2P-U01-L02");
    const slots = () => screen.getAllByRole("button", { name: /nombre entre/i });

    fireEvent.click(screen.getByRole("button", { name: "13" }));
    fireEvent.click(slots()[0]);
    fireEvent.click(screen.getByRole("button", { name: "16" }));
    fireEvent.click(slots()[0]);

    expect(screen.getByRole("button", { name: "13" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "16" })).not.toBeInTheDocument();
  });

  it("rend le panier gauche sélectionnable directement sur l'image de la troisième leçon", () => {
    const onValidated = renderActivity("discover", false, "MATH-2P-U01-L03");
    const leftChoices = screen.getAllByRole("button", { name: /panier de gauche/i });

    fireEvent.click(leftChoices[0]);

    expect(leftChoices[1]).toHaveAttribute("aria-pressed", "true");
    expect(leftChoices[1]).toHaveTextContent("✓");
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("affiche clairement le signe inférieur sélectionné quand l'étape est terminée", () => {
    renderActivity("manipulate", true, "MATH-2P-U01-L03");

    expect(screen.getByRole("button", { name: "<" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "=" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: ">" })).toHaveAttribute("aria-pressed", "false");
  });

  it("fait choisir l'autobus portant le plus petit nombre dans la quatrième leçon", () => {
    const onValidated = renderActivity("discover", false, "MATH-2P-U01-L04");

    fireEvent.click(screen.getByRole("button", { name: "5" }));
    expect(screen.getByRole("button", { name: "5" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));

    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("compose les paniers avec exactement 2, 7, 8 et 10 bananes", () => {
    renderActivity("practice", false, "MATH-2P-U01-L04");

    for (const count of [2, 7, 8, 10]) {
      const basket = screen.getByRole("button", { name: `Panier contenant ${count} bananes` });
      expect(basket.querySelectorAll("img")).toHaveLength(count + 1);
      expect(screen.getByRole("button", { name: `Case ${count}, vide` })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: "Case 6, vide" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Case 11, vide" })).not.toBeInTheDocument();
  });

  it("associe un panier de bananes à la case de même quantité", () => {
    renderActivity("practice", false, "MATH-2P-U01-L04");

    fireEvent.click(screen.getByRole("button", { name: "Panier contenant 2 bananes" }));
    fireEvent.click(screen.getByRole("button", { name: "Case 2, vide" }));

    expect(screen.getByRole("button", { name: "Case 2, panier de 2 bananes" })).toBeInTheDocument();
  });

  it("permet de ranger les cartes de la quatrième leçon par toucher", () => {
    const onValidated = renderActivity("manipulate", false, "MATH-2P-U01-L04");

    for (const [number, position] of [[5, 1], [9, 2], [12, 3], [17, 4]] as const) {
      fireEvent.click(screen.getByRole("button", { name: String(number) }));
      fireEvent.click(screen.getByRole("button", { name: `Position ${position}, vide` }));
    }
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));

    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("accepte le glisser-déposer d'une carte vers une case", () => {
    renderActivity("manipulate", false, "MATH-2P-U01-L04");
    const values: Record<string, string> = {};
    const dataTransfer = {
      setData: (type: string, value: string) => { values[type] = value; },
      getData: (type: string) => values[type] ?? "",
    };

    fireEvent.dragStart(screen.getByRole("button", { name: "5" }), { dataTransfer });
    fireEvent.drop(screen.getByRole("button", { name: "Position 1, vide" }), { dataTransfer });

    expect(screen.getByRole("button", { name: "Position 1, nombre 5" })).toBeInTheDocument();
  });
});

describe("Étapes des leçons 2 à 4 de 2e primaire", () => {
  const kinds: LessonStepKind[] = ["discover", "manipulate", "understand", "practice", "play", "remember"];
  const lessons = ["MATH-2P-U01-L02", "MATH-2P-U01-L03", "MATH-2P-U01-L04"];

  beforeEach(async () => {
    cleanup();
    await i18next.changeLanguage("fr");
  });

  afterEach(() => cleanup());

  for (const lessonId of lessons) {
    for (const kind of kinds) {
      it(`refuse une validation vide pour ${lessonId} / ${kind}`, () => {
        const onValidated = renderActivity(kind, false, lessonId);
        fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
        expect(onValidated).not.toHaveBeenCalled();
      });

      it(`affiche ${lessonId} / ${kind} comme terminée`, () => {
        const onValidated = renderActivity(kind, true, lessonId);
        expect(onValidated).not.toHaveBeenCalled();
        expect(screen.queryByRole("button", { name: /vérifier ma réponse/i })).not.toBeInTheDocument();
      });
    }
  }

  it("valide la relation entre 9 et 11 puis la règle à retenir de la leçon 2", () => {
    const onValidated = renderActivity("understand", false, "MATH-2P-U01-L02");
    fireEvent.click(screen.getByRole("radio", { name: /entre/i }));
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(onValidated).toHaveBeenCalledOnce();
  });

  it("corrige puis valide les trois champs numériques de la leçon 2", () => {
    const onValidated = renderActivity("practice", false, "MATH-2P-U01-L02");
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "14" } });
    fireEvent.change(inputs[1], { target: { value: "17" } });
    fireEvent.change(inputs[2], { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(onValidated).not.toHaveBeenCalled();
    fireEvent.change(screen.getAllByRole("spinbutton")[1], { target: { value: "18" } });
    fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));
    expect(onValidated).toHaveBeenCalledOnce();
  });
});
