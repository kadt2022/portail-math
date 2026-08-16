import Phaser from "phaser";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import { mountTurboPulseGame, TurboPulseScene, type TurboPulseSnapshot } from "./TurboPulseGame";
import { CALCULATIONS_PER_LEVEL, TURBO_LEVELS, type FruitSpec } from "./turbo-pulse-engine";

// Vue interne d'un acteur de la scène : les tests ont besoin de placer les
// fruits et de déclencher les transitions de partie, ce que l'interface
// publique du contrôleur ne permet pas de faire de façon déterministe.
interface FakeFruitView { x: number; y: number; destroy(): void; setPosition?(x: number, y: number): void }
interface FakeShotView { x: number; y: number; destroy(): void }
interface SceneShot { view: FakeShotView; vx: number; vy: number; life: number; result: number; token: number }
interface SceneInternals {
  fruits: Array<{ spec: FruitSpec; view: FakeFruitView; speed: number; phase: number; wobble: number }>;
  shots: SceneShot[];
  operation: { result: number };
  operationToken: number;
  status: string;
  solved: number;
  levelIndex: number;
  intrusions: number;
  failureAction: string;
  paused: boolean;
  completionTimer: unknown;
  correctHit(fruit: SceneInternals["fruits"][number]): void;
  wrongHit(fruit: SceneInternals["fruits"][number]): void;
  registerIntrusion(fruit: SceneInternals["fruits"][number]): boolean;
  aimAt(x: number, y: number): void;
  fire(): void;
  spawnArrival(now: number): void;
  scheduleCompletion(): void;
  emitSnapshot(): void;
  cannonBadge?: { text: string };
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
 * automatique. Pire, une frame update() isolée peut s'exécuter dans cette
 * fenêtre avant même notre restartRun() explicite (scène active mais niveau
 * pas encore démarré) : ensureSafetyStock()/ensureTarget() créent alors des
 * fruits temporaires et émettent un instantané parasite — un simple
 * "au moins un instantané est arrivé" n'est donc plus un signal fiable
 * (c'est justement ce que corrige ce fichier : setTarget() publie désormais
 * chaque changement). On relance systématiquement restartRun() ici — il
 * repart proprement d'un niveau 0 à 3 fruits quoi qu'il se soit passé avant
 * — et on attend ce marqueur fiable (remainingFruits === 3, garanti par
 * createStartingFruitSpecs) plutôt qu'un simple compteur d'instantanés.
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
  scene.restartRun();
  await vi.waitFor(() => expect(lastSnapshot(snapshots)?.remainingFruits).toBe(3), { timeout: 5000 });
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
function fakeFruit(number: number, x = 500): SceneInternals["fruits"][number] {
  const id = nextFakeFruitId++;
  return {
    spec: { id, family: "tomato", familyLabel: "tomate", emoji: "🍅", variant: "red", variantLabel: "rouge", color: 0xe94f4f, number },
    view: { x, y: 200, destroy: () => {}, setPosition: () => {} },
    speed: 60,
    phase: 0,
    wobble: 1.5,
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

  it("relance le parcours au niveau 1 depuis le panneau maîtrisé", async () => {
    const { scene, snapshots } = await mountScene();
    internalsOf(scene).status = "mastered";
    internalsOf(scene).levelIndex = 6;

    scene.nextLevel();

    const snapshot = lastSnapshot(snapshots);
    expect(snapshot.levelIndex).toBe(0);
    expect(snapshot.status).toBe("playing");
  });

  it("relance directement le parcours quand la limite de tentatives est épuisée", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);
    internals.correctHit(internals.fruits[0]);
    internals.failureAction = "restart-run";
    internals.status = "failed";

    scene.retryLevel();

    const snapshot = lastSnapshot(snapshots);
    expect(snapshot.levelIndex).toBe(0);
    expect(snapshot.score).toBe(0);
    expect(snapshot.status).toBe("playing");
  });

  it("repousse un fruit intrus au lieu de le détruire pendant le nettoyage de fin de niveau", async () => {
    const { scene } = await mountScene();
    const internals = internalsOf(scene);
    internals.status = "clearing";
    const fruit = fakeFruit(7);
    internals.fruits = [fruit];
    let repositioned = false;
    fruit.view.setPosition = () => { repositioned = true; };

    const failed = internals.registerIntrusion(fruit);

    expect(failed).toBe(false);
    expect(repositioned).toBe(true);
    // Contrairement à la phase de jeu normale, le fruit n'est pas détruit :
    // il doit encore pouvoir être visé pour terminer le nettoyage.
    expect(internals.fruits).toContain(fruit);
  });

  it("n'engage la fin de niveau qu'une seule fois même si le déclencheur est appelé deux fois", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);
    internals.status = "clearing";
    internals.fruits = [];

    internals.scheduleCompletion();
    const feedbackApresPremierAppel = lastSnapshot(snapshots).feedback;
    internals.scheduleCompletion();

    expect(lastSnapshot(snapshots).feedback).toBe(feedbackApresPremierAppel);
  });

  it("ignore un second tir tant que la cadence de tir minimale n'est pas écoulée", async () => {
    const { scene } = await mountScene();
    const internals = internalsOf(scene);

    internals.fire();
    const apresPremierTir = internals.shots.length;
    internals.fire();

    expect(internals.shots.length).toBe(apresPremierTir);
  });

  it("vise et tire via les évènements pointeur réels, sans effet pendant la pause", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);

    internals.paused = true;
    scene.input.emit("pointermove", { worldX: 650, worldY: 220 });
    scene.input.emit("pointerdown", { worldX: 650, worldY: 220 });
    expect(internals.shots.length).toBe(0);

    internals.paused = false;
    scene.input.emit("pointermove", { worldX: 650, worldY: 220 });
    scene.input.emit("pointerdown", { worldX: 650, worldY: 220 });

    expect(internals.shots.length).toBeGreaterThan(0);
    expect(lastSnapshot(snapshots).operation).toMatch(/= \?$/);
  });

  it("ignore un tir pointeur pendant un panneau d'échec ou de réussite", async () => {
    const { scene } = await mountScene();
    const internals = internalsOf(scene);
    internals.status = "failed";

    scene.input.emit("pointerdown", { worldX: 650, worldY: 220 });

    expect(internals.shots.length).toBe(0);
  });

  it("fait avancer les fruits et les tirs, détecte un impact et fait expirer un tir manqué", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);

    // Un fruit positionné exactement sur la valeur ciblée, assez proche du
    // tir pour être détecté par la boucle de collision de update().
    const target = fakeFruit(internals.operation.result, 400);
    internals.fruits = [target];
    internals.shots = [{ view: { x: 402, y: 200, destroy: () => {} }, vx: 0, vy: 0, life: 1, result: internals.operation.result, token: internals.operationToken }];

    scene.update(1000, 16);

    expect(lastSnapshot(snapshots).score).toBeGreaterThan(0);
  });

  it("compte comme raté un tir qui touche un fruit sans porter la bonne réponse", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);
    const wrongNumber = internals.operation.result + 1000;
    const target = fakeFruit(wrongNumber, 400);
    internals.fruits = [target];
    internals.shots = [{ view: { x: 402, y: 200, destroy: () => {} }, vx: 0, vy: 0, life: 1, result: wrongNumber, token: internals.operationToken }];

    scene.update(1000, 16);

    expect(lastSnapshot(snapshots).streak).toBe(0);
  });

  it("retire un tir qui expire sans avoir touché aucun fruit", async () => {
    const { scene } = await mountScene();
    const internals = internalsOf(scene);
    internals.shots = [{ view: { x: 300, y: 200, destroy: () => {} }, vx: 0, vy: 0, life: 0.001, result: 1, token: 1 }];

    scene.update(1000, 16);

    expect(internals.shots).toHaveLength(0);
  });

  it("échoue le niveau dès qu'un fruit franchit entièrement la ligne de défense pendant update()", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);
    internals.intrusions = 4; // à une intrusion de la limite du niveau 1 (5)
    // Position déjà au-delà de la ligne de défense : un pas d'update() suffit
    // à constater le franchissement complet (hasFullyCrossedDefense).
    internals.fruits = [fakeFruit(1, 20)];

    scene.update(1000, 16);

    expect(lastSnapshot(snapshots).status).toBe("failed");
  });

  it("déclenche une arrivée naturelle de fruits quand l'échéance planifiée est atteinte", async () => {
    const { scene } = await mountScene();
    const internals = internalsOf(scene);
    const avant = internals.fruits.length;

    internals.spawnArrival(0);

    expect(internals.fruits.length).toBeGreaterThan(avant);
  });

  // Régression : le fruit ciblé peut disparaître entre deux instantanés
  // (intrusion, arrivée qui le remplace...). ensureTarget() choisit alors une
  // nouvelle cible en cours de frame, via update() — un enfant ne doit jamais
  // voir « À résoudre » indiquer un calcul différent de celui affiché sur le
  // piston Phaser ou de celui réellement validé par les tirs.
  it("republie immédiatement le nouveau calcul quand le fruit ciblé disparaît en cours de frame", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);
    const ancienResultat = internals.operation.result;
    const nombreInstantanesAvant = snapshots.length;

    // Le fruit ciblé n'existe plus parmi les fruits présents : ensureTarget()
    // doit constater l'absence et retargeter dès le prochain update().
    internals.fruits = internals.fruits.filter((fruit) => fruit.spec.number !== ancienResultat);
    internals.fruits.push(fakeFruit(ancienResultat + 37));

    scene.update(1000, 16);

    expect(snapshots.length).toBeGreaterThan(nombreInstantanesAvant);
    const snapshot = lastSnapshot(snapshots);
    const nouveauResultat = internals.operation.result;
    expect(nouveauResultat).not.toBe(ancienResultat);
    // HUD React, piston Phaser et validation des tirs partagent la même
    // source (this.operation) : les trois doivent afficher exactement le
    // même calcul dès qu'il change, sans attendre un futur évènement de jeu.
    // La réponse elle-même reste volontairement absente du texte affiché
    // (voir formatOperation) : on ne vérifie donc que l'égalité stricte des
    // deux affichages, jamais la présence du résultat caché.
    expect(snapshot.operation).toBe(internals.cannonBadge!.text);
  });

  it("garde le HUD, le piston et la validation des tirs synchronisés sur un parcours complet", async () => {
    const { scene, snapshots } = await mountScene();
    const internals = internalsOf(scene);

    function assertSynchronise() {
      const snapshot = lastSnapshot(snapshots);
      // La réponse reste cachée dans le texte affiché : seule l'égalité
      // stricte HUD/piston prouve la synchronisation, jamais son contenu.
      expect(snapshot.operation).toBe(internals.cannonBadge!.text);
      expect(snapshot.operation).toMatch(/= \?$/);
    }

    // démarrage
    assertSynchronise();

    // bonne réponse (peut déclencher un combo selon les fruits de départ)
    const cible = internals.fruits.find((fruit) => fruit.spec.number === internals.operation.result)!;
    internals.correctHit(cible);
    assertSynchronise();

    // nouveau calcul provoqué par la disparition du fruit ciblé pendant une frame
    const resultatCourant = internals.operation.result;
    internals.fruits = internals.fruits.filter((fruit) => fruit.spec.number !== resultatCourant);
    internals.fruits.push(fakeFruit(resultatCourant + 41));
    scene.update(2000, 16);
    assertSynchronise();

    // resize (refreshLayout ne doit ni recréer la scène ni désynchroniser l'affichage)
    scene.refreshLayout();
    assertSynchronise();

    // pause/reprise
    scene.togglePause();
    assertSynchronise();
    scene.togglePause();
    assertSynchronise();
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
