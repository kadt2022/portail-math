import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    deliver: vi.fn(),
    reset: vi.fn(),
    setControl: vi.fn(),
    turn: vi.fn(),
    setPaused: vi.fn(),
    retryAssets: vi.fn(),
    setSound: vi.fn(() => false),
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

describe("Conduire avec Léo dans les jeux", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    document.documentElement.style.overflow = "";
  });

  it("figure dans le catalogue des jeux, en français et en anglais, vers l'écran de conduite", () => {
    const entry = gameCatalogue.find((game) => game.id === "conduire-avec-leo");
    expect(entry).toBeDefined();
    expect(entry?.availability).toBe("react");
    expect(entry?.href).toBe("/jeux/conduire-avec-leo");
    expect(entry?.imageFit).toBe("contain");
    expect(fr.leoDriving.name).toBe("Conduire avec Léo");
    expect(en.leoDriving.name).toBe("Driving with Léo");
  });

  it("ouvre directement l'écran de conduite plein écran, sans la page du prototype", () => {
    renderGame();
    expect(screen.getByRole("region", { name: "Prototype de conduite de Léo" })).toHaveAttribute("data-immersive", "true");
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByLabelText("Tableau de bord")).toBeInTheDocument();
    // Ressources du démarrage reçues : Commencer apparaît.
    act(() => controllerMock.listener?.({
      phase: "INTRO", speedKmh: 0, heading: 0, steering: 0, cargo: 12, targetCargo: 12, distanceToHouse: 12,
      targetLabel: "Maison 1", signalState: null, signalMessage: null, signalDistance: null, signalPrepare: false,
      travelledMeters: 0, routeLengthMeters: Number.POSITIVE_INFINITY, assets: "ready", assetsLoaded: null, assetsTotal: null,
    }));
    expect(screen.getByRole("button", { name: "Commencer" })).toBeInTheDocument();
    expect(document.documentElement.style.overflow).toBe("hidden");
  });

  it("revient au catalogue des jeux avec Quitter, commandes relâchées et jeu repris", () => {
    renderGame();
    fireEvent.click(screen.getByRole("button", { name: "Quitter le mode conduite" }));
    expect(screen.getByText("Catalogue des jeux")).toBeInTheDocument();
    expect(controllerMock.setPaused).toHaveBeenLastCalledWith(false);
    expect(controllerMock.setControl).toHaveBeenCalledWith("forward", false);
  });
});
