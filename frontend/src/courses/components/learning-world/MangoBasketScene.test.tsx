import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18next } from "../../../i18n/i18n";
import { MangoBasketScene } from "./MangoBasketScene";
import { applyMangoBasketAction, createMangoBasketState } from "./mango-basket-engine";

describe("scène contrôlée des mangues", () => {
  beforeEach(async () => {
    cleanup();
    await i18next.changeLanguage("fr");
  });

  afterEach(() => cleanup());

  it("émet une action explicite après sélection puis choix du panier", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(<MangoBasketScene state={createMangoBasketState(4)} onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Sélectionner la mangue 1" }));
    expect(screen.getByRole("button", { name: "Désélectionner la mangue 1" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Déposer dans Panier 1" }));

    expect(onAction).toHaveBeenCalledWith({
      type: "move-object",
      objectInstanceId: "mango-1",
      fromZoneId: "stock",
      toZoneId: "basket-1",
    });
  });

  it("reflète uniquement le nouvel état reçu par ses propriétés", async () => {
    const user = userEvent.setup();
    const initial = createMangoBasketState(4);
    let next = initial;
    const { rerender } = render(
      <MangoBasketScene
        state={initial}
        onAction={(action) => {
          next = applyMangoBasketAction(initial, action);
        }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Sélectionner la mangue 1" }));
    await user.click(screen.getByRole("button", { name: "Déposer dans Panier 1" }));
    expect(screen.getByText(/Panier 1 : 0/)).toBeInTheDocument();

    rerender(<MangoBasketScene state={next} onAction={vi.fn()} />);
    expect(screen.getByText(/Panier 1 : 1/)).toBeInTheDocument();
  });

  it("permet de reprendre une mangue déjà déposée", async () => {
    const user = userEvent.setup();
    const initial = createMangoBasketState(1);
    const placed = applyMangoBasketAction(initial, {
      type: "move-object",
      objectInstanceId: "mango-1",
      fromZoneId: "stock",
      toZoneId: "basket-1",
    });
    const onAction = vi.fn();
    render(<MangoBasketScene state={placed} onAction={onAction} />);

    await user.click(screen.getByRole("button", { name: "Sélectionner la mangue 1" }));
    await user.click(screen.getByRole("button", { name: "Déposer dans Panier de départ" }));
    expect(onAction).toHaveBeenCalledWith(expect.objectContaining({ fromZoneId: "basket-1", toZoneId: "stock" }));
  });

  it("efface la sélection visuelle quand l'enfant recommence", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<MangoBasketScene state={createMangoBasketState(2)} onAction={vi.fn()} onReset={onReset} />);

    await user.click(screen.getByRole("button", { name: /^Sélectionner la mangue 1$/ }));
    expect(screen.getByRole("button", { name: "Désélectionner la mangue 1" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Recommencer" }));

    expect(onReset).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: /^Sélectionner la mangue 1$/ })).toHaveAttribute("aria-pressed", "false");
  });
});
