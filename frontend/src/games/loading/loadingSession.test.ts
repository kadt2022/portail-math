import { describe, expect, it, vi } from "vitest";

import { createLoadingSession, INIT_SHARE } from "./loadingSession";

const clock = () => {
  let time = 1_000;
  return { now: () => time, advance: (ms: number) => (time += ms) };
};

describe("séance de chargement : progression globale pondérée", () => {
  it("initialisation de 0 à 10 % par jalons réellement atteints, chacun selon son poids", () => {
    const session = createLoadingSession({ player: 3, engine: 5, mounted: 2 });
    expect(session.getState()).toMatchObject({ phase: "init", progress: 0 });
    session.milestone("player");
    expect(session.getState().progress).toBeCloseTo(0.03, 6);
    session.milestone("engine");
    expect(session.getState().progress).toBeCloseTo(0.08, 6);
    // Un jalon inconnu ou déjà atteint ne compte pas.
    session.milestone("inconnu");
    session.milestone("player");
    expect(session.getState().progress).toBeCloseTo(0.08, 6);
    expect(session.getState().phase).toBe("init");
  });

  it("fin de l'initialisation : exactement 10 %, puis 10 + ressources × 90, sans jamais revenir en arrière", () => {
    const time = clock();
    const session = createLoadingSession({ player: 7, mounted: 3 }, time.now);
    session.milestone("player");
    time.advance(4_000);
    session.milestone("mounted");
    expect(session.getState()).toMatchObject({ phase: "resources", phaseStartedAt: 5_000, startedAt: 1_000 });
    expect(session.getState().progress).toBeCloseTo(INIT_SHARE, 6);
    for (const [resources, global] of [[0.25, 0.325], [0.5, 0.55], [0.75, 0.775]] as const) {
      session.reportResources(resources);
      expect(session.getState().progress).toBeCloseTo(global, 6);
    }
    // Une valeur plus basse (nouvelle estimation) ne fait jamais reculer la barre.
    session.reportResources(0.4);
    expect(session.getState().progress).toBeCloseTo(0.775, 6);
  });

  it("ressources arrivées pendant l'initialisation : montrées seulement à partir de la phase 2, sans recul", () => {
    const session = createLoadingSession({ player: 3, engine: 5, mounted: 2 });
    session.milestone("player");
    session.milestone("mounted");
    session.reportResources(0.5);
    // Moteur encore attendu : on reste dans l'initialisation, à la part de ses jalons.
    expect(session.getState()).toMatchObject({ phase: "init" });
    expect(session.getState().progress).toBeCloseTo(0.05, 6);
    session.milestone("engine");
    expect(session.getState().phase).toBe("resources");
    expect(session.getState().progress).toBeCloseTo(0.55, 6);
  });

  it("jamais 100 % avant le signal « prêt », qui seul termine le chargement", () => {
    const session = createLoadingSession({ player: 1 });
    session.milestone("player");
    session.reportResources(1);
    expect(session.getState().progress).toBeLessThan(1);
    expect(session.getState().ready).toBe(false);
    session.ready();
    expect(session.getState()).toMatchObject({ progress: 1, ready: true });
    // Plus rien ne bouge ensuite.
    session.reportResources(0.2);
    expect(session.getState().progress).toBe(1);
  });

  it("jeu sans ressource : prêt directement depuis l'initialisation", () => {
    const session = createLoadingSession({ player: 7, mounted: 3 });
    session.milestone("player");
    session.ready();
    expect(session.getState()).toMatchObject({ ready: true, progress: 1 });
  });

  it("échec réel : signalé, puis Réessayer lève l'échec et lance la reprise du jeu", () => {
    const session = createLoadingSession({ player: 1 });
    const retry = vi.fn();
    session.fail(retry);
    expect(session.getState().failed).toBe(true);
    session.retry();
    expect(session.getState().failed).toBe(false);
    expect(retry).toHaveBeenCalledOnce();
  });

  it("prévient ses abonnés à chaque changement visible, et seulement alors", () => {
    const session = createLoadingSession({ player: 1, mounted: 1 });
    const listener = vi.fn();
    const stop = session.subscribe(listener);
    session.milestone("player");
    session.milestone("player");
    expect(listener).toHaveBeenCalledTimes(1);
    stop();
    session.milestone("mounted");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
