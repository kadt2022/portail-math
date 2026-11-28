import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import type { GameState } from "@mbuyamba/math-flow";

// La partie démarre au moment où tous les nombres ont traversé le tuyau : seul le choix des résultats reste à faire.
vi.mock("@mbuyamba/math-flow", async (importOriginal) => {
  const engine = await importOriginal<typeof import("@mbuyamba/math-flow")>();
  return {
    ...engine,
    newGame(levelId: number, seed: number, options?: Parameters<typeof engine.newGame>[2]) {
      const { state: start, solution } = engine.newGame(levelId, seed, options);
      let state: GameState = start;
      for (const [a, b] of solution) {
        state = engine.swapGame(state, a, b).state;
        for (let i = 0; i < 3; i += 1) state = engine.tickGame(state).state;
      }
      for (let i = 0; i < 2000; i += 1) {
        const step = engine.tickGame(state);
        state = step.state;
        if (step.events.length === 0) break;
      }
      return { state, solution };
    },
  };
});

import { FLOW_VARIANT_LIST, type FlowVariant } from "./flow-variants";
import { MathFlowGame } from "./MathFlowGame";

function renderGame(variant: FlowVariant) {
  return render(
    <MemoryRouter>
      <MathFlowGame variant={variant.id} initialLevel={1} initialSeed={7} />
    </MemoryRouter>,
  );
}

const resultTiles = () => [...document.querySelectorAll<HTMLButtonElement>("[data-result-tile]")];

describe.each(FLOW_VARIANT_LIST)("$gameId : le réservoir de résultats", (variant) => {
  it("propose les résultats dans un réservoir, des « ? » à remplir, et ne gagne que lorsque l'enfant a tout posé", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    try {
      renderGame(variant);
      const tank = await screen.findByRole("group", { name: "Réservoir de résultats" });
      const questions = () => [...document.querySelectorAll<HTMLButtonElement>("[data-question]")];
      // Tous les nombres sont arrivés : le tableau d'entrée est nettoyé, fermé, et plus aucun fruit n'y reste.
      const board = screen.getByRole("group", { name: "Plateau des tuiles" });
      expect(board).toHaveAttribute("aria-disabled", "true");
      expect(within(board).queryAllByRole("button")).toHaveLength(0);
      expect(within(tank).getAllByRole("button").length).toBe(resultTiles().length);
      expect(questions().length).toBeGreaterThan(1);
      expect(screen.queryByText(/Bravo/)).toBeNull();

      // Un mauvais résultat remonte : rien n'est verrouillé et la partie continue.
      const total = questions().length;
      for (const [index] of Array.from({ length: total }).entries()) {
        const target = questions()[0] as HTMLButtonElement;
        const label = target.getAttribute("aria-label") ?? "";
        const [, a, b] = /(\d+)\D+(\d+)\s*$/.exec(label) ?? [];
        const expected = String(variant.operation.compute(...variant.operation.arrange(Number(a), Number(b))));
        const right = resultTiles().find((tile) => tile.textContent === expected) as HTMLButtonElement;
        const wrong = resultTiles().find((tile) => tile.textContent !== expected) as HTMLButtonElement;
        if (index === 0) {
          await user.click(wrong);
          await user.click(target);
          await act(async () => {
            await vi.advanceTimersByTimeAsync(2000);
          });
          expect(questions().length).toBe(total);
        }
        await user.click(right);
        await user.click(questions()[0] as HTMLButtonElement);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(1300);
        });
        expect(questions().length).toBe(total - index - 1);
      }
      expect(await screen.findByText(/Bravo/)).toBeInTheDocument();
      expect(resultTiles()).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  }, 60000);
});
