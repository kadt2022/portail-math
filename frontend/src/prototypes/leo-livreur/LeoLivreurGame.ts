import Phaser from "phaser";

import carUrl from "./assets/leo-car.webp";
import frontCarUrl from "./assets/leo-car-front.webp";
import houseUrl from "./assets/leo-house-turquoise.webp";
import restaurantUrl from "./assets/leo-pizza-restaurant.webp";

export type LeoLivreurPhase = "INTRO" | "DRIVING" | "ARRIVED" | "DELIVERED";
export type LeoLivreurControl = "left" | "right" | "forward" | "brake";

export interface LeoLivreurSnapshot {
  phase: LeoLivreurPhase;
  speed: number;
  heading: number;
  steering: number;
  cargo: number;
  targetCargo: number;
  distanceToHouse: number;
}

export interface LeoLivreurController {
  destroy(): void;
  refreshLayout(): void;
  startMission(): void;
  deliver(): void;
  reset(): void;
  setControl(control: LeoLivreurControl, active: boolean): void;
  turn(direction: "left" | "right"): void;
}

type SnapshotListener = (snapshot: LeoLivreurSnapshot) => void;

const WORLD_WIDTH = 1800;
const WORLD_HEIGHT = 900;
export const ROAD_Y = 600;
export const ROAD_WIDTH = 140;
export const ROAD_HALF_WIDTH = ROAD_WIDTH / 2;
export const LANE_OFFSET = 35;
export const MAIN_LANE_Y = ROAD_Y + LANE_OFFSET;
export const INTERSECTION_X = 930;
export const BRANCH_LANE_X = INTERSECTION_X + LANE_OFFSET;
export const HOUSE_X = BRANCH_LANE_X;
export const HOUSE_Y = 290;
const MAX_SPEED = 260;
const ARRIVAL_RADIUS = 105;
export const MAX_STEERING_ANGLE = Math.PI / 6;
export const WHEEL_BASE = 96;
export const STEERING_RETURN_RATE = 3.8;
export const WHEEL_RADIUS = 11;
// Le nez peint dans l'illustration pointe légèrement vers le bas à droite.
// Phaser considère 0° comme l'axe horizontal vers la droite : cet offset
// aligne donc la voiture avec la route sans modifier la direction physique.
export const CAR_SPRITE_HEADING_OFFSET = -18;
// Positions des deux moyeux déjà présents dans l'illustration de la voiture.
// On anime uniquement ces détails : aucun pneu supplémentaire n'est dessiné.
export const CAR_WHEEL_HUBS = [[-43, 17], [-10, 21]] as const;
export const CAR_FRONT_WHEEL_HUBS = [[-21, 36], [21, 36]] as const;

export interface LeoMotionState {
  x: number;
  y: number;
  speed: number;
  heading: number;
  steeringAngle: number;
}

export interface LeoMotionInput {
  left: boolean;
  right: boolean;
  forward: boolean;
  brake: boolean;
}

export function approach(current: number, target: number, amount: number) {
  if (current < target) return Math.min(current + amount, target);
  return Math.max(current - amount, target);
}

export function isLeoRoadPoint(x: number, y: number) {
  const onMainRoad = x >= 40 && x <= WORLD_WIDTH - 40 && Math.abs(y - ROAD_Y) <= ROAD_HALF_WIDTH;
  const onBranch = y >= 220 && y <= ROAD_Y + ROAD_HALF_WIDTH && Math.abs(x - INTERSECTION_X) <= ROAD_HALF_WIDTH;
  return onMainRoad || onBranch;
}

export function updateLeoMotion(state: LeoMotionState, input: LeoMotionInput, deltaSeconds: number): LeoMotionState {
  const seconds = Math.min(deltaSeconds, 0.05);
  const steeringTarget = input.left === input.right
    ? 0
    : input.left
      ? -MAX_STEERING_ANGLE
      : MAX_STEERING_ANGLE;
  const steeringAngle = approach(state.steeringAngle, steeringTarget, STEERING_RETURN_RATE * seconds);
  let speed = input.forward ? Math.min(MAX_SPEED, state.speed + 280 * seconds) : Math.max(0, state.speed - 90 * seconds);
  if (input.brake) speed = Math.max(0, speed - 520 * seconds);
  if (speed < 2) speed = 0;

  const heading = state.heading + (speed / WHEEL_BASE) * Math.tan(steeringAngle) * seconds;
  const x = state.x + Math.cos(heading) * speed * seconds;
  const y = state.y + Math.sin(heading) * speed * seconds;
  if (!isLeoRoadPoint(x, y)) return { ...state, speed: 0, steeringAngle };
  return { x, y, speed, heading, steeringAngle };
}

export class LeoLivreurScene extends Phaser.Scene {
  private readonly onSnapshot: SnapshotListener;
  private car?: Phaser.GameObjects.Container;
  private sideCar?: Phaser.GameObjects.Image;
  private frontCar?: Phaser.GameObjects.Image;
  private carShadow?: Phaser.GameObjects.Ellipse;
  private wheelGraphics?: Phaser.GameObjects.Graphics;
  private debugGuides?: Phaser.GameObjects.Graphics;
  private debugMarker?: Phaser.GameObjects.Graphics;
  private readonly debugMode = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).has("debug");
  private phase: LeoLivreurPhase = "INTRO";
  private speed = 0;
  private heading = 0;
  private steeringAngle = 0;
  private wheelSpin = 0;
  private steeringPulseDirection: "left" | "right" | null = null;
  private steeringPulseUntil = 0;
  private cargo = 2;
  private readonly targetCargo = 2;
  private xPosition = 300;
  private yPosition = MAIN_LANE_Y;
  private controls: Record<LeoLivreurControl, boolean> = {
    left: false,
    right: false,
    forward: false,
    brake: false,
  };

  constructor(onSnapshot: SnapshotListener) {
    super({ key: "leo-livreur" });
    this.onSnapshot = onSnapshot;
  }

  preload() {
    this.load.image("leo-car", carUrl);
    this.load.image("leo-car-front", frontCarUrl);
    this.load.image("leo-house", houseUrl);
    this.load.image("leo-restaurant", restaurantUrl);
  }

  create() {
    this.drawWorld();
    this.carShadow = this.add.ellipse(this.xPosition, this.yPosition + 27, 120, 34, 0x3b241c, 0.3).setDepth(8);
    this.car = this.add.container(this.xPosition, this.yPosition).setDepth(10);
    this.sideCar = this.add.image(0, 0, "leo-car").setDisplaySize(132, 88).setAngle(CAR_SPRITE_HEADING_OFFSET);
    this.frontCar = this.add.image(0, 0, "leo-car-front").setDisplaySize(86, 88).setVisible(false).setFlipY(true);
    this.car.add([this.sideCar, this.frontCar]);
    this.wheelGraphics = this.add.graphics();
    this.car.add(this.wheelGraphics);
    this.updateVehicleVisual();
    if (this.debugMode) this.createDebugGuides();
    this.car.setDepth(10);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.car, true, 0.08, 0.08);
    this.cameras.main.setZoom(Math.min(this.scale.width / 900, this.scale.height / 520, 1));
    this.registerKeyboardControls();
    this.publish();
  }

  update(_time: number, delta: number) {
    if (!this.car || this.phase !== "DRIVING") return;
    const previousSpeed = this.speed;
    const previousX = this.xPosition;
    const previousY = this.yPosition;
    const pulseActive = this.time.now < this.steeringPulseUntil;
    const motion = updateLeoMotion(
      { x: this.xPosition, y: this.yPosition, speed: this.speed, heading: this.heading, steeringAngle: this.steeringAngle },
      {
        ...this.controls,
        left: this.controls.left || (pulseActive && this.steeringPulseDirection === "left"),
        right: this.controls.right || (pulseActive && this.steeringPulseDirection === "right"),
      },
      delta / 1000,
    );
    this.xPosition = Phaser.Math.Clamp(motion.x, 80, WORLD_WIDTH - 80);
    this.yPosition = Phaser.Math.Clamp(motion.y, 100, WORLD_HEIGHT - 80);
    this.speed = motion.speed;
    this.heading = motion.heading;
    this.steeringAngle = motion.steeringAngle;
    const movedDistance = Phaser.Math.Distance.Between(previousX, previousY, this.xPosition, this.yPosition);
    this.wheelSpin += movedDistance / WHEEL_RADIUS;
    this.car.setPosition(this.xPosition, this.yPosition);
    this.carShadow?.setPosition(this.xPosition, this.yPosition + 27);
    this.updateVehicleVisual();
    this.updateDebugMarker();

    if (this.distanceToHouse() <= ARRIVAL_RADIUS && this.speed === 0) {
      this.phase = "ARRIVED";
      this.publish();
    } else if (Math.floor(this.speed) % 8 === 0 || previousSpeed !== this.speed) {
      this.publish();
    }
  }

  startMission() {
    if (this.phase !== "INTRO") return;
    this.phase = "DRIVING";
    this.publish();
  }

  deliver() {
    if (this.phase !== "ARRIVED") return;
    this.cargo = 0;
    this.phase = "DELIVERED";
    this.publish();
  }

  reset() {
    this.phase = "INTRO";
    this.speed = 0;
    this.heading = 0;
    this.steeringAngle = 0;
    this.wheelSpin = 0;
    this.steeringPulseDirection = null;
    this.steeringPulseUntil = 0;
    this.cargo = this.targetCargo;
    this.xPosition = 300;
    this.yPosition = MAIN_LANE_Y;
    this.controls = { left: false, right: false, forward: false, brake: false };
    this.car?.setPosition(this.xPosition, this.yPosition);
    this.carShadow?.setPosition(this.xPosition, this.yPosition + 27);
    this.updateVehicleVisual();
    this.updateDebugMarker();
    this.publish();
  }

  setControl(control: LeoLivreurControl, active: boolean) {
    this.controls[control] = active;
  }

  turn(direction: "left" | "right") {
    if (this.phase !== "DRIVING") return;
    // Un clic très court doit tout de même produire une frame de braquage.
    // Un maintien tactile continue d'utiliser controls[direction].
    this.steeringPulseDirection = direction;
    this.steeringPulseUntil = this.time.now + 220;
    this.publish();
  }

  private registerKeyboardControls() {
    const keyboard = this.input.keyboard;
    if (!keyboard) return;
    const bind = (event: string, control: LeoLivreurControl, active: boolean) => {
      keyboard.on(event, () => this.setControl(control, active));
    };
    bind("keydown-LEFT", "left", true);
    bind("keyup-LEFT", "left", false);
    bind("keydown-A", "left", true);
    bind("keyup-A", "left", false);
    bind("keydown-RIGHT", "right", true);
    bind("keyup-RIGHT", "right", false);
    bind("keydown-D", "right", true);
    bind("keyup-D", "right", false);
    bind("keydown-UP", "forward", true);
    bind("keyup-UP", "forward", false);
    bind("keydown-W", "forward", true);
    bind("keyup-W", "forward", false);
    bind("keydown-DOWN", "brake", true);
    bind("keyup-DOWN", "brake", false);
    bind("keydown-S", "brake", true);
    bind("keyup-S", "brake", false);
  }

  private distanceToHouse() {
    return Phaser.Math.Distance.Between(this.xPosition, this.yPosition, HOUSE_X, HOUSE_Y);
  }

  private publish() {
    this.onSnapshot({
      phase: this.phase,
      speed: Math.round(this.speed),
      heading: this.heading,
      steering: Math.round(Phaser.Math.RadToDeg(this.steeringAngle)),
      cargo: this.cargo,
      targetCargo: this.targetCargo,
      distanceToHouse: Math.round(this.distanceToHouse()),
    });
  }

  private drawWorld() {
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x9bdc79).setDepth(-5);
    const road = this.add.graphics().setDepth(0);
    road.fillStyle(0xd7bd8c, 1);
    road.fillRect(28, ROAD_Y - ROAD_HALF_WIDTH - 13, WORLD_WIDTH - 56, ROAD_WIDTH + 26);
    road.fillRect(INTERSECTION_X - ROAD_HALF_WIDTH - 13, 207, ROAD_WIDTH + 26, ROAD_Y - 124);
    road.fillStyle(0x4b4b55, 1);
    road.fillRect(40, ROAD_Y - ROAD_HALF_WIDTH, WORLD_WIDTH - 80, ROAD_WIDTH);
    road.fillRect(INTERSECTION_X - ROAD_HALF_WIDTH, 220, ROAD_WIDTH, ROAD_Y - 150);
    road.lineStyle(8, 0xffd83d, 1);
    road.lineBetween(80, ROAD_Y, INTERSECTION_X - 75, ROAD_Y);
    road.lineBetween(INTERSECTION_X + 75, ROAD_Y, WORLD_WIDTH - 80, ROAD_Y);
    road.lineBetween(INTERSECTION_X, ROAD_Y - 45, INTERSECTION_X, 250);
    road.lineStyle(5, 0xf4efe0, 0.9);
    for (let x = 90; x < WORLD_WIDTH - 80; x += 90) road.lineBetween(x, ROAD_Y, x + 42, ROAD_Y);
    for (let y = 270; y < ROAD_Y - 55; y += 82) road.lineBetween(INTERSECTION_X, y, INTERSECTION_X, y + 38);

    this.add.image(170, 445, "leo-restaurant").setDisplaySize(250, 167).setDepth(2);
    this.add.image(HOUSE_X, HOUSE_Y - 25, "leo-house").setDisplaySize(230, 153).setDepth(2);
    this.add.circle(HOUSE_X, HOUSE_Y + 95, ARRIVAL_RADIUS, 0xfff1a8, 0.22).setStrokeStyle(4, 0xffd83d, 0.9).setDepth(1);
    this.add.text(HOUSE_X, HOUSE_Y + 175, "ZONE D’ARRÊT", {
      color: "#3b241c",
      fontFamily: "Nunito, sans-serif",
      fontSize: "22px",
      fontStyle: "bold",
      stroke: "#fff4d6",
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(3);
    this.add.text(INTERSECTION_X + 115, ROAD_Y - 110, "Intersection", {
      color: "#3b241c",
      fontFamily: "Nunito, sans-serif",
      fontSize: "24px",
      fontStyle: "bold",
      stroke: "#fff4d6",
      strokeThickness: 6,
    }).setDepth(3);
    this.add.text(120, 760, "Route principale", {
      color: "#ffffff",
      fontFamily: "Nunito, sans-serif",
      fontSize: "28px",
      fontStyle: "bold",
    }).setDepth(3);
  }

  private updateVehicleVisual() {
    if (!this.car || !this.sideCar || !this.frontCar) return;
    const verticalProgress = Phaser.Math.Clamp(
      (Math.abs(this.heading) - Phaser.Math.DegToRad(42)) / Phaser.Math.DegToRad(48),
      0,
      1,
    );
    this.sideCar.setAlpha(1 - verticalProgress);
    this.frontCar.setAlpha(verticalProgress).setFlipY(this.heading < 0);
    this.car.setAngle(Phaser.Math.RadToDeg(this.heading) * (1 - verticalProgress));
    this.drawWheels(verticalProgress);
  }

  private drawWheels(verticalProgress = 0) {
    if (!this.wheelGraphics) return;
    this.wheelGraphics.clear();
    for (const [x, y] of CAR_WHEEL_HUBS) this.drawWheelHub(x, y, 1 - verticalProgress);
    for (const [x, y] of CAR_FRONT_WHEEL_HUBS) this.drawWheelHub(x, y, verticalProgress);
  }

  private drawWheelHub(x: number, y: number, alpha: number) {
    if (!this.wheelGraphics || alpha <= 0) return;
    // Les pneus et jantes sont déjà peints dans les sprites directionnels.
    // On n'anime que leurs moyeux, sans superposer un pneu supplémentaire.
    this.wheelGraphics.fillStyle(0xe3ddd2, 0.95 * alpha);
    this.wheelGraphics.fillCircle(x, y, 4.5);
    this.wheelGraphics.lineStyle(1.5, 0x5b5660, 0.9 * alpha);
    for (let spoke = 0; spoke < 4; spoke += 1) {
      const angle = this.wheelSpin + spoke * Math.PI / 2;
      this.wheelGraphics.lineBetween(x, y, x + Math.cos(angle) * 4, y + Math.sin(angle) * 4);
    }
  }

  private createDebugGuides() {
    this.debugGuides = this.add.graphics().setDepth(4);
    this.debugGuides.lineStyle(3, 0xff4fd8, 0.9);
    this.debugGuides.lineBetween(40, MAIN_LANE_Y, WORLD_WIDTH - 40, MAIN_LANE_Y);
    this.debugGuides.lineBetween(BRANCH_LANE_X, 220, BRANCH_LANE_X, ROAD_Y + ROAD_HALF_WIDTH);
    this.debugGuides.lineStyle(2, 0x2ee6ff, 0.85);
    this.debugGuides.lineBetween(40, ROAD_Y, WORLD_WIDTH - 40, ROAD_Y);
    this.debugGuides.lineBetween(INTERSECTION_X, 220, INTERSECTION_X, ROAD_Y + ROAD_HALF_WIDTH);
    this.add.text(55, MAIN_LANE_Y + 14, "voie droite →", {
      color: "#ff4fd8",
      fontFamily: "Nunito, sans-serif",
      fontSize: "18px",
      fontStyle: "bold",
    }).setDepth(4);
    this.debugMarker = this.add.graphics().setDepth(12);
    this.updateDebugMarker();
  }

  private updateDebugMarker() {
    if (!this.debugMarker) return;
    this.debugMarker.clear();
    this.debugMarker.lineStyle(2, 0xffffff, 0.95);
    this.debugMarker.strokeCircle(this.xPosition, this.yPosition, 12);
    this.debugMarker.lineBetween(this.xPosition - 18, this.yPosition, this.xPosition + 18, this.yPosition);
    this.debugMarker.lineBetween(this.xPosition, this.yPosition - 18, this.xPosition, this.yPosition + 18);
  }
}

export function mountLeoLivreurGame(host: HTMLElement, onSnapshot: SnapshotListener): LeoLivreurController {
  const scene = new LeoLivreurScene(onSnapshot);
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host,
    transparent: true,
    scene,
    scale: {
      mode: Phaser.Scale.RESIZE,
      width: Math.max(host.clientWidth, 320),
      height: Math.max(host.clientHeight, 260),
    },
  });

  return {
    destroy: () => game.destroy(true),
    refreshLayout: () => game.scale.resize(Math.max(host.clientWidth, 320), Math.max(host.clientHeight, 260)),
    startMission: () => scene.startMission(),
    deliver: () => scene.deliver(),
    reset: () => scene.reset(),
    setControl: (control, active) => scene.setControl(control, active),
    turn: (direction) => scene.turn(direction),
  };
}
