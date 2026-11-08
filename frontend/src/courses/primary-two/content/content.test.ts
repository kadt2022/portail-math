import { describe, expect, it } from "vitest";

import fr from "../../../i18n/locales/fr/primaryTwoLessons.json";
import { PRIMARY_TWO_FINAL_ASSESSMENT_ID, PRIMARY_TWO_MODULES } from "../course-catalogue";
import {
  acceptedValues,
  buildIsCorrect,
  collectIsCorrect,
  collectSignature,
  distributeShares,
  distributionIsFair,
  expectedOrder,
  matchIsCorrect,
  shuffle,
  symmetryIsCorrect,
  symmetryTargets,
} from "../interactive/logic";
import type { ActivitySpec, SingleActivitySpec } from "../interactive/types";
import { INTERACTIVE_CONTENT } from "./index";

// Contrôle exhaustif des données des leçons : chaque réponse attendue est
// vérifiée mathématiquement, chaque texte existe en français et aucune
// présentation initiale ne montre déjà la réponse.

function lookup(key: string): unknown {
  return key.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), fr);
}

function expectText(key: string) {
  const value = lookup(key);
  expect(typeof value === "string" && value.trim().length > 0, `texte manquant : ${key}`).toBe(true);
}

/** Calcul de contrôle limité aux nombres, opérations et Math.floor. */
function evaluateCheck(expression: string): number {
  const safe = expression.replace(/Math\.floor/g, "");
  if (!/^[\d\s+\-*/%().]+$/.test(safe)) throw new Error(`calcul de contrôle refusé : ${expression}`);
  return Function(`"use strict"; return (${expression});`)() as number;
}

function singleSpecs(spec: ActivitySpec): SingleActivitySpec[] {
  return spec.type === "rounds" ? [...spec.rounds] : [spec];
}

function checkTexts(spec: SingleActivitySpec, inRound: boolean) {
  const base = spec.text;
  if (!inRound) {
    expectText(`${base}.title`);
  }
  expectText(`${base}.instruction`);
  if (spec.type !== "selfcheck") expectText(`${base}.hint`);
  const parent = inRound ? base.split(".").slice(0, -1).join(".") : base;
  const label = (key: string) => {
    // Les libellés de contrôles peuvent être partagés au niveau du jeu.
    const local = lookup(`${base}.${key}`);
    expect(typeof local === "string" || typeof lookup(`${parent}.${key}`) === "string", `libellé manquant : ${base}.${key}`).toBe(true);
  };
  switch (spec.type) {
    case "numeric":
      spec.fields.forEach((field) => label(field.key));
      break;
    case "match":
      spec.items.forEach((item) => item.labelKey && label(item.labelKey));
      spec.bins.forEach((bin) => typeof bin.label === "string" && label(bin.label));
      break;
    case "build":
      spec.controls.forEach((control) => label(control.labelKey));
      break;
    case "choice":
      spec.options.forEach((option) => label(`options.${option.id}`));
      break;
    case "collect":
      spec.supply.forEach((supply) => label(`supply.${supply.id}`));
      break;
    case "selfcheck":
      spec.recap.forEach((key) => label(key));
      break;
    default:
      break;
  }
}

function checkMaths(spec: SingleActivitySpec) {
  switch (spec.type) {
    case "numeric":
      for (const field of spec.fields) {
        expect(acceptedValues(field.accept).length, `${spec.text}.${field.key}`).toBeGreaterThan(0);
        if (field.check) {
          expect(typeof field.accept, `${spec.text}.${field.key} : un calcul de contrôle exige une réponse unique`).toBe("number");
          expect(evaluateCheck(field.check), `${spec.text}.${field.key} = ${field.check}`).toBe(field.accept);
        }
      }
      break;
    case "match": {
      const binIds = new Set(spec.bins.map((bin) => bin.id));
      spec.items.forEach((item) => expect(binIds.has(item.bin), `${spec.text} : case ${item.bin}`).toBe(true));
      expect(matchIsCorrect(spec, Object.fromEntries(spec.items.map((item) => [item.id, item.bin])))).toBe(true);
      // Une collection à compter posée sur une case-nombre doit avoir exactement ce nombre d'objets.
      for (const item of spec.items) {
        const bin = spec.bins.find((candidate) => candidate.id === item.bin);
        if (item.visual?.kind === "collection" && typeof bin?.label === "number") expect(item.visual.count).toBe(bin.label);
        if (item.visual?.kind === "tens" && typeof bin?.label === "number") expect(item.visual.tens * 10 + item.visual.units).toBe(bin.label);
      }
      const shuffled = shuffle(spec.items.map((item) => item.id), spec.text);
      expect(shuffled.join(), `${spec.text} : les cartes doivent être mélangées`).not.toBe(spec.items.map((item) => item.id).join());
      break;
    }
    case "build":
      for (const control of spec.controls) {
        const goal = spec.goal[control.id];
        expect(goal, `${spec.text} : objectif de ${control.id}`).toBeDefined();
        expect(goal).toBeGreaterThanOrEqual(control.min);
        expect(goal).toBeLessThanOrEqual(control.max);
        expect(goal === (control.start ?? control.min) && spec.controls.length === 1, `${spec.text} : la réponse ne doit pas être affichée au départ`).toBe(false);
      }
      expect(buildIsCorrect(spec, spec.goal)).toBe(true);
      break;
    case "order": {
      const shown = shuffle(spec.values, spec.text, expectedOrder(spec));
      expect(shown.join(), `${spec.text} : présentation déjà rangée`).not.toBe(expectedOrder(spec).join());
      expect(new Set(spec.values).size).toBe(spec.values.length);
      break;
    }
    case "choice":
      spec.correct.forEach((id) => expect(spec.options.some((option) => option.id === id), `${spec.text} : ${id}`).toBe(true));
      expect(spec.options.length).toBeGreaterThanOrEqual(2);
      if (!spec.multiple) expect(spec.correct).toHaveLength(1);
      break;
    case "distribute":
      expect(distributionIsFair(spec, Array.from({ length: spec.recipients }, () => distributeShares(spec).each))).toBe(true);
      if (spec.total % spec.recipients !== 0) expect(spec.askRest, `${spec.text} : il reste des objets, il faut demander le reste`).toBe(true);
      break;
    case "collect":
      expect(collectIsCorrect(spec, spec.solution), `${spec.text} : solution`).toBe(true);
      if (spec.twoWays) {
        expect(spec.secondSolution).toBeDefined();
        expect(collectIsCorrect(spec, spec.secondSolution ?? {})).toBe(true);
        expect(collectSignature(spec.secondSolution ?? {})).not.toBe(collectSignature(spec.solution));
      }
      break;
    case "clock":
      expect(spec.hour).toBeGreaterThanOrEqual(1);
      expect(spec.hour).toBeLessThanOrEqual(12);
      expect(spec.hour === (spec.startHour ?? 12) && spec.minute === 0).toBe(false);
      break;
    case "symmetry":
      spec.left.forEach(([column, row]) => {
        expect(column).toBeGreaterThanOrEqual(1);
        expect(column).toBeLessThanOrEqual(spec.half);
        expect(row).toBeLessThan(spec.rows);
      });
      expect(symmetryIsCorrect(spec, new Set(symmetryTargets(spec)))).toBe(true);
      break;
    default:
      break;
  }
}

describe("Contenu interactif de 2e primaire", () => {
  it("couvre exactement les leçons et évaluations publiées du catalogue", () => {
    const published = PRIMARY_TWO_MODULES.flatMap((module) => [
      ...module.lessons,
      module.evaluation,
      ...(module.finalEvaluation ? [module.finalEvaluation] : []),
    ]).filter((item) => item.publication === "available" && !/U01-L0[1-4]$/.test(item.id));
    expect(published.map((item) => item.id).sort()).toEqual(INTERACTIVE_CONTENT.map((content) => content.id).sort());
  });

  it.each(INTERACTIVE_CONTENT.map((content) => [content.id, content] as const))("%s : structure, textes et réponses", (id, content) => {
    if (id.endsWith("-EVAL")) {
      expect(content.activities).toHaveLength(5);
      expect(content.activities[4].type).toBe("selfcheck");
    } else if (id === PRIMARY_TWO_FINAL_ASSESSMENT_ID) {
      expect(content.activities).toHaveLength(11);
      expect(content.activities[10].type).toBe("selfcheck");
    } else {
      expect(content.activities).toHaveLength(6);
    }
    expectText(`${content.text}.objective`);
    expectText(`${content.text}.situation`);
    expectText(`${content.text}.complete`);
    const texts = new Set<string>();
    for (const activity of content.activities) {
      expect(activity.text.startsWith(`${content.text}.`)).toBe(true);
      expect(texts.has(activity.text)).toBe(false);
      texts.add(activity.text);
      if (activity.type === "rounds") {
        expectText(`${activity.text}.title`);
        expectText(`${activity.text}.instruction`);
        expect(activity.rounds.length).toBeGreaterThanOrEqual(2);
      }
      for (const single of singleSpecs(activity)) {
        checkTexts(single, activity.type === "rounds");
        checkMaths(single);
      }
    }
  });

  it("varie les types d'activités dans chaque leçon (pas de suite de QCM)", () => {
    for (const content of INTERACTIVE_CONTENT.filter((entry) => /-L0\d$/.test(entry.id))) {
      const kinds = content.activities.flatMap(singleSpecs).map((spec) => spec.type);
      const choices = kinds.filter((kind) => kind === "choice").length;
      expect(new Set(kinds).size, `${content.id} : ${kinds.join(", ")}`).toBeGreaterThanOrEqual(3);
      expect(choices, `${content.id} : trop de choix multiples`).toBeLessThanOrEqual(Math.ceil(kinds.length / 2));
      // Je manipule et Je joue demandent une action, pas un simple choix.
      expect(singleSpecs(content.activities[1]).every((spec) => spec.type !== "choice") || singleSpecs(content.activities[1]).length > 1).toBe(true);
    }
  });
});
