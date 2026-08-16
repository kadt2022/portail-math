import Phaser from "phaser";

import {
  CALCULATIONS_PER_LEVEL,
  CANNON_BOTTOM_MARGIN,
  chooseTargetResult,
  comboForHit,
  createFruitSpec,
  createStartingFruitSpecs,
  formatOperation,
  FRUIT_RADIUS,
  fruitSpawnYRange,
  getTurboPulseVisualMetrics,
  hasFullyCrossedDefense,
  HUD_SAFE_TOP,
  INTRUSION_LIMITS,
  MAX_FRUITS,
  operationForResult,
  randomInt,
  REFERENCE_WORLD_HEIGHT,
  REFERENCE_WORLD_WIDTH,
  registerFailure,
  TURBO_LEVELS,
  type ExpertFailures,
  type FruitSpec,
  type Operation,
  type TurboPulseVisualMetrics,
} from "./turbo-pulse-engine";

// MIN_WORLD_WIDTH/HEIGHT ne sont PAS appliqués côté logique de jeu (voir
// mountTurboPulseGame) : ils sont passés à Phaser via scale.minWidth/
// minHeight, qui clampe ensemble displaySize, gameSize ET le canvas réel.
// Un clamp maison ici (sur worldWidth/worldHeight seuls) laisserait le
// canvas continuer à rétrécir en dessous pendant que la logique de jeu
// croirait le monde plus grand qu'il ne l'est réellement à l'écran.
const MIN_WORLD_WIDTH = 480;
const MIN_WORLD_HEIGHT = 270;
const DEFENSE_X = 72;
const SHOT_SPEED = 620;

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
  private cannonBase?: Phaser.GameObjects.Container;
  private cannonArm?: Phaser.GameObjects.Container;
  private cannonBadge?: Phaser.GameObjects.Text;
  private aimGuide?: Phaser.GameObjects.Graphics;
  private worldGraphics?: Phaser.GameObjects.Graphics;
  private stationLabel?: Phaser.GameObjects.Text;
  // Taille réelle du monde de jeu : suit la place disponible (voir
  // handleResize), jamais figée à 960×540. cannonY, fruitYRange et metrics
  // (tailles visuelles/hitboxes bornées, voir getTurboPulseVisualMetrics) en
  // dépendent et sont recalculés à chaque changement.
  private worldWidth = REFERENCE_WORLD_WIDTH;
  private worldHeight = REFERENCE_WORLD_HEIGHT;
  private cannonY = REFERENCE_WORLD_HEIGHT - CANNON_BOTTOM_MARGIN;
  private fruitYRange = fruitSpawnYRange(FRUIT_RADIUS, REFERENCE_WORLD_HEIGHT);
  private metrics: TurboPulseVisualMetrics = getTurboPulseVisualMetrics(REFERENCE_WORLD_WIDTH, REFERENCE_WORLD_HEIGHT);
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
    // La taille réelle allouée par mountTurboPulseGame (mesurée sur le
    // conteneur DOM) est déjà connue de Phaser à ce stade : on l'adopte
    // comme monde de jeu initial plutôt que la référence 960×540. Le plancher
    // (scale.minWidth/minHeight, voir mountTurboPulseGame) est déjà appliqué
    // par Phaser lui-même à this.scale.width/height : le canvas réel et cette
    // lecture ne peuvent donc jamais diverger.
    this.worldWidth = Math.round(this.scale.width);
    this.worldHeight = Math.round(this.scale.height);
    this.metrics = getTurboPulseVisualMetrics(this.worldWidth, this.worldHeight);
    this.cannonY = this.worldHeight - this.metrics.cannonBottomMargin;
    this.fruitYRange = fruitSpawnYRange(this.metrics.fruitRadius, this.worldHeight);

    const spark = this.make.graphics({ x: 0, y: 0 });
    spark.fillStyle(0xffffff, 1).fillCircle(6, 6, 6);
    spark.generateTexture("turbo-spark", 12, 12);
    spark.destroy();
    this.drawWorld();
    this.createCannon();
    // Phaser ne surveille nativement que le redimensionnement de la fenêtre,
    // pas celui d'un conteneur CSS : c'est mountTurboPulseGame/refreshLayout
    // (piloté par un ResizeObserver côté React) qui appelle this.scale.resize()
    // et déclenche donc cet évènement, quelle qu'en soit la cause (mise en
    // page responsive, plein écran, rotation).
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    });
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
      if (hasFullyCrossedDefense(fruit.view.x, this.metrics.fruitRadius, DEFENSE_X)) {
        if (this.registerIntrusion(fruit)) return;
      }
    }

    for (let index = this.shots.length - 1; index >= 0; index -= 1) {
      const shot = this.shots[index];
      shot.view.x += shot.vx * seconds;
      shot.view.y += shot.vy * seconds;
      shot.life -= seconds;
      if (shot.life <= 0 || shot.view.x < -80 || shot.view.x > this.worldWidth + 80 || shot.view.y < -80 || shot.view.y > this.worldHeight + 80) {
        shot.view.destroy();
        this.shots.splice(index, 1);
        continue;
      }
      const hit = this.fruits.find((fruit) => Phaser.Math.Distance.Between(shot.view.x, shot.view.y, fruit.view.x, fruit.view.y) <= this.metrics.fruitHitRadius);
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

  // Déclenché par mountTurboPulseGame/refreshLayout (this.scale.resize()) :
  // met à jour la taille de monde, l'échelle visuelle bornée (metrics — voir
  // getTurboPulseVisualMetrics), la zone de sécurité des fruits et la
  // position/taille du canon, puis redessine/repositionne sans jamais
  // recréer la scène ni perdre l'état de partie en cours (fruits, score,
  // niveau...). Le plancher de taille du monde (largeur/hauteur) est déjà
  // garanti par scale.minWidth/minHeight (voir mountTurboPulseGame) : ce que
  // gameSize rapporte ici correspond toujours exactement au canvas réel.
  private handleResize = (gameSize: Phaser.Structs.Size) => {
    const width = Math.round(gameSize.width);
    const height = Math.round(gameSize.height);
    if (width === this.worldWidth && height === this.worldHeight) return;
    this.worldWidth = width;
    this.worldHeight = height;
    this.metrics = getTurboPulseVisualMetrics(width, height);
    this.cannonY = height - this.metrics.cannonBottomMargin;
    this.fruitYRange = fruitSpawnYRange(this.metrics.fruitRadius, height);
    this.drawWorld();
    this.applyCannonMetrics();
  };

  // Repositionne/redimensionne le canon existant sur l'échelle visuelle
  // courante (this.metrics), sans redessiner ses graphismes : cannonBase et
  // cannonArm ne contiennent que des formes vectorielles (aucun texte), la
  // mise à l'échelle du conteneur Phaser leur suffit donc sans jamais
  // introduire de flou. cannonBadge est un texte autonome (hors conteneur) :
  // sa taille de police est ajustée explicitement pour rester nette.
  private applyCannonMetrics() {
    const { cannonX, cannonScale, cannonBadgeFontSize } = this.metrics;
    this.cannonBase?.setPosition(cannonX, this.cannonY).setScale(cannonScale);
    this.cannonArm?.setPosition(cannonX, this.cannonY).setScale(cannonScale);
    this.cannonBadge?.setPosition(cannonX, this.cannonY + 54 * cannonScale).setFontSize(cannonBadgeFontSize);
  }

  // Phaser ne surveille nativement que le redimensionnement de la FENÊTRE,
  // jamais celui d'un conteneur CSS : sous Scale.RESIZE, updateScale() lit
  // sa taille cible dans this.parentSize (mis à jour uniquement par
  // getParentBounds()) et non dans les arguments d'un resize() manuel —
  // appeler resize() directement ici serait donc silencieusement ignoré.
  // getParentBounds() remesure this.scale.parent (le conteneur DOM réel) et
  // met à jour parentSize ; refresh() applique alors cette nouvelle taille
  // au canvas, ce qui redessine le décor/repositionne le canon
  // (handleResize) sans jamais recréer la scène ni perdre la partie en
  // cours. Appelé par le ResizeObserver React sur le conteneur, y compris
  // hors plein écran.
  refreshLayout = () => {
    if (this.scale.getParentBounds()) this.scale.refresh();
  };

  // Décor purement visuel : ni les positions de collision (défense, canon)
  // ni la logique de jeu n'en dépendent directement, seules worldWidth et
  // worldHeight le font. Redessiné (clear + retracé sur le même Graphics,
  // jamais recréé) à chaque redimensionnement pour occuper toute la surface
  // réellement disponible au lieu d'un cadre 960×540 fixe étiré.
  private drawWorld() {
    const graphics = this.worldGraphics ?? (this.worldGraphics = this.add.graphics());
    graphics.clear();
    const width = this.worldWidth;
    const height = this.worldHeight;
    // Facteurs de proportion par rapport au décor de référence (960×540) :
    // ce sont les POSITIONS du décor qui suivent la taille du monde. Les
    // fruits/canon/textes suivent séparément l'échelle visuelle bornée
    // (this.metrics, voir getTurboPulseVisualMetrics) — jamais ces sx/sy
    // directement, qui ne sont pas bornés et grandiraient sans limite sur
    // un très grand écran.
    const sx = width / REFERENCE_WORLD_WIDTH;
    const sy = height / REFERENCE_WORLD_HEIGHT;

    graphics.fillGradientStyle(0x123d55, 0x123d55, 0x6fb8c5, 0x6fb8c5, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.fillStyle(0xffdf83, 0.9);
    graphics.fillCircle(820 * sx, 76, 48);
    graphics.fillStyle(0xffffff, 0.14);
    for (let index = 0; index < 20; index += 1) graphics.fillCircle((40 + index * 49) * sx, 34 + (index % 4) * 19, 2 + (index % 3));

    // Bandeau HUD réservé : fond visuel du calcul « À résoudre » et, en plein
    // écran, des commandes Pause/Quitter. Aucun fruit ne doit s'y trouver
    // (voir fruitYRange) — ce liseré matérialise la limite réelle.
    graphics.fillStyle(0x0a2630, 0.5);
    graphics.fillRoundedRect(10, 8, width - 20, HUD_SAFE_TOP - 16, 16);
    graphics.lineStyle(2, 0xffd36b, 0.22);
    graphics.strokeRoundedRect(10, 8, width - 20, HUD_SAFE_TOP - 16, 16);

    graphics.fillStyle(0x2a7b72, 1);
    graphics.fillTriangle(0, 330 * sy, 220 * sx, 150 * sy, 430 * sx, 330 * sy);
    graphics.fillTriangle(250 * sx, 330 * sy, 560 * sx, 120 * sy, 780 * sx, 330 * sy);
    graphics.fillTriangle(610 * sx, 330 * sy, 840 * sx, 178 * sy, 1000 * sx, 330 * sy);
    graphics.fillStyle(0x17493f, 1);
    graphics.fillRect(0, 330 * sy, width, height - 330 * sy);
    graphics.fillStyle(0x1d5b4c, 1);
    for (let row = 0; row < 3; row += 1) {
      graphics.fillRoundedRect(100 * sx, (350 + row * 57) * sy, 830 * sx, 38, 18);
      graphics.lineStyle(2, 0x74a783, 0.35);
      graphics.strokeRoundedRect(100 * sx, (350 + row * 57) * sy, 830 * sx, 38, 18);
    }
    graphics.fillStyle(0x0a2630, 0.78);
    graphics.fillRect(0, 0, DEFENSE_X, height);
    graphics.fillStyle(0xffd36b, 0.18);
    graphics.fillRect(DEFENSE_X, 0, 26, height);
    graphics.lineStyle(4, 0xffd36b, 0.9);
    graphics.lineBetween(DEFENSE_X, 42, DEFENSE_X, height - 28);
    for (let y = 48; y < height - 30; y += 36) graphics.fillTriangle(DEFENSE_X - 8, y, DEFENSE_X + 8, y + 12, DEFENSE_X - 8, y + 24);

    if (!this.stationLabel) {
      this.stationLabel = this.add.text(0, 0, "STATION JARDIN • TURBO PULSE", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "13px", fontStyle: "bold", color: "#9bd7b1" }).setOrigin(0.5);
    }
    this.stationLabel.setPosition(710 * sx, 500 * sy);
  }

  private createCannon() {
    // "DÉFENSE" est ancré dans un coin fixe (près de la zone de défense, elle
    // aussi à marge fixe) : contrairement au reste du décor, sa position ne
    // dépend jamais de la taille du monde.
    this.add.text(20, 70, "🛡\nDÉFENSE", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "15px", fontStyle: "bold", align: "center", color: "#fff7dc" }).setAngle(-90).setOrigin(0.5);

    // Formes vectorielles dessinées une fois à l'échelle de référence, à
    // l'origine locale du conteneur : applyCannonMetrics() les redimensionne
    // ensuite via .setScale(), sans jamais les redessiner ni introduire de
    // flou (aucun texte dans ces deux conteneurs).
    const baseGraphics = this.add.graphics();
    baseGraphics.fillStyle(0x0d2137, 0.55).fillEllipse(0, 24, 134, 42);
    baseGraphics.fillStyle(0x355b70, 1).fillCircle(0, 0, 45);
    baseGraphics.lineStyle(5, 0xffc857, 1).strokeCircle(0, 0, 36);
    baseGraphics.fillStyle(0x172f46, 1).fillCircle(0, 0, 19);
    this.cannonBase = this.add.container(this.metrics.cannonX, this.cannonY, [baseGraphics]);

    const tube = this.add.rectangle(48, 0, 96, 32, 0x79a9b8).setStrokeStyle(4, 0xd8f0ec).setOrigin(0, 0.5);
    const muzzle = this.add.rectangle(94, 0, 22, 43, 0xffc857).setStrokeStyle(3, 0x6b4b18).setOrigin(0.5);
    this.cannonArm = this.add.container(this.metrics.cannonX, this.cannonY, [tube, muzzle]);
    this.cannonBadge = this.add.text(this.metrics.cannonX, this.cannonY + 54, "", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "20px", fontStyle: "bold", color: "#102c3c", backgroundColor: "#fff7dc", padding: { x: 14, y: 7 } }).setOrigin(0.5).setDepth(5);
    this.aimGuide = this.add.graphics().setDepth(2);
    this.applyCannonMetrics();
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
    // Rayon et polices explicitement recalculés depuis this.metrics (jamais
    // FRUIT_RADIUS brut, ni un .setScale() de conteneur) : ce dernier
    // mélangerait formes vectorielles et texte, qui se remettrait alors à
    // l'échelle deux fois (une fois via sa propre taille de police, une
    // fois via la transformation du conteneur parent) — au lieu de rester
    // net, le texte flouterait sur petit écran.
    const { fruitRadius, scale, emojiFontSize, numberFontSize, numberFontSizeLarge, labelFontSize } = this.metrics;
    const halo = this.add.circle(0, 0, fruitRadius + 7 * scale, spec.color, 1).setStrokeStyle(3, 0xffffff, 0.74);
    const plate = this.add.circle(0, 0, fruitRadius, 0xfff3cf, 1).setStrokeStyle(2, 0x16324a, 0.55);
    const emoji = this.add.text(0, -11 * scale, spec.emoji, { fontFamily: "Segoe UI Emoji, sans-serif", fontSize: `${emojiFontSize}px` }).setOrigin(0.5);
    const value = this.add.text(0, 15 * scale, String(spec.number), { fontFamily: "Trebuchet MS, sans-serif", fontSize: `${spec.number >= 100 ? numberFontSizeLarge : numberFontSize}px`, fontStyle: "bold", color: "#102c3c", stroke: "#ffffff", strokeThickness: 4 }).setOrigin(0.5);
    const label = this.add.text(0, 39 * scale, spec.variantLabel.toUpperCase(), { fontFamily: "Trebuchet MS, sans-serif", fontSize: `${labelFontSize}px`, fontStyle: "bold", color: "#ffffff", backgroundColor: "#102c3c", padding: { x: 5, y: 2 } }).setOrigin(0.5);
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
      this.createFruitActor(spec, this.worldWidth + 70 + index * randomInt(78, 108), randomInt(this.fruitYRange.min, this.fruitYRange.max));
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
      this.createFruitActor(spec, this.worldWidth + 80 + this.fruits.length * 90, randomInt(this.fruitYRange.min, this.fruitYRange.max));
    }
  }

  // Unique point d'écriture de l'opération courante : le bandeau HUD React
  // (« À résoudre »), le texte Phaser sur le piston et la validation des tirs
  // (operationToken) doivent toujours refléter le même calcul. ensureTarget()
  // appelle cette méthode à chaque frame dès que le fruit ciblé disparaît ;
  // sans emitSnapshot() ici, le piston (dessiné directement dans Phaser)
  // changeait instantanément tandis que le HUD React restait figé sur
  // l'ancien calcul jusqu'au prochain évènement de jeu — d'où le
  // désaccord visible entre « À résoudre » et le piston.
  private setTarget(result: number | null) {
    if (result === null) return;
    this.operation = operationForResult(result, this.levelIndex);
    this.operationToken += 1;
    this.cannonBadge?.setText(`${formatOperation(this.operation)} = ?`);
    this.shots.forEach((shot) => shot.view.destroy());
    this.shots = [];
    this.emitSnapshot();
  }

  private ensureTarget() {
    if (this.fruits.length === 0) {
      if (this.status === "clearing") this.scheduleCompletion();
      return;
    }
    if (!this.fruits.some((fruit) => fruit.spec.number === this.operation.result)) this.setTarget(chooseTargetResult(this.fruits.map((fruit) => fruit.spec)));
  }

  private aimAt(x: number, y: number) {
    const { cannonX, cannonScale } = this.metrics;
    this.aimAngle = Phaser.Math.Clamp(Math.atan2(y - this.cannonY, x - cannonX), -Math.PI + 0.04, 0.12);
    this.cannonArm?.setRotation(this.aimAngle);
    this.aimGuide?.clear().lineStyle(3, 0xffffff, 0.28).lineBetween(cannonX + Math.cos(this.aimAngle) * 112 * cannonScale, this.cannonY + Math.sin(this.aimAngle) * 112 * cannonScale, cannonX + Math.cos(this.aimAngle) * 215 * cannonScale, this.cannonY + Math.sin(this.aimAngle) * 215 * cannonScale);
  }

  private fire() {
    if (this.time.now - this.lastFireAt < 130) return;
    this.lastFireAt = this.time.now;
    const { cannonX, cannonScale, projectileFontSize } = this.metrics;
    const operationText = formatOperation(this.operation).replaceAll(" ", "");
    const body = this.add.rectangle(0, 0, 82 * cannonScale, 38 * cannonScale, 0xe5f1f4, 1).setStrokeStyle(4, 0xffc857).setOrigin(0.5);
    const label = this.add.text(0, 0, operationText, { fontFamily: "Trebuchet MS, sans-serif", fontSize: `${projectileFontSize}px`, fontStyle: "bold", color: "#102c3c" }).setOrigin(0.5);
    const view = this.add.container(cannonX + Math.cos(this.aimAngle) * 112 * cannonScale, this.cannonY + Math.sin(this.aimAngle) * 112 * cannonScale, [body, label]).setRotation(this.aimAngle).setDepth(4);
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
      fruit.view.setPosition(this.worldWidth + randomInt(80, 180), randomInt(this.fruitYRange.min, this.fruitYRange.max));
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
  // Un grand écran doit révéler une vraie surface de jeu plus grande, pas
  // agrandir par étirement une scène 960×540 figée : la taille initiale suit
  // la place réellement disponible dans le conteneur (mesurée ici), et
  // Phaser.Scale.RESIZE la fait suivre ensuite tout changement (voir
  // refreshLayout, appelé par un ResizeObserver côté React). Le repli
  // 960×540 ne sert qu'aux instants où le conteneur n'a pas encore de
  // dimensions mesurables (ex. juste après l'insertion dans le DOM).
  const bounds = parent.getBoundingClientRect();
  const initialWidth = bounds.width >= MIN_WORLD_WIDTH ? Math.round(bounds.width) : REFERENCE_WORLD_WIDTH;
  const initialHeight = bounds.height >= MIN_WORLD_HEIGHT ? Math.round(bounds.height) : REFERENCE_WORLD_HEIGHT;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: initialWidth,
    height: initialHeight,
    backgroundColor: "#123d55",
    transparent: false,
    scene,
    // min: seul plancher appliqué au monde de jeu lui-même — clampe ensemble
    // displaySize, gameSize ET le canvas réel (this.scale.width/height dans
    // create()/handleResize() ne peuvent alors jamais diverger de ce que
    // Phaser affiche vraiment). En dessous de cette taille de conteneur,
    // c'est getTurboPulseVisualMetrics (plancher 0.68) qui prend le relais en
    // réduisant fruits/canon/textes, jamais un agrandissement artificiel du
    // monde logique au-delà du canvas physique.
    scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER, min: { width: MIN_WORLD_WIDTH, height: MIN_WORLD_HEIGHT } },
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
