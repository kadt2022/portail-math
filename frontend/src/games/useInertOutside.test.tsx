import { render } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it } from "vitest";

import { useInertOutside } from "./useInertOutside";

function Shell({ enabled }: { enabled: boolean }) {
  const gameRef = useRef<HTMLDivElement>(null);
  useInertOutside(gameRef, enabled);
  return (
    <div>
      <header data-testid="header">En-tête</header>
      <aside data-testid="menu">Menu</aside>
      <main>
        <section data-testid="other">Autre contenu</section>
        <div ref={gameRef} tabIndex={-1} data-testid="game">
          <button type="button">Jouer</button>
        </div>
      </main>
      <footer data-testid="footer">Pied de page</footer>
    </div>
  );
}

describe("useInertOutside", () => {
  it("rend inerte tout ce qui entoure le jeu (en-tête, menu, pied de page, contenu voisin), pas le jeu", () => {
    const { getByTestId } = render(<Shell enabled />);
    for (const id of ["header", "menu", "other", "footer"]) {
      expect(getByTestId(id).hasAttribute("inert")).toBe(true);
    }
    expect(getByTestId("game").hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(getByTestId("game"));
  });

  it("restaure tout quand le plein écran se termine, sans toucher ce qui était déjà inerte", () => {
    const { getByTestId, rerender } = render(<Shell enabled />);
    rerender(<Shell enabled={false} />);
    for (const id of ["header", "menu", "other", "footer", "game"]) {
      expect(getByTestId(id).hasAttribute("inert")).toBe(false);
    }
  });

  it("ne fait rien tant que le plein écran n'est pas actif", () => {
    const { getByTestId } = render(<Shell enabled={false} />);
    expect(getByTestId("header").hasAttribute("inert")).toBe(false);
  });
});
