import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { AppRouter } from "./AppRouter";

function renderAt(path: string) {
  window.history.pushState({}, "", path);
  return render(<AppRouter />);
}

describe("Routeur du portail React", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/app");
  });

  it("affiche le tableau de bord sur /app", () => {
    renderAt("/app");
    expect(screen.getByRole("heading", { level: 1, name: /bonjour, explorateur/i })).toBeInTheDocument();
  });

  it("affiche le catalogue sur /app/jeux", () => {
    renderAt("/app/jeux");
    expect(screen.getByRole("heading", { level: 1, name: /les jeux/i })).toBeInTheDocument();
    expect(screen.getByText(/le train des multiplications/i)).toBeInTheDocument();
  });

  it("affiche la page d'attente du nouveau jeu sans permettre de le lancer", () => {
    renderAt("/app/jeux/nouveau-jeu-react");
    expect(screen.getByRole("heading", { level: 1, name: /en préparation/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^jouer$/i })).not.toBeInTheDocument();
  });

  it("affiche la page de progression sur /app/progression", () => {
    renderAt("/app/progression");
    expect(screen.getByRole("heading", { level: 1, name: /ta progression/i })).toBeInTheDocument();
  });

  it("compose les liens de navigation avec le basename /app, sans le doubler", () => {
    renderAt("/app/jeux");

    // La sidebar est toujours présente dans le document (repliée hors champ
    // par CSS sur mobile, jamais retirée du DOM) : elle sert de vérité pour
    // les hrefs générés par la navigation.
    const nav = screen.getByRole("navigation", { name: /navigation principale/i });

    expect(within(nav).getByRole("link", { name: /tableau de bord/i })).toHaveAttribute(
      "href",
      "/app",
    );
    expect(within(nav).getByRole("link", { name: "Jeux" })).toHaveAttribute("href", "/app/jeux");
    expect(within(nav).getByRole("link", { name: /^progression$/i })).toHaveAttribute(
      "href",
      "/app/progression",
    );
  });

  it("affiche une page 404 React sur une route inconnue, après actualisation directe", () => {
    renderAt("/app/une-route-totalement-inconnue");
    expect(screen.getByRole("heading", { level: 1, name: /page n'existe pas/i })).toBeInTheDocument();
  });

  it("ne lit ni n'écrit aucune clé de stockage local au chargement", () => {
    const lues: string[] = [];
    const ecrites: string[] = [];
    const lireOrigine = Storage.prototype.getItem;
    const ecrireOrigine = Storage.prototype.setItem;
    Storage.prototype.getItem = function patchLecture(key: string) {
      lues.push(key);
      return lireOrigine.call(this, key);
    };
    Storage.prototype.setItem = function patchEcriture(key: string, value: string) {
      ecrites.push(key);
      return ecrireOrigine.call(this, key, value);
    };

    try {
      renderAt("/app");
    } finally {
      Storage.prototype.getItem = lireOrigine;
      Storage.prototype.setItem = ecrireOrigine;
    }

    expect(lues).toEqual([]);
    expect(ecrites).toEqual([]);
  });
});
