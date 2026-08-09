import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";

import { GrilleMagiquePage } from "./GrilleMagiquePage";

// Math.random figé à 0 : generateGridSpec/createInitialState (appelés sans
// rng explicite par le composant) deviennent alors entièrement déterministes,
// ce qui permet de cibler des tuiles précises par leur libellé accessible
// plutôt que de dépendre d'une disposition aléatoire à chaque exécution.
function renderGame() {
  return render(
    <BrowserRouter>
      <GrilleMagiquePage />
    </BrowserRouter>,
  );
}

function movesValue() {
  const stats = screen.getAllByRole("term").map((term) => term.closest("div"));
  const movesItem = stats.find((item) => item && within(item).queryByText("Déplacements"));
  return movesItem ? within(movesItem).getByRole("definition").textContent : null;
}

describe("Les Tuiles magiques", () => {
  beforeEach(() => {
    vi.spyOn(Math, "random").mockReturnValue(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("affiche la consigne de référence et un unique h1", () => {
    renderGame();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByText(
        "Révèle la carte magique, puis fais glisser les tuiles pour respecter toutes les opérations. Ramène la case vide au centre et pose la carte pour valider ta grille.",
      ),
    ).toBeInTheDocument();
  });

  it("révèle la carte sans changer le statut ni les coups", async () => {
    const user = userEvent.setup();
    renderGame();

    const hiddenCard = screen.getByRole("button", { name: "Carte magique, valeur cachée. Appuie pour la révéler." });
    await user.click(hiddenCard);

    expect(screen.getByRole("button", { name: /Carte magique révélée/ })).toBeInTheDocument();
    expect(movesValue()).toBe("0");
    expect(screen.queryByText("Bravo ! Toutes les égalités sont vérifiées.")).not.toBeInTheDocument();
  });

  it("un déplacement légal met à jour le compteur de coups", async () => {
    const user = userEvent.setup();
    renderGame();

    const movableTile = screen.getByRole("button", {
      name: "Ligne 1, colonne 2, valeur 2, déplaçable vers la case vide.",
    });
    await user.click(movableTile);

    expect(movesValue()).toBe("1");
  });

  it("un coup illégal (case non voisine) est ignoré", () => {
    renderGame();
    const blockedTile = screen.getByRole("button", {
      name: "Ligne 2, colonne 2, valeur 3, non déplaçable.",
    });
    expect(blockedTile).toBeDisabled();
    expect(movesValue()).toBe("0");
  });

  it("active une tuile déplaçable au clavier (Entrée)", async () => {
    const user = userEvent.setup();
    renderGame();

    const movableTile = screen.getByRole("button", {
      name: "Ligne 1, colonne 2, valeur 2, déplaçable vers la case vide.",
    });
    movableTile.focus();
    await user.keyboard("{Enter}");

    expect(movesValue()).toBe("1");
  });

  it("refuse la pose de la carte tant que la case vide n'est pas au centre", async () => {
    const user = userEvent.setup();
    renderGame();

    await user.click(
      screen.getByRole("button", { name: "Carte magique, valeur cachée. Appuie pour la révéler." }),
    );
    expect(screen.getByText("Ramène la case vide au centre pour pouvoir poser la carte.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Carte magique révélée/ }));
    expect(screen.queryByText("Bravo ! Toutes les égalités sont vérifiées.")).not.toBeInTheDocument();
  });

  it("accepte une disposition valide et ajoute le score, sans révéler la solution avant la pose", async () => {
    const user = userEvent.setup();
    renderGame();

    // ramène la case vide au centre par deux déplacements légaux successifs
    await user.click(
      screen.getByRole("button", { name: "Ligne 1, colonne 2, valeur 2, déplaçable vers la case vide." }),
    );
    await user.click(
      screen.getByRole("button", { name: "Ligne 2, colonne 2, valeur 3, déplaçable vers la case vide." }),
    );

    await user.click(
      screen.getByRole("button", { name: "Carte magique, valeur cachée. Appuie pour la révéler." }),
    );
    expect(screen.getByText("La case vide est au centre : pose la carte pour valider ta grille.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Carte magique révélée/ }));

    expect(screen.getByText("Bravo ! Toutes les égalités sont vérifiées.")).toBeInTheDocument();
    const scoreItem = screen.getAllByRole("term").map((t) => t.closest("div")).find((item) => item && within(item).queryByText("Score"));
    expect(scoreItem).toBeTruthy();
    expect(within(scoreItem as HTMLElement).getByRole("definition").textContent).not.toBe("0");
  });

  it("refuse une disposition invalide, indique les lignes en cause sans révéler la solution, et reste jouable", async () => {
    const user = userEvent.setup();
    renderGame();

    // ramène la case vide au centre par un chemin différent, aboutissant à
    // une disposition qui ne respecte pas toutes les égalités
    await user.click(
      screen.getByRole("button", { name: "Ligne 2, colonne 1, valeur 5, déplaçable vers la case vide." }),
    );
    await user.click(
      screen.getByRole("button", { name: "Ligne 2, colonne 2, valeur 3, déplaçable vers la case vide." }),
    );

    await user.click(
      screen.getByRole("button", { name: "Carte magique, valeur cachée. Appuie pour la révéler." }),
    );
    await user.click(screen.getByRole("button", { name: /Carte magique révélée/ }));

    expect(
      screen.getByText("Certaines égalités ne sont pas encore correctes. Continue à déplacer les tuiles."),
    ).toBeInTheDocument();
    expect(screen.getByText("Ligne 1 incorrecte.")).toBeInTheDocument();
    expect(screen.queryByText("Bravo ! Toutes les égalités sont vérifiées.")).not.toBeInTheDocument();

    // la partie reste jouable : un nouveau déplacement légal est toujours possible
    const stillPlayable = screen.getAllByRole("button", { name: /déplaçable vers la case vide/ });
    expect(stillPlayable.length).toBeGreaterThan(0);
  });
});
