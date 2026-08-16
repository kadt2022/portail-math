import Phaser from "phaser";

import {
  CALCULATIONS_PER_LEVEL,
  chooseTargetResult,
  comboForHit,
  createFruitSpec,
  createStartingFruitSpecs,
  formatOperation,
  fruitSpawnYRange,
  hasFullyCrossedDefense,
  HUD_SAFE_TOP,
  INTRUSION_LIMITS,
  MAX_FRUITS,
  operationForResult,
  randomInt,
  registerFailure,
  TURBO_LEVELS,
  type ExpertFailures,
  type FruitSpec,
  type Operation,
} from "./turbo-pulse-engine";

const WORLD_WIDTH = 960;
const WORLD_HEIGHT = 540;
const DEFENSE_X = 72;
const CANNON_X = 178;
const CANNON_Y = 465;
const FRUIT_RADIUS = 31;
const SHOT_SPEED = 620;

// Zone de jeu sûre : aucun fruit ne doit jamais circuler dans le bandeau HUD
// (calcul « À résoudre », commandes Pause/Plein écran en plein écran).
const FRUIT_Y_RANGE = fruitSpawnYRange(FRUIT_RADIUS, WORLD_HEIGHT);

export type TurboPulseStatus = "playing" | "clearing" | "level-complete" | "failed" | "mastered";

export interface TurboPulseSnapshot {
  levelIndex: number;
  levelName: string;
  solved: number;
  score: number;
  streak: number;
  intrusions: number;
  intrusionLimit: number;
  operation: string;
  status: TurboPulseStatus;
  feedback: string;
  totalSolved: number;
  remainingFruits: number;
  failureAction: "retry" | "restart-run";
  expertAttemptUsed: number | null;
  muted: boolean;
  paused: boolean;
}

export interface TurboPulseController {
  destroy(): void;
  restartRun(): void;
  retryLevel(): void;
  nextLevel(): void;
  toggleMuted(): void;
  togglePause(): void;
  /** Réapplique le scale Phaser (ex. après un changement plein écran/orientation) sans recréer le moteur. */
  refreshLayout(): void;
}

interface FruitActor {
  spec: FruitSpec;
  view: Phaser.GameObjects.Container;
  speed: number;
  phase: number;
  wobble: number;
}

interface ShotActor {
  view: Phaser.GameObjects.Container;
  vx: number;
  vy: number;
  life: number;
  result: number;
  token: number;
}

type SnapshotListener = (snapshot: TurboPulseSnapshot) => void;

// Exportée pour les tests : ils montent la scène dans un Phaser.Game réel et
// pilotent directement les transitions de partie (tir juste, tir manqué,
// intrusion, fin de niveau), impossibles à provoquer de façon déterministe
// depuis la seule interface publique du contrôleur.
export class TurboPulseScene extends Phaser.Scene {
  private readonly onSnapshot: SnapshotListener;
  private fruits: FruitActor[] = [];
  private shots: ShotActor[] = [];
  private cannonArm?: Phaser.GameObjects.Container;
  private cannonBadge?: Phaser.GameObjects.Text;
  private aimGuide?: Phaser.GameObjects.Graphics;
  private operation: Operation = { left: 2, right: 3, operator: "+", result: 5 };
  private operationToken = 0;
  private aimAngle = -0.35;
  private levelIndex = 0;
  private solved = 0;
  private totalSolved = 0;
  private score = 0;
  private streak = 0;
  private intrusions = 0;
  private status: TurboPulseStatus = "playing";
  private feedback = "";
  private failureAction: "retry" | "restart-run" = "retry";
  private expertAttemptUsed: number | null = null;
  private expertFailures: ExpertFailures = { 5: 0, 6: 0 };
  private nextFruitId = 1;
  private nextArrivalAt = Number.POSITIVE_INFINITY;
  private checkpointScore = 0;
  private checkpointSolved = 0;
  private lastFireAt = 0;
  private muted = false;
  private paused = false;
  private completionTimer?: Phaser.Time.TimerEvent;

  constructor(onSnapshot: SnapshotListener) {
    super({ key: "turbo-pulse" });
    this.onSnapshot = onSnapshot;
  }

  create() {
    const spark = this.make.graphics({ x: 0, y: 0 });
    spark.fillStyle(0xffffff, 1).fillCircle(6, 6, 6);
    spark.generateTexture("turbo-spark", 12, 12);
    spark.destroy();
    this.drawWorld();
    this.createCannon();
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
      if (this.paused) return;
      this.aimAt(pointer.worldX, pointer.worldY);
    });
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.paused) return;
      if (this.status !== "playing" && this.status !== "clearing") return;
      this.aimAt(pointer.worldX, pointer.worldY);
      this.fire();
    });
    this.restartRun();
  }

  update(time: number, delta: number) {
    if (this.status !== "playing" && this.status !== "clearing") return;
    const seconds = Math.min(delta / 1000, 0.05);

    if (this.status === "playing" && time >= this.nextArrivalAt) {
      this.spawnArrival(time);
    }

    for (let index = this.fruits.length - 1; index >= 0; index -= 1) {
      const fruit = this.fruits[index];
      fruit.view.x -= fruit.speed * seconds;
      fruit.phase += fruit.wobble * seconds;
      fruit.view.y += Math.sin(fruit.phase) * 0.35;
      if (hasFullyCrossedDefense(fruit.view.x, FRUIT_RADIUS, DEFENSE_X)) {
        if (this.registerIntrusion(fruit)) return;
      }
    }

    for (let index = this.shots.length - 1; index >= 0; index -= 1) {
      const shot = this.shots[index];
      shot.view.x += shot.vx * seconds;
      shot.view.y += shot.vy * seconds;
      shot.life -= seconds;
      if (shot.life <= 0 || shot.view.x < -80 || shot.view.x > WORLD_WIDTH + 80 || shot.view.y < -80 || shot.view.y > WORLD_HEIGHT + 80) {
        shot.view.destroy();
        this.shots.splice(index, 1);
        continue;
      }
      const hit = this.fruits.find((fruit) => Phaser.Math.Distance.Between(shot.view.x, shot.view.y, fruit.view.x, fruit.view.y) <= FRUIT_RADIUS + 22);
      if (hit) {
        shot.view.destroy();
        this.shots.splice(index, 1);
        if (hit.spec.number === shot.result && shot.result === this.operation.result && shot.token === this.operationToken) this.correctHit(hit);
        else this.wrongHit(hit);
      }
    }

    if (this.status === "playing") this.ensureSafetyStock();
    this.ensureTarget();
  }

  restartRun = () => {
    if (!this.scene.isActive()) return;
    this.score = 0;
    this.streak = 0;
    this.totalSolved = 0;
    this.expertFailures = { 5: 0, 6: 0 };
    this.startLevel(0, false);
  };

  retryLevel = () => {
    if (this.failureAction === "restart-run") {
      this.restartRun();
      return;
    }
    this.score = this.checkpointScore;
    this.totalSolved = this.checkpointSolved;
    this.streak = 0;
    this.startLevel(this.levelIndex, true);
  };

  nextLevel = () => {
    if (this.status === "mastered") {
      this.restartRun();
      return;
    }
    if (this.status !== "level-complete") return;
    this.startLevel(this.levelIndex + 1, false);
  };

  toggleMuted = () => {
    this.muted = !this.muted;
    this.sound.mute = this.muted;
    this.emitSnapshot();
  };

  // this.scene.pause()/resume() est le mécanisme natif de Phaser : il gèle
  // automatiquement update(), les tweens et les timers de la scène (donc les
  // fruits, projectiles, arrivées et le compte à rebours de fin de niveau),
  // sans perte d'état ni recréation du moteur. Le flag ci-dessus ne sert
  // qu'à ignorer les entrées pointeur pendant la pause.
  togglePause = () => {
    if (this.status !== "playing" && this.status !== "clearing") return;
    this.paused = !this.paused;
    if (this.paused) this.scene.pause();
    else this.scene.resume();
    this.emitSnapshot();
  };

  refreshLayout = () => {
    this.scale.refresh();
  };

  private drawWorld() {
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x123d55, 0x123d55, 0x6fb8c5, 0x6fb8c5, 1);
    graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    graphics.fillStyle(0xffdf83, 0.9);
    graphics.fillCircle(820, 76, 48);
    graphics.fillStyle(0xffffff, 0.14);
    for (let index = 0; index < 20; index += 1) graphics.fillCircle(40 + index * 49, 34 + (index % 4) * 19, 2 + (index % 3));

    // Bandeau HUD réservé : fond visuel du calcul « À résoudre » et, en plein
    // écran, des commandes Pause/Quitter. Aucun fruit ne doit s'y trouver
    // (voir FRUIT_Y_RANGE) — ce liseré matérialise la limite réelle.
    graphics.fillStyle(0x0a2630, 0.5);
    graphics.fillRoundedRect(10, 8, WORLD_WIDTH - 20, HUD_SAFE_TOP - 16, 16);
    graphics.lineStyle(2, 0xffd36b, 0.22);
    graphics.strokeRoundedRect(10, 8, WORLD_WIDTH - 20, HUD_SAFE_TOP - 16, 16);

    graphics.fillStyle(0x2a7b72, 1);
    graphics.fillTriangle(0, 330, 220, 150, 430, 330);
    graphics.fillTriangle(250, 330, 560, 120, 780, 330);
    graphics.fillTriangle(610, 330, 840, 178, 1000, 330);
    graphics.fillStyle(0x17493f, 1);
    graphics.fillRect(0, 330, WORLD_WIDTH, 210);
    graphics.fillStyle(0x1d5b4c, 1);
    for (let row = 0; row < 3; row += 1) {
      graphics.fillRoundedRect(100, 350 + row * 57, 830, 38, 18);
      graphics.lineStyle(2, 0x74a783, 0.35);
      graphics.strokeRoundedRect(100, 350 + row * 57, 830, 38, 18);
    }
    graphics.fillStyle(0x0a2630, 0.78);
    graphics.fillRect(0, 0, DEFENSE_X, WORLD_HEIGHT);
    graphics.fillStyle(0xffd36b, 0.18);
    graphics.fillRect(DEFENSE_X, 0, 26, WORLD_HEIGHT);
    graphics.lineStyle(4, 0xffd36b, 0.9);
    graphics.lineBetween(DEFENSE_X, 42, DEFENSE_X, WORLD_HEIGHT - 28);
    for (let y = 48; y < WORLD_HEIGHT - 30; y += 36) graphics.fillTriangle(DEFENSE_X - 8, y, DEFENSE_X + 8, y + 12, DEFENSE_X - 8, y + 24);
    this.add.text(20, 70, "🛡\nDÉFENSE", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "15px", fontStyle: "bold", align: "center", color: "#fff7dc" }).setAngle(-90).setOrigin(0.5);
    this.add.text(710, 500, "STATION JARDIN • TURBO PULSE", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "13px", fontStyle: "bold", color: "#9bd7b1" }).setOrigin(0.5);
  }

  private createCannon() {
    const base = this.add.graphics();
    base.fillStyle(0x0d2137, 0.55).fillEllipse(CANNON_X, CANNON_Y + 24, 134, 42);
    base.fillStyle(0x355b70, 1).fillCircle(CANNON_X, CANNON_Y, 45);
    base.lineStyle(5, 0xffc857, 1).strokeCircle(CANNON_X, CANNON_Y, 36);
    base.fillStyle(0x172f46, 1).fillCircle(CANNON_X, CANNON_Y, 19);

    const tube = this.add.rectangle(48, 0, 96, 32, 0x79a9b8).setStrokeStyle(4, 0xd8f0ec).setOrigin(0, 0.5);
    const muzzle = this.add.rectangle(94, 0, 22, 43, 0xffc857).setStrokeStyle(3, 0x6b4b18).setOrigin(0.5);
    this.cannonArm = this.add.container(CANNON_X, CANNON_Y, [tube, muzzle]);
    this.cannonBadge = this.add.text(CANNON_X, CANNON_Y + 54, "", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "20px", fontStyle: "bold", color: "#102c3c", backgroundColor: "#fff7dc", padding: { x: 14, y: 7 } }).setOrigin(0.5).setDepth(5);
    this.aimGuide = this.add.graphics().setDepth(2);
  }

  private startLevel(index: number, retry: boolean) {
    this.completionTimer?.remove(false);
    this.clearActors();
    this.levelIndex = index;
    this.solved = 0;
    this.intrusions = 0;
    this.status = "playing";
    this.failureAction = "retry";
    this.expertAttemptUsed = null;
    if (!retry) {
      this.checkpointScore = this.score;
      this.checkpointSolved = this.totalSolved;
    }
    const starting = createStartingFruitSpecs(index);
    this.nextFruitId = 4;
    [630, 760, 890].forEach((x, fruitIndex) => this.createFruitActor(starting[fruitIndex], x, 155 + fruitIndex * 112));
    this.setTarget(starting[0].number);
    this.scheduleNextArrival(this.time.now);
    this.feedback = `Niveau ${index + 1} — ${TURBO_LEVELS[index].name}`;
    this.playSequence(index >= 5 ? [330, 440, 554] : [392, 523], 0.08);
    this.emitSnapshot();
  }

  private clearActors() {
    this.fruits.forEach((fruit) => fruit.view.destroy());
    this.shots.forEach((shot) => shot.view.destroy());
    this.fruits = [];
    this.shots = [];
  }

  private createFruitActor(spec: FruitSpec, x: number, y: number) {
    const halo = this.add.circle(0, 0, FRUIT_RADIUS + 7, spec.color, 1).setStrokeStyle(3, 0xffffff, 0.74);
    const plate = this.add.circle(0, 0, FRUIT_RADIUS, 0xfff3cf, 1).setStrokeStyle(2, 0x16324a, 0.55);
    const emoji = this.add.text(0, -11, spec.emoji, { fontFamily: "Segoe UI Emoji, sans-serif", fontSize: "31px" }).setOrigin(0.5);
    const value = this.add.text(0, 15, String(spec.number), { fontFamily: "Trebuchet MS, sans-serif", fontSize: spec.number >= 100 ? "18px" : "22px", fontStyle: "bold", color: "#102c3c", stroke: "#ffffff", strokeThickness: 4 }).setOrigin(0.5);
    const label = this.add.text(0, 39, spec.variantLabel.toUpperCase(), { fontFamily: "Trebuchet MS, sans-serif", fontSize: "10px", fontStyle: "bold", color: "#ffffff", backgroundColor: "#102c3c", padding: { x: 5, y: 2 } }).setOrigin(0.5);
    const view = this.add.container(x, y, [halo, plate, emoji, value, label]).setDepth(3);
    // Amplitude et phase de l'ondulation visuelle du fruit : aucun enjeu de
    // sécurité (ni jeton, ni tirage déterminant une règle de jeu), Math.random
    // reste donc approprié malgré l'alerte générique de Sonar sur ce générateur.
    this.fruits.push({ spec, view, speed: randomInt(56, 72), phase: Math.random() * Math.PI * 2, wobble: 1.35 + Math.random() * 0.85 }); // NOSONAR
  }

  private spawnArrival(now: number) {
    const level = TURBO_LEVELS[this.levelIndex];
    const count = Math.min(randomInt(level.batchMin, level.batchMax), MAX_FRUITS - this.fruits.length);
    for (let index = 0; index < count; index += 1) {
      const spec = createFruitSpec(this.fruits.map((fruit) => fruit.spec), this.levelIndex, this.nextFruitId++);
      this.createFruitActor(spec, WORLD_WIDTH + 70 + index * randomInt(78, 108), randomInt(FRUIT_Y_RANGE.min, FRUIT_Y_RANGE.max));
    }
    this.scheduleNextArrival(now);
  }

  private scheduleNextArrival(now: number) {
    const level = TURBO_LEVELS[this.levelIndex];
    this.nextArrivalAt = now + randomInt(level.minMs, level.maxMs);
  }

  private ensureSafetyStock() {
    while (this.fruits.length < 2) {
      const spec = createFruitSpec(this.fruits.map((fruit) => fruit.spec), this.levelIndex, this.nextFruitId++);
      this.createFruitActor(spec, WORLD_WIDTH + 80 + this.fruits.length * 90, randomInt(FRUIT_Y_RANGE.min, FRUIT_Y_RANGE.max));
    }
  }

  private setTarget(result: number | null) {
    if (result === null) return;
    this.operation = operationForResult(result, this.levelIndex);
    this.operationToken += 1;
    this.cannonBadge?.setText(`${formatOperation(this.operation)} = ?`);
    this.shots.forEach((shot) => shot.view.destroy());
    this.shots = [];
  }

  private ensureTarget() {
    if (this.fruits.length === 0) {
      if (this.status === "clearing") this.scheduleCompletion();
      return;
    }
    if (!this.fruits.some((fruit) => fruit.spec.number === this.operation.result)) this.setTarget(chooseTargetResult(this.fruits.map((fruit) => fruit.spec)));
  }

  private aimAt(x: number, y: number) {
    this.aimAngle = Phaser.Math.Clamp(Math.atan2(y - CANNON_Y, x - CANNON_X), -Math.PI + 0.04, 0.12);
    this.cannonArm?.setRotation(this.aimAngle);
    this.aimGuide?.clear().lineStyle(3, 0xffffff, 0.28).lineBetween(CANNON_X + Math.cos(this.aimAngle) * 112, CANNON_Y + Math.sin(this.aimAngle) * 112, CANNON_X + Math.cos(this.aimAngle) * 215, CANNON_Y + Math.sin(this.aimAngle) * 215);
  }

  private fire() {
    if (this.time.now - this.lastFireAt < 130) return;
    this.lastFireAt = this.time.now;
    const operationText = formatOperation(this.operation).replaceAll(" ", "");
    const body = this.add.rectangle(0, 0, 82, 38, 0xe5f1f4, 1).setStrokeStyle(4, 0xffc857).setOrigin(0.5);
    const label = this.add.text(0, 0, operationText, { fontFamily: "Trebuchet MS, sans-serif", fontSize: "18px", fontStyle: "bold", color: "#102c3c" }).setOrigin(0.5);
    const view = this.add.container(CANNON_X + Math.cos(this.aimAngle) * 112, CANNON_Y + Math.sin(this.aimAngle) * 112, [body, label]).setRotation(this.aimAngle).setDepth(4);
    this.shots.push({ view, vx: Math.cos(this.aimAngle) * SHOT_SPEED, vy: Math.sin(this.aimAngle) * SHOT_SPEED, life: 2.4, result: this.operation.result, token: this.operationToken });
    this.playTone(230, 0.06, 0.04, "square");
  }

  private correctHit(selected: FruitActor) {
    const comboSpecs = comboForHit(this.fruits.map((fruit) => fruit.spec), selected.spec);
    const ids = new Set(comboSpecs.map((fruit) => fruit.id));
    const destroyed = this.fruits.filter((fruit) => ids.has(fruit.spec.id));
    this.fruits = this.fruits.filter((fruit) => !ids.has(fruit.spec.id));
    destroyed.forEach((fruit, index) => this.explodeFruit(fruit, index === 0));
    this.score += destroyed.length;
    this.streak += 1;
    this.totalSolved += 1;
    if (this.status === "playing") this.solved += 1;
    this.feedback = destroyed.length > 1 ? `Combo ${selected.spec.variantLabel} ×${destroyed.length} !` : `${formatOperation(this.operation)} = ${this.operation.result}`;
    this.playSequence(destroyed.length >= 3 ? [440, 587, 784] : destroyed.length === 2 ? [480, 700] : [520], 0.065);

    if (this.status === "playing" && this.solved >= CALCULATIONS_PER_LEVEL) {
      this.solved = CALCULATIONS_PER_LEVEL;
      this.status = "clearing";
      this.nextArrivalAt = Number.POSITIVE_INFINITY;
      this.feedback = this.fruits.length > 0 ? `Objectif atteint : encore ${this.fruits.length} fruit${this.fruits.length > 1 ? "s" : ""} à détruire` : "Niveau nettoyé !";
    }

    if (this.fruits.length === 0 && this.status === "clearing") this.scheduleCompletion();
    else this.setTarget(chooseTargetResult(this.fruits.map((fruit) => fruit.spec)));
    this.emitSnapshot();
  }

  private wrongHit(fruit: FruitActor) {
    this.streak = 0;
    fruit.view.x += 24;
    this.feedback = "Presque ! Recalcule : la valeur visée n’est pas la réponse.";
    this.tweens.add({ targets: fruit.view, scale: 1.12, yoyo: true, duration: 100 });
    this.playTone(145, 0.14, 0.05, "sawtooth");
    this.emitSnapshot();
  }

  private explodeFruit(fruit: FruitActor, selected: boolean) {
    const particles = this.add.particles(fruit.view.x, fruit.view.y, "turbo-spark", {
      lifespan: 480,
      speed: { min: 80, max: selected ? 260 : 190 },
      scale: { start: 0.55, end: 0 },
      quantity: selected ? 24 : 15,
      tint: [fruit.spec.color, 0xffc857, 0xffffff],
      emitting: false,
    });
    particles.explode(selected ? 28 : 18);
    this.time.delayedCall(560, () => particles.destroy());
    this.tweens.add({ targets: fruit.view, scale: 1.65, alpha: 0, angle: 25, duration: 330, ease: "Back.easeIn", onComplete: () => fruit.view.destroy() });
  }

  private registerIntrusion(fruit: FruitActor): boolean {
    this.intrusions += 1;
    this.playSequence([170, 130], 0.11);
    if (this.intrusions >= INTRUSION_LIMITS[this.levelIndex]) {
      this.failLevel();
      return true;
    }
    this.feedback = `Intrusion ${this.intrusions}/${INTRUSION_LIMITS[this.levelIndex]}`;
    if (this.status === "clearing") {
      fruit.view.setPosition(WORLD_WIDTH + randomInt(80, 180), randomInt(FRUIT_Y_RANGE.min, FRUIT_Y_RANGE.max));
    } else {
      fruit.view.destroy();
      this.fruits = this.fruits.filter((candidate) => candidate !== fruit);
    }
    this.emitSnapshot();
    return false;
  }

  private failLevel() {
    this.status = "failed";
    this.shots.forEach((shot) => shot.view.destroy());
    this.shots = [];
    const resolution = registerFailure(this.levelIndex, this.expertFailures);
    this.expertFailures = resolution.failures;
    this.failureAction = resolution.action;
    this.expertAttemptUsed = resolution.attemptUsed;
    this.feedback = "La ligne de défense a été franchie.";
    this.playSequence([220, 174, 130], 0.14);
    this.emitSnapshot();
  }

  private scheduleCompletion() {
    if (this.completionTimer || (this.status !== "clearing" && this.status !== "playing")) return;
    this.feedback = "Niveau nettoyé !";
    this.emitSnapshot();
    this.completionTimer = this.time.delayedCall(1000, () => {
      this.completionTimer = undefined;
      this.status = this.levelIndex === TURBO_LEVELS.length - 1 ? "mastered" : "level-complete";
      this.feedback = this.status === "mastered" ? "Les sept niveaux sont maîtrisés !" : `Niveau ${this.levelIndex + 1} terminé !`;
      this.playSequence([523, 659, 784, 1047], 0.09);
      this.emitSnapshot();
    });
  }

  private playTone(frequency: number, duration: number, volume: number, type: OscillatorType = "sine", delay = 0) {
    if (this.muted) return;
    const context = (this.sound as Phaser.Sound.WebAudioSoundManager).context;
    if (!context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  }

  private playSequence(notes: number[], delay: number) {
    notes.forEach((note, index) => this.playTone(note, 0.14, 0.055, "triangle", index * delay));
  }

  private emitSnapshot() {
    this.onSnapshot({
      levelIndex: this.levelIndex,
      levelName: TURBO_LEVELS[this.levelIndex].name,
      solved: this.solved,
      score: this.score,
      streak: this.streak,
      intrusions: this.intrusions,
      intrusionLimit: INTRUSION_LIMITS[this.levelIndex],
      operation: `${formatOperation(this.operation)} = ?`,
      status: this.status,
      feedback: this.feedback,
      totalSolved: this.totalSolved,
      remainingFruits: this.fruits.length,
      failureAction: this.failureAction,
      expertAttemptUsed: this.expertAttemptUsed,
      muted: this.muted,
      paused: this.paused,
    });
  }
}

export function mountTurboPulseGame(parent: HTMLElement, onSnapshot: SnapshotListener): TurboPulseController {
  const scene = new TurboPulseScene(onSnapshot);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    backgroundColor: "#123d55",
    transparent: false,
    scene,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { antialias: true, roundPixels: true },
    input: { activePointers: 2 },
  });
  return {
    destroy: () => game.destroy(true),
    restartRun: scene.restartRun,
    retryLevel: scene.retryLevel,
    nextLevel: scene.nextLevel,
    toggleMuted: scene.toggleMuted,
    togglePause: scene.togglePause,
    refreshLayout: scene.refreshLayout,
  };
}
