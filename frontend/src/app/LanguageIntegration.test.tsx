import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import i18next from "i18next";

import { AppRouter } from "./AppRouter";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<AppRouter />);
}

describe("Changement de langue dans l'application", () => {
  afterEach(async () => {
    await i18next.changeLanguage("fr");
  });

  it("bascule le tableau de bord en anglais immédiatement, sans changer de route", async () => {
    const user = userEvent.setup();
    renderAt("/app");

    // Seule la fin du titre est vérifiée : le début salue selon l'heure
    // (« Bonjour » / « Bon après-midi » / « Bonsoir »), ce qui rendrait
    // l'assertion dépendante du moment où la suite tourne. Le choix de la
    // salutation est couvert par WelcomeHero.test.tsx, à heure figée.
    expect(screen.getByRole("heading", { level: 1, name: /explorateur !$/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^english$/i }));

    await screen.findByRole("heading", { level: 1, name: /explorer!$/i });
    expect(window.location.pathname).toBe("/app");
  });

  it("synchronise document.documentElement.lang avec la langue active", async () => {
    const user = userEvent.setup();
    renderAt("/app");

    await user.click(screen.getByRole("button", { name: /^english$/i }));
    await waitFor(() => expect(document.documentElement.lang).toBe("en"));

    await user.click(screen.getByRole("button", { name: /français/i }));
    await waitFor(() => expect(document.documentElement.lang).toBe("fr"));
  });

  it("traduit la navigation, le catalogue et la page 404, sans clé brute affichée", async () => {
    const user = userEvent.setup();
    renderAt("/app/jeux");
    await user.click(screen.getByRole("button", { name: /^english$/i }));

    await screen.findByRole("heading", { level: 1, name: /^games$/i });
    const nav = screen.getByRole("navigation", { name: /main navigation/i });
    expect(within(nav).getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Games" })).toBeInTheDocument();

    const courseNav = screen.getByRole("navigation", { name: /course navigation/i });
    expect(within(courseNav).getByRole("button", { name: /primary courses/i })).toBeInTheDocument();
    expect(within(courseNav).getByRole("button", { name: /secondary courses/i })).toBeInTheDocument();
    expect(within(courseNav).getByRole("link", { name: /exetat preparation/i })).toBeInTheDocument();
    expect(within(courseNav).getByRole("link", { name: /my progress/i })).toBeInTheDocument();

    // Aucune clé i18next non résolue (ex. "welcome.title") ne doit fuiter à
    // l'écran. On inspecte chaque nœud de texte isolément — pas le body
    // entier concaténé, où une phrase suivie d'un élément voisin sans
    // espace ("forward.Play") ressemblerait à tort à une clé pointée.
    const rawKeyPattern = /^[a-z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9]*)+$/;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const suspiciousNodes: string[] = [];
    let node = walker.nextNode();
    while (node) {
      const text = node.textContent?.trim() ?? "";
      if (text && rawKeyPattern.test(text)) {
        suspiciousNodes.push(text);
      }
      node = walker.nextNode();
    }
    expect(suspiciousNodes).toEqual([]);
  });
});
