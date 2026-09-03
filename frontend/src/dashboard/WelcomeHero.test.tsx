import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WelcomeHero } from "./WelcomeHero";

afterEach(() => {
  vi.useRealTimers();
});

function renderAt(hour: number) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 8, 3, hour, 0));
  render(<WelcomeHero />);
}

describe("Accroche du tableau de bord", () => {
  it("salue selon l'heure de la journée", () => {
    renderAt(20);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/bonsoir/i);
  });

  it("garde un seul titre de niveau 1", () => {
    renderAt(9);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("offre les raccourcis vers les cours, les jeux et la progression", () => {
    renderAt(9);
    const raccourcis = screen.getByRole("navigation", { name: /aller directement à/i });
    expect(raccourcis).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ma progression/i })).toHaveAttribute(
      "href",
      "/app/progression",
    );
  });
});
