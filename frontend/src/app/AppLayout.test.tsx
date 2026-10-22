import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router-dom";

import { AppLayout } from "./AppLayout";

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<p>Contenu de test</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Sidebar mobile de l'en-tête", () => {
  it("s'ouvre et annonce son état", async () => {
    const user = userEvent.setup();
    renderLayout();

    const bouton = screen.getByRole("button", { name: /ouvrir le menu/i });
    expect(bouton).toHaveAttribute("aria-expanded", "false");

    await user.click(bouton);

    expect(screen.getByRole("button", { name: /fermer le menu/i })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("se referme avec Échap et rend le focus au bouton", async () => {
    const user = userEvent.setup();
    renderLayout();

    const bouton = screen.getByRole("button", { name: /ouvrir le menu/i });
    await user.click(bouton);
    await user.keyboard("{Escape}");

    expect(screen.getByRole("button", { name: /ouvrir le menu/i })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByRole("button", { name: /ouvrir le menu/i })).toHaveFocus();
  });

  it("la navigation principale est toujours présente dans le document", () => {
    renderLayout();
    expect(screen.getByRole("navigation", { name: /navigation principale/i })).toBeInTheDocument();
  });
  it("réserve tout le viewport au lecteur sur une route de livre", () => {
    render(
      <MemoryRouter initialEntries={["/bibliotheque/math-primary-one"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="bibliotheque/:bookId" element={<p>Lecteur de test</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Lecteur de test")).toBeInTheDocument();
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /navigation principale/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("contentinfo")).not.toBeInTheDocument();
  });

  it("re-mesure l'en-tête en quittant le lecteur vers la bibliothèque", async () => {
    const user = userEvent.setup();

    function Lecteur() {
      const navigate = useNavigate();
      return (
        <button type="button" onClick={() => navigate("/")}>
          Quitter le lecteur
        </button>
      );
    }

    render(
      <MemoryRouter initialEntries={["/bibliotheque/math-primary-one"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<p>Accueil de test</p>} />
            <Route path="bibliotheque/:bookId" element={<Lecteur />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.queryByRole("banner")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /quitter le lecteur/i }));

    const header = screen.getByRole("banner");
    expect(header.parentElement?.style.getPropertyValue("--pm-header-height")).toBe("0px");
  });
});

describe("Menu compact sur ordinateur", () => {
  // JSDOM ne résout pas les media queries : le titre permet de cibler le
  // bouton desktop. Sa visibilité et la largeur du rail sont vérifiées au navigateur.
  it("réduit puis déploie le menu en gardant les rubriques accessibles", async () => {
    const user = userEvent.setup();
    renderLayout();
    const nav = screen.getByRole("navigation", { name: /navigation principale/i });
    const reduce = screen.getByTitle("Réduire le menu");
    expect(reduce).toHaveAttribute("aria-expanded", "true");

    await user.click(reduce);

    const expand = screen.getByTitle("Déployer le menu");
    expect(expand).toHaveAttribute("aria-expanded", "false");
    expect(expand).toHaveAttribute("aria-controls", nav.parentElement?.id);
    for (const name of ["Tableau de bord", "Préparer l'EXETAT", "Bibliothèque", "Jeux", "Ma progression", "À propos"]) {
      expect(within(nav).getByRole("link", { name })).toHaveAttribute("title", name);
    }
    expect(document.body.style.overflow).not.toBe("hidden");

    await user.click(expand);

    expect(screen.getByTitle("Réduire le menu")).toHaveAttribute("aria-expanded", "true");
    expect(within(nav).getByRole("link", { name: "À propos" })).not.toHaveAttribute("title");
  });

  it("ouvre le choix de classe depuis l'icône du menu compact", async () => {
    const user = userEvent.setup();
    renderLayout();
    const nav = screen.getByRole("navigation", { name: /navigation principale/i });
    await user.click(screen.getByTitle("Réduire le menu"));

    const primary = within(nav).getByRole("button", { name: "Niveaux du primaire" });
    expect(primary).toHaveAttribute("aria-expanded", "false");
    expect(within(nav).queryByRole("link", { name: "1re primaire" })).not.toBeInTheDocument();
    await user.click(primary);

    expect(screen.getByTitle("Réduire le menu")).toHaveAttribute("aria-expanded", "true");
    expect(primary).toHaveAttribute("aria-expanded", "true");
    expect(within(nav).getByRole("link", { name: "1re primaire" })).toHaveAttribute("href", "/apprentissages/primaire/1/mathematiques");
  });

  it("ouvre le menu complet sur mobile même après une réduction sur ordinateur", async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByTitle("Réduire le menu"));
    await user.click(screen.getByRole("button", { name: "Ouvrir le menu" }));

    expect(screen.getByTitle("Réduire le menu")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Fermer le menu" })).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Ouvrir le menu" })).toHaveFocus();
  });
});
