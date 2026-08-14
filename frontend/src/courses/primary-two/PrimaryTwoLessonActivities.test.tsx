import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18next } from "../../i18n/i18n";
import type { LessonStepKind } from "../course-engine/course-model";
import { PrimaryTwoLessonActivity } from "./PrimaryTwoLessonActivities";

function renderActivity(kind: LessonStepKind, completed = false) {
  const onValidated = vi.fn();
  render(
    <PrimaryTwoLessonActivity
      kind={kind}
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
});
