import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GameCard } from "./GameCard";
import { gameCatalogue } from "./game-catalogue";

const turboPulse = gameCatalogue.find((game) => game.id === "turbo-pulse")!;
const grilleMagique = gameCatalogue.find((game) => game.id === "grille-magique")!;

function renderCard(game: typeof turboPulse) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<GameCard game={game} />} />
        <Route path={game.href} element={<p>Destination atteinte : {game.href}</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("GameCard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ouvre Turbo Pulse dans la page, sans plein écran ni navigation, comme les Tuiles magiques", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    document.documentElement.requestFullscreen = requestFullscreen;
    const onOpen = vi.fn();

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<GameCard game={turboPulse} onOpen={onOpen} />} />
          <Route path={turboPulse.href} element={<p>Destination atteinte : {turboPulse.href}</p>} />
        </Routes>
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("link", { name: /Jouer à/ }));

    expect(onOpen).toHaveBeenCalledWith(turboPulse);
    expect(requestFullscreen).not.toHaveBeenCalled();
    expect(screen.queryByText(`Destination atteinte : ${turboPulse.href}`)).not.toBeInTheDocument();
  });

  it("signale le survol à la souris et sa fin, pour précharger le jeu ; ni le toucher ni le focus ne préchargent", async () => {
    const onIntent = vi.fn();
    const onIntentEnd = vi.fn();
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <GameCard game={turboPulse} onOpen={() => undefined} onIntent={onIntent} onIntentEnd={onIntentEnd} />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /Jouer à/ });
    await user.hover(link);
    expect(onIntent).toHaveBeenCalledWith("turbo-pulse", expect.any(Function));
    await user.unhover(link);
    expect(onIntentEnd).toHaveBeenCalledWith("turbo-pulse");
    onIntent.mockClear();
    // Écran tactile : le doigt qui arrive sur la carte n'est pas un survol, rien n'est préchargé.
    await user.pointer({ keys: "[TouchA]", target: link });
    // Clavier : le focus seul ne précharge pas non plus (le clic ou Entrée ouvre le jeu, qui se charge normalement).
    await user.tab();
    expect(onIntent).not.toHaveBeenCalled();
  });

  it("garde l'adresse du jeu comme vrai lien quand rien n'ouvre le jeu sur place", async () => {
    const user = userEvent.setup();
    renderCard(turboPulse);

    await user.click(screen.getByRole("link", { name: /Jouer à/ }));

    expect(await screen.findByText(`Destination atteinte : ${turboPulse.href}`)).toBeInTheDocument();
  });

  it("ne tente aucun plein écran pour les autres jeux React", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    document.documentElement.requestFullscreen = requestFullscreen;

    const user = userEvent.setup();
    renderCard(grilleMagique);

    await user.click(screen.getByRole("link", { name: /Jouer à/ }));

    expect(requestFullscreen).not.toHaveBeenCalled();
    expect(await screen.findByText(`Destination atteinte : ${grilleMagique.href}`)).toBeInTheDocument();
  });
});
