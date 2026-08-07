import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

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
});
