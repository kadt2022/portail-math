import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TrainMultiplicationsGamePage } from "./TrainMultiplicationsGamePage";

const { player, exitNativeFullscreen } = vi.hoisted(() => ({
  player: { props: null as null | { pageHeading?: boolean; fullscreen?: boolean; onFullscreenChange?: (next: boolean) => void; onClose?: () => void } },
  exitNativeFullscreen: vi.fn(async () => undefined),
}));

// Le lecteur (et le jeu 3D derrière lui) est remplacé : on vérifie ici ce que la page autonome en fait.
vi.mock("./TrainMultiplicationsPlayer", () => ({
  TrainMultiplicationsPlayer: (props: NonNullable<typeof player.props>) => {
    player.props = props;
    return <div data-testid="lecteur" data-plein-ecran={String(props.fullscreen)} data-titre={String(props.pageHeading)} />;
  },
}));
vi.mock("../fullscreen", () => ({ exitNativeFullscreen }));

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/jeux/train-des-multiplications"]}>
      <Routes>
        <Route path="/jeux/train-des-multiplications" element={<TrainMultiplicationsGamePage />} />
        <Route path="/jeux" element={<p>Catalogue des jeux</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("page autonome du Train des multiplications", () => {
  beforeEach(() => {
    player.props = null;
    exitNativeFullscreen.mockClear();
  });

  it("affiche le lecteur, dont le titre est celui de la page, en affichage normal", () => {
    renderPage();
    expect(screen.getByTestId("lecteur")).toHaveAttribute("data-titre", "true");
    expect(screen.getByTestId("lecteur")).toHaveAttribute("data-plein-ecran", "false");
  });

  it("suit le plein écran demandé par le lecteur, puis le quitte", () => {
    renderPage();
    act(() => player.props?.onFullscreenChange?.(true));
    expect(screen.getByTestId("lecteur")).toHaveAttribute("data-plein-ecran", "true");
    act(() => player.props?.onFullscreenChange?.(false));
    expect(screen.getByTestId("lecteur")).toHaveAttribute("data-plein-ecran", "false");
  });

  it("Fermer quitte le plein écran natif puis ramène au catalogue des jeux", async () => {
    renderPage();
    act(() => player.props?.onClose?.());
    await waitFor(() => expect(screen.getByText("Catalogue des jeux")).toBeInTheDocument());
    expect(exitNativeFullscreen).toHaveBeenCalledOnce();
  });
});
