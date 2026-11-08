import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { i18next } from "../../../i18n/i18n";
import { InteractiveActivity } from "./activities";
import { accepts, collectIsCorrect, firstOrderMistake, parseAnswer, shuffle } from "./logic";
import type { ActivitySpec, CollectSpec, OrderSpec } from "./types";

// Règles et comportements communs du moteur d'activités : retours d'erreur
// précis, recommencer, alternative au glisser-déposer, manches.

function renderActivity(spec: ActivitySpec, onValidated = vi.fn()) {
  const result = render(<InteractiveActivity spec={spec} completed={false} onValidated={onValidated} />);
  return { ...result, onValidated };
}

const validate = () => fireEvent.click(screen.getByRole("button", { name: /vérifier ma réponse/i }));

describe("Règles pures", () => {
  it("lit les saisies d’enfant avec ou sans espaces, refuse le reste", () => {
    expect(parseAnswer("1 000")).toBe(1000);
    expect(parseAnswer(" 42 ")).toBe(42);
    expect(parseAnswer("4a")).toBeNull();
    expect(parseAnswer("")).toBeNull();
  });

  it("accepte uniquement les valeurs prévues, bornes comprises", () => {
    expect(accepts({ min: 67, max: 69 }, 67)).toBe(true);
    expect(accepts({ min: 67, max: 69 }, 66)).toBe(false);
    expect(accepts({ min: 67, max: 69 }, 70)).toBe(false);
    expect(accepts({ oneOf: [7, 8] }, 9)).toBe(false);
  });

  it("ne présente jamais des cartes déjà rangées", () => {
    for (const seed of ["a", "b", "c", "d", "e", "f", "g"]) {
      expect(shuffle([1, 2], seed, [1, 2])).toEqual([2, 1]);
    }
  });

  it("désigne la première paire mal rangée", () => {
    const spec: OrderSpec = { type: "order", text: "x", values: [3, 1, 2], direction: "asc" };
    expect(firstOrderMistake(spec, [1, 3, 2])).toEqual([3, 2]);
    expect(firstOrderMistake(spec, [1, undefined, 2])).toBe("incomplete");
    expect(firstOrderMistake(spec, [1, 2, 3])).toBeNull();
  });

  it("refuse un budget dépassé et un article pris deux fois", () => {
    const spec: CollectSpec = {
      type: "collect",
      text: "x",
      unit: "FC",
      supply: [
        { id: "a", value: 400, limit: 1, visual: { kind: "money", values: [400] } },
        { id: "b", value: 500, limit: 1, visual: { kind: "money", values: [500] } },
      ],
      goal: { atMost: 900, minItems: 2 },
      solution: { a: 1, b: 1 },
    };
    expect(collectIsCorrect(spec, { a: 1, b: 1 })).toBe(true);
    expect(collectIsCorrect(spec, { a: 2 })).toBe(false);
    expect(collectIsCorrect(spec, { b: 1 })).toBe(false);
  });
});

describe("Composants d’activité", () => {
  beforeEach(async () => {
    cleanup();
    await i18next.changeLanguage("fr");
  });
  afterEach(() => cleanup());

  it("nomme la question fausse, puis valide après correction", () => {
    const { container, onValidated } = renderActivity({
      type: "numeric",
      text: "u03l01.practice",
      fields: [
        { key: "q1", accept: 27 },
        { key: "q2", accept: 49 },
        { key: "q3", accept: 33 },
      ],
    });
    const inputs = container.querySelectorAll("input");
    fireEvent.change(inputs[0], { target: { value: "27" } });
    fireEvent.change(inputs[1], { target: { value: "50" } });
    fireEvent.change(inputs[2], { target: { value: "33" } });
    validate();
    expect(screen.getByText(/revois la question 2/i)).toBeInTheDocument();
    expect(onValidated).not.toHaveBeenCalled();
    fireEvent.change(inputs[1], { target: { value: "49" } });
    validate();
    expect(onValidated).toHaveBeenCalledTimes(1);
  });

  it("place un panier par toucher (sans glisser) et par glisser-déposer", () => {
    const { container, onValidated } = renderActivity({
      type: "match",
      text: "u02l02.play",
      items: [
        { id: "a", visual: { kind: "tens", tens: 3, units: 5 }, bin: "35" },
        { id: "b", visual: { kind: "tens", tens: 5, units: 3 }, bin: "53" },
      ],
      bins: [
        { id: "35", label: 35 },
        { id: "53", label: 53 },
      ],
    });
    // Alternative accessible : choisir la carte, puis la case.
    fireEvent.click(container.querySelector('[data-item="a"]') as HTMLElement);
    expect(screen.getByText(/est choisie/i)).toBeInTheDocument();
    fireEvent.click(container.querySelector('[data-bin="35"]') as HTMLElement);
    // Glisser-déposer : la donnée transportée est l’identifiant de la carte.
    const store: Record<string, string> = {};
    const dataTransfer = { setData: (type: string, value: string) => { store[type] = value; }, getData: (type: string) => store[type] };
    const item = container.querySelector('[data-item="b"]') as HTMLElement;
    const start = createEvent.dragStart(item);
    Object.defineProperty(start, "dataTransfer", { value: dataTransfer });
    fireEvent(item, start);
    const bin = (container.querySelector('[data-bin="53"]') as HTMLElement).parentElement as HTMLElement;
    const drop = createEvent.drop(bin);
    Object.defineProperty(drop, "dataTransfer", { value: dataTransfer });
    fireEvent(bin, drop);
    validate();
    expect(onValidated).toHaveBeenCalledTimes(1);
  });

  it("signale une carte mal placée sans révéler laquelle, et permet de recommencer", () => {
    const { container, onValidated } = renderActivity({
      type: "match",
      text: "u02l02.play",
      items: [
        { id: "a", visual: { kind: "tens", tens: 3, units: 5 }, bin: "35" },
        { id: "b", visual: { kind: "tens", tens: 5, units: 3 }, bin: "53" },
      ],
      bins: [
        { id: "35", label: 35 },
        { id: "53", label: 53 },
      ],
    });
    fireEvent.click(container.querySelector('[data-item="a"]') as HTMLElement);
    fireEvent.click(container.querySelector('[data-bin="53"]') as HTMLElement);
    fireEvent.click(container.querySelector('[data-item="b"]') as HTMLElement);
    fireEvent.click(container.querySelector('[data-bin="35"]') as HTMLElement);
    validate();
    expect(screen.getByText(/2 cartes ne sont pas à la bonne place/i)).toBeInTheDocument();
    expect(onValidated).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /recommencer/i }));
    expect(container.querySelectorAll('[data-bin] ~ div [data-item]')).toHaveLength(0);
    expect(container.querySelector('[data-item="a"]')).not.toBeNull();
  });

  it("explique l’erreur de rangement par la paire concernée", () => {
    const { container } = renderActivity({ type: "order", text: "u02l04.play", values: [45, 54, 40, 49], direction: "asc" });
    [40, 49, 54, 45].forEach((value, index) => {
      fireEvent.click(container.querySelector(`[data-card="${value}"]`) as HTMLElement);
      fireEvent.click(container.querySelector(`[data-slot="${index}"]`) as HTMLElement);
    });
    validate();
    expect(screen.getByText(/regarde 54 et 45/i)).toBeInTheDocument();
  });

  it("refuse un partage inégal et demande de continuer à distribuer", () => {
    const { container, onValidated } = renderActivity({ type: "distribute", text: "u06l01.discover", total: 12, recipients: 3, item: "nut", container: "child", askEach: true });
    fireEvent.click(container.querySelector('[data-recipient="0"]') as HTMLElement);
    validate();
    expect(screen.getByText(/continue/i)).toBeInTheDocument();
    expect(onValidated).not.toHaveBeenCalled();
  });

  it("indique si la somme est trop grande ou trop petite", () => {
    const { container } = renderActivity({
      type: "collect",
      text: "u07l01.play.r1",
      unit: "FC",
      supply: [{ id: "c200", value: 200, visual: { kind: "money", values: [200] } }],
      goal: { equals: 250 },
      solution: { c200: 1 },
    });
    fireEvent.click(container.querySelector('[data-supply="c200"]') as HTMLElement);
    fireEvent.click(container.querySelector('[data-supply="c200"]') as HTMLElement);
    validate();
    expect(screen.getByText(/c’est trop/i)).toBeInTheDocument();
  });

  it("enchaîne les manches et ne valide l’étape qu’à la dernière", () => {
    const { container, onValidated } = renderActivity({
      type: "rounds",
      text: "u03l02.play",
      rounds: [
        { type: "build", text: "u03l02.play.r1", controls: [{ id: "added", labelKey: "added", min: 0, max: 9 }], preview: { kind: "tenFrame", count: "added", base: 5 }, goal: { added: 5 } },
        { type: "build", text: "u03l02.play.r3", controls: [{ id: "added", labelKey: "added", min: 0, max: 9 }], preview: { kind: "tenFrame", count: "added", base: 9 }, goal: { added: 1 } },
      ],
    });
    expect(screen.getByText("Manche 1 sur 2")).toBeInTheDocument();
    for (let index = 0; index < 5; index += 1) fireEvent.click(container.querySelector('[data-action="plus"]') as HTMLElement);
    validate();
    expect(onValidated).not.toHaveBeenCalled();
    expect(screen.getByText("Manche 2 sur 2")).toBeInTheDocument();
    fireEvent.click(container.querySelector('[data-action="plus"]') as HTMLElement);
    validate();
    expect(onValidated).toHaveBeenCalledTimes(1);
  });
});
