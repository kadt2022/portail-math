import { act, render, screen } from "@testing-library/react";
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

  it("chargement long : après le délai, un message invite à patienter, sans interrompre la progression", () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<GameLoadingScreen progress={0.2} finished={false} slowAfterMs={20_000} />);
      act(() => vi.advanceTimersByTime(19_999));
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      act(() => vi.advanceTimersByTime(1));
      expect(screen.getByRole("status")).toHaveTextContent(
        "Le chargement prend un peu plus de temps. Merci de patienter. Sur une connexion lente, cela peut prendre jusqu'à une minute, voire davantage.",
      );
      // La barre et le pourcentage continuent d'avancer sous le message.
      rerender(<GameLoadingScreen progress={0.55} finished={false} slowAfterMs={20_000} />);
      expect(screen.getByText("55 %")).toBeInTheDocument();
      expect(screen.getByRole("status")).toBeInTheDocument();
      // Échec : le message laisse la place à Réessayer ; prêt : il disparaît avec l'écran.
      rerender(<GameLoadingScreen progress={0.55} finished={false} failed slowAfterMs={20_000} />);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      rerender(<GameLoadingScreen progress={1} finished slowAfterMs={20_000} />);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("sans délai demandé (Turbo Pulse), jamais de message de chargement long", () => {
    vi.useFakeTimers();
    try {
      render(<GameLoadingScreen progress={0.2} finished={false} />);
      act(() => vi.advanceTimersByTime(120_000));
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("chargement terminé avant le délai : aucun message ensuite", () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(<GameLoadingScreen progress={0.9} finished={false} slowAfterMs={20_000} />);
      act(() => vi.advanceTimersByTime(5_000));
      rerender(<GameLoadingScreen progress={1} finished slowAfterMs={20_000} />);
      act(() => vi.advanceTimersByTime(60_000));
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
