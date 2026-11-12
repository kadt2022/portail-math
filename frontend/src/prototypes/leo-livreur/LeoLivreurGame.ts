import Phaser from "phaser";

import backCarUrl from "./assets/leo-car-back.webp";
import frontCarUrl from "./assets/leo-car-front.webp";
import leftCarUrl from "./assets/leo-car-left.webp";
import rightCarUrl from "./assets/leo-car-right.webp";
import houseUrl from "./assets/leo-house-turquoise.webp";
import restaurantUrl from "./assets/leo-pizza-restaurant.webp";
import { updateLeoMotion, type LeoMotionInput, type LeoMotionState } from "./leoDriving";
import {
  BRANCH_LANE_X,
  BRANCH_TOP_Y,
  canDeliver,
  DESTINATIONS,
  destinationAt,
  INTERSECTION_X,
  laneAt,
  MAIN_LANE_Y,
  MAIN_ROAD_X_MAX,
  MAIN_ROAD_X_MIN,
  ROAD_HALF_WIDTH,
  ROAD_WIDTH,
  ROAD_Y,
  START_POSITION,
  VEHICLE_LENGTH,
  VEHICLE_WIDTH,
  vehicleCorners,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  distanceTo,
} from "./leoGeometry";
import { vehicleViewForHeading, type LeoVehicleSprite } from "./leoVehicleView";

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
  targetLabel: string;
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

export const WHEEL_RADIUS = 11;
// Les pneus et jantes sont peints dans les illustrations. On n'anime que les
// moyeux des deux profils (positions relatives au centre du sprite affiché).
export const CAR_RIGHT_WHEEL_HUBS = [[-37, 34], [34, 34]] as const;
export const CAR_LEFT_WHEEL_HUBS = [[-34, 34], [37, 34]] as const;
const SIDE_SPRITE_SIZE = { width: 132, height: 96 };
const END_SPRITE_SIZE = { width: 80, height: 90 };

export class LeoLivreurScene extends Phaser.Scene {
  private readonly onSnapshot: SnapshotListener;
  private car?: Phaser.GameObjects.Container;
  private body?: Phaser.GameObjects.Container;
  private sprites: Partial<Record<LeoVehicleSprite, Phaser.GameObjects.Image>> = {};
  private carShadow?: Phaser.GameObjects.Ellipse;
  private wheelGraphics?: Phaser.GameObjects.Graphics;
  private targetGraphics?: Phaser.GameObjects.Graphics;
  private debugGuides?: Phaser.GameObjects.Graphics;
  private debugVehicle?: Phaser.GameObjects.Graphics;
  private debugText?: Phaser.GameObjects.Text;
  // Mode diagnostic : développement uniquement, activé par ?debug (pas de route ni d'API).
  private readonly debugMode = import.meta.env.DEV
    && typeof window !== "undefined"
    && new URLSearchParams(window.location.search).has("debug");
  private debugRectangle = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("debug") === "rect";
  private phase: LeoLivreurPhase = "INTRO";
  private motion: LeoMotionState = {
    x: START_POSITION.x,
    y: START_POSITION.y,
    speed: 0,
    heading: 0,
    steeringAngle: 0,
  };
  private wheelSpin = 0;
  private steeringPulseDirection: "left" | "right" | null = null;
  private steeringPulseUntil = 0;
  private deliveredCount = 0;
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
    this.load.image("leo-car-right", rightCarUrl);
    this.load.image("leo-car-left", leftCarUrl);
    this.load.image("leo-car-front", frontCarUrl);
    this.load.image("leo-car-back", backCarUrl);
    this.load.image("leo-house", houseUrl);
    this.load.image("leo-restaurant", restaurantUrl);
  }

  create() {
    this.drawWorld();
    this.carShadow = this.add.ellipse(this.motion.x, this.motion.y + 27, 120, 34, 0x3b241c, 0.3).setDepth(8);
    this.car = this.add.container(this.motion.x, this.motion.y).setDepth(10);
    this.body = this.add.container(0, 0);
    const make = (sprite: LeoVehicleSprite, size: { width: number; height: number }) =>
      this.add.image(0, 0, `leo-car-${sprite}`).setDisplaySize(size.width, size.height).setVisible(false);
    this.sprites = {
      right: make("right", SIDE_SPRITE_SIZE),
      left: make("left", SIDE_SPRITE_SIZE),
      front: make("front", END_SPRITE_SIZE),
      back: make("back", END_SPRITE_SIZE),
    };
    this.wheelGraphics = this.add.graphics();
    this.body.add([...Object.values(this.sprites), this.wheelGraphics]);
    this.car.add(this.body);
    this.updateVehicleVisual();
    if (this.debugMode) this.createDebugOverlay();
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.startFollow(this.car, true, 0.08, 0.08);
    this.cameras.main.setZoom(Math.min(this.scale.width / 900, this.scale.height / 520, 1));
    this.registerKeyboardControls();
    this.publish();
  }

  update(_time: number, delta: number) {
    if (!this.car || this.phase !== "DRIVING") return;
    const previousSpeed = this.motion.speed;
    const pulseActive = this.time.now < this.steeringPulseUntil;
    const input: LeoMotionInput = {
      ...this.controls,
      left: this.controls.left || (pulseActive && this.steeringPulseDirection === "left"),
      right: this.controls.right || (pulseActive && this.steeringPulseDirection === "right"),
    };
    const seconds = Math.min(delta / 1000, 0.05);
    this.motion = updateLeoMotion(this.motion, input, delta / 1000);
    this.wheelSpin += (this.motion.speed * seconds) / WHEEL_RADIUS;
    this.syncCar();

    if (this.canDeliverNow()) {
      this.phase = "ARRIVED";
      this.publish();
    } else if (previousSpeed !== this.motion.speed) {
      this.publish();
    }
  }

  startMission() {
    if (this.phase !== "INTRO") return;
    this.phase = "DRIVING";
    this.publish();
  }

  deliver() {
    // Livraison possible uniquement arrêté dans la zone de la destination en cours.
    if (this.phase !== "ARRIVED" || !this.canDeliverNow()) return;
    this.deliveredCount += 1;
    this.phase = this.deliveredCount >= DESTINATIONS.length ? "DELIVERED" : "DRIVING";
    this.drawTargets();
    this.publish();
  }

  reset() {
    this.phase = "INTRO";
    this.motion = {
      x: START_POSITION.x,
      y: START_POSITION.y,
      speed: 0,
      heading: 0,
      steeringAngle: 0,
    };
    this.wheelSpin = 0;
    this.steeringPulseDirection = null;
    this.steeringPulseUntil = 0;
    this.deliveredCount = 0;
    this.controls = { left: false, right: false, forward: false, brake: false };
    this.drawTargets();
    this.syncCar();
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
    if (this.debugMode) {
      keyboard.on("keydown-G", () => {
        this.debugRectangle = !this.debugRectangle;
        this.syncCar();
      });
    }
  }

  private currentDestination() {
    return destinationAt(this.deliveredCount);
  }

  private canDeliverNow() {
    return canDeliver(this.motion.x, this.motion.y, this.motion.speed, this.deliveredCount);
  }

  private publish() {
    const destination = this.currentDestination();
    this.onSnapshot({
      phase: this.phase,
      speed: Math.round(Math.abs(this.motion.speed)),
      heading: this.motion.heading,
      steering: Math.round(Phaser.Math.RadToDeg(this.motion.steeringAngle)),
      cargo: DESTINATIONS.length - this.deliveredCount,
      targetCargo: DESTINATIONS.length,
      distanceToHouse: Math.round(distanceTo(this.motion.x, this.motion.y, destination.stop)),
      targetLabel: destination.label,
    });
  }

  private drawWorld() {
    this.add.rectangle(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, WORLD_WIDTH, WORLD_HEIGHT, 0x9bdc79).setDepth(-5);
    const road = this.add.graphics().setDepth(0);
    road.fillStyle(0xd7bd8c, 1);
    road.fillRect(28, ROAD_Y - ROAD_HALF_WIDTH - 13, WORLD_WIDTH - 56, ROAD_WIDTH + 26);
    road.fillRect(INTERSECTION_X - ROAD_HALF_WIDTH - 13, BRANCH_TOP_Y - 13, ROAD_WIDTH + 26, ROAD_Y - BRANCH_TOP_Y + 63);
    road.fillStyle(0x4b4b55, 1);
    road.fillRect(MAIN_ROAD_X_MIN, ROAD_Y - ROAD_HALF_WIDTH, MAIN_ROAD_X_MAX - MAIN_ROAD_X_MIN, ROAD_WIDTH);
    road.fillRect(INTERSECTION_X - ROAD_HALF_WIDTH, BRANCH_TOP_Y, ROAD_WIDTH, ROAD_Y + ROAD_HALF_WIDTH - BRANCH_TOP_Y);
    road.lineStyle(8, 0xffd83d, 1);
    road.lineBetween(80, ROAD_Y, INTERSECTION_X - 75, ROAD_Y);
    road.lineBetween(INTERSECTION_X + 75, ROAD_Y, WORLD_WIDTH - 80, ROAD_Y);
    road.lineBetween(INTERSECTION_X, ROAD_Y - 45, INTERSECTION_X, 250);
    road.lineStyle(5, 0xf4efe0, 0.9);
    for (let x = 90; x < WORLD_WIDTH - 80; x += 90) road.lineBetween(x, ROAD_Y, x + 42, ROAD_Y);
    for (let y = 270; y < ROAD_Y - 55; y += 82) road.lineBetween(INTERSECTION_X, y, INTERSECTION_X, y + 38);

    this.add.image(170, 445, "leo-restaurant").setDisplaySize(250, 167).setDepth(2);
    for (const destination of DESTINATIONS) {
      this.add.image(destination.house.x, destination.house.y, "leo-house").setDisplaySize(230, 153).setDepth(2);
    }
    this.targetGraphics = this.add.graphics().setDepth(1);
    this.drawTargets();
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

  /** Zones d'arrêt : la destination en cours est en relief, les autres sont estompées. */
  private drawTargets() {
    if (!this.targetGraphics) return;
    this.targetGraphics.clear();
    DESTINATIONS.forEach((destination, index) => {
      if (index < this.deliveredCount) return;
      const current = index === this.deliveredCount;
      this.targetGraphics?.fillStyle(0xfff1a8, current ? 0.3 : 0.1);
      this.targetGraphics?.fillCircle(destination.stop.x, destination.stop.y, destination.radius);
      this.targetGraphics?.lineStyle(4, 0xffd83d, current ? 0.95 : 0.35);
      this.targetGraphics?.strokeCircle(destination.stop.x, destination.stop.y, destination.radius);
    });
  }

  private syncCar() {
    if (!this.car) return;
    this.car.setPosition(this.motion.x, this.motion.y);
    this.carShadow?.setPosition(this.motion.x, this.motion.y + 27);
    this.updateVehicleVisual();
    this.updateDebugOverlay();
  }

  private updateVehicleVisual() {
    if (!this.body) return;
    const view = vehicleViewForHeading(this.motion.heading);
    const showSprite = !this.debugRectangle;
    for (const [name, image] of Object.entries(this.sprites)) image?.setVisible(showSprite && name === view.sprite);
    this.body.setAngle(view.angleDeg);
    this.carShadow?.setVisible(showSprite);
    this.drawWheels(view.sprite);
  }

  private drawWheels(sprite: LeoVehicleSprite) {
    if (!this.wheelGraphics) return;
    this.wheelGraphics.clear();
    if (this.debugRectangle) return;
    // De face ou de dos, les roues ne montrent pas leur jante : rien à animer.
    if (sprite === "front" || sprite === "back") return;
    const hubs = sprite === "right" ? CAR_RIGHT_WHEEL_HUBS : CAR_LEFT_WHEEL_HUBS;
    for (const [x, y] of hubs) this.drawWheelHub(x, y);
  }

  private drawWheelHub(x: number, y: number) {
    if (!this.wheelGraphics) return;
    // Les pneus et jantes sont déjà peints dans les sprites directionnels.
    // On n'anime que leurs moyeux, sans superposer un pneu supplémentaire.
    this.wheelGraphics.fillStyle(0xe3ddd2, 0.95);
    this.wheelGraphics.fillCircle(x, y, 4.5);
    this.wheelGraphics.lineStyle(1.5, 0x5b5660, 0.9);
    for (let spoke = 0; spoke < 4; spoke += 1) {
      const angle = this.wheelSpin + spoke * Math.PI / 2;
      this.wheelGraphics.lineBetween(x, y, x + Math.cos(angle) * 4, y + Math.sin(angle) * 4);
    }
  }

  // --- Mode diagnostic (développement uniquement) -------------------------------

  private createDebugOverlay() {
    this.debugGuides = this.add.graphics().setDepth(4);
    // Limites des chaussées (blanc), axes (cyan), centres de voie (magenta).
    this.debugGuides.lineStyle(2, 0xffffff, 0.9);
    this.debugGuides.strokeRect(MAIN_ROAD_X_MIN, ROAD_Y - ROAD_HALF_WIDTH, MAIN_ROAD_X_MAX - MAIN_ROAD_X_MIN, ROAD_WIDTH);
    this.debugGuides.strokeRect(INTERSECTION_X - ROAD_HALF_WIDTH, BRANCH_TOP_Y, ROAD_WIDTH, ROAD_Y - BRANCH_TOP_Y);
    this.debugGuides.lineStyle(2, 0x2ee6ff, 0.85);
    this.debugGuides.lineBetween(MAIN_ROAD_X_MIN, ROAD_Y, MAIN_ROAD_X_MAX, ROAD_Y);
    this.debugGuides.lineBetween(INTERSECTION_X, BRANCH_TOP_Y, INTERSECTION_X, ROAD_Y + ROAD_HALF_WIDTH);
    this.debugGuides.lineStyle(3, 0xff4fd8, 0.9);
    this.debugGuides.lineBetween(MAIN_ROAD_X_MIN, MAIN_LANE_Y, MAIN_ROAD_X_MAX, MAIN_LANE_Y);
    this.debugGuides.lineBetween(BRANCH_LANE_X, BRANCH_TOP_Y, BRANCH_LANE_X, ROAD_Y + ROAD_HALF_WIDTH);
    this.debugVehicle = this.add.graphics().setDepth(12);
    this.debugText = this.add.text(0, 0, "", {
      color: "#ffffff",
      backgroundColor: "#000000aa",
      fontFamily: "monospace",
      fontSize: "16px",
    }).setDepth(13);
    this.updateDebugOverlay();
  }

  private updateDebugOverlay() {
    if (!this.debugVehicle || !this.debugText) return;
    const { x, y, heading, steeringAngle, speed } = this.motion;
    const g = this.debugVehicle;
    g.clear();
    // Rectangle d'empreinte : c'est lui que le moteur teste contre la chaussée.
    g.lineStyle(3, this.debugRectangle ? 0xffd83d : 0xffffff, 1);
    const corners = vehicleCorners({ x, y, heading });
    g.beginPath();
    g.moveTo(corners[0][0], corners[0][1]);
    for (const [cx, cy] of corners.slice(1)) g.lineTo(cx, cy);
    g.closePath();
    g.strokePath();
    // Flèche : l'avant du véhicule.
    const tipX = x + Math.cos(heading) * (VEHICLE_LENGTH / 2 + 24);
    const tipY = y + Math.sin(heading) * (VEHICLE_LENGTH / 2 + 24);
    g.lineStyle(4, 0xff3b30, 1);
    g.lineBetween(x, y, tipX, tipY);
    g.fillStyle(0xff3b30, 1);
    g.fillTriangle(
      tipX, tipY,
      tipX - Math.cos(heading - 0.5) * 14, tipY - Math.sin(heading - 0.5) * 14,
      tipX - Math.cos(heading + 0.5) * 14, tipY - Math.sin(heading + 0.5) * 14,
    );
    // Point logique (centre de l'empreinte).
    g.fillStyle(0x00e676, 1);
    g.fillCircle(x, y, 6);
    this.debugText
      .setPosition(x + VEHICLE_LENGTH / 2 + 8, y - VEHICLE_WIDTH / 2 - 44)
      .setText(`cap ${Math.round(Phaser.Math.RadToDeg(heading))}°  braq ${Math.round(Phaser.Math.RadToDeg(steeringAngle))}°\nv ${Math.round(speed)}  ${laneAt(x, y)}`);
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
