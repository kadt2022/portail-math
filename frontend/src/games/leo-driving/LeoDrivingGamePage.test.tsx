import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import en from "../../i18n/locales/en/games.json";
import fr from "../../i18n/locales/fr/games.json";
import { gameCatalogue } from "../game-catalogue";
import type { LeoLivreurSnapshot } from "../../prototypes/leo-livreur/LeoLivreurGame";

const { controllerMock } = vi.hoisted(() => ({
  controllerMock: {
    listener: null as ((snapshot: LeoLivreurSnapshot) => void) | null,
    destroy: vi.fn(),
    refreshLayout: vi.fn(),
    startMission: vi.fn(),
    setDestination: vi.fn(),
    lockDriving: vi.fn(),
    resumeDriving: vi.fn(),
    handOver: vi.fn(async () => undefined),
    returnToRestaurant: vi.fn(),
    cue: vi.fn(),
    reset: vi.fn(),
    setControl: vi.fn(),
    turn: vi.fn(),
    setPaused: vi.fn(),
    retryAssets: vi.fn(),
    setSound: vi.fn((on: boolean) => on),
    horn: vi.fn(),
  },
}));

vi.mock("../../prototypes/leo-livreur/LeoLivreurGame", () => ({
  mountLeoLivreurGame: (_host: HTMLElement, listener: (snapshot: LeoLivreurSnapshot) => void) => {
    controllerMock.listener = listener;
    return controllerMock;
  },
}));

import { LeoDrivingGamePage } from "./LeoDrivingGamePage";

const READY: LeoLivreurSnapshot = {
  phase: "INTRO", speedKmh: 0, heading: 0, steering: 0, remainingMeters: 800, destinationStatus: "ahead",
  targetLabel: "98, avenue des Manguiers", signalState: null, signalMessage: null, signalDistance: null, signalPrepare: false,
  travelledMeters: 0, assets: "ready", assetsLoaded: null, assetsTotal: null,
};

function renderGame() {
  return render(
    <MemoryRouter initialEntries={["/jeux/conduire-avec-leo"]}>
      <Routes>
        <Route path="/jeux" element={<p>Catalogue des jeux</p>} />
        <Route path="/jeux/conduire-avec-leo" element={<LeoDrivingGamePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const region = () => screen.getByRole("region", { name: "Jeu Conduire avec Léo" });
const toolbarNames = () =>
  within(screen.getByRole("toolbar", { name: "Commandes du jeu" }))
    .getAllByRole("button")
    .map((button) => button.getAttribute("aria-label") ?? button.textContent);

describe("Conduire avec Léo dans le lecteur standard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("figure dans le catalogue des jeux, en français et en anglais, et se joue dans la page Jeux", () => {
    const entry = gameCatalogue.find((game) => game.id === "conduire-avec-leo");
    expect(entry?.availability).toBe("react");
    expect(entry?.href).toBe("/jeux/conduire-avec-leo");
    expect(entry?.featured).toBe(true);
    expect(entry?.embed).toBe(true);
    expect(fr.leoDriving.name).toBe("Conduire avec Léo");
    expect(en.leoDriving.name).toBe("Driving with Léo");
  });

  it("s'ouvre dans le lecteur standard : en-tête de partie, barre de commandes et commandes de conduite dans la scène", () => {
    renderGame();
    expect(region().className).not.toMatch(/fullscreen/);
    expect(screen.getByRole("heading", { level: 1, name: "Conduire avec Léo" })).toBeInTheDocument();
    // Barre du lecteur : plus de tableau de bord propre à Léo (Son, Pause, Quitter du prototype).
    expect(toolbarNames()).toEqual([
      "Pause",
      "Recommencer la livraison depuis le restaurant",
      "Son coupé",
      "Passer en plein écran",
      "Fermer le jeu et retrouver les autres jeux",
    ]);
    expect(screen.queryByLabelText("Tableau de bord")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitter le mode conduite" })).not.toBeInTheDocument();
    // Commandes de conduite : des commandes de jeu, dans la scène.
    const controls = within(screen.getByRole("region", { name: "Commandes de conduite" }));
    for (const name of ["Gauche (maintenir)", "Droite (maintenir)", "Avancer (maintenir)", "Freiner (maintenir)", "Reculer (maintenir)", "Klaxon (maintenir)"]) {
      expect(controls.getByRole("button", { name })).toBeInTheDocument();
    }
    // Direction désactivée en V1 : visible mais inerte, dans le lecteur comme dans le prototype.
    expect(controls.getByRole("button", { name: "Gauche (maintenir)" })).toBeDisabled();
    expect(controls.getByRole("button", { name: "Droite (maintenir)" })).toBeDisabled();
    expect(controls.getByRole("button", { name: "Avancer (maintenir)" })).toBeEnabled();
    act(() => controllerMock.listener?.(READY));
    expect(screen.getByText("Pizzas").nextElementSibling).toHaveTextContent("0");
    expect(screen.getByText("Parcouru").nextElementSibling).toHaveTextContent("0,00 km");
    expect(screen.getByText("Reste").nextElementSibling).toHaveTextContent("0,80 km");
    expect(screen.getByText("Livraison en cours : 98, avenue des Manguiers")).toBeInTheDocument();
    expect(controllerMock.setDestination).toHaveBeenCalledWith(expect.objectContaining({ label: "98, avenue des Manguiers" }));
    fireEvent.click(screen.getByRole("button", { name: "Commencer" }));
    // La pizzeria s'ouvre dans le lecteur, conduite neutralisée.
    expect(screen.getByRole("dialog", { name: "Tournée 1 — Préparation" })).toBeInTheDocument();
    expect(controllerMock.lockDriving).toHaveBeenCalled();
  });

  it("Pause du lecteur : le moteur s'arrête et les commandes sont relâchées ; Jouer le relance", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(controllerMock.setPaused).toHaveBeenLastCalledWith(true);
    expect(controllerMock.setControl).toHaveBeenCalledWith("forward", false);
    expect(screen.getByText("Jeu en pause")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Jouer" }));
    expect(controllerMock.setPaused).toHaveBeenLastCalledWith(false);
  });

  it("Recommencer repart du restaurant, Son active le son du jeu (coupé au départ)", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByRole("button", { name: "Recommencer la livraison depuis le restaurant" }));
    expect(controllerMock.reset).toHaveBeenCalledOnce();
    expect(screen.getByRole("dialog", { name: "Tournée 1 — Préparation" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Son coupé" }));
    expect(controllerMock.setSound).toHaveBeenCalledWith(true);
    expect(screen.getByRole("button", { name: "Son activé" })).toBeInTheDocument();
  });

  it("plein écran : la barre disparaît, seul « Quitter » reste, et les commandes de conduite restent dans la scène", async () => {
    const user = userEvent.setup();
    renderGame();
    await user.click(screen.getByRole("button", { name: "Passer en plein écran" }));
    expect(region().className).toMatch(/fullscreen/);
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Commandes de conduite" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Quitter le plein écran" }));
    expect(region().className).not.toMatch(/fullscreen/);
  });

  it("Fermer ramène au catalogue des jeux", () => {
    renderGame();
    fireEvent.click(screen.getByRole("button", { name: "Fermer le jeu et retrouver les autres jeux" }));
    return screen.findByText("Catalogue des jeux");
  });
});
