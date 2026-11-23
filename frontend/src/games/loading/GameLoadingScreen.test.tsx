import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GameLoadingScreen } from "./GameLoadingScreen";

const bar = () => document.querySelector('[role=progressbar][aria-label="Chargement du jeu"]');

describe("écran de chargement commun aux jeux", () => {
  it("une barre et un vrai pourcentage, sans le nom du jeu", () => {
    render(<GameLoadingScreen progress={0.426} finished={false} />);
    expect(screen.getByText("Chargement des ressources")).toBeInTheDocument();
    expect(bar()).toHaveAttribute("aria-valuenow", "42");
    expect(screen.getByText("42 %")).toBeInTheDocument();
    expect(screen.queryByText(/Turbo Pulse|Léo/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Réessayer" })).not.toBeInTheDocument();
  });

  it("échec : un message et Réessayer à la place du pourcentage", async () => {
    const onRetry = vi.fn();
    render(<GameLoadingScreen progress={0.3} finished={false} failed onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Le téléchargement a été interrompu.");
    expect(screen.queryByText("30 %")).not.toBeInTheDocument();
    await userEvent.setup().click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("habillage du jeu par les variables --loading-* ; une fois terminé, l'écran se retire des lecteurs d'écran", () => {
    const { container } = render(<GameLoadingScreen progress={1} finished theme={{ "--loading-fill": "orange" } as React.CSSProperties} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--loading-fill")).toBe("orange");
    expect(root).toHaveAttribute("aria-hidden", "true");
    expect(bar()).toHaveAttribute("aria-valuenow", "100");
  });
});
