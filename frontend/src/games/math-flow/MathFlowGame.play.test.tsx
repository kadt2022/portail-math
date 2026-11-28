import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { newGame } from "@mbuyamba/math-flow";

import { FLOW_VARIANTS } from "./flow-variants";
import { AddiFlowGame, DiviFlowGame, MathFlowGame, MultipliFlowGame, SoustraFlowGame } from "./MathFlowGame";
import { MultipliFlowPage } from "./MathFlowPage";

// Une vraie partie, du premier échange à la victoire : la solution du moteur est jouée avec les trois gestes de l'interface
// (toucher, clavier, glisser), puis les résultats sont posés depuis le réservoir.
const SEED = 7;
const LEVEL = 1;

const board = () => screen.getByRole("group", { name: "Plateau des tuiles" });
const tileAt = (index: number) => board().querySelector<HTMLElement>(`[data-index="${index}"]`) as HTMLElement;
const questions = () => [...document.querySelectorAll<HTMLButtonElement>("[data-question]")];
const resultTiles = () => [...document.querySelectorAll<HTMLButtonElement>("[data-result-tile]")];

async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function renderGame() {
  return render(
    <MemoryRouter>
      <MathFlowGame variant="multiplication" initialLevel={LEVEL} initialSeed={SEED} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});
afterEach(() => {
  vi.useRealTimers();
});

describe("Math Flow : une partie complète", () => {
  it("joue la solution au toucher, au clavier et au glisser, pose les résultats, gagne et passe au niveau suivant", async () => {
    const { solution } = newGame(LEVEL, SEED, { operation: FLOW_VARIANTS.multiplication.operation });
    renderGame();
    await screen.findByRole("group", { name: "Plateau des tuiles" });

    // Un indice sur le plateau : deux fruits sont mis en valeur.
    fireEvent.click(screen.getByRole("button", { name: /indice/i }));
    expect(board().querySelectorAll("[data-hinted]").length).toBe(2);

    for (const [step, [a, b]] of solution.entries()) {
      const gesture = step % 3;
      if (gesture === 0) {
        fireEvent.click(tileAt(a));
        fireEvent.click(tileAt(b));
      } else if (gesture === 1) {
        tileAt(a).focus();
        fireEvent.keyDown(tileAt(a), { key: "Enter" });
        const key = b === a + 1 ? "ArrowRight" : b === a - 1 ? "ArrowLeft" : b > a ? "ArrowDown" : "ArrowUp";
        fireEvent.keyDown(tileAt(a), { key });
      } else {
        const dx = b === a + 1 ? 30 : b === a - 1 ? -30 : 0;
        const dy = dx !== 0 ? 0 : b > a ? 30 : -30;
        fireEvent.pointerDown(tileAt(a), { clientX: 100, clientY: 100, pointerType: "touch" });
        fireEvent.pointerMove(board(), { clientX: 100 + dx, clientY: 100 + dy, pointerType: "touch" });
        fireEvent.pointerUp(board(), { pointerType: "touch" });
      }
      await advance(420 * 3);
    }
    // Les nombres finissent de traverser le tuyau ; le tableau d'entrée se nettoie.
    for (let i = 0; i < 60 && board().getAttribute("aria-disabled") !== "true"; i += 1) await advance(420);
    expect(board()).toHaveAttribute("aria-disabled", "true");

    // Un indice sur les résultats, puis un « ? » touché sans résultat choisi : un message l'explique.
    fireEvent.click(screen.getByRole("button", { name: /indice/i }));
    expect(document.querySelectorAll("[data-hinted]").length).toBeGreaterThan(0);
    if (questions().length > 1) {
      fireEvent.click(questions()[0] as HTMLButtonElement);
      expect(await screen.findByText(/Choisis un résultat/, { selector: "span" })).toBeInTheDocument();
    }

    while (questions().length > 0) {
      const target = questions()[0] as HTMLButtonElement;
      const [, x, y] = /(\d+)\D+(\d+)\s*$/.exec(target.getAttribute("aria-label") ?? "") ?? [];
      const expected = String(Number(x) * Number(y));
      const right = resultTiles().find((tile) => tile.textContent === expected) as HTMLButtonElement;
      fireEvent.click(right);
      if (questions().length > 1 || resultTiles().some((tile) => tile.dataset.selected)) fireEvent.click(questions()[0] as HTMLButtonElement);
      await advance(1300);
    }
    const next = await screen.findByRole("button", { name: "Niveau suivant" });
    expect(next).toHaveFocus();
    fireEvent.click(next);
    expect(screen.getByText(`${LEVEL + 1}/5`)).toBeInTheDocument();
  }, 60_000);

  it("refuse un échange sans alignement, change de fruit choisi, et se désélectionne au clavier", async () => {
    renderGame();
    await screen.findByRole("group", { name: "Plateau des tuiles" });
    const fruits = () => within(board()).getAllByRole("button");
    const first = fruits()[0] as HTMLElement;
    const index = Number(first.dataset.index);
    const far = fruits().find((fruit) => Math.abs(Number(fruit.dataset.index) - index) > 2) as HTMLElement;

    // Un fruit lointain remplace le choix au lieu d'échanger.
    fireEvent.click(first);
    fireEvent.click(far);
    expect(far).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(far, { key: "Escape" });
    expect(far).toHaveAttribute("aria-pressed", "false");

    // Les flèches déplacent le focus d'un fruit à l'autre sans rien choisir.
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    fireEvent.keyDown(first, { key: "ArrowDown" });

    // Un échange voisin qui n'aligne rien rebondit, avec un message.
    let refused = false;
    for (const candidate of fruits()) {
      const i = Number(candidate.dataset.index);
      const next = fruits().find((fruit) => Number(fruit.dataset.index) === i + 1);
      if (!next) continue;
      fireEvent.click(candidate);
      fireEvent.click(next);
      if (board().querySelector("[data-bounce]")) {
        refused = true;
        break;
      }
      await advance(420);
    }
    expect(refused).toBe(true);
    // Un appui ailleurs que sur un fruit annule le choix ; un glisser hors du plateau ne fait rien.
    fireEvent.click(fruits()[0] as HTMLElement);
    fireEvent.pointerDown(board(), { clientX: 1, clientY: 1, pointerType: "mouse", button: 0 });
    fireEvent.pointerCancel(board());
    await advance(3000);
  });

  it("coupe et rallume le son, se met en pause (les fruits ne répondent plus) et recommence le niveau", async () => {
    renderGame();
    await screen.findByRole("group", { name: "Plateau des tuiles" });
    const sound = screen.getByRole("button", { name: "Son activé" });
    fireEvent.click(sound);
    expect(screen.getByRole("button", { name: "Son coupé" })).toBeInTheDocument();
    fireEvent.click(sound);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    fireEvent.click(within(board()).getAllByRole("button")[0] as HTMLElement);
    expect(board().querySelector("[aria-pressed='true']")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: /^(Reprendre|Jouer)$/ })[0] as HTMLElement);
    fireEvent.click(screen.getByRole("button", { name: /Recommencer ce niveau/ }));
    expect(board()).toBeInTheDocument();
  });
});

describe("Math Flow : composants et page par jeu", () => {
  it.each([AddiFlowGame, SoustraFlowGame, MultipliFlowGame, DiviFlowGame])("chaque jeu s'ouvre sur son plateau", async (Game) => {
    render(
      <MemoryRouter>
        <Game initialSeed={3} />
      </MemoryRouter>,
    );
    expect(await screen.findByRole("group", { name: "Plateau des tuiles" })).toBeInTheDocument();
  });

  it("la page lit le niveau et la graine dans l'adresse, et ramène au catalogue", async () => {
    render(
      <MemoryRouter initialEntries={["/jeux/multipli-flow?niveau=2&graine=5"]}>
        <MultipliFlowPage />
      </MemoryRouter>,
    );
    expect(await screen.findByText("2/5")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Retour aux jeux" })).toHaveAttribute("href", "/jeux");
  });
});
