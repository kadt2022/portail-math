import Phaser from "phaser";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";

import { LeoLivreurScene, mountLeoLivreurGame, renderPixelRatio, type LeoLivreurSnapshot } from "./LeoLivreurGame";
import { BRIDGE_END_X, BRIDGE_START_X, cityLayout } from "./leoCityLayout";
import { DESTINATIONS, MAIN_LANE_Y, START_POSITION } from "./leoGeometry";
import { MAX_AUTO_RETRIES } from "./leoZoneAssets";

/**
 * Scène réelle dans un vrai moteur Phaser (rendu canvas simulé par vitest-canvas-mock). Les images sont « reçues »
 * immédiatement, sauf celles que le test fait échouer : on vérifie ainsi le démarrage, la conduite, les livraisons
 * et tout le cycle de vie des lots de ressources (attente, reprise, erreur, libération).
 */
interface Internals {
  motion: { x: number; y: number; speed: number; heading: number; steeringAngle: number };
  assets: { state(bundle: string): string; attempts(bundle: string): number };
  assetsWaiting: boolean;
  textures: Phaser.Textures.TextureManager;
  sprites: Record<string, Phaser.GameObjects.Image | undefined>;
  trafficViews: Array<{ spec: unknown }>;
  phase: string;
}

/** Fichiers dont le téléchargement échoue (motif sur l'URL), et combien de fois. */
const failures = new Map<RegExp, number>();

const games: Phaser.Game[] = [];
let clock = 0;

async function mountScene() {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const snapshots: LeoLivreurSnapshot[] = [];
  const scene = new LeoLivreurScene((snapshot) => snapshots.push(snapshot));
  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent,
    width: 960,
    height: 540,
    scene,
    loader: { imageLoadType: "HTMLImageElement" },
    scale: { mode: Phaser.Scale.NONE },
  });
  games.push(game);
  await vi.waitFor(() => expect(scene.scene.isActive()).toBe(true), { timeout: 5000 });
  // Boucle pilotée par le test : chaque image avance l'horloge de la scène de façon déterministe.
  game.loop.sleep();
  clock = game.loop.time;
  const internals = scene as unknown as Internals;
  const step = async (frames = 1, delta = 16) => {
    for (let frame = 0; frame < frames; frame += 1) {
      clock += delta;
      game.step(clock, delta);
      if (frame % 10 === 9) await flush();
    }
    await flush();
  };
  const last = () => snapshots[snapshots.length - 1];
  // Démarrage terminé : lot commun prêt ET instantané « ready » publié (l'attente se lève à l'image suivante).
  const started = () => internals.assets.state("common") === "ready" && last()?.assets === "ready";
  return { scene, internals, snapshots, game, step, last, started };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** Avance jusqu'à ce que la condition soit vraie (téléchargements simulés asynchrones). */
async function stepUntil(step: (frames?: number) => Promise<void>, condition: () => boolean, maxFrames = 400) {
  for (let frame = 0; frame < maxFrames && !condition(); frame += 10) await step(10);
  expect(condition()).toBe(true);
}

function teleport(internals: Internals, x: number, y = MAIN_LANE_Y) {
  internals.motion = { ...internals.motion, x, y, speed: 0, heading: 0, steeringAngle: 0 };
}

describe("scène de conduite de Léo", () => {
  let nativeImage: typeof Image;

  beforeAll(() => {
    nativeImage = globalThis.Image;
    class InstantImage extends nativeImage {
      constructor() {
        super();
        // Le constructeur Image de jsdom renvoie son propre objet : la taille se définit donc sur l'instance.
        Object.defineProperty(this, "naturalWidth", { get: () => 512 });
        Object.defineProperty(this, "naturalHeight", { get: () => 256 });
        setTimeout(() => {
          for (const [pattern, remaining] of failures) {
            if (remaining > 0 && pattern.test(this.src)) {
              failures.set(pattern, remaining - 1);
              this.dispatchEvent(new Event("error"));
              return;
            }
          }
          this.dispatchEvent(new Event("load"));
        }, 0);
      }
    }
    globalThis.Image = InstantImage as unknown as typeof Image;
  });

  afterAll(() => {
    globalThis.Image = nativeImage;
  });

  beforeEach(() => failures.clear());

  afterEach(() => {
    while (games.length) games.pop()?.destroy(true);
    window.history.replaceState(null, "", "/");
  });

  it("démarre avec le seul lot commun et attend Commencer", async () => {
    const { internals, last, step, started } = await mountScene();
    await stepUntil(step, started);
    expect(internals.assets.state("bridge")).toBe("absent");
    expect(internals.assets.state("city")).toBe("absent");
    expect(last().assets).toBe("ready");
    expect(last().phase).toBe("INTRO");
    expect(last().cargo).toBe(DESTINATIONS.length);
    // Avant Commencer, les commandes ne font pas avancer Léo.
    const { scene } = { scene: internals as unknown as LeoLivreurScene };
    scene.setControl("forward", true);
    await step(30);
    expect(internals.motion.x).toBe(START_POSITION.x);
  });

  it("roule, braque, freine et recule une fois la mission commencée", async () => {
    const { scene, internals, last, step, started } = await mountScene();
    await stepUntil(step, started);
    scene.startMission();
    expect(last().phase).toBe("DRIVING");
    scene.setControl("forward", true);
    await step(90);
    expect(internals.motion.x).toBeGreaterThan(START_POSITION.x);
    expect(last().speedKmh).toBeGreaterThan(0);
    expect(last().travelledMeters).toBeGreaterThan(0);
    scene.turn("left");
    await step(5);
    scene.setControl("right", true);
    await step(10);
    scene.setControl("right", false);
    scene.setControl("forward", false);
    scene.setControl("brake", true);
    await step(200);
    expect(internals.motion.speed).toBe(0);
    scene.setControl("brake", false);
    scene.setControl("reverse", true);
    const before = internals.motion.x;
    await step(60);
    expect(internals.motion.x).toBeLessThan(before);
    scene.setControl("reverse", false);
    scene.reset();
    expect(last().phase).toBe("INTRO");
    expect(internals.motion.x).toBe(START_POSITION.x);
  });

  it("suit les commandes du clavier", async () => {
    const { scene, internals, step, started } = await mountScene();
    await stepUntil(step, started);
    scene.startMission();
    const keyboard = scene.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin;
    keyboard.emit("keydown-UP");
    await step(60);
    expect(internals.motion.speed).toBeGreaterThan(0);
    keyboard.emit("keyup-UP");
    for (const key of ["LEFT", "A", "RIGHT", "D", "W", "DOWN", "S", "SPACE", "R"]) {
      keyboard.emit(`keydown-${key}`);
      keyboard.emit(`keyup-${key}`);
    }
    keyboard.emit("keydown-SPACE");
    await step(200);
    expect(internals.motion.speed).toBe(0);
  });

  it("livre la pizza arrêté devant la maison, puis vise la suivante", async () => {
    const { scene, internals, last, step, started } = await mountScene();
    await stepUntil(step, started);
    scene.startMission();
    teleport(internals, DESTINATIONS[0].stop.x);
    // Une livraison n'est possible qu'à l'arrêt dans la zone : ARRIVED, puis Livrer.
    await stepUntil(step, () => last().phase === "ARRIVED");
    scene.deliver();
    expect(last().phase).toBe("DRIVING");
    expect(last().cargo).toBe(DESTINATIONS.length - 1);
    expect(last().targetLabel).toBe(DESTINATIONS[1].label);
    // Livrer ailleurs que devant la maison est sans effet.
    scene.deliver();
    expect(last().cargo).toBe(DESTINATIONS.length - 1);
  });

  it("met Léo en attente devant le pont, télécharge pont puis ville, et libère tout en s'éloignant", async () => {
    const { scene, internals, last, step, started } = await mountScene();
    await stepUntil(step, started);
    scene.startMission();
    teleport(internals, BRIDGE_START_X + 400);
    await step(1);
    expect(internals.assetsWaiting).toBe(true);
    expect(last().assets).toBe("loading");
    await stepUntil(step, () => internals.assets.state("bridge") === "ready" && !internals.assetsWaiting);
    // Image source du pont libérée, seules les versions affichées restent.
    expect(internals.textures.exists("leo-world-suspension-bridge-layer")).toBe(false);
    expect(last().assets).toBe("ready");
    // La ville arrive avec ses feux, ses voitures en profondeur et la berline qui tourne.
    const city = cityLayout();
    teleport(internals, city.stopLineEast - 600);
    await stepUntil(step, () => internals.assets.state("city") === "ready" && !internals.assetsWaiting);
    expect(internals.textures.exists("leo-cross-sedan-turn")).toBe(false);
    scene.setControl("forward", true);
    await step(120);
    scene.setControl("forward", false);
    scene.setControl("brake", true);
    await step(120);
    scene.setControl("brake", false);
    // Retour au départ : pont et ville sont libérés.
    teleport(internals, START_POSITION.x);
    await stepUntil(step, () => internals.assets.state("bridge") === "absent" && internals.assets.state("city") === "absent");
    expect(internals.textures.exists("leo-world-city-top")).toBe(false);
    // Et rechargés au retour.
    teleport(internals, BRIDGE_END_X - 200);
    await stepUntil(step, () => internals.assets.state("bridge") === "ready" && !internals.assetsWaiting);
  });

  it("reprend un téléchargement en échec après son délai, puis signale l'erreur et réessaie sur demande", async () => {
    failures.set(/suspension-bridge-layer/, MAX_AUTO_RETRIES + 1);
    const { scene, internals, last, step, started } = await mountScene();
    await stepUntil(step, started);
    scene.startMission();
    teleport(internals, BRIDGE_START_X + 400);
    await stepUntil(step, () => internals.assets.state("bridge") === "retrying");
    expect(internals.assets.attempts("bridge")).toBe(1);
    // Pendant le délai, aucune nouvelle tentative malgré les demandes de chaque image.
    await step(30);
    expect(internals.assets.attempts("bridge")).toBe(1);
    await stepUntil(step, () => internals.assets.state("bridge") === "error", 2000);
    expect(last().assets).toBe("error");
    // Le réseau revient : Réessayer relance le pont, puis la conduite reprend.
    scene.retryAssets();
    await stepUntil(step, () => internals.assets.state("bridge") === "ready" && !internals.assetsWaiting);
    expect(last().assets).toBe("ready");
  });

  it("rend ses vraies images à Léo quand une image du démarrage arrive après une reprise", async () => {
    failures.set(/leo-car-right/, 1);
    const { scene, internals, last, step, started } = await mountScene();
    await stepUntil(step, started, 2000);
    // L'image a bien échoué au démarrage, puis a été reçue par la reprise.
    expect([...failures.values()]).toEqual([0]);
    expect(last().assets).toBe("ready");
    // Léo a été recréé sur la vraie image (et non l'image de remplacement de Phaser).
    expect(internals.sprites.right?.texture.key).toBe("leo-car-right");
    scene.startMission();
    scene.setControl("forward", true);
    await step(30);
    expect(internals.sprites.right?.visible).toBe(true);
    expect(internals.trafficViews.some((view) => view.spec !== null)).toBe(true);
  });

  it("propose un mode diagnostic (départ avancé, empreintes, rectangle de contrôle)", async () => {
    window.history.replaceState(null, "", "/?debug&startx=2000&lanecap=2");
    const { scene, internals, step, started } = await mountScene();
    expect(internals.motion.x).toBe(2000);
    await stepUntil(step, started);
    scene.startMission();
    (scene.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin).emit("keydown-G");
    scene.setControl("forward", true);
    await step(60);
    expect(internals.motion.x).toBeGreaterThan(2000);
  });
  describe("montage du jeu dans la page", () => {
    it("limite la densité de rendu entre 1 et 2", () => {
      expect(renderPixelRatio(undefined)).toBe(1);
      expect(renderPixelRatio(0)).toBe(1);
      expect(renderPixelRatio(1.5)).toBe(1.5);
      expect(renderPixelRatio(3)).toBe(2);
    });

    it("expose un contrôleur qui pilote la scène et se détruit proprement", async () => {
      // Le montage réel télécharge par XHR : réponse 200 immédiate, puis image décodée par l'Image simulée.
      class InstantXhr {
        readyState = 0;
        status = 0;
        response: Blob | null = null;
        responseType = "";
        timeout = 0;
        responseURL = "";
        onload: ((event: { target: InstantXhr }) => void) | null = null;
        onerror: (() => void) | null = null;
        onprogress: (() => void) | null = null;
        ontimeout: (() => void) | null = null;
        open() { this.readyState = 1; }
        setRequestHeader() {}
        overrideMimeType() {}
        abort() {}
        send() {
          setTimeout(() => {
            this.readyState = 4;
            this.status = 200;
            this.response = new Blob(["image"], { type: "image/webp" });
            this.onload?.({ target: this });
          }, 0);
        }
      }
      vi.stubGlobal("XMLHttpRequest", InstantXhr);
      const nativeUrl = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
      URL.createObjectURL = () => "blob:leo";
      URL.revokeObjectURL = () => {};
      onTestFinished(() => {
        URL.createObjectURL = nativeUrl.create;
        URL.revokeObjectURL = nativeUrl.revoke;
        vi.unstubAllGlobals();
      });
      const host = document.createElement("div");
      Object.defineProperty(host, "clientWidth", { value: 800 });
      Object.defineProperty(host, "clientHeight", { value: 450 });
      document.body.appendChild(host);
      const snapshots: LeoLivreurSnapshot[] = [];
      const controller = mountLeoLivreurGame(host, (snapshot) => snapshots.push(snapshot));
      await vi.waitFor(() => expect(snapshots.length).toBeGreaterThan(0), { timeout: 5000 });
      controller.refreshLayout();
      controller.startMission();
      controller.setControl("forward", true);
      controller.turn("right");
      controller.setPaused(true);
      controller.setPaused(false);
      controller.deliver();
      controller.retryAssets();
      controller.reset();
      expect(snapshots.at(-1)?.phase).toBe("INTRO");
      controller.destroy();
    });
  });
});
