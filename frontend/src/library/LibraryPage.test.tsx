import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LibraryPage } from "./LibraryPage";
import { mockLibraryCatalogue } from "./library-catalogue.fixture";

afterEach(async () => {
  vi.unstubAllGlobals();
  await i18next.changeLanguage("fr");
});

function renderPage() {
  return render(<MemoryRouter><LibraryPage /></MemoryRouter>);
}

describe("Bibliothèque", () => {
  it("annonce la bibliothèque et son sous-titre", async () => {
    mockLibraryCatalogue();
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Bibliothèque" })).toBeInTheDocument();
    expect(screen.getByText("Des livres pour apprendre autrement")).toBeInTheDocument();
    await screen.findByText("4 livres");
  });

  it("présente les livres du catalogue backend, chaque carte ouvrant le lecteur", async () => {
    const fetchMock = mockLibraryCatalogue();
    renderPage();

    const cards = await screen.findAllByRole("link", { name: /ouvrir le livre/i });
    expect(cards).toHaveLength(4);
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/resources", expect.anything());
    expect(cards[0].getAttribute("href")).toMatch(/\/bibliotheque\/math-primary-one$/);
    expect(cards.at(-1)?.getAttribute("href")).toMatch(/\/bibliotheque\/math-primary-five$/);

    // Niveau, matière et pages sont sur la carte ; plus aucun gros bouton « Lire le livre » ni description.
    expect(within(cards[0]).getByText("1re primaire")).toBeInTheDocument();
    expect(within(cards[0]).getByText("Mathématiques · 96 pages")).toBeInTheDocument();
    expect(within(cards[3]).getByText("Mathématiques · 93 pages")).toBeInTheDocument();
    expect(screen.queryByText(/lire le livre/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Un parcours concret/)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /télécharger/i })).not.toBeInTheDocument();
  });

  it("garde la couverture de chaque livre, y compris le volume 1 de la 5e", async () => {
    mockLibraryCatalogue();
    renderPage();
    expect(await screen.findByRole("img", { name: /Volume 1/ })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: /Couverture/i })).toHaveLength(4);
  });

  it("ne propose que des filtres tirés des livres réels", async () => {
    mockLibraryCatalogue();
    renderPage();
    await screen.findByText("4 livres");
    const filters = screen.getByRole("group", { name: "Filtrer les livres" });
    const names = within(filters).getAllByRole("button").map((button) => button.textContent);
    expect(names).toEqual(["Tous les livres", "Mathématiques", "1re primaire", "2e primaire", "3e primaire", "5e primaire"]);
    // Une seule collection : « Par collection » n'est pas affiché (il ne filtrerait rien).
    expect(within(filters).queryByText("Par collection")).not.toBeInTheDocument();
  });

  it("filtre par niveau puis revient à tous les livres", async () => {
    const user = userEvent.setup();
    mockLibraryCatalogue();
    renderPage();
    await screen.findByText("4 livres");

    await user.click(screen.getByRole("button", { name: "3e primaire" }));
    expect(screen.getAllByRole("link", { name: /ouvrir le livre/i })).toHaveLength(1);
    expect(screen.getByText("1 livre")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3e primaire" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Tous les livres" }));
    expect(screen.getAllByRole("link", { name: /ouvrir le livre/i })).toHaveLength(4);
  });

  it("garde le filtre choisi quand la langue change", async () => {
    const user = userEvent.setup();
    mockLibraryCatalogue();
    renderPage();
    await screen.findByText("4 livres");

    await user.click(screen.getByRole("button", { name: "3e primaire" }));
    expect(screen.getAllByRole("link", { name: /ouvrir le livre/i })).toHaveLength(1);

    await act(() => i18next.changeLanguage("en"));
    const filters = screen.getByRole("group", { name: /filter/i });
    // Toujours un seul livre, et exactement un filtre actif (hors « tous »).
    expect(screen.getAllByRole("link", { name: /open|ouvrir/i })).toHaveLength(1);
    const pressed = within(filters).getAllByRole("button").filter((button) => button.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(1);
  });

  it("recherche un livre par son titre, sans tenir compte des accents ni de la casse", async () => {
    const user = userEvent.setup();
    mockLibraryCatalogue();
    renderPage();
    await screen.findByText("4 livres");

    await user.type(screen.getByRole("searchbox", { name: "Chercher un livre" }), "VOLUME 1");
    expect(screen.getAllByRole("link", { name: /ouvrir le livre/i })).toHaveLength(1);

    await user.clear(screen.getByRole("searchbox", { name: "Chercher un livre" }));
    await user.type(screen.getByRole("searchbox", { name: "Chercher un livre" }), "decouvre");
    expect(screen.getAllByRole("link", { name: /ouvrir le livre/i })).toHaveLength(4);
  });

  it("explique l'absence de résultat", async () => {
    const user = userEvent.setup();
    mockLibraryCatalogue();
    renderPage();
    await screen.findByText("4 livres");
    await user.type(screen.getByRole("searchbox", { name: "Chercher un livre" }), "zzz");
    expect(screen.queryAllByRole("link", { name: /ouvrir le livre/i })).toHaveLength(0);
    expect(screen.getByText(/Aucun livre ne correspond/)).toBeInTheDocument();
  });

  it("n'écrit aucun cache persistant", async () => {
    const user = userEvent.setup();
    localStorage.clear();
    sessionStorage.clear();
    mockLibraryCatalogue();
    renderPage();
    await screen.findByText("4 livres");
    await user.type(screen.getByRole("searchbox", { name: "Chercher un livre" }), "maths");
    await user.click(screen.getByRole("button", { name: "2e primaire" }));
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it("prévient l'élève quand le catalogue est indisponible", async () => {
    mockLibraryCatalogue(undefined, false);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent("La bibliothèque est momentanément indisponible");
    expect(screen.queryByText("1re primaire")).not.toBeInTheDocument();
  });
});
