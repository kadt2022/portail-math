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

  it("tente le plein écran et le verrouillage paysage avant de naviguer vers Turbo Pulse", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    document.documentElement.requestFullscreen = requestFullscreen;
    const lock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, "screen", { value: { orientation: { lock } }, configurable: true });

    const user = userEvent.setup();
    renderCard(turboPulse);

    await user.click(screen.getByRole("link", { name: "Jouer" }));

    expect(requestFullscreen).toHaveBeenCalledOnce();
    expect(lock).toHaveBeenCalledWith("landscape");
    expect(await screen.findByText(`Destination atteinte : ${turboPulse.href}`)).toBeInTheDocument();
  });

  it("navigue quand même si le verrouillage d'orientation est refusé", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    document.documentElement.requestFullscreen = requestFullscreen;
    const lock = vi.fn().mockRejectedValue(new Error("non supporté"));
    Object.defineProperty(window, "screen", { value: { orientation: { lock } }, configurable: true });

    const user = userEvent.setup();
    renderCard(turboPulse);

    await user.click(screen.getByRole("link", { name: "Jouer" }));

    expect(await screen.findByText(`Destination atteinte : ${turboPulse.href}`)).toBeInTheDocument();
  });

  it("navigue quand même si le plein écran est refusé par le navigateur", async () => {
    const requestFullscreen = vi.fn().mockRejectedValue(new Error("refusé"));
    document.documentElement.requestFullscreen = requestFullscreen;

    const user = userEvent.setup();
    renderCard(turboPulse);

    await user.click(screen.getByRole("link", { name: "Jouer" }));

    expect(await screen.findByText(`Destination atteinte : ${turboPulse.href}`)).toBeInTheDocument();
  });

  it("navigue quand même si l'API plein écran est absente du navigateur", async () => {
    // Pas de requestFullscreen sur documentElement (navigateur sans support) :
    // l'appel optionnel (?.()) ne doit jamais bloquer la navigation.
    Reflect.deleteProperty(document.documentElement, "requestFullscreen");

    const user = userEvent.setup();
    renderCard(turboPulse);

    await user.click(screen.getByRole("link", { name: "Jouer" }));

    expect(await screen.findByText(`Destination atteinte : ${turboPulse.href}`)).toBeInTheDocument();
  });

  it("ne tente aucun plein écran pour les autres jeux React", async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined);
    document.documentElement.requestFullscreen = requestFullscreen;

    const user = userEvent.setup();
    renderCard(grilleMagique);

    await user.click(screen.getByRole("link", { name: "Jouer" }));

    expect(requestFullscreen).not.toHaveBeenCalled();
    expect(await screen.findByText(`Destination atteinte : ${grilleMagique.href}`)).toBeInTheDocument();
  });
});
