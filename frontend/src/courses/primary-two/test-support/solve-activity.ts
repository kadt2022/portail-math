import { fireEvent } from "@testing-library/react";

import { acceptedValues, distributeShares, expectedOrder, symmetryTargets } from "../interactive/logic";
import type { ActivitySpec, SingleActivitySpec } from "../interactive/types";

// Résout une activité pilotée par données en passant uniquement par
// l'interface (boutons, champs, cases), comme le ferait un enfant.
// Utilisé par les tests de parcours complets.

function query(root: HTMLElement, selector: string) {
  const element = root.querySelector<HTMLElement>(selector);
  if (!element) throw new Error(`Élément introuvable : ${selector}`);
  return element;
}

function type(root: HTMLElement, field: string, value: number) {
  fireEvent.change(query(root, `input[data-field="${field}"]`), { target: { value: String(value) } });
}

export function validateButton(root: HTMLElement) {
  const button = [...root.querySelectorAll("button")].find((candidate) => candidate.textContent?.includes("Vérifier ma réponse"));
  if (!button) throw new Error("Bouton de validation introuvable");
  return button;
}

function solveSingle(root: HTMLElement, spec: SingleActivitySpec) {
  switch (spec.type) {
    case "numeric":
      for (const field of spec.fields) type(root, field.key, acceptedValues(field.accept)[0]);
      return;
    case "match":
      for (const item of spec.items) {
        fireEvent.click(query(root, `[data-item="${item.id}"]`));
        fireEvent.click(query(root, `[data-bin="${item.bin}"]`));
      }
      return;
    case "build":
      for (const control of spec.controls) {
        const start = control.start ?? control.min;
        const goal = spec.goal[control.id] ?? start;
        const action = goal > start ? "plus" : "minus";
        for (let index = 0; index < Math.abs(goal - start); index += 1) {
          fireEvent.click(query(root, `[data-control="${control.id}"][data-action="${action}"]`));
        }
      }
      return;
    case "order":
      expectedOrder(spec).forEach((value, index) => {
        fireEvent.click(query(root, `[data-card="${value}"]`));
        fireEvent.click(query(root, `[data-slot="${index}"]`));
      });
      return;
    case "choice":
      for (const id of spec.correct) fireEvent.click(query(root, `input[value="${id}"]`));
      return;
    case "symbol":
      spec.pairs.forEach(([a, b], index) => {
        const symbol = a < b ? "<" : a > b ? ">" : "=";
        fireEvent.click(query(root, `[data-pair="${index}"][data-symbol="${symbol}"]`));
      });
      return;
    case "distribute": {
      const { each, rest } = distributeShares(spec);
      for (let round = 0; round < each; round += 1) {
        for (let recipient = 0; recipient < spec.recipients; recipient += 1) {
          fireEvent.click(query(root, `[data-recipient="${recipient}"]`));
        }
      }
      if (spec.askEach) type(root, "each", each);
      if (spec.askRest) type(root, "rest", rest);
      return;
    }
    case "collect": {
      const fill = (solution: Readonly<Record<string, number>>) => {
        for (const [id, count] of Object.entries(solution)) {
          for (let index = 0; index < count; index += 1) fireEvent.click(query(root, `[data-supply="${id}"]`));
        }
      };
      fill(spec.solution);
      if (spec.twoWays) {
        fireEvent.click(validateButton(root));
        fill(spec.secondSolution ?? {});
      }
      return;
    }
    case "clock": {
      const start = spec.startHour ?? 12;
      const steps = (spec.hour - start + 12) % 12;
      for (let index = 0; index < steps; index += 1) fireEvent.click(query(root, `[data-clock="hour-plus"]`));
      fireEvent.click(query(root, `[data-clock="${spec.minute === 0 ? "minute-12" : "minute-6"}"]`));
      return;
    }
    case "symmetry":
      for (const cell of symmetryTargets(spec)) fireEvent.click(query(root, `[data-cell="${cell}"]`));
      return;
    case "selfcheck":
      fireEvent.click(query(root, `input[value="alone"]`));
      return;
  }
}

/** Résout l'activité puis clique sur « Vérifier ma réponse » (à chaque manche). */
export function solveActivity(root: HTMLElement, spec: ActivitySpec) {
  const rounds = spec.type === "rounds" ? spec.rounds : [spec];
  for (const round of rounds) {
    solveSingle(root, round);
    fireEvent.click(validateButton(root));
  }
}
