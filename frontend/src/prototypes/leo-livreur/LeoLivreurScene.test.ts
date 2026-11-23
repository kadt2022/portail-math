import Phaser from "phaser";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";

import { LeoLivreurScene, mountLeoLivreurGame, renderPixelRatio, type LeoLivreurSnapshot } from "./LeoLivreurGame";
import { BRIDGE_END_X, BRIDGE_START_X, cityLayout } from "./leoCityLayout";
import { DESTINATIONS, MAIN_LANE_Y, ROAD_Y, SCENE_BOTTOM, START_POSITION, WORLD_HEIGHT } from "./leoGeometry";
import { MISSION_ADDRESSES } from "./leoMission";
import type { LeoSound } from "./leoAudio";
import { kmhToPx, pxToMeters } from "./leoUnits";
import { MAX_AUTO_RETRIES } from "./leoZoneAssets";
import { boulevardSignals } from "./leoBoulevardLayout";
import { WORLD_ZONE_WIDTH } from "./leoWorldZones";

/**
 * Scène réelle dans un vrai moteur Phaser (rendu canvas simulé par vitest-canvas-mock). Les images sont « reçues »
 * immédiatement, sauf celles que le test fait échouer : on vérifie ainsi le démarrage, la conduite, les livraisons
 * et le chargement de tout le parcours avant le départ (reprise, erreur, aucune libération ensuite).
 */
interface Internals {
  motion: { x: number; y: number; speed: number; heading: number; steeringAngle: number };
  assets: { state(bundle: string): string; attempts(bundle: string): number };
  assetsWaiting: boolean;
  textures: Phaser.Textures.TextureManager;
  sprites: Record<string, Phaser.GameObjects.Image | undefined>;
  trafficViews: Array<{ spec: unknown }>;
  phase: string;
  sceneryZones: Map<number, unknown>;
  boulevardHeads: Map<Phaser.GameObjects.Graphics, { signals: Array<{ x: number }>; drawn: string | null }>;
  drawBoulevardHeads(state: string): void;
}

/** Fichiers dont le téléchargement échoue (motif sur l'URL), et combien de fois. */
const failures = new Map<RegExp, number>();

const games: Phaser.Game[] = [];
let clock = 0;

/** Son espion : la scène lui transmet vitesse, pédales, chocs et passages ; le test lit ce qu'elle a demandé. */
function spySound() {
  return {
    update: vi.fn(),
    setEnabled: vi.fn((on: boolean) => on),
    setPaused: vi.fn(),
    hornOn: vi.fn(),
    hornOff: vi.fn(),
    passBy: vi.fn(() => true),
    crash: vi.fn(() => "accrochage"),
    cue: vi.fn(() => true),
    destroy: vi.fn(),
  };
}

async function mountScene(sound?: ReturnType<typeof spySound>) {
  const parent = document.createElement("div");
  document.body.appendChild(parent);
  const snapshots: LeoLivreurSnapshot[] = [];
  const scene = new LeoLivreurScene((snapshot) => snapshots.push(snapshot), 1, sound as unknown as LeoSound | undefined);
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
  // Démarrage terminé : les trois lots prêts ET instantané « ready » publié (l'attente se lève à l'image suivante).
  const started = () => ["common", "bridge", "city"].every((bundle) => internals.assets.state(bundle) === "ready") && last()?.assets === "ready";
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

// Vraie scène Phaser pas à pas : lente quand toute la suite tourne en parallèle, d'où une marge au-delà des 5 s par défaut.
describe("scène de conduite de Léo", { timeout: 20_000 }, () => {
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

  it("la caméra descend jusqu'au sol sous le décor : la base des maisons du bas n'est jamais au bord de l'écran", async () => {
    const { internals, step, started } = await mountScene();
    await stepUntil(step, started);
    const scene = internals as unknown as LeoLivreurScene;
    expect(scene.cameras.main.getBounds().bottom).toBe(SCENE_BOTTOM);
    // Scène de téléphone tenu droit (343 × 319) : la vue va jusqu'au sol, sans montrer plus que la hauteur du monde.
    scene.scale.resize(343, 319);
    await step(20);
    const view = scene.cameras.main.worldView;
    expect(view.bottom).toBeCloseTo(SCENE_BOTTOM, 0);
    expect(view.height).toBeLessThanOrEqual(WORLD_HEIGHT + 0.5);
  });

  it("démarre avec tout le parcours prêt (village, pont, ville) et attend Commencer", async () => {
    const { internals, last, step, started } = await mountScene();
    await stepUntil(step, started);
    expect(last().assets).toBe("ready");
    // Pont et ville préparés dès le départ ; leurs images sources, transformées, sont libérées.
    for (const key of ["leo-world-suspension-bridge-layer-faded", "leo-world-city-top", "leo-pedestrian-man", "leo-cross-sedan-turn-90"]) {
      expect(internals.textures.exists(key), key).toBe(true);
    }
    for (const key of ["leo-world-suspension-bridge-layer", "leo-cross-sedan-turn", "leo-pedestrian-man-sheet"]) {
      expect(internals.textures.exists(key), key).toBe(false);
    }
    expect(last().phase).toBe("INTRO");
    expect(last().targetLabel).toBe(DESTINATIONS[0].label);
    expect(last().travelledMeters).toBe(0);
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

  describe("mission : destination, compteurs et livraison", () => {
    const [h1, h2] = MISSION_ADDRESSES.map(({ destination }) => destination);

    it("compte jusqu'à l'entrée de la zone, 0 dans la zone, et n'arrive que devant la bonne maison, à l'arrêt", async () => {
      const { scene, internals, last, step, started } = await mountScene();
      await stepUntil(step, started);
      scene.setDestination(h1);
      expect(last().targetLabel).toBe(MISSION_ADDRESSES[0].label);
      expect(last().destinationStatus).toBe("ahead");
      expect(last().remainingMeters).toBe(Math.round(pxToMeters(h1.stop.x - h1.radius - START_POSITION.x)));
      scene.startMission();
      // Arrêté dans la zone de H1 : arrivée, distance restante à zéro ; entrer dans la zone ne livre rien.
      teleport(internals, h1.stop.x - 40);
      await stepUntil(step, () => internals.assets.state("city") !== "loading" && !internals.assetsWaiting && last().phase === "ARRIVED", 800);
      expect(last().remainingMeters).toBe(0);
      expect(last().destinationStatus).toBe("zone");
      // Léo repart : l'arrivée est perdue ; tant que l'arrière est dans la zone, rien n'est « devant ».
      scene.setControl("forward", true);
      await stepUntil(step, () => last().phase === "DRIVING" && internals.motion.x > h1.stop.x + h1.radius);
      expect(last().remainingMeters).toBe(0);
      // Zone entièrement franchie : la maison est dépassée, jamais présentée comme encore devant.
      await stepUntil(step, () => last().destinationStatus === "passed");
      scene.setControl("forward", false);
      expect(last().remainingMeters).toBe(0);
      // Arrêté devant une autre maison (H2) : pas d'arrivée pour H1.
      teleport(internals, h2.stop.x);
      await step(20);
      expect(last().phase).toBe("DRIVING");
    });

    it("signale le dépassement d'un seul bond, sans image intermédiaire dans la zone, et garde l'odomètre", async () => {
      const { scene, internals, last, step, started } = await mountScene();
      await stepUntil(step, started);
      scene.setDestination(h1);
      scene.startMission();
      scene.setControl("forward", true);
      await step(60);
      scene.setControl("forward", false);
      const travelled = last().travelledMeters;
      expect(last().destinationStatus).toBe("ahead");
      teleport(internals, h1.stop.x + 1_000);
      await stepUntil(step, () => internals.assets.state("city") !== "loading" && !internals.assetsWaiting, 800);
      await step(1);
      expect(last().destinationStatus).toBe("passed");
      expect(last().remainingMeters).toBe(0);
      // Nouvelle destination : le compteur repart vers elle, l'odomètre n'est jamais remis à zéro.
      scene.setDestination(h2);
      expect(last().destinationStatus).toBe("ahead");
      expect(last().remainingMeters).toBe(Math.round(pxToMeters(h2.stop.x - h2.radius - internals.motion.x)));
      expect(last().travelledMeters).toBeGreaterThanOrEqual(travelled);
    });

    it("direction désactivée : ni le clavier, ni setControl, ni turn ne braquent ; Avancer et Freiner restent actifs", async () => {
      const { scene, internals, step, started } = await mountScene();
      await stepUntil(step, started);
      scene.startMission();
      const keyboard = scene.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin;
      scene.setControl("forward", true);
      for (const key of ["LEFT", "A", "RIGHT", "D"]) keyboard.emit(`keydown-${key}`);
      scene.setControl("left", true);
      scene.setControl("right", true);
      scene.turn("left");
      scene.turn("right");
      await step(90);
      expect(internals.motion.speed).toBeGreaterThan(0);
      expect(internals.motion.steeringAngle).toBe(0);
      expect(internals.motion.heading).toBe(0);
      expect(internals.motion.y).toBe(MAIN_LANE_Y);
      scene.setControl("forward", false);
      scene.setControl("brake", true);
      await step(200);
      expect(internals.motion.speed).toBe(0);
    });

    it("odomètre : avance en marche avant comme en marche arrière, jamais à l'arrêt", async () => {
      const { scene, last, step, started } = await mountScene();
      await stepUntil(step, started);
      scene.startMission();
      scene.setControl("forward", true);
      await step(120);
      scene.setControl("forward", false);
      scene.setControl("brake", true);
      await step(200);
      scene.setControl("brake", false);
      const forward = last().travelledMeters;
      expect(forward).toBeGreaterThan(5);
      await step(120);
      expect(last().travelledMeters).toBe(forward);
      scene.setControl("reverse", true);
      await step(120);
      scene.setControl("reverse", false);
      expect(last().travelledMeters).toBeGreaterThan(forward);
    });

    it("odomètre : Léo qui pousse contre le bord de la route ne compte aucun kilomètre fictif", async () => {
      const { scene, internals, last, step, started } = await mountScene();
      await stepUntil(step, started);
      scene.startMission();
      // Léo tourné vers le trottoir, pédale enfoncée : il bute et rebondit sur place.
      internals.motion = { ...internals.motion, x: 3_000, y: ROAD_Y, heading: Math.PI / 2, speed: 0, steeringAngle: 0 };
      scene.setControl("forward", true);
      await step(40);
      const pushed = last().travelledMeters;
      await step(150);
      expect(last().travelledMeters - pushed).toBeLessThanOrEqual(1);
      scene.setControl("forward", false);
    });

    it("neutralise la conduite pendant la livraison, puis la rend", async () => {
      const { scene, internals, last, step, started } = await mountScene();
      await stepUntil(step, started);
      scene.startMission();
      scene.setControl("forward", true);
      await step(30);
      scene.lockDriving();
      expect(last().phase).toBe("TASK");
      expect(internals.motion.speed).toBe(0);
      const x = internals.motion.x;
      scene.setControl("forward", true);
      scene.turn("left");
      await step(60);
      expect(internals.motion.x).toBe(x);
      scene.resumeDriving();
      expect(last().phase).toBe("DRIVING");
      await step(30);
      expect(internals.motion.x).toBeGreaterThan(x);
    });

    it("joue la remise des pizzas (son compris) et ne la termine qu'avec la boucle du jeu", async () => {
      const sound = spySound();
      const { scene, internals, step, started } = await mountScene(sound);
      await stepUntil(step, started);
      scene.setDestination(h1);
      teleport(internals, h1.stop.x);
      scene.lockDriving();
      let done = false;
      void scene.handOver().then(() => { done = true; });
      expect(sound.cue).toHaveBeenCalledWith("deliver");
      await step(10);
      expect(done).toBe(false);
      await stepUntil(step, () => done, 400);
    });

    it("rentre au restaurant sans ajouter le trajet à l'odomètre", async () => {
      const { scene, internals, last, step, started } = await mountScene();
      await stepUntil(step, started);
      scene.startMission();
      scene.setControl("forward", true);
      await step(120);
      scene.setControl("forward", false);
      scene.lockDriving();
      const travelled = last().travelledMeters;
      scene.returnToRestaurant();
      await step(10);
      expect(internals.motion.x).toBe(START_POSITION.x);
      expect(last().travelledMeters).toBe(travelled);
      scene.reset();
      expect(last().travelledMeters).toBe(0);
    });
  });

  it("traverse le village, le pont et la ville, puis revient en marche arrière, sans jamais attendre ni recharger", async () => {
    const { scene, internals, last, step, started } = await mountScene();
    await stepUntil(step, started);
    const loads = vi.spyOn(scene.load, "start");
    scene.startMission();
    const city = cityLayout();
    for (const x of [BRIDGE_START_X + 400, BRIDGE_END_X - 200, city.stopLineEast - 600, city.panelEnd - 400, BRIDGE_END_X - 200, START_POSITION.x + 600]) {
      teleport(internals, x);
      await step(2);
      expect(internals.assetsWaiting, `x = ${x}`).toBe(false);
      expect(last().assets).toBe("ready");
    }
    // Marche arrière sur le pont, puis retour vers la ville : Léo roule, rien n'est libéré ni redemandé.
    teleport(internals, BRIDGE_START_X + 1200);
    scene.setControl("reverse", true);
    await step(90);
    scene.setControl("reverse", false);
    expect(internals.motion.x).toBeLessThan(BRIDGE_START_X + 1200);
    expect(internals.assetsWaiting).toBe(false);
    for (const bundle of ["common", "bridge", "city"]) expect(internals.assets.state(bundle)).toBe("ready");
    expect(internals.textures.exists("leo-world-city-top")).toBe(true);
    expect(internals.textures.exists("leo-world-suspension-bridge-layer-faded")).toBe(true);
    expect(loads).not.toHaveBeenCalled();
  });

  it("une image du pont introuvable au départ : reprises après délai, erreur, puis Réessayer rend la partie jouable", async () => {
    failures.set(/suspension-bridge-layer/, 100);
    const { scene, internals, last, step, started } = await mountScene();
    await stepUntil(step, () => internals.assets.state("bridge") === "retrying");
    expect(last().assets).toBe("loading");
    const attempts = internals.assets.attempts("bridge");
    // Pendant le délai, aucune nouvelle tentative.
    await step(30);
    expect(internals.assets.attempts("bridge")).toBe(attempts);
    await stepUntil(step, () => internals.assets.state("bridge") === "error", 2000);
    expect(internals.assets.attempts("bridge")).toBe(MAX_AUTO_RETRIES + 1);
    expect(last().assets).toBe("error");
    // Le réseau revient : Réessayer relance le pont, puis la partie devient jouable.
    failures.clear();
    scene.retryAssets();
    await stepUntil(step, started);
    expect(internals.textures.exists("leo-world-suspension-bridge-layer-faded")).toBe(true);
  });

  it("textures livrées réduites : redessinées à leur taille logique dès leur arrivée", async () => {
    const { internals, step, started } = await mountScene();
    await stepUntil(step, started);
    const size = (key: string) => {
      const source = internals.textures.get(key).source[0];
      return { width: source.width, height: source.height };
    };
    // Images simulées reçues en 512 × 256 : celles livrées réduites retrouvent la taille de l'illustration d'origine,
    // les autres gardent la taille reçue.
    expect(size("leo-car-right")).toEqual({ width: 502, height: 364 });
    expect(size("leo-traffic-family-blue")).toEqual({ width: 640, height: 320 });
    expect(size("leo-tree")).toEqual({ width: 512, height: 256 });
    // Piétons : planche animée à la taille logique, en vues de 543 × 724 ; l'image d'origine n'est pas gardée en double.
    expect(size("leo-pedestrian-man")).toEqual({ width: 2172, height: 724 });
    expect(internals.textures.get("leo-pedestrian-man").get(0).width).toBe(543);
    expect(internals.textures.exists("leo-pedestrian-man-sheet")).toBe(false);
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

  it("transmet au son la vitesse et les pédales à chaque image, le klaxon (touche H), la pause et la fin", async () => {
    const sound = spySound();
    const { scene, step, started } = await mountScene(sound);
    await stepUntil(step, started);
    // Tout est prêt dès la construction de la scène : une image jouée suffit pour que le son reçoive l'état.
    await step(1);
    expect(sound.update).toHaveBeenLastCalledWith(0, false, false, expect.any(Number));
    scene.startMission();
    scene.setControl("forward", true);
    await step(60);
    const [kmh, accelerating] = sound.update.mock.calls.at(-1) as [number, boolean];
    expect(kmh).toBeGreaterThan(0);
    expect(accelerating).toBe(true);
    const keyboard = scene.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin;
    keyboard.emit("keydown-H");
    expect(sound.hornOn).toHaveBeenCalledTimes(1);
    keyboard.emit("keyup-H");
    expect(sound.hornOff).toHaveBeenCalledTimes(1);
    expect(scene.setSound(true)).toBe(true);
    expect(sound.setEnabled).toHaveBeenLastCalledWith(true);
    scene.setSoundPaused(true);
    expect(sound.setPaused).toHaveBeenLastCalledWith(true);
    scene.destroySound();
    expect(sound.destroy).toHaveBeenCalledTimes(1);
  });

  it("fait entendre un choc quand Léo bute contre le bord de la route, une seule fois par choc", async () => {
    const sound = spySound();
    const { scene, internals, step, started } = await mountScene(sound);
    await stepUntil(step, started);
    scene.startMission();
    // Léo fonce vers le trottoir : la physique l'arrête au bord, sans le laisser avancer.
    internals.motion = { ...internals.motion, heading: -Math.PI / 2, speed: kmhToPx(40), steeringAngle: 0 };
    scene.setControl("forward", true);
    await stepUntil(step, () => sound.crash.mock.calls.length > 0, 200);
    const [kmh] = sound.crash.mock.calls[0] as unknown as [number];
    expect(kmh).toBeGreaterThan(6);
    // Le frottement qui suit ne répète pas le choc immédiatement.
    const count = sound.crash.mock.calls.length;
    await step(20);
    expect(sound.crash.mock.calls.length).toBe(count);
  });

  it("ne fait aucun bruit de choc en roulant normalement sur la chaussée", async () => {
    const sound = spySound();
    const { scene, step, started } = await mountScene(sound);
    await stepUntil(step, started);
    scene.startMission();
    scene.setControl("forward", true);
    await step(120);
    scene.setControl("forward", false);
    scene.setControl("brake", true);
    await step(120);
    expect(sound.crash).not.toHaveBeenCalled();
  });

  it("fait entendre les voitures du trafic qui croisent Léo", async () => {
    const sound = spySound();
    const { scene, step, started } = await mountScene(sound);
    await stepUntil(step, started);
    scene.startMission();
    await stepUntil(step, () => sound.passBy.mock.calls.length > 0, 2400);
    const [direction, pitch, closeness] = sound.passBy.mock.calls[0] as unknown as [number, number, number];
    expect([1, -1]).toContain(direction);
    expect(pitch).toBeGreaterThanOrEqual(55);
    expect(closeness).toBeGreaterThan(0);
    expect(closeness).toBeLessThanOrEqual(1);
  });

  it("garde vivants les feux du boulevard d'une zone quand une zone voisine est déchargée", async () => {
    const { scene, internals, step, started } = await mountScene();
    await stepUntil(step, started);
    scene.startMission();
    const zoneOf = (x: number) => Math.floor(x / WORLD_ZONE_WIDTH);
    const signals = boulevardSignals();
    const westZone = zoneOf(signals[0].x);
    const eastZone = zoneOf(signals[signals.length - 1].x);
    expect(eastZone).toBe(westZone + 1);
    // Zone est chargée d'abord, puis la zone ouest recréée en reculant : c'est l'ordre qui figeait les feux.
    teleport(internals, signals[signals.length - 1].x + 1500);
    await stepUntil(step, () => internals.assets.state("city") === "ready" && !internals.assetsWaiting && internals.sceneryZones.has(eastZone) && !internals.sceneryZones.has(westZone));
    teleport(internals, eastZone * WORLD_ZONE_WIDTH - 200);
    await stepUntil(step, () => internals.sceneryZones.has(westZone) && internals.sceneryZones.has(eastZone));
    expect(internals.boulevardHeads.size).toBe(2);
    // Chaque zone ne dessine que ses propres feux.
    const owned = [...internals.boulevardHeads.values()].flatMap(({ signals: own }) => own.map(({ x }) => x));
    expect(owned.sort((a, b) => a - b)).toEqual(signals.map(({ x }) => x));
    // On repart vers l'est : la zone ouest est déchargée, ses feux disparaissent avec elle.
    teleport(internals, signals[signals.length - 1].x + 1500);
    await stepUntil(step, () => !internals.sceneryZones.has(westZone));
    expect(internals.boulevardHeads.size).toBe(1);
    const [[graphics, heads]] = [...internals.boulevardHeads];
    expect(graphics.active).toBe(true);
    expect(heads.signals.every(({ x }) => zoneOf(x) === eastZone)).toBe(true);
    // Les feux restants suivent toujours le cycle du carrefour.
    for (const state of ["RED", "GREEN"]) {
      internals.drawBoulevardHeads(state);
      expect(heads.drawn).toBe(state);
    }
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
      controller.setDestination(DESTINATIONS[1]);
      controller.lockDriving();
      void controller.handOver();
      controller.resumeDriving();
      controller.returnToRestaurant();
      controller.cue("correct");
      controller.retryAssets();
      // Sans son dans ce navigateur de test : le son reste coupé, le klaxon ne fait rien, sans erreur.
      expect(controller.setSound(true)).toBe(false);
      controller.horn(true);
      controller.horn(false);
      controller.reset();
      expect(snapshots.at(-1)?.phase).toBe("INTRO");
      controller.destroy();
    });
  });
});
