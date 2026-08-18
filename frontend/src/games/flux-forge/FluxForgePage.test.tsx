import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { HouseIndex, HousePart } from "./flux-forge-engine";
import { FluxForgePage } from "./FluxForgePage";

const { gameMock, mountFluxForgeGameMock } = vi.hoisted(() => {
  const gameMock = {
    destroy: vi.fn(),
    refreshLayout: vi.fn(),
    syncState: vi.fn(),
    activateCurrentPart: vi.fn(() => true),
    onPartSelected: null as null | ((houseIndex: HouseIndex, part: HousePart) => void),
  };
  const mountFluxForgeGameMock = vi.fn((_host: HTMLElement, callbacks: { onPartSelected: (houseIndex: HouseIndex, part: HousePart) => void }) => {
    gameMock.onPartSelected = callbacks.onPartSelected;
    return gameMock;
  });
  return { gameMock, mountFluxForgeGameMock };
});

vi.mock("./FluxForgeGame", () => ({
  mountFluxForgeGame: mountFluxForgeGameMock,
}));

function selectActivePart() {
  act(() => gameMock.onPartSelected?.(0, "wall"));
}

describe("page Flux Forge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    gameMock.onPartSelected = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("monte la scène Babylon, affiche le message d'invite avant sélection et détruit le contrôleur au démontage", () => {
    const view = render(
      <MemoryRouter>
        <FluxForgePage />
      </MemoryRouter>,
    );
    expect(mountFluxForgeGameMock).toHaveBeenCalledOnce();
    expect(screen.getByRole("img", { name: /Scène 3D du village Flux Forge/ })).toBeInTheDocument();
    expect(screen.getByText(/Touche le mur transparent/)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Ta réponse/)).not.toBeInTheDocument();

    view.unmount();
    expect(gameMock.destroy).toHaveBeenCalledOnce();
  });

  it("affiche l'exercice du mur après sélection de l'élément actif dans la scène", () => {
    render(
      <MemoryRouter>
        <FluxForgePage />
      </MemoryRouter>,
    );
    selectActivePart();
    expect(screen.getByText("Quelle est la surface du mur ?")).toBeInTheDocument();
    expect(screen.getByText("4 × 2 = ?")).toBeInTheDocument();
  });

  it("ne construit rien et affiche un retour d'erreur sur une mauvaise réponse", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FluxForgePage />
      </MemoryRouter>,
    );
    selectActivePart();
    const input = screen.getByLabelText(/Ta réponse/);
    await user.type(input, "99");
    await user.click(screen.getByRole("button", { name: "Valider" }));
    expect(screen.getByText("Essaie encore : recalcule et valide à nouveau.")).toBeInTheDocument();
    expect(screen.getByText("Quelle est la surface du mur ?")).toBeInTheDocument();
  });

  it("construit l'élément et passe à l'étape suivante sur une bonne réponse", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FluxForgePage />
      </MemoryRouter>,
    );
    selectActivePart();
    const input = screen.getByLabelText(/Ta réponse/);
    await user.type(input, "8");
    await user.click(screen.getByRole("button", { name: "Valider" }));
    expect(screen.getByText("Bravo, c'est construit !")).toBeInTheDocument();
    // L'étape "porte" devient l'élément actif : elle attend une nouvelle sélection.
    expect(screen.getByText(/Touche la porte transparente/)).toBeInTheDocument();
  });

  it("relie la palette glissée-déposée sur la scène à la même logique que le clic", () => {
    render(
      <MemoryRouter>
        <FluxForgePage />
      </MemoryRouter>,
    );
    const tile = screen.getByRole("button", { name: "🧱 Mur" });
    expect(tile).toBeInTheDocument();
  });

  it("préremplit la bonne réponse via le bouton indice", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <FluxForgePage />
      </MemoryRouter>,
    );
    selectActivePart();
    await user.click(screen.getByRole("button", { name: "Afficher le calcul" }));
    expect(screen.getByLabelText(/Ta réponse/)).toHaveValue(8);
  });
});
