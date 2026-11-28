import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { MathFlowGame } from "./MathFlowGame";

// Un lecteur d'écran (double-tap VoiceOver, TalkBack, NVDA…) active un fruit par un « click » synthétisé, sans pointeur
// ni touche : ce click doit sélectionner le fruit, sans que le toucher ou le clavier ne le comptent deux fois.
async function fruits() {
  render(
    <MemoryRouter>
      <MathFlowGame variant="multiplication" initialLevel={1} initialSeed={7} />
    </MemoryRouter>,
  );
  const board = await screen.findByRole("group", { name: "Plateau des tuiles" });
  return () => within(board).getAllByRole("button");
}

describe("Math Flow : activation des fruits", () => {
  it("un click seul (lecteur d'écran) sélectionne puis désélectionne un fruit", async () => {
    const buttons = await fruits();
    const fruit = buttons()[0] as HTMLButtonElement;
    fireEvent.click(fruit);
    expect(buttons()[0]).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(buttons()[0] as HTMLButtonElement);
    expect(buttons()[0]).toHaveAttribute("aria-pressed", "false");
  });

  it("un toucher suivi de son click ne compte qu'une fois", async () => {
    const buttons = await fruits();
    const user = userEvent.setup();
    await user.click(buttons()[0] as HTMLButtonElement);
    expect(buttons()[0]).toHaveAttribute("aria-pressed", "true");
  });

  it("Entrée ou Espace au clavier ne comptent qu'une fois", async () => {
    const buttons = await fruits();
    const user = userEvent.setup();
    (buttons()[0] as HTMLButtonElement).focus();
    await user.keyboard("{Enter}");
    expect(buttons()[0]).toHaveAttribute("aria-pressed", "true");
    await user.keyboard(" ");
    expect(buttons()[0]).toHaveAttribute("aria-pressed", "false");
  });
});
