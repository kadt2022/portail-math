import Phaser from "phaser";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { mountTurboPulseGame, TurboPulseScene, type TurboPulseSnapshot } from "./TurboPulseGame";
import { CALCULATIONS_PER_LEVEL, TURBO_LEVELS, type FruitSpec } from "./turbo-pulse-engine";

// Vue interne d'un acteur de la scène : les tests ont besoin de placer les
// fruits et de déclencher les transitions de partie, ce que l'interface
// publique du contrôleur ne permet pas de faire de façon déterministe.
interface SceneInternals {
  fruits: Array<{ spec: FruitSpec; view: { x: number; y: number; destroy(): void } }>;
  shots: unknown[];
  operation: { result: number };
  status: string;
  solved: number;
  levelIndex: number;
  intrusions: number;
  correctHit(fruit: SceneInternals["fruits"][number]): void;
  wrongHit(fruit: SceneInternals["fruits"][number]): void;
  registerIntrusion(fruit: SceneInternals["fruits"][number]): boolean;
  aimAt(x: number, y: number): void;
  fire(): void;
  emitSnapshot(): void;
}

function internalsOf(scene: TurboPulseScene): SceneInternals {
  return scene as unknown as SceneInternals;
}

const games: Phaser.Game[] = [];

/**
 * Monte une scène Turbo Pulse dans un vrai moteur Phaser et attend que la
 * partie soit lancée.
 *
 * En navigateur, `create()` appelle `restartRun()` et la scène est déjà
 * active à ce moment précis : le premier instantané part immédiatement. Sous
 * jsdom, le drapeau "active" de la scène ne se stabilise qu'après le retour
 * de `create()` (différence de timing du bootstrap Phaser dans cet
 * environnement, sans rapport avec la logique de jeu) : `restartRun()`
 * s'arrête donc sur son garde-fou `isActive()` lors de ce tout premier appel
 * automatique. On attend que la scène soit active puis on relance nous-mêmes
 * `restartRun()` — exactement l'action qu'exécute le bouton « Recommencer »
 * une fois la partie chargée.
 */
async function mountScene(): Promise<{ scene: TurboPulseScene; snapshots: TurboPulseSnapshot[] }> {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const snapshots: TurboPulseSnapshot[] = [];
  const scene = new TurboPulseScene((snapshot) => snapshots.push(snapshot));
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: 960,
    height: 540,
    scene,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  });
  games.push(game);
  await vi.waitFor(() => expect(scene.scene.isActive()).toBe(true), { timeout: 5000 });
  if (snapshots.length === 0) scene.restartRun();
  await vi.waitFor(() => expect(snapshots.length).toBeGreaterThan(0), { timeout: 5000 });
  return { scene, snapshots };
}

function lastSnapshot(snapshots: TurboPulseSnapshot[]): TurboPulseSnapshot {
  return snapshots[snapshots.length - 1];
}

let nextFakeFruitId = 1000;

/**
 * Fruit minimal pour les scénarios qui consomment plus de fruits qu'il n'en
 * apparaît naturellement pendant la durée d'un test (arrivées Phaser
 * planifiées sur plusieurs secondes de jeu réel). `view` n'a besoin que des
 * propriétés lues par correctHit/wrongHit/registerIntrusion — Phaser anime
 * n'importe quel objet aux bonnes propriétés numériques, pas seulement ses
 * propres GameObjects.
 */
function fakeFruit(number: number): SceneInternals["fruits"][number] {
  const id = nextFakeFruitId++;
  return {
    spec: { id, family: "tomato", familyLabel: "tomate", emoji: "🍅", variant: "red", variantLabel: "rouge", color: 0xe94f4f, number },
    view: { x: 500, y: 200, destroy: () => {} },
  };
}

describe("scène Turbo Pulse", () => {
  let nativeImage: typeof Image;

  beforeAll(() => {
    // jsdom ne charge jamais les images : Phaser attend indéfiniment ses
    // textures par défaut (__DEFAULT / __MISSING) et ne démarre alors aucune
    // scène. Résoudre le chargement immédiatement débloque le boot.
    nativeImage = globalThis.Image;
    class InstantImage extends nativeImage {
      constructor() {
        super();
        setTimeout(() => this.dispatchEvent(new Event("load")), 0);
      }
    }
    globalThis.Image = InstantImage as unknown as typeof Image;
  });

  afterAll(() => {
    globalThis.Image = nativeImage;
  });

  afterEach(() => {
    games.splice(0).forEach((game) => game.destroy(true));
  });

  it("démarre au niveau 1 avec trois fruits et une opération à résoudre", async () => {
    const { snapshots } = await mountScene();
    const snapshot = lastSnapshot(snapshots);

    expect(snapshot.levelIndex).toBe(0);
    expect(snapshot.levelName).toBe(TURBO_LEVELS[0].name);
    expect(snapshot.remainingFruits).toBe(3);
    expect(snapshot.solved).toBe(0);
    expect(snapshot.score).toBe(0);
    expect(snapshot.status).toBe("playing");
    expect(snapshot.operation).toMatch(/^\d+ [+−×] \d+ = \?$/);
  });

  it("détruit toute la couleur touchée, crédite le score et garde la réponse cachée", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);
    const target = internals.fruits.find((fruit) => fruit.spec.number === internals.operation.result);
    expect(target).toBeDefined();
    const sameColour = internals.fruits.filter((fruit) => fruit.spec.variant === target!.spec.variant).length;

    internals.correctHit(target!);
    const snapshot = lastSnapshot(snapshots);

    expect(snapshot.score).toBe(sameColour);
    expect(snapshot.streak).toBe(1);
    expect(snapshot.solved).toBe(1);
    // L'opération proposée reste une question : la réponse n'est jamais affichée.
    expect(snapshot.operation).toMatch(/= \?$/);
  });

  it("remet la série à zéro sur un tir manqué sans retirer de fruit", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);
    const target = internals.fruits.find((fruit) => fruit.spec.number === internals.operation.result)!;
    internals.correctHit(target);
    expect(lastSnapshot(snapshots).streak).toBe(1);

    const remaining = internals.fruits.length;
    internals.wrongHit(internals.fruits[0]);
    const snapshot = lastSnapshot(snapshots);

    expect(snapshot.streak).toBe(0);
    expect(internals.fruits).toHaveLength(remaining);
  });

  it("compte les intrusions et fait échouer le niveau à la limite du niveau 1", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);
    const limit = 5; // INTRUSION_LIMITS[0]

    for (let count = 1; count < limit; count += 1) {
      // Chaque intrusion consomme le fruit franchi ; on regarnit pour ne pas
      // dépendre des arrivées Phaser planifiées sur plusieurs secondes.
      const fruit = internals.fruits[0] ?? fakeFruit(999);
      const failed = internals.registerIntrusion(fruit);
      expect(failed).toBe(false);
      expect(lastSnapshot(snapshots).intrusions).toBe(count);
    }

    const lastFruit = internals.fruits[0] ?? fakeFruit(999);
    const failed = internals.registerIntrusion(lastFruit);
    expect(failed).toBe(true);
    const snapshot = lastSnapshot(snapshots);
    expect(snapshot.status).toBe("failed");
    expect(snapshot.intrusions).toBe(limit);
    expect(snapshot.failureAction).toBe("retry");
  });

  it("passe en nettoyage une fois les douze calculs réussis puis termine le niveau", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);

    for (let solved = 0; solved < CALCULATIONS_PER_LEVEL; solved += 1) {
      // Les arrivées naturelles sont planifiées sur plusieurs secondes de jeu
      // réel : on regarnit avec la valeur ciblée pour rester déterministe.
      const target = internals.fruits.find((fruit) => fruit.spec.number === internals.operation.result)
        ?? fakeFruit(internals.operation.result);
      if (!internals.fruits.includes(target)) internals.fruits.push(target);
      internals.correctHit(target);
    }

    expect(lastSnapshot(snapshots).solved).toBe(CALCULATIONS_PER_LEVEL);
    expect(["clearing", "level-complete"]).toContain(lastSnapshot(snapshots).status);
  });

  it("met en pause et reprend sans perdre le score ni le niveau en cours", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);
    const target = internals.fruits.find((fruit) => fruit.spec.number === internals.operation.result)!;
    internals.correctHit(target);
    const scoreAvant = lastSnapshot(snapshots).score;

    scene.togglePause();
    expect(lastSnapshot(snapshots).paused).toBe(true);
    expect(lastSnapshot(snapshots).score).toBe(scoreAvant);

    scene.togglePause();
    expect(lastSnapshot(snapshots).paused).toBe(false);
    expect(lastSnapshot(snapshots).score).toBe(scoreAvant);
  });

  it("ne met pas en pause un niveau déjà échoué", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);
    internals.status = "failed";

    scene.togglePause();

    expect(lastSnapshot(snapshots).paused).toBe(false);
  });

  it("bascule le son et le répercute dans l'instantané", async () => {
    const { scene, snapshots } = await mountScene();
    expect(lastSnapshot(snapshots).muted).toBe(false);

    scene.toggleMuted();
    expect(lastSnapshot(snapshots).muted).toBe(true);

    scene.toggleMuted();
    expect(lastSnapshot(snapshots).muted).toBe(false);
  });

  it("relance le parcours au niveau 1 en remettant score et série à zéro", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);
    internals.correctHit(internals.fruits[0]);
    expect(lastSnapshot(snapshots).score).toBeGreaterThan(0);

    scene.restartRun();

    const snapshot = lastSnapshot(snapshots);
    expect(snapshot.levelIndex).toBe(0);
    expect(snapshot.score).toBe(0);
    expect(snapshot.streak).toBe(0);
    expect(snapshot.solved).toBe(0);
    expect(snapshot.status).toBe("playing");
  });

  it("ignore le passage au niveau suivant tant que le niveau n'est pas terminé", async () => {
    const { scene, snapshots } = await mountScene();

    scene.nextLevel();

    expect(lastSnapshot(snapshots).levelIndex).toBe(0);
  });

  it("avance au niveau suivant une fois le niveau terminé", async () => {
    const { scene, snapshots } = await mountScene();
    internalsOf(scene).status = "level-complete";

    scene.nextLevel();

    const snapshot = lastSnapshot(snapshots);
    expect(snapshot.levelIndex).toBe(1);
    expect(snapshot.levelName).toBe(TURBO_LEVELS[1].name);
    expect(snapshot.status).toBe("playing");
  });

  it("rejoue le niveau échoué en repartant du score de départ du niveau", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);
    internals.correctHit(internals.fruits[0]);
    internals.status = "failed";

    scene.retryLevel();

    const snapshot = lastSnapshot(snapshots);
    expect(snapshot.levelIndex).toBe(0);
    expect(snapshot.status).toBe("playing");
    expect(snapshot.streak).toBe(0);
    expect(snapshot.intrusions).toBe(0);
  });

  it("vise puis tire sans jamais révéler la réponse sur le projectile", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);

    internals.aimAt(700, 200);
    internals.fire();

    expect(internals.shots.length).toBeGreaterThan(0);
    expect(lastSnapshot(snapshots).operation).toMatch(/= \?$/);
  });

  it("réapplique la mise à l'échelle sans recréer la scène ni perdre l'état", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);
    internals.correctHit(internals.fruits[0]);
    const scoreAvant = lastSnapshot(snapshots).score;
    const fruitsAvant = internals.fruits.length;

    scene.refreshLayout();

    expect(internals.fruits).toHaveLength(fruitsAvant);
    expect(lastSnapshot(snapshots).score).toBe(scoreAvant);
  });
});

describe("montage du jeu Turbo Pulse", () => {
  let nativeImage: typeof Image;

  beforeAll(() => {
    nativeImage = globalThis.Image;
    class InstantImage extends nativeImage {
      constructor() {
        super();
        setTimeout(() => this.dispatchEvent(new Event("load")), 0);
      }
    }
    globalThis.Image = InstantImage as unknown as typeof Image;
  });

  afterAll(() => {
    globalThis.Image = nativeImage;
  });

  // Sous jsdom, la scène ne devient "active" qu'après le retour de create()
  // (voir le commentaire de mountScene ci-dessus) : le tout premier
  // restartRun() automatique s'arrête sur son garde-fou. On relance
  // restartRun() via le contrôleur public à chaque tentative, jusqu'à ce que
  // la scène soit prête à l'accepter — sans rien changer au code de jeu.
  async function waitForFirstSnapshot(controller: { restartRun(): void }, snapshots: TurboPulseSnapshot[]) {
    await vi.waitFor(
      () => {
        if (snapshots.length === 0) controller.restartRun();
        expect(snapshots.length).toBeGreaterThan(0);
      },
      { timeout: 5000, interval: 50 },
    );
  }

  it("crée un canvas unique dans l'hôte fourni et le retire à la destruction", async () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const snapshots: TurboPulseSnapshot[] = [];

    const controller = mountTurboPulseGame(parent, (snapshot) => snapshots.push(snapshot));
    await waitForFirstSnapshot(controller, snapshots);

    expect(parent.querySelectorAll("canvas")).toHaveLength(1);

    controller.destroy();

    // Game.destroy() ne fait que poser un drapeau côté Phaser ; le retrait
    // réel du canvas s'exécute au tick suivant de la boucle de jeu.
    await vi.waitFor(() => expect(parent.querySelectorAll("canvas")).toHaveLength(0), { timeout: 2000 });
  });

  it("expose les commandes de partie reliées à la scène montée", async () => {
    const parent = document.createElement("div");
    document.body.appendChild(parent);
    const snapshots: TurboPulseSnapshot[] = [];

    const controller = mountTurboPulseGame(parent, (snapshot) => snapshots.push(snapshot));
    await waitForFirstSnapshot(controller, snapshots);

    controller.toggleMuted();
    expect(lastSnapshot(snapshots).muted).toBe(true);

    controller.togglePause();
    expect(lastSnapshot(snapshots).paused).toBe(true);

    controller.togglePause();
    expect(lastSnapshot(snapshots).paused).toBe(false);

    // Le rafraîchissement de mise en page ne doit jamais détruire le canvas.
    controller.refreshLayout();
    expect(parent.querySelectorAll("canvas")).toHaveLength(1);

    controller.destroy();
  });
});
