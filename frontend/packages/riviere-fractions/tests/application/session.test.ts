import { describe, expect, it, vi } from "vitest";

import { questionParts, signLabelOf } from "../../src/application/presentation";
import { RiverSession, type RiverGameEvent, type ScenePort, type SessionView } from "../../src/application/session";
import { expectedValue, fraction, integer } from "../../src/domain/challenge";
import { Fraction } from "../../src/domain/fraction";
import { createRandom } from "../../src/domain/random";
import type { LaneIndex } from "../../src/domain/attempt";

function fakeScene(): ScenePort & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    setSigns: vi.fn((signs) => calls.push(`signs:${signs.length}`)),
    showVerdict: vi.fn((fork, lane, correct) => calls.push(`verdict:${fork}:${lane}:${correct}`)),
    resetCrossing: vi.fn(() => calls.push("reset")),
    celebrate: vi.fn(() => calls.push("celebrate")),
  };
}

function setup(seed = 4) {
  const views: SessionView[] = [];
  const events: RiverGameEvent[] = [];
  const session = new RiverSession({ random: createRandom(seed), onView: (view) => views.push(view), onEvent: (event) => events.push(event) });
  const scene = fakeScene();
  session.attach(scene);
  return { session, scene, views, events };
}

/** Voie de la bonne réponse du défi affiché, retrouvée par sa valeur parmi les réponses écrites sur les voies. */
function correctLane(view: SessionView): LaneIndex {
  const challenge = view.challenge!;
  const expected = expectedValue(challenge.expression);
  const lane = challenge.laneAnswers.findIndex((text) => {
    const [numerator, denominator] = text.split("/").map(Number);
    return Fraction.of(numerator, denominator ?? 1).equals(expected);
  });
  return lane as LaneIndex;
}

describe("Session de la traversée", () => {
  it("envoie les sept panneaux à la scène dès qu'elle est prête, et attend l'enfant au ponton", () => {
    const { session, scene } = setup();
    expect(scene.calls).toEqual(["signs:7"]);
    expect(session.view.phase).toBe("intro");
    expect(session.view.challenge).toBeNull();
  });

  it("montre la question une fois les amarres larguées", () => {
    const { session, events } = setup();
    session.start();
    expect(session.view.phase).toBe("sailing");
    expect(session.view.challenge?.rank).toBe(0);
    expect(session.view.challenge?.laneAnswers).toHaveLength(3);
    expect(events).toEqual([{ type: "attempt-started", attempt: 1 }]);
  });

  it("ignore un passage qui ne correspond pas au défi en cours", () => {
    const { session, scene } = setup();
    session.laneCrossed(0, 1);
    session.start();
    session.laneCrossed(3, 1);
    expect(scene.calls).toEqual(["signs:7"]);
  });

  it("valide une bonne voie : verdict, message, défi suivant", () => {
    const { session, scene, events } = setup();
    session.start();
    const lane = correctLane(session.view);
    session.laneCrossed(0, lane);
    expect(scene.calls).toContain(`verdict:0:${lane}:true`);
    expect(session.view.feedback?.kind).toBe("correct");
    expect(session.view.rank).toBe(1);
    expect(events.at(-1)).toMatchObject({ type: "challenge-answered", rank: 0, correct: true });
    const id = session.view.feedback!.id;
    session.dismissFeedback(id);
    expect(session.view.feedback).toBeNull();
  });

  it("une mauvaise voie arrête la tentative et explique l'erreur", () => {
    const { session, scene, events } = setup();
    session.start();
    const lane = correctLane(session.view);
    const wrong = ((lane + 1) % 3) as LaneIndex;
    session.laneCrossed(0, wrong);
    expect(scene.calls).toContain(`verdict:0:${wrong}:false`);
    expect(session.view.phase).toBe("wrong");
    const feedback = session.view.feedback;
    expect(feedback?.kind).toBe("wrong");
    if (feedback?.kind === "wrong") {
      expect(feedback.correctLane).toBe(lane);
      expect(feedback.explanation.rule.key).toBe("explain.division");
      expect(feedback.explanation.mistake).not.toBeNull();
    }
    expect(events.map((event) => event.type)).toContain("attempt-failed");
    // Un message d'erreur ne s'efface pas tout seul.
    session.dismissFeedback(feedback!.id);
    expect(session.view.feedback).not.toBeNull();
  });

  it("recommence au premier défi : la scène revient au départ et reçoit les nouveaux panneaux", () => {
    const { session, scene, events } = setup();
    session.start();
    session.laneCrossed(0, ((correctLane(session.view) + 1) % 3) as LaneIndex);
    session.restart();
    expect(scene.calls.slice(-2)).toEqual(["reset", "signs:7"]);
    expect(session.view.phase).toBe("sailing");
    expect(session.view.rank).toBe(0);
    expect(session.view.attempt).toBe(2);
    expect(session.view.challenge?.rework).toBe(true);
    expect(events.at(-1)).toEqual({ type: "attempt-started", attempt: 2 });
  });

  it("fête l'arrivée après sept bonnes voies", () => {
    const { session, scene, events } = setup();
    session.start();
    for (let fork = 0; fork < 7; fork += 1) session.laneCrossed(fork, correctLane(session.view));
    expect(session.view.phase).toBe("completed");
    expect(scene.calls).toContain("celebrate");
    expect(events.at(-1)).toEqual({ type: "level-completed", attempts: 1 });
  });

  it("publie chaque changement de vue", () => {
    const { session, views } = setup();
    session.start();
    expect(views.at(-1)?.phase).toBe("sailing");
    session.detach();
    session.restart();
    expect(views.at(-1)?.attempt).toBe(2);
  });
});

describe("Présentation", () => {
  it("donne aux panneaux des étiquettes prêtes à dessiner, sans calcul", () => {
    expect(signLabelOf(integer(3))).toEqual({ kind: "text", text: "3" });
    expect(signLabelOf(fraction(6, 12))).toEqual({ kind: "stacked", numerator: "6", denominator: "12" });
  });

  it("découpe chaque forme de question en morceaux d'écriture", () => {
    expect(questionParts({ kind: "division", dividend: 12, divisor: 4 }).map((part) => part.kind)).toEqual(["number", "operator", "number", "operator", "unknown"]);
    expect(questionParts({ kind: "equivalent", left: { numerator: 2, denominator: 3 }, rightDenominator: 9 }).at(-1)).toEqual({ kind: "fraction-unknown-numerator", denominator: "9" });
    expect(questionParts({ kind: "fraction-of", part: { numerator: 1, denominator: 3 }, quantity: 12 })[1]).toEqual({ kind: "word", key: "word.of" });
    expect(questionParts({ kind: "sum", left: { numerator: 1, denominator: 5 }, right: { numerator: 2, denominator: 5 } })).toHaveLength(5);
  });
});
