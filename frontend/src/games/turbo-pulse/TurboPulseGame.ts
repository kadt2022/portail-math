import Phaser from "phaser";

import {
  ART_SCALE,
  CANNON_ARM,
  CANNON_ARM_KEY,
  CANNON_BASE,
  CANNON_BASE_KEY,
  CANNON_MUZZLE_DISTANCE,
  CANNON_PLATE_KEY,
  ENERGY_CORE_KEY,
  ENERGY_CORE_SIZE,
  ENERGY_GLOW_KEY,
  ENERGY_GLOW_SIZE,
  ensureCannonTextures,
  ensureEnergyTextures,
  ensureFruitTexture,
  FRUIT_BADGE_SIZE,
} from "./turbo-pulse-art";
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

// Bornes de visée du canon : reprises dans aimAt() (clamp).
const AIM_MIN_ANGLE = -Math.PI + 0.04;
const AIM_MAX_ANGLE = 0.12;

// Le canon est dessiné en vectoriel (voir turbo-pulse-art.ts), à ART_SCALE fois
// l'échelle de référence : CANNON_IMAGE_SCALE ramène ces textures à leur taille
// d'affichage de référence, cannonScale applique ensuite le bornage petit écran
// par-dessus (voir applyCannonMetrics). Exportée pour les tests, qui vérifient
// que cannonBase/cannonArm.scaleX suit toujours metrics.scale.
// Énergie et ligne de défense : toujours dorées (identité Turbo Pulse), quel que soit le monde.
const GOLD_ENERGY = 0xffc83d;
export const CANNON_IMAGE_SCALE = 1 / ART_SCALE;
// Centre de la plaque d'opération sous le canon (échelle 1, depuis le pivot).
const CANNON_PLATE_OFFSET_Y = 62;
// Cadence des étincelles de la traînée du tir.
const TRAIL_INTERVAL = 0.028;

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
  /** Temps restant avant la prochaine étincelle de traînée. */
  trail: number;
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
  private cannonBase?: Phaser.GameObjects.Image;
  private cannonArm?: Phaser.GameObjects.Image;
  private cannonPlate?: Phaser.GameObjects.Image;
  private cannonBadge?: Phaser.GameObjects.Text;
  private aimGuide?: Phaser.GameObjects.Graphics;
  private worldGraphics?: Phaser.GameObjects.Graphics;
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
    // Canon, tir et plaque : dessinés une fois en vectoriel (turbo-pulse-art.ts).
    ensureCannonTextures(this);
    ensureEnergyTextures(this);
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

    // Référence stable capturée AVANT la boucle : un tir juste peut déclencher
    // this.correctHit() -> this.setTarget(), qui vide ET RÉASSIGNE
    // intégralement this.shots (this.shots = []) pour invalider les tirs en
    // vol visant l'ancienne cible. Si d'autres tirs restent à traiter dans
    // CETTE frame (plusieurs tirs simultanés), relire `this.shots[index]`
    // après cette réassignation retombe sur le NOUVEAU tableau (vide) à un
    // index qui n'y existe plus -> `undefined`, et `shot.view` plantait
    // (blocage complet du jeu signalé après plusieurs tirs rapprochés). En
    // itérant sur cette référence locale, les tirs restants de la frame sont
    // traités normalement (rejetés côté jeton, voir plus bas) sans jamais
    // relire le tableau réassigné.
    const shots = this.shots;
    for (let index = shots.length - 1; index >= 0; index -= 1) {
      const shot = shots[index];
      shot.view.x += shot.vx * seconds;
      shot.view.y += shot.vy * seconds;
      shot.life -= seconds;
      shot.trail -= seconds;
      if (shot.trail <= 0) {
        shot.trail = TRAIL_INTERVAL;
        this.spawnTrailSpark(shot.view.x, shot.view.y);
      }
      if (shot.life <= 0 || shot.view.x < -80 || shot.view.x > this.worldWidth + 80 || shot.view.y < -80 || shot.view.y > this.worldHeight + 80) {
        shot.view.destroy();
        shots.splice(index, 1);
        continue;
      }
      const hit = this.fruits.find((fruit) => Phaser.Math.Distance.Between(shot.view.x, shot.view.y, fruit.view.x, fruit.view.y) <= this.metrics.fruitHitRadius);
      if (hit) {
        shot.view.destroy();
        shots.splice(index, 1);
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
  // courante (this.metrics), sans rien redessiner : CANNON_IMAGE_SCALE ramène
  // d'abord les textures (cuites à ART_SCALE) à l'encombrement de référence,
  // cannonScale applique ensuite le bornage petit écran par dessus (les deux
  // facteurs se multiplient, .setScale() n'étant jamais cumulatif d'un appel à
  // l'autre). cannonBadge est un texte autonome posé sur la plaque dorée : sa
  // taille de police est ajustée explicitement pour rester nette.
  private applyCannonMetrics() {
    const { cannonX, cannonScale, cannonBadgeFontSize } = this.metrics;
    const cannonDisplayScale = CANNON_IMAGE_SCALE * cannonScale;
    const plateY = this.cannonY + CANNON_PLATE_OFFSET_Y * cannonScale;
    this.cannonBase?.setPosition(cannonX, this.cannonY).setScale(cannonDisplayScale);
    this.cannonArm?.setPosition(cannonX, this.cannonY).setScale(cannonDisplayScale);
    this.cannonPlate?.setPosition(cannonX, plateY).setScale(cannonDisplayScale);
    this.cannonBadge?.setPosition(cannonX, plateY).setFontSize(cannonBadgeFontSize);
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
  // this.scale peut être absent si la scène a été arrêtée/détruite (ex.
  // juste après une exception non rattrapée ailleurs dans la boucle de jeu,
  // ou pendant un démontage React) au moment où le ResizeObserver externe
  // déclenche cet appel — un plantage silencieux ici ne doit jamais se
  // reproduire au prochain redimensionnement.
  refreshLayout = () => {
    if (this.scale?.getParentBounds()) this.scale.refresh();
  };

  // Décor purement visuel : ni les positions de collision (défense, canon)
  // ni la logique de jeu n'en dépendent directement, seules worldWidth et
  // worldHeight le font. Redessiné (clear + retracé sur le même Graphics,
  // jamais recréé) à chaque redimensionnement pour occuper toute la surface
  // réellement disponible au lieu d'un cadre 960×540 fixe étiré.
  private drawWorld() {
    const graphics = this.worldGraphics ?? (this.worldGraphics = this.add.graphics());
    graphics.clear();
    const height = this.worldHeight;
    // Le décor illustré vit dans un calque CSS/DOM séparé, derrière ce canvas
    // (voir .background dans TurboPulsePage.module.css) : le flou "façon
    // cinéma" y est appliqué une fois par le compositeur du navigateur, sans
    // recalcul à chaque frame d'un shader WebGL sur une grosse image statique.
    // Ce canvas Phaser reste transparent (mountTurboPulseGame) et ne dessine
    // plus que les éléments qui doivent rester nets : zone de défense, fruits,
    // canon, projectiles. La ligne de défense est dorée, comme l'énergie.
    const accent = GOLD_ENERGY;
    graphics.fillStyle(0x06151f, 0.7);
    graphics.fillRect(0, 0, DEFENSE_X, height);
    graphics.fillStyle(accent, 0.1);
    graphics.fillRect(DEFENSE_X, 0, 30, height);
    graphics.fillStyle(accent, 0.18);
    graphics.fillRect(DEFENSE_X, 0, 10, height);
    graphics.lineStyle(5, accent, 0.28);
    graphics.lineBetween(DEFENSE_X, 36, DEFENSE_X, height - 24);
    graphics.lineStyle(3, 0xffd36b, 0.95);
    graphics.lineBetween(DEFENSE_X, 40, DEFENSE_X, height - 28);
    graphics.fillStyle(accent, 0.85);
    for (let y = 48; y < height - 30; y += 36) graphics.fillTriangle(DEFENSE_X - 8, y, DEFENSE_X + 8, y + 12, DEFENSE_X - 8, y + 24);
  }

  private createCannon() {
    // "DÉFENSE" est ancré dans un coin fixe (près de la zone de défense, elle
    // aussi à marge fixe) : contrairement au reste du décor, sa position ne
    // dépend jamais de la taille du monde.
    this.add.text(20, 70, "🛡\nDÉFENSE", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "15px", fontStyle: "bold", align: "center", color: "#fff7dc" }).setAngle(-90).setOrigin(0.5);

    // Base, bras et plaque : textures vectorielles (voir turbo-pulse-art.ts).
    // L'origine est posée sur le pivot (centre du corps hexagonal), identique
    // pour la base et le bras : applyCannonMetrics() les repositionne et les
    // redimensionne ensuite via .setScale(), sans jamais les redessiner. Le bras
    // est dessiné canon vers la droite : sa rotation est donc l'angle de visée.
    const { cannonX } = this.metrics;
    this.cannonBase = this.add.image(cannonX, this.cannonY, CANNON_BASE_KEY).setOrigin(CANNON_BASE.pivotX / CANNON_BASE.width, CANNON_BASE.pivotY / CANNON_BASE.height).setDepth(0);
    this.cannonArm = this.add
      .image(cannonX, this.cannonY, CANNON_ARM_KEY)
      .setOrigin(CANNON_ARM.pivotX / CANNON_ARM.width, CANNON_ARM.pivotY / CANNON_ARM.height)
      .setRotation(this.aimAngle)
      .setDepth(1);
    this.cannonPlate = this.add.image(cannonX, this.cannonY, CANNON_PLATE_KEY).setDepth(4);
    this.cannonBadge = this.add.text(cannonX, this.cannonY, "", { fontFamily: "Trebuchet MS, sans-serif", fontSize: "20px", fontStyle: "bold", color: "#3b2606" }).setOrigin(0.5).setDepth(5);
    this.aimGuide = this.add.graphics().setDepth(2);
    this.applyCannonMetrics();
  }

  private startLevel(index: number, retry: boolean) {
    this.completionTimer?.remove(false);
    this.clearActors();
    this.levelIndex = index;
    this.drawWorld();
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
    const { scale, numberFontSize, numberFontSizeLarge } = this.metrics;
    // Badge (halo, anneau de couleur, pastille et fruit dessiné) : texture cuite
    // une fois par famille et par couleur (voir ensureFruitTexture), jamais par
    // fruit. Le nombre et l'étiquette restent des textes Phaser, pour rester
    // nets et lisibles quel que soit leur contenu.
    const textureKey = ensureFruitTexture(this, spec.family, spec.variant, spec.color);
    const badge = this.add.image(0, 0, textureKey).setDisplaySize(FRUIT_BADGE_SIZE * scale, FRUIT_BADGE_SIZE * scale);
    const value = this.add.text(0, 17 * scale, String(spec.number), { fontFamily: "Trebuchet MS, sans-serif", fontSize: `${spec.number >= 100 ? numberFontSizeLarge : numberFontSize}px`, fontStyle: "bold", color: "#102c3c", stroke: "#ffffff", strokeThickness: 4 }).setOrigin(0.5);
    const view = this.add.container(x, y, [badge, value]).setDepth(3);
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
    this.aimAngle = Phaser.Math.Clamp(Math.atan2(y - this.cannonY, x - cannonX), AIM_MIN_ANGLE, AIM_MAX_ANGLE);
    this.cannonArm?.setRotation(this.aimAngle);
    const guideStart = (CANNON_MUZZLE_DISTANCE + 16) * cannonScale;
    const guideEnd = (CANNON_MUZZLE_DISTANCE + 118) * cannonScale;
    this.aimGuide?.clear().lineStyle(3, GOLD_ENERGY, 0.4).lineBetween(cannonX + Math.cos(this.aimAngle) * guideStart, this.cannonY + Math.sin(this.aimAngle) * guideStart, cannonX + Math.cos(this.aimAngle) * guideEnd, this.cannonY + Math.sin(this.aimAngle) * guideEnd);
  }

  private fire() {
    if (this.time.now - this.lastFireAt < 130) return;
    this.lastFireAt = this.time.now;
    const { cannonX, cannonScale } = this.metrics;
    const accent = GOLD_ENERGY;
    const muzzle = CANNON_MUZZLE_DISTANCE * cannonScale;
    const muzzleX = cannonX + Math.cos(this.aimAngle) * muzzle;
    const muzzleY = this.cannonY + Math.sin(this.aimAngle) * muzzle;
    // Boule d'énergie : un halo teinté à la couleur du monde autour d'un cœur blanc.
    const glow = this.add.image(0, 0, ENERGY_GLOW_KEY).setDisplaySize(ENERGY_GLOW_SIZE * 0.95 * cannonScale, ENERGY_GLOW_SIZE * 0.95 * cannonScale).setTint(accent).setBlendMode(Phaser.BlendModes.ADD);
    const core = this.add.image(0, 0, ENERGY_CORE_KEY).setDisplaySize(ENERGY_CORE_SIZE * 0.95 * cannonScale, ENERGY_CORE_SIZE * 0.95 * cannonScale);
    const view = this.add.container(muzzleX, muzzleY, [glow, core]).setDepth(4);
    this.shots.push({ view, vx: Math.cos(this.aimAngle) * SHOT_SPEED, vy: Math.sin(this.aimAngle) * SHOT_SPEED, life: 2.4, result: this.operation.result, token: this.operationToken, trail: 0 });
    this.flashMuzzle(muzzleX, muzzleY, accent);
    this.playTone(230, 0.06, 0.04, "square");
  }

  // Éclat bref à la bouche du canon au moment du tir.
  private flashMuzzle(x: number, y: number, accent: number) {
    const size = ENERGY_GLOW_SIZE * this.metrics.cannonScale;
    const flash = this.add.image(x, y, ENERGY_GLOW_KEY).setDisplaySize(size * 0.6, size * 0.6).setTint(accent).setBlendMode(Phaser.BlendModes.ADD).setDepth(4);
    this.tweens.add({ targets: flash, scale: flash.scale * 1.9, alpha: 0, duration: 160, ease: "Quad.easeOut", onComplete: () => flash.destroy() });
  }

  // Étincelle de la traînée : naît sur la trajectoire du tir, rétrécit et s'éteint.
  private spawnTrailSpark(x: number, y: number) {
    const accent = GOLD_ENERGY;
    const size = ENERGY_GLOW_SIZE * 0.5 * this.metrics.cannonScale;
    const spark = this.add.image(x, y, ENERGY_GLOW_KEY).setDisplaySize(size, size).setTint(accent).setAlpha(0.7).setBlendMode(Phaser.BlendModes.ADD).setDepth(3);
    this.tweens.add({ targets: spark, scale: spark.scale * 0.25, alpha: 0, duration: 240, onComplete: () => spark.destroy() });
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
    // Onde de choc : un anneau de la couleur du fruit qui s'élargit et s'éteint.
    const ring = this.add.circle(fruit.view.x, fruit.view.y, this.metrics.fruitRadius, 0xffffff, 0).setStrokeStyle(4, fruit.spec.color, 0.9).setDepth(4);
    this.tweens.add({ targets: ring, scale: selected ? 2.6 : 1.9, alpha: 0, duration: 380, ease: "Quad.easeOut", onComplete: () => ring.destroy() });
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
    // Le décor illustré vit dans un calque CSS/DOM séparé, derrière ce
    // canvas (voir .background dans TurboPulsePage.module.css) : Phaser ne
    // doit donc plus peindre de fond opaque, seulement les objets de jeu
    // (fruits, canon, projectiles) et les overlays fonctionnels (bandeau
    // HUD, zone de défense), pour laisser transparaître le fond flouté.
    transparent: true,
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
