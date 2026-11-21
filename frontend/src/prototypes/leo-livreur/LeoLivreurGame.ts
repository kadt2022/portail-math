import Phaser from "phaser";

import backCarUrl from "./assets/leo-car-back.webp";
import familyTrafficUrl from "./assets/leo-traffic-family-blue-v1.webp";
import compactTrafficUrl from "./assets/leo-traffic-compact-green-v1.webp";
import sedanTrafficUrl from "./assets/leo-traffic-sedan-gray-v1.webp";
import cityBusTrafficUrl from "./assets/leo-traffic-city-bus-v1.webp";
import schoolBusTrafficUrl from "./assets/leo-traffic-school-bus-occupied-v1.webp";
import taxiTrafficUrl from "./assets/leo-traffic-taxi-occupied-v1.webp";
import minibusTrafficUrl from "./assets/leo-traffic-minibus-v1.webp";
import frontCarUrl from "./assets/leo-car-front.webp";
import houseUrl from "./assets/leo-house-turquoise.webp";
import nearSideHouseUrl from "./assets/leo-house-near-side-v1.webp";
import villageTreeUrl from "./assets/leo-tree-v1.webp";
import nearSideFlowersUrl from "./assets/leo-flowers-near-side-v1.webp";
import nearSideGardenUrl from "./assets/leo-garden-near-side-v1.webp";
import houseYellowUrl from "./assets/leo-house-yellow-v1-compact.webp";
import leftCarUrl from "./assets/leo-car-left.webp";
import rightCarUrl from "./assets/leo-car-right.webp";
import bridgeLayerUrl from "./assets/leo-world-suspension-bridge-layer-v2.webp";
import bridgeDeckUrl from "./assets/leo-world-bridge-deck-v1.webp";
import bridgeRailUrl from "./assets/leo-world-bridge-rail-v1.webp";
import villageBackdropUrl from "./assets/leo-world-village-zone1-backdrop-v1.webp";
import { BRIDGE_CAMERA_OFFSET, bridgeLayout, cameraZoomFor, DECK, RAIL, SKY_COLOR, SUSPENSION, WATER_COLOR } from "./leoBridgeLayout";
import cityTopUrl from "./assets/leo-world-city-top-v1.webp";
import cityBottomUrl from "./assets/leo-world-city-bottom-v1.webp";
import boulevardZone4Url from "./assets/leo-world-boulevard-zone4-v7-seated-below-crop.webp";
import pedestrianManUrl from "./assets/leo-pedestrian-man-walk-v1.webp";
import pedestrianWomanUrl from "./assets/leo-pedestrian-woman-walk-v1.webp";
import pedestrianChildUrl from "./assets/leo-pedestrian-child-walk-v1.webp";
import pedestrianDepthFrontUrl from "./assets/leo-pedestrian-depth-front-walk-v1.webp";
import pedestrianDepthBackUrl from "./assets/leo-pedestrian-depth-back-walk-v1.webp";
import { cameraProfile, CITY_FADE, CITY_REF, cityLayout } from "./leoCityLayout";
import { BOULEVARD_FADE, BOULEVARD_REF, boulevardLayout, boulevardSignals } from "./leoBoulevardLayout";
import {
  boulevardDepthPedestrians,
  boulevardPedestrians,
  pedestrianExitAlpha,
  PEDESTRIAN_FRAME,
  PEDESTRIAN_FRAMES,
  type DepthPedestrianSpec,
  type PedestrianSpec,
} from "./leoPedestrians";
import crossBusUrl from "./assets/leo-cross-bus-v1.webp";
import crossLimousineUrl from "./assets/leo-cross-limousine-v1.webp";
import crossSedanUrl from "./assets/leo-cross-sedan-v1.webp";
import crossSportUrl from "./assets/leo-cross-sport-v1.webp";
import crossSuvUrl from "./assets/leo-cross-suv-v1.webp";
import crossSedanTurnUrl from "./assets/leo-cross-sedan-turn-v1.webp";
import { CrossTrafficManager } from "./leoCrossTraffic";
import { CrossViews } from "./leoCrossView";
import { DepthTraffic, SEDAN_TURN_PROFILE, SHEET_VIEWS, SHEET_WHEELS, TURN_SHEET, sheetCrop, turnTextureKey, turnWheelTextureKey } from "./leoDepthVehicle";
import { IntersectionController } from "./leoIntersection";
import {
  SIGNAL_MESSAGES,
  SignalJudge,
  type LightState,
  type SignalEvent,
} from "./leoTrafficLight";
import { updateLeoMotion, type LeoMotionInput, type LeoMotionState } from "./leoDriving";
import {
  canDeliver,
  DESTINATIONS,
  destinationForDelivery,
  laneAt,
  type LeoDestination,
  MAIN_LANE_Y,
  MAIN_ROAD_X_MIN,
  ONCOMING_LANE_Y,
  ROAD_HALF_WIDTH,
  ROAD_WIDTH,
  ROAD_Y,
  ROUTE_LENGTH_METERS,
  START_POSITION,
  suburbHousesBetween,
  VEHICLE_LENGTH,
  VEHICLE_WIDTH,
  vehicleCorners,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  distanceTo,
} from "./leoGeometry";
import { WORLD_ZONE_WIDTH, zoneForWorldX, zonesToKeep } from "./leoWorldZones";
import {
  framedViewRange,
  steadyFraming,
  lookDirection,
  signalReadout,
  smoothToward,
  type Framing,
} from "./leoSightline";
import {
  LEO_SPEC_LEFT,
  LEO_SPEC_RIGHT,
  CROSS_SPECS,
  TRAFFIC_SPECS,
  needsMirror,
  rollAngle,
  vehicleDisplay,
  wheelDiscSourceRadius,
  type VehicleSpec,
} from "./leoVehicleCatalog";
import { LeoSound, passerPitch } from "./leoAudio";
import { kmhToPx, pxToKmh, pxToMeters } from "./leoUnits";
import {
  BUNDLE_TEXTURES,
  ZoneAssetManager,
  bundlesForRange,
  keepRange,
  prefetchRange,
  type BundleId,
} from "./leoZoneAssets";
import { DensityGovernor, initialLaneCap, laneY, TrafficManager, trafficWheelPose, vehicleBounds } from "./leoTraffic";
import { vehicleViewForHeading, type LeoVehicleSprite } from "./leoVehicleView";

export type LeoLivreurPhase = "INTRO" | "DRIVING" | "ARRIVED";
export type LeoLivreurControl = "left" | "right" | "forward" | "brake" | "reverse";

export interface LeoLivreurSnapshot {
  phase: LeoLivreurPhase;
  /** Vitesse affichée, en km/h (arrondie). */
  speedKmh: number;
  heading: number;
  steering: number;
  cargo: number;
  targetCargo: number;
  /** Distance réelle jusqu’au point de livraison, en mètres. */
  distanceToHouse: number;
  targetLabel: string;
  /** Distance réellement parcourue, en mètres. */
  travelledMeters: number;
  routeLengthMeters: number;
  /** Feu de la Zone 3 et message pédagogique en cours (null hors de la ville). */
  signalState: LightState | null;
  signalMessage: string | null;
  /** Distance en mètres jusqu’à la ligne d’arrêt du feu, et sa consigne d’approche. */
  signalDistance: number | null;
  signalPrepare: boolean;
  /**
   * Ressources du jeu : « loading » (démarrage ou suite du parcours en cours de téléchargement, conduite en attente),
   * « ready », ou « error » (reprises épuisées : bouton Réessayer). `assetsLoaded` / `assetsTotal` : nombre réel
   * d'images du démarrage (jamais un pourcentage inventé) ; null hors démarrage.
   */
  assets: "loading" | "ready" | "error";
  assetsLoaded: number | null;
  assetsTotal: number | null;
}

export interface LeoLivreurController {
  destroy(): void;
  refreshLayout(): void;
  startMission(): void;
  deliver(): void;
  reset(): void;
  setControl(control: LeoLivreurControl, active: boolean): void;
  turn(direction: "left" | "right"): void;
  /** Met le jeu en pause (boucle Phaser arrêtée : physique, trafic et feux figés) ou le reprend. */
  setPaused(paused: boolean): void;
  /** Réessaie le téléchargement des ressources en échec (bouton Réessayer). */
  retryAssets(): void;
  /** Active ou coupe le son (à appeler depuis le clic de l'enfant). Renvoie l'état obtenu. */
  setSound(on: boolean): boolean;
  /** Klaxon tenu (vrai) ou relâché (faux). */
  horn(active: boolean): void;
}

type SnapshotListener = (snapshot: LeoLivreurSnapshot) => void;

const END_SPRITE_SIZE = { width: 80, height: 90 };
const TRAFFIC_POOL_CAPACITY = 12;
const MAX_LANE_CAP = 6;
const CROSS_CAPACITY = 6;
/** Son : vitesse minimale d'un choc audible, délai entre deux chocs. */
const MIN_COLLISION_KMH = 6;
const COLLISION_COOLDOWN_MS = 900;
/** Son : une voiture qui croise Léo s'entend si elle passe à moins de cette distance latérale (px) et assez vite. */
const PASS_HEARING_DISTANCE = 260;
const MIN_PASS_KMH = 12;

/** Adresse de chaque texture téléchargée (une seule source de vérité pour le préchargement et les lots). */
const TEXTURE_URLS: Record<string, string> = {
  "leo-traffic-family-blue": familyTrafficUrl,
  "leo-traffic-compact-green": compactTrafficUrl,
  "leo-traffic-sedan-gray": sedanTrafficUrl,
  "leo-traffic-city-bus": cityBusTrafficUrl,
  "leo-traffic-school-bus-occupied": schoolBusTrafficUrl,
  "leo-traffic-taxi-occupied": taxiTrafficUrl,
  "leo-traffic-minibus": minibusTrafficUrl,
  "leo-car-right": rightCarUrl,
  "leo-car-left": leftCarUrl,
  "leo-car-front": frontCarUrl,
  "leo-car-back": backCarUrl,
  "leo-house": houseUrl,
  "leo-house-near-side": nearSideHouseUrl,
  "leo-tree": villageTreeUrl,
  "leo-flowers-near-side": nearSideFlowersUrl,
  "leo-garden-near-side": nearSideGardenUrl,
  "leo-house-yellow": houseYellowUrl,
  "leo-world-bridge-deck": bridgeDeckUrl,
  "leo-world-bridge-rail": bridgeRailUrl,
  "leo-world-suspension-bridge-layer": bridgeLayerUrl,
  "leo-world-village-zone1-backdrop": villageBackdropUrl,
  "leo-world-city-top": cityTopUrl,
  "leo-world-city-bottom": cityBottomUrl,
  "leo-world-boulevard-zone4": boulevardZone4Url,
  "leo-pedestrian-man-sheet": pedestrianManUrl,
  "leo-pedestrian-woman-sheet": pedestrianWomanUrl,
  "leo-pedestrian-child-sheet": pedestrianChildUrl,
  "leo-pedestrian-depth-front-sheet": pedestrianDepthFrontUrl,
  "leo-pedestrian-depth-back-sheet": pedestrianDepthBackUrl,
  "leo-cross-sedan-turn": crossSedanTurnUrl,
};
const BRIDGE_SOURCE_KEY = "leo-world-suspension-bridge-layer";
const PEDESTRIAN_SHEETS = [
  ["leo-pedestrian-man-sheet", "leo-pedestrian-man"],
  ["leo-pedestrian-woman-sheet", "leo-pedestrian-woman"],
  ["leo-pedestrian-child-sheet", "leo-pedestrian-child"],
  ["leo-pedestrian-depth-front-sheet", "leo-pedestrian-depth-front"],
  ["leo-pedestrian-depth-back-sheet", "leo-pedestrian-depth-back"],
] as const;
const FADED_BRIDGE_KEYS = [
  "leo-world-suspension-bridge-layer-faded",
  "leo-world-suspension-bridge-layer-faded-start",
  "leo-world-suspension-bridge-layer-faded-end",
] as const;
/** Images à télécharger pour un lot, sauf si ses textures dérivées existent déjà. */
const sourceTexturesFor = (bundle: BundleId) => BUNDLE_TEXTURES[bundle];
/** Textures fabriquées dans le navigateur à partir d'un lot (libérées avec lui). */
const derivedTexturesFor = (bundle: BundleId): string[] => {
  if (bundle === "bridge") return [...FADED_BRIDGE_KEYS];
  if (bundle === "city") {
    return [
      ...SHEET_VIEWS.map((view) => turnTextureKey(view.angle)),
      ...SHEET_VIEWS.flatMap((view) => (SHEET_WHEELS[view.angle] ?? []).map((_wheel, index) => turnWheelTextureKey(view.angle, index))),
      wheelTextureKey(SEDAN_TURN_PROFILE, 0),
      wheelTextureKey(SEDAN_TURN_PROFILE, 1),
      ...PEDESTRIAN_SHEETS.map(([, textureKey]) => textureKey),
    ];
  }
  return [];
};
/**
 * Trafic de la rue perpendiculaire qui tourne (profils des 5 véhicules noirs) : à l'arrêt depuis l'expérience de la
 * rue des Jardins. Tant qu'il l'est, ses 5 illustrations (≈ 217 ko) ne sont ni téléchargées ni préparées : le
 * chargement sur téléphone est plus léger. Le code reste en place pour le réactiver.
 */
const CROSS_TRAFFIC_ENABLED = false;
const ACTIVE_CROSS_SPECS = CROSS_TRAFFIC_ENABLED ? CROSS_SPECS : [];
/** Asphalte de leo-road-straight-v1.png entre les lignes blanches : 181 px source, centré sur y = 255,5. */
const WORLD_BACKGROUND_COLOR = 0x9bdc79;
const ROAD_SURFACE_COLOR = 0x4b4b55;
/** Fondus du calque de suspension, en fraction de sa largeur : court entre copies, long aux deux bouts du pont. */
const SHORT_FADE = 0.12;
const BRIDGE_ENTRY_FADE = 0.4;
const HOUSE_SIGN_STYLE = {
  fontFamily: "Arial Black, Arial, sans-serif",
  fontSize: "16px",
  color: "#17324d",
  stroke: "#ffffff",
  strokeThickness: 4,
  align: "center" as const,
};
const FAR_SIDE_HOUSE_KEYS = [
  "leo-house",
  "leo-house-yellow",
] as const;

const wheelTextureKey = (spec: VehicleSpec, index: number) => `wheel-${spec.textureKey}-${index}`;

/** Une paire corps + roues réutilisée par le pool de trafic : jamais créée ni détruite en cours de jeu. */
interface TrafficView {
  body: Phaser.GameObjects.Image;
  wheels: [Phaser.GameObjects.Image, Phaser.GameObjects.Image];
  spec: VehicleSpec | null;
  flipped: boolean;
}

interface PedestrianView {
  sprite: Phaser.GameObjects.Sprite;
  spec: PedestrianSpec;
  x: number;
  direction: 1 | -1;
  walked: number;
  gone: boolean;
}

interface DepthPedestrianView {
  sprite: Phaser.GameObjects.Sprite;
  spec: DepthPedestrianSpec;
  y: number;
  walked: number;
  gone: boolean;
}

export class LeoLivreurScene extends Phaser.Scene {
  private readonly onSnapshot: SnapshotListener;
  private car?: Phaser.GameObjects.Container;
  private body?: Phaser.GameObjects.Container;
  private sprites: Partial<Record<LeoVehicleSprite, Phaser.GameObjects.Image>> = {};
  private leoWheels: Record<"right" | "left", Phaser.GameObjects.Image[]> = { right: [], left: [] };
  private carShadow?: Phaser.GameObjects.Ellipse;
  private debugGuides?: Phaser.GameObjects.Graphics;
  private debugVehicle?: Phaser.GameObjects.Graphics;
  private debugText?: Phaser.GameObjects.Text;
  private traffic = new TrafficManager({ capacity: TRAFFIC_POOL_CAPACITY });
  private trafficViews: TrafficView[] = [];
  private governor = new DensityGovernor(initialLaneCap(900), { min: 1, max: MAX_LANE_CAP });
  private fixedLaneCap: number | null = null;
  /** Distance parcourue en px du monde (convertie en mètres à l affichage). */
  private travelledPx = 0;
  /** Contrôleur de feux commun : il ne rend jamais le vert à des mouvements incompatibles. */
  private readonly intersection = new IntersectionController();
  /** Même contrôleur que la zone 3, dédié aux trois carrefours du boulevard. */
  private readonly boulevardIntersection = new IntersectionController();
  private lightGraphics?: Phaser.GameObjects.Graphics;
  private mainHeads?: Phaser.GameObjects.Graphics;
  private mainHeadDrawn: LightState | null = null;
  private boulevardHeads?: Phaser.GameObjects.Graphics;
  private boulevardHeadDrawn: LightState | null = null;
  private readonly cross = new CrossTrafficManager({ capacity: CROSS_CAPACITY, specs: CROSS_SPECS });
  private crossViews?: CrossViews;
  // Rue des Jardins : une berline de face qui avance en profondeur, sans virage (expérience).
  private readonly depthTraffic = new DepthTraffic();
  private readonly depthSprites = new Map<number, Phaser.GameObjects.Image>();
  /** Roues tournantes de chaque vue de la berline : conteneur (aplatissement de l'ellipse) + disque (rotation). */
  private readonly depthWheels = new Map<number, Array<{ holder: Phaser.GameObjects.Container; disc: Phaser.GameObjects.Image }>>();
  private lightDrawn: LightState | null = null;
  private readonly signalJudge = new SignalJudge();
  private signalMessage: string | null = null;
  private signalMessageUntil = 0;
  private signalReadoutKey = "";
  private signalReadoutValue: ReturnType<typeof signalReadout> = null;
  /** Cadrage à anticipation : lissé, jamais appliqué aux coordonnées de la voiture. */
  private framing: Framing = { ratio: 0.3, zoomFactor: 1 };
  private lookDir: 1 | -1 = 1;
  private sceneryZones = new Map<number, Phaser.GameObjects.Container>();
  private roadZones = new Map<number, Phaser.GameObjects.Graphics>();
  private bridgeDecorZones = new Map<number, Phaser.GameObjects.GameObject[]>();
  private pedestrians: PedestrianView[] = [];
  private depthPedestrians: DepthPedestrianView[] = [];
  private lastZoneWindow = "";
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
  /** Rotation cumulée des roues de Léo (rad), positive = roulage vers l'avant du profil droit. */
  private wheelSpin = 0;
  private steeringPulseDirection: "left" | "right" | null = null;
  private steeringPulseUntil = 0;
  private deliveredCount = 0;
  private controls: Record<LeoLivreurControl, boolean> = {
    left: false,
    right: false,
    forward: false,
    brake: false,
    reverse: false,
  };

  /** Densité de pixels du rendu (pixels réels par pixel CSS) : nette sur les écrans de téléphone. */
  private readonly pixelRatio: number;

  /** Lots de ressources par zone : téléchargés à l'approche, libérés à l'éloignement (LEO-PERF-02). */
  private readonly assets = new ZoneAssetManager(
    (bundle) => this.fetchBundle(bundle),
    (callback, delay) => { this.time.delayedCall(delay, callback); },
    () => performance.now(),
    () => this.onAssetsChanged(),
  );
  /** Téléchargements en file : le chargeur de Phaser n'en traite qu'un à la fois. */
  private readonly loadQueue: Array<{ bundle: BundleId; resolve: () => void; reject: () => void }> = [];
  private loadingJob: { bundle: BundleId; resolve: () => void; reject: () => void; failed: boolean } | null = null;
  private assetsLoaded: number | null = 0;
  private assetsTotal: number | null = BUNDLE_TEXTURES.common.length;
  private assetsWaiting = false;
  /** Son du jeu (moteur, voitures qui passent, collisions, klaxon) : coupé tant que l'enfant ne l'active pas. */
  private readonly leoSound: LeoSound;
  /** Position de chaque voiture du trafic par rapport à Léo à l'image précédente : un changement de côté = un passage. */
  private readonly passSides = new Map<number, number>();
  private lastCrashAt = Number.NEGATIVE_INFINITY;

  constructor(onSnapshot: SnapshotListener, pixelRatio = 1, sound: LeoSound = new LeoSound()) {
    super({ key: "leo-livreur" });
    this.onSnapshot = onSnapshot;
    this.pixelRatio = pixelRatio;
    this.leoSound = sound;
  }

  preload() {
    // Démarrage : uniquement le lot commun (Léo, trafic, maisons, tablier). Le pont et la ville arrivent ensuite,
    // en arrière-plan, quand Léo s'en approche.
    for (const key of BUNDLE_TEXTURES.common) this.load.image(key, TEXTURE_URLS[key]);
    if (CROSS_TRAFFIC_ENABLED) {
      this.load.image("leo-cross-limousine", crossLimousineUrl);
      this.load.image("leo-cross-bus", crossBusUrl);
      this.load.image("leo-cross-suv", crossSuvUrl);
      this.load.image("leo-cross-sport", crossSportUrl);
      this.load.image("leo-cross-sedan", crossSedanUrl);
    }
    // Progression réelle : nombre d'images reçues sur le nombre demandé.
    this.load.on("progress", (value: number) => {
      this.assetsLoaded = Math.round(value * BUNDLE_TEXTURES.common.length);
      this.publish();
    });
  }

  create() {
    // Une image du démarrage a pu échouer : le gestionnaire la retélécharge (et la conduite attend).
    void this.assets.request("common");
    this.assetsLoaded = null;
    this.assetsTotal = null;
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      if (this.loadingJob && TEXTURE_URLS[file.key]) this.loadingJob.failed = true;
    });
    if (this.bundlePresent("common")) {
      for (const spec of [LEO_SPEC_RIGHT, LEO_SPEC_LEFT, ...TRAFFIC_SPECS, ...ACTIVE_CROSS_SPECS]) this.createWheelTextures(spec);
    }
    this.drawWorld();
    this.carShadow = this.add.ellipse(this.motion.x, this.motion.y + VEHICLE_WIDTH / 2 - 4, VEHICLE_LENGTH, 26, 0x3b241c, 0.3).setDepth(8);
    this.car = this.add.container(this.motion.x, this.motion.y).setDepth(10);
    this.body = this.add.container(0, 0);
    this.createLeoSprites();
    this.car.add(this.body);
    this.updateVehicleVisual();
    this.createTrafficViews();
    // Vraies illustrations seulement ; mode diagnostic (développement) : empreintes des véhicules non dessinés.
    if (CROSS_TRAFFIC_ENABLED) this.crossViews = new CrossViews(this, CROSS_CAPACITY, CROSS_SPECS, this.debugMode);
    this.governor = new DensityGovernor(initialLaneCap(this.scale.width / this.pixelRatio), { min: 1, max: MAX_LANE_CAP });
    if (this.debugMode) {
      const fixed = Number(new URLSearchParams(window.location.search).get("lanecap"));
      if (Number.isFinite(fixed) && fixed > 0) this.fixedLaneCap = Math.min(fixed, MAX_LANE_CAP);
      this.createDebugOverlay();
    }
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    // Suivi rigide : un lissage (lerp) fait continuer à défiler le décor après l'arrêt de Léo,
    // ce qui ressemble à un freinage élastique de tout le trafic.
    this.cameras.main.startFollow(this.car, true, 1, 1);
    if (this.debugMode) {
      // Dev uniquement : démarrer plus loin pour inspecter une zone (?debug&startx=7500).
      const startX = Number(new URLSearchParams(window.location.search).get("startx"));
      if (Number.isFinite(startX) && startX > 0) {
        this.motion = { ...this.motion, x: startX };
        this.syncCar();
      }
    }
    this.applyCameraZoom();
    // Le cadre peut changer de taille (fenêtre, téléphone qui tourne) : on recalcule l'échelle.
    this.scale.on("resize", () => this.applyCameraZoom());
    this.registerKeyboardControls();
    this.publish();
  }

  // --- Lots de ressources (LEO-PERF-02) ---------------------------------------------------------

  /** Le lot est-il utilisable ? Pour le pont et la ville, ce sont les textures dérivées qui comptent. */
  private bundlePresent(bundle: BundleId) {
    if (bundle === "common") return BUNDLE_TEXTURES.common.every((key) => this.textures.exists(key));
    if (bundle === "bridge") {
      return ["leo-world-bridge-rail", ...FADED_BRIDGE_KEYS].every((key) => this.textures.exists(key));
    }
    return [
      "leo-world-city-top", "leo-world-city-bottom", "leo-world-boulevard-zone4",
      ...PEDESTRIAN_SHEETS.map(([, textureKey]) => textureKey),
      ...SHEET_VIEWS.map((view) => turnTextureKey(view.angle)),
    ]
      .every((key) => this.textures.exists(key));
  }

  /** Télécharge ce qui manque d'un lot, puis prépare ses textures dérivées. */
  private fetchBundle(bundle: BundleId) {
    if (this.bundlePresent(bundle)) {
      this.prepareBundle(bundle);
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      this.loadQueue.push({ bundle, resolve, reject });
      this.pumpLoader();
    });
  }

  private pumpLoader() {
    if (this.loadingJob || this.load.isLoading()) return;
    const next = this.loadQueue.shift();
    if (!next) return;
    const missing = sourceTexturesFor(next.bundle).filter((key) => !this.textures.exists(key));
    this.loadingJob = { ...next, failed: false };
    for (const key of missing) this.load.image(key, TEXTURE_URLS[key]);
    this.load.once("complete", () => {
      const job = this.loadingJob;
      this.loadingJob = null;
      if (!job) return;
      const complete = sourceTexturesFor(job.bundle).every((key) => this.textures.exists(key));
      if (job.failed || !complete) job.reject();
      else {
        this.prepareBundle(job.bundle);
        job.resolve();
      }
      this.pumpLoader();
    });
    this.load.start();
  }

  /**
   * Textures dérivées d'un lot (fondus du pont, vues découpées de la berline), puis libération des images sources
   * devenues inutiles : 6 Mo (pont) et 5 Mo (planche) de mémoire graphique en moins.
   */
  private prepareBundle(bundle: BundleId) {
    if (bundle === "common") {
      for (const spec of [LEO_SPEC_RIGHT, LEO_SPEC_LEFT, ...TRAFFIC_SPECS, ...ACTIVE_CROSS_SPECS]) this.createWheelTextures(spec);
      this.restoreCommonVisuals();
      return;
    }
    if (bundle === "bridge") {
      if (this.textures.exists(BRIDGE_SOURCE_KEY)) {
        this.createFadedBridgeTexture();
        this.textures.remove(BRIDGE_SOURCE_KEY);
      }
      return;
    }
    if (this.textures.exists(TURN_SHEET.key)) {
      this.createTurnViewTextures();
      this.createWheelTextures(SEDAN_TURN_PROFILE);
      this.textures.remove(TURN_SHEET.key);
    }
    this.createPedestrianTextures();
    if (this.depthSprites.size === 0) {
      // Les 7 vues de la berline : ancrées au contact au sol de la roue avant gauche. Aucune rotation, aucun miroir.
      for (const view of SHEET_VIEWS) {
        this.depthSprites.set(view.angle, this.add.image(0, 0, turnTextureKey(view.angle)).setVisible(false));
        this.depthWheels.set(view.angle, (SHEET_WHEELS[view.angle] ?? []).map((_wheel, index) => {
          const disc = this.add.image(0, 0, turnWheelTextureKey(view.angle, index));
          return { holder: this.add.container(0, 0, [disc]).setVisible(false), disc };
        }));
      }
    }
    this.createPedestrians();
  }

  /** Convertit les trois planches transparentes en vraies planches Phaser à quatre images. */
  private createPedestrianTextures() {
    for (const [sheetKey, textureKey] of PEDESTRIAN_SHEETS) {
      if (this.textures.exists(textureKey) || !this.textures.exists(sheetKey)) continue;
      const source = this.textures.get(sheetKey).getSourceImage() as HTMLImageElement;
      this.textures.addSpriteSheet(textureKey, source, {
        frameWidth: PEDESTRIAN_FRAME.width,
        frameHeight: PEDESTRIAN_FRAME.height,
      });
    }
  }

  /** Les passants ne sont présents que lorsque le lot urbain est prêt, puis sont recyclés avec lui. */
  private createPedestrians() {
    if (this.pedestrians.length > 0) return;
    this.pedestrians = boulevardPedestrians().map((spec) => {
      const direction = (Math.sign(spec.speed) || 1) as 1 | -1;
      const sprite = this.add.sprite(spec.x, spec.groundY, spec.textureKey, PEDESTRIAN_FRAMES[spec.phase])
        .setOrigin(0.5, 1)
        .setScale(spec.scale)
        .setDepth(4);
      sprite.setFlipX(direction !== spec.nativeDirection);
      return { sprite, spec, x: spec.x, direction, walked: 0, gone: false };
    });
    this.depthPedestrians = boulevardDepthPedestrians().map((spec) => ({
      sprite: this.add.sprite(spec.x, spec.y, spec.textureKey, PEDESTRIAN_FRAMES[spec.phase])
        .setOrigin(0.5, 1)
        .setScale(spec.startScale)
        // Au-dessus du décor urbain (1.55–2), sous les véhicules (6+), pour rester lisible sans flotter.
        .setDepth(5.2),
      spec,
      y: spec.y,
      walked: 0,
      gone: false,
    }));
  }

  /** Marche régulière : déplacement horizontal et changement de pose, sans rebond ni mouvement vertical. */
  private updatePedestrians(seconds: number) {
    const pedestrianMayCross = this.boulevardIntersection.state.main === "RED";
    for (const pedestrian of this.pedestrians) {
      if (pedestrian.gone) continue;
      const speed = Math.abs(pedestrian.spec.speed);
      let distance = speed * seconds;
      const waitAt = pedestrian.spec.waitAtX;
      const reachesSignal = waitAt !== undefined && pedestrian.direction * (waitAt - pedestrian.x) >= 0
        && pedestrian.direction * (waitAt - (pedestrian.x + pedestrian.direction * distance)) < 0;
      if (reachesSignal && !pedestrianMayCross) {
        distance = Math.max(0, Math.abs(waitAt - pedestrian.x));
      }
      pedestrian.x += pedestrian.direction * distance;
      pedestrian.walked += distance;
      const reachedExit = pedestrian.direction * (pedestrian.x - pedestrian.spec.exitX) >= 0;
      const alpha = pedestrianExitAlpha(pedestrian.x, pedestrian.spec);
      if (reachedExit || alpha <= 0) {
        pedestrian.gone = true;
        pedestrian.sprite.setVisible(false);
        continue;
      }
      // Une foulée = environ 24 px : quatre poses réparties sur 6 px donnent une cadence liée à la vitesse.
      const frame = PEDESTRIAN_FRAMES[Math.floor(pedestrian.walked / 6) % PEDESTRIAN_FRAMES.length];
      pedestrian.sprite.setPosition(pedestrian.x, pedestrian.spec.groundY).setFrame(frame).setAlpha(alpha);
    }
    for (const pedestrian of this.depthPedestrians) {
      if (pedestrian.gone) continue;
      let distance = pedestrian.spec.speed * seconds;
      const reachesSignal = Math.sign(distance) * (pedestrian.spec.waitY - pedestrian.y) >= 0
        && Math.sign(distance) * (pedestrian.spec.waitY - (pedestrian.y + distance)) < 0;
      if (reachesSignal && !pedestrianMayCross) distance = pedestrian.spec.waitY - pedestrian.y;
      pedestrian.y += distance;
      pedestrian.walked += Math.abs(distance);
      const total = Math.abs(pedestrian.spec.exitY - pedestrian.spec.y);
      const progress = Math.min(1, Math.abs(pedestrian.y - pedestrian.spec.y) / total);
      const scale = Phaser.Math.Linear(pedestrian.spec.startScale, pedestrian.spec.endScale, progress);
      const alpha = Math.max(0, Math.min(1, Math.abs(pedestrian.spec.exitY - pedestrian.y) / 38));
      const reachedExit = Math.sign(pedestrian.spec.speed) * (pedestrian.y - pedestrian.spec.exitY) >= 0;
      if (reachedExit || alpha <= 0) {
        pedestrian.gone = true;
        pedestrian.sprite.setVisible(false);
        continue;
      }
      const frame = PEDESTRIAN_FRAMES[Math.floor(pedestrian.walked / 5) % PEDESTRIAN_FRAMES.length];
      pedestrian.sprite.setPosition(pedestrian.spec.x, pedestrian.y).setScale(scale).setAlpha(alpha).setFrame(frame);
    }
  }

  /**
   * Libère un lot : ses objets (décor, berline) sont détruits AVANT ses textures. Jamais si un véhicule du trafic
   * utilise encore une de ses textures (la berline reprise par l'avenue du Savoir).
   */
  private unloadBundle(bundle: BundleId) {
    if (bundle === "common") return false;
    if (bundle === "city") {
      const inUse = this.traffic.vehicles.some((vehicle) => vehicle.active && vehicle.spec === SEDAN_TURN_PROFILE);
      if (inUse) return false;
      this.depthTraffic.reset();
      for (const sprite of this.depthSprites.values()) sprite.destroy();
      for (const wheels of this.depthWheels.values()) for (const wheel of wheels) wheel.holder.destroy();
      this.depthSprites.clear();
      this.depthWheels.clear();
      for (const pedestrian of this.pedestrians) pedestrian.sprite.destroy();
      this.pedestrians = [];
      for (const pedestrian of this.depthPedestrians) pedestrian.sprite.destroy();
      this.depthPedestrians = [];
      for (const view of this.trafficViews) {
        if (view.spec === SEDAN_TURN_PROFILE) {
          view.spec = null;
          view.body.setVisible(false);
        }
      }
    }
    for (const key of derivedTexturesFor(bundle)) if (this.textures.exists(key)) this.textures.remove(key);
    for (const key of sourceTexturesFor(bundle)) if (this.textures.exists(key)) this.textures.remove(key);
    return this.assets.release(bundle);
  }

  private onAssetsChanged() {
    // Un lot arrivé ou parti : les zones visibles sont reconstruites avec les bonnes textures.
    this.rebuildZones();
    this.publish();
  }

  /** Les ressources de la vue manquent : la conduite est suspendue (jamais une zone vide traversée à l'aveugle). */
  private assetsBlocking() {
    const range = framedViewRange(this.motion.x, this.lookDir, this.framing, this.baseViewWidth());
    return !this.assets.isReady(bundlesForRange(range.minX - 300, range.maxX + 300));
  }

  /** Demande les lots qui approchent et libère ceux dont Léo s'est nettement éloigné. */
  private manageBundles() {
    const view = framedViewRange(this.motion.x, this.lookDir, this.framing, this.baseViewWidth());
    const direction = this.motion.speed * Math.cos(this.motion.heading) < 0 ? -1 : this.lookDir;
    const prefetch = prefetchRange(view, Math.abs(this.motion.speed), direction, this.assets.bandwidthBps);
    for (const bundle of bundlesForRange(prefetch.minX, prefetch.maxX)) void this.assets.request(bundle);
    const keep = keepRange(prefetch);
    const kept = new Set(bundlesForRange(keep.minX, keep.maxX));
    for (const bundle of ["bridge", "city"] as const) {
      if (!kept.has(bundle) && this.assets.state(bundle) === "ready") this.unloadBundle(bundle);
    }
  }

  retryAssets() {
    this.assets.retryFailed();
  }

  /**
   * Découpe des 7 vues de la berline dans la planche fournie : simple copie des pixels de l illustration, une texture
   * par vue. La vue 90° sert aussi de profil au trafic de l avenue du Savoir après le relais.
   */
  private createTurnViewTextures() {
    const sheet = this.textures.get(TURN_SHEET.key).getSourceImage() as CanvasImageSource;
    for (const view of SHEET_VIEWS) {
      const key = turnTextureKey(view.angle);
      if (this.textures.exists(key)) continue;
      const crop = sheetCrop(view);
      const texture = this.textures.createCanvas(key, crop.width, crop.height);
      if (!texture) continue;
      texture.getContext().drawImage(sheet, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      texture.refresh();
      // Disques de jante : l'ellipse de la vue est redressée en cercle ; à l'affichage, le conteneur la ré-aplatit,
      // si bien qu'en tournant la jante reste dans son ellipse (roue vue de biais).
      (SHEET_WHEELS[view.angle] ?? []).forEach((wheel, index) => {
        const wheelKey = turnWheelTextureKey(view.angle, index);
        if (this.textures.exists(wheelKey)) return;
        const size = Math.max(2, Math.round(wheel.ry * 2));
        const disc = this.textures.createCanvas(wheelKey, size, size);
        if (!disc) return;
        const context = disc.getContext();
        context.beginPath();
        context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        context.clip();
        context.drawImage(sheet, wheel.cx - wheel.rx, wheel.cy - wheel.ry, wheel.rx * 2, wheel.ry * 2, 0, 0, size, size);
        disc.refresh();
      });
    }
  }

  /**
   * Disque tournant = copie circulaire de la roue déjà dessinée dans l'illustration
   * (technique du masque). Il est posé exactement sur cette roue : on ne dessine
   * aucun pneu supplémentaire et on ne déforme pas la carrosserie.
   */
  private createWheelTextures(spec: VehicleSpec) {
    const source = this.textures.get(spec.textureKey).getSourceImage() as CanvasImageSource;
    spec.wheels.forEach(([cx, cy, r], index) => {
      const key = wheelTextureKey(spec, index);
      if (this.textures.exists(key)) return;
      const radius = wheelDiscSourceRadius(r);
      const texture = this.textures.createCanvas(key, radius * 2, radius * 2);
      if (!texture) return;
      const context = texture.getContext();
      context.beginPath();
      context.arc(radius, radius, radius, 0, Math.PI * 2);
      context.clip();
      context.drawImage(source, cx - radius, cy - radius, radius * 2, radius * 2, 0, 0, radius * 2, radius * 2);
      texture.refresh();
    });
  }

  /**
   * Masque les bords du panorama. Trois variantes : copies intérieures (recouvrement court),
   * première copie (long fondu d'entrée dans le village) et dernière (long fondu de sortie vers la ville).
   */
  private createFadedBridgeTexture() {
    const source = this.textures.get("leo-world-suspension-bridge-layer").getSourceImage() as HTMLImageElement;
    const width = source.naturalWidth;
    const height = source.naturalHeight;
    const variants: Array<[string, number, number]> = [
      ["leo-world-suspension-bridge-layer-faded", SHORT_FADE, SHORT_FADE],
      ["leo-world-suspension-bridge-layer-faded-start", BRIDGE_ENTRY_FADE, SHORT_FADE],
      ["leo-world-suspension-bridge-layer-faded-end", SHORT_FADE, BRIDGE_ENTRY_FADE],
    ];
    for (const [key, left, right] of variants) {
      if (this.textures.exists(key)) continue;
      const texture = this.textures.createCanvas(key, width, height);
      if (!texture) continue;
      const context = texture.getContext();
      context.drawImage(source, 0, 0, width, height);
      // La bande 42–61 % est la réservation exacte pour la chaussée du jeu.
      // Nettoyage de l'alpha généré : aucun faux tablier ne peut apparaître dedans.
      context.clearRect(0, height * 0.42, width, height * 0.19);
      context.globalCompositeOperation = "destination-in";
      const alpha = context.createLinearGradient(0, 0, width, 0);
      alpha.addColorStop(0, "rgba(255,255,255,0)");
      alpha.addColorStop(left, "rgba(255,255,255,1)");
      alpha.addColorStop(1 - right, "rgba(255,255,255,1)");
      alpha.addColorStop(1, "rgba(255,255,255,0)");
      context.fillStyle = alpha;
      context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = "source-over";
      texture.refresh();
    }
  }

  /**
   * Lot commun reçu après la création de la scène (reprise d'une image du démarrage) : les objets déjà créés portent
   * l'image de remplacement de Phaser et une taille calculée sur elle. Léo est donc recréé, et chaque vue du trafic
   * sera reconfigurée à sa prochaine mise à jour. Les zones (maison, tablier) sont reconstruites par onAssetsChanged.
   */
  private restoreCommonVisuals() {
    if (this.body) {
      this.body.removeAll(true);
      this.sprites = {};
      this.leoWheels = { right: [], left: [] };
      this.createLeoSprites();
      this.updateVehicleVisual();
    }
    for (const view of this.trafficViews) view.spec = null;
  }

  private createLeoSprites() {
    if (!this.body) return;
    const sides = { right: LEO_SPEC_RIGHT, left: LEO_SPEC_LEFT } as const;
    for (const side of ["right", "left"] as const) {
      const spec = sides[side];
      const display = vehicleDisplay(spec);
      // Le centre logique est le centre de la voie ; les pneus touchent le bord de l'empreinte.
      const image = this.add.image(0, display.offsetY, spec.textureKey)
        .setOrigin(display.origin.x, display.origin.y)
        .setDisplaySize(display.width, display.height)
        .setVisible(false);
      this.sprites[side] = image;
      this.body.add(image);
      this.leoWheels[side] = display.wheels.map((wheel, index) => {
        const disc = this.add.image(wheel.x, display.offsetY + wheel.y, wheelTextureKey(spec, index))
          .setDisplaySize(wheel.discRadius * 2, wheel.discRadius * 2)
          .setVisible(false);
        this.body?.add(disc);
        return disc;
      });
    }
    for (const end of ["front", "back"] as const) {
      const image = this.add.image(0, 0, `leo-car-${end}`)
        .setDisplaySize(END_SPRITE_SIZE.width, END_SPRITE_SIZE.height)
        .setVisible(false);
      this.sprites[end] = image;
      this.body.add(image);
    }
  }

  private createTrafficViews() {
    this.trafficViews = this.traffic.vehicles.map(() => {
      const body = this.add.image(0, 0, TRAFFIC_SPECS[0].textureKey).setVisible(false);
      const wheels = [0, 1].map(() => this.add.image(0, 0, wheelTextureKey(TRAFFIC_SPECS[0], 0)).setVisible(false)) as TrafficView["wheels"];
      return { body, wheels, spec: null, flipped: false };
    });
  }

  private baseZoom = 1;

  private applyCameraZoom() {
    // Le cadrage se calcule en pixels CSS (ce que voit l'enfant) ; le rendu, lui, est fait en pixels réels de
    // l'écran : le zoom est multiplié par la densité, la scène montre donc exactement la même portion du monde.
    this.baseZoom = cameraZoomFor(this.scale.width / this.pixelRatio, this.scale.height / this.pixelRatio) * this.pixelRatio;
    this.cameras.main.setZoom(this.baseZoom);
  }

  /** Sur le pont, la caméra regarde un peu plus haut : pylônes et lampadaires restent dans le cadre. */
  /** Largeur du monde visible avec le zoom de base de la zone, avant l'ajustement d'anticipation. */
  private baseViewWidth() {
    const profile = cameraProfile(this.motion.x, BRIDGE_CAMERA_OFFSET);
    return this.scale.width / (this.baseZoom * profile.zoomFactor);
  }

  /**
   * Caméra à anticipation : Léo à 30 % de l'écran (davantage de route devant), de l'autre côté en marche arrière,
   * sans rotation. Seul le décalage et le zoom de la caméra changent : les coordonnées du véhicule restent celles
   * du monde. À grande vitesse, le cadre s'élargit assez pour voir le feu avant la distance de freinage.
   */
  private updateBridgeCamera(seconds: number) {
    const profile = cameraProfile(this.motion.x, BRIDGE_CAMERA_OFFSET);
    const viewWidth = this.baseViewWidth();
    this.lookDir = lookDirection(this.lookDir, this.motion.speed * Math.cos(this.motion.heading));
    // Zoom fixe pour l’écran (jamais lié à la vitesse) ; seul le décalage de Léo dans le cadre suit la vitesse.
    const viewHeight = this.scale.height / (this.baseZoom * profile.zoomFactor);
    const target = steadyFraming(Math.abs(this.motion.speed), viewWidth, viewHeight);
    this.framing = {
      ratio: smoothToward(this.framing.ratio, target.ratio, 2.2, seconds),
      // Le zoom ne change qu'avec la taille de l'écran : appliqué tel quel, sans animation.
      zoomFactor: target.zoomFactor,
    };
    const zoom = this.baseZoom * profile.zoomFactor * this.framing.zoomFactor;
    const width = viewWidth / this.framing.zoomFactor;
    // Centre de la caméra = voiture + (0,5 - ratio) × largeur dans le sens de marche : Léo reste au ratio voulu.
    const shift = (0.5 - this.framing.ratio) * width * this.lookDir;
    this.cameras.main.setFollowOffset(-shift, profile.offset);
    this.cameras.main.setZoom(zoom);
  }

  update(_time: number, delta: number) {
    const seconds = Math.min(delta / 1000, 0.05);
    this.leoSound.update(pxToKmh(Math.abs(this.motion.speed)), this.controls.forward || this.controls.reverse, this.controls.brake, seconds);
    this.updateBridgeCamera(seconds);
    this.manageBundles();
    // Ressources de la vue absentes : tout le monde s'arrête (Léo, trafic, feux) jusqu'à leur arrivée.
    const waiting = this.assetsBlocking();
    if (waiting !== this.assetsWaiting) {
      this.assetsWaiting = waiting;
      this.publish();
    }
    if (waiting) {
      this.updateWorldZones();
      return;
    }
    this.judgeSignal(this.time.now);
    this.updateSignalReadout();
    this.updateWorldZones();
    if (this.motion.x > WORLD_WIDTH - 20_000) this.cameras.main.setBounds(0, 0, this.motion.x + 1_000_000, WORLD_HEIGHT);
    this.updateTraffic(seconds, delta);
    this.updatePedestrians(seconds);
    if (!this.car) return;
    const steeringPulseActive = this.time.now < this.steeringPulseUntil;
    const playerResuming = this.controls.forward || this.controls.reverse || this.controls.left || this.controls.right || steeringPulseActive;
    if (this.phase === "ARRIVED" && playerResuming) this.phase = "DRIVING";
    if (this.phase !== "DRIVING") return;
    const previousSpeed = this.motion.speed;
    const pulseActive = this.time.now < this.steeringPulseUntil;
    const input: LeoMotionInput = {
      ...this.controls,
      left: this.controls.left || (pulseActive && this.steeringPulseDirection === "left"),
      right: this.controls.right || (pulseActive && this.steeringPulseDirection === "right"),
    };
    const previousX = this.motion.x;
    const previousY = this.motion.y;
    // Léo ne traverse jamais un véhicule : le trafic compte comme un obstacle, comme un bord de route.
    this.motion = updateLeoMotion(this.motion, input, delta / 1000, (pose) =>
      this.traffic.blocksPose(pose, VEHICLE_LENGTH, VEHICLE_WIDTH),
    // La vitesse s'adapte au trafic : libre = pleine vitesse, véhicule devant = on s'aligne dessus.
    this.traffic.leoSpeedCap(this.motion));
    const moved = Math.hypot(this.motion.x - previousX, this.motion.y - previousY);
    this.travelledPx += moved;
    this.detectCollision(previousSpeed, moved, seconds);
    // Δθ = Δdistance / r, signé : négatif en marche arrière, nul à l'arrêt.
    this.wheelSpin += rollAngle(this.motion.speed * seconds, vehicleDisplay(LEO_SPEC_RIGHT).wheels[0].rollRadius);
    this.syncCar();

    if (this.canDeliverNow()) {
      this.phase = "ARRIVED";
      this.publish();
    } else if (previousSpeed !== this.motion.speed) {
      this.publish();
    }
  }

  /**
   * Choc : Léo roulait mais n'a presque pas avancé (la physique l'a fait rebondir contre une voiture ou le bord de la
   * route). La physique n'est pas modifiée : on constate seulement le rebond. Un choc toutes les 0,9 s au plus, pour
   * qu'un frottement prolongé ne répète pas le son.
   */
  private detectCollision(previousSpeed: number, moved: number, seconds: number) {
    const kmh = pxToKmh(Math.abs(previousSpeed));
    if (kmh < MIN_COLLISION_KMH || moved > Math.abs(previousSpeed) * seconds * 0.35) return;
    if (this.time.now - this.lastCrashAt < COLLISION_COOLDOWN_MS) return;
    this.lastCrashAt = this.time.now;
    this.leoSound.crash(kmh);
  }

  /** Une voiture du trafic qui croise Léo (elle change de côté par rapport à lui) se fait entendre en passant. */
  private listenToTraffic(seconds: number) {
    for (const vehicle of this.traffic.vehicles) {
      if (!vehicle.active) {
        this.passSides.delete(vehicle.id);
        continue;
      }
      const relative = vehicle.x - this.motion.x;
      const before = this.passSides.get(vehicle.id);
      this.passSides.set(vehicle.id, relative);
      if (before === undefined || Math.sign(before) === Math.sign(relative)) continue;
      const lateral = Math.abs(laneY(vehicle.lane) - this.motion.y);
      const closing = Math.abs(relative - before) / Math.max(seconds, 0.001);
      if (lateral > PASS_HEARING_DISTANCE || closing < kmhToPx(MIN_PASS_KMH)) continue;
      this.leoSound.passBy(relative > before ? 1 : -1, passerPitch(vehicle.spec.kind, vehicle.id), 1 - lateral / PASS_HEARING_DISTANCE);
    }
  }

  /** Bouton Son : à appeler depuis le clic (le navigateur n'autorise le son qu'après un geste). */
  setSound(on: boolean) {
    return this.leoSound.setEnabled(on);
  }

  horn(active: boolean) {
    if (active) this.leoSound.hornOn();
    else this.leoSound.hornOff();
  }

  setSoundPaused(paused: boolean) {
    this.leoSound.setPaused(paused);
  }

  destroySound() {
    this.leoSound.destroy();
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
    this.phase = "DRIVING";
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
    this.travelledPx = 0;
    this.traffic.reset();
    this.cross.reset();
    this.depthTraffic.reset();
    this.intersection.reset();
    this.boulevardIntersection.reset();
    this.intersection.reset();
    this.signalJudge.reset();
    this.signalReadoutKey = "";
    this.signalReadoutValue = null;
    this.signalMessage = null;
    this.signalMessageUntil = 0;
    this.controls = { left: false, right: false, forward: false, brake: false, reverse: false };
    this.syncCar();
    this.publish();
  }

  setControl(control: LeoLivreurControl, active: boolean) {
    this.controls[control] = active;
  }

  turn(direction: "left" | "right") {
    if (this.phase === "ARRIVED") this.phase = "DRIVING";
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
    bind("keydown-SPACE", "brake", true);
    bind("keyup-SPACE", "brake", false);
    bind("keydown-R", "reverse", true);
    bind("keyup-R", "reverse", false);
    keyboard.on("keydown-H", () => this.horn(true));
    keyboard.on("keyup-H", () => this.horn(false));
    if (this.debugMode) {
      keyboard.on("keydown-G", () => {
        this.debugRectangle = !this.debugRectangle;
        this.syncCar();
      });
    }
  }

  private currentDestination() {
    return destinationForDelivery(this.deliveredCount);
  }

  private canDeliverNow() {
    return canDeliver(this.motion.x, this.motion.y, this.motion.speed, this.deliveredCount);
  }

  private publish() {
    const destination = this.currentDestination();
    const failed = this.assets.failed().length > 0;
    const loading = this.assetsTotal !== null || this.assetsWaiting || this.assets.state("common") !== "ready";
    this.onSnapshot({
      assets: failed ? "error" : loading ? "loading" : "ready",
      assetsLoaded: this.assetsLoaded,
      assetsTotal: this.assetsTotal,
      phase: this.phase,
      speedKmh: Math.round(pxToKmh(Math.abs(this.motion.speed))),
      heading: this.motion.heading,
      steering: Math.round(Phaser.Math.RadToDeg(this.motion.steeringAngle)),
      cargo: Math.max(0, DESTINATIONS.length - this.deliveredCount % DESTINATIONS.length),
      targetCargo: DESTINATIONS.length,
      distanceToHouse: Math.round(pxToMeters(distanceTo(this.motion.x, this.motion.y, destination.stop))),
      targetLabel: destination.label,
      travelledMeters: Math.round(pxToMeters(this.travelledPx)),
      routeLengthMeters: ROUTE_LENGTH_METERS,
      signalState: this.signalReadoutValue ? this.signalReadoutValue.state : this.signalMessage !== null || this.inCityLight() ? this.intersection.state.main : null,
      signalMessage: this.signalMessage,
      signalDistance: this.signalReadoutValue?.distance ?? null,
      signalPrepare: this.signalReadoutValue?.prepare ?? false,
    });
  }

  private drawWorld() {
    this.updateWorldZones();
  }

  /** Détruit tous les objets de zone : ils sont recréés avec les textures disponibles. */
  private rebuildZones() {
    for (const zone of this.sceneryZones.values()) zone.destroy(true);
    for (const road of this.roadZones.values()) road.destroy();
    for (const decor of this.bridgeDecorZones.values()) decor.forEach((image) => image.destroy());
    this.sceneryZones.clear();
    this.roadZones.clear();
    this.bridgeDecorZones.clear();
    this.lastZoneWindow = "";
  }

  /** Fenêtre glissante : objets monde créés et détruits avec les zones ; textures gérées par lots (manageBundles). */
  private updateWorldZones() {
    const range = framedViewRange(this.motion.x, this.lookDir, this.framing, this.baseViewWidth());
    const wanted = zonesToKeep(this.motion.x, range.minX, range.maxX);
    const wantedSet = new Set(wanted);
    const signature = wanted.join(",");
    if (signature === this.lastZoneWindow) return;
    this.lastZoneWindow = signature;
    for (const [id, zone] of this.sceneryZones) {
      if (wantedSet.has(id)) continue;
      zone.destroy(true);
      this.sceneryZones.delete(id);
      this.roadZones.get(id)?.destroy();
      this.roadZones.delete(id);
      this.bridgeDecorZones.get(id)?.forEach((image) => image.destroy());
      this.bridgeDecorZones.delete(id);
    }
    for (const id of wanted) {
      if (this.sceneryZones.has(id)) continue;
      this.sceneryZones.set(id, this.createWorldZone(id));
      this.roadZones.set(id, this.createRoadZone(id));
      this.bridgeDecorZones.set(id, this.createBridgeDecorZone(id));
    }
  }

  /** Chaussée au niveau scène, au-dessus de toutes les décos groupées par zone. */
  private createRoadZone(id: number) {
    const { startX, endX } = zoneForWorldX(id * WORLD_ZONE_WIDTH);
    const road = this.add.graphics().setDepth(0);
    road.fillStyle(ROAD_SURFACE_COLOR, 1);
    road.fillRect(startX, ROAD_Y - ROAD_HALF_WIDTH, endX - startX, ROAD_WIDTH);
    return road;
  }

  /** Léo est-il dans la zone où le feu est visible et utile ? */
  private inCityLight() {
    const city = cityLayout();
    return this.motion.x > city.stopLineEast - 900 && this.motion.x < city.stopLineWest + 400;
  }

  /** Tête de feu : boîtier opaque posé sur celui de l'illustration, avec la lampe de l'état courant allumée. */
  private drawLight(state: LightState) {
    const g = this.lightGraphics;
    if (!g || !g.active || this.lightDrawn === state) return;
    this.lightDrawn = state;
    const city = cityLayout();
    g.clear();
    const w = city.lightWidth + 4;
    const h = city.lightHeight + 4;
    g.fillStyle(0x1d2430, 1).fillRoundedRect(city.lightX - w / 2, city.lightY - h / 2, w, h, 9);
    g.lineStyle(3, 0x0b0f16, 1).strokeRoundedRect(city.lightX - w / 2, city.lightY - h / 2, w, h, 9);
    const lamps: Array<[LightState, number, number]> = [
      ["RED", city.lampOffsets.red, 0xff3b30],
      ["YELLOW", city.lampOffsets.yellow, 0xffc21a],
      ["GREEN", city.lampOffsets.green, 0x2ee06b],
    ];
    for (const [lamp, offset, color] of lamps) {
      const lit = lamp === state;
      const y = city.lightY + offset;
      if (lit) g.fillStyle(color, 0.28).fillCircle(city.lightX, y, city.lampOffsets.radius * 1.9);
      g.fillStyle(lit ? color : 0x39414d, 1).fillCircle(city.lightX, y, city.lampOffsets.radius);
      if (lit) g.fillStyle(0xffffff, 0.55).fillCircle(city.lightX - 3, y - 3, city.lampOffsets.radius * 0.35);
    }
  }

  /**
   * Feux de l'avenue principale, posés sur le trottoir au niveau des deux lignes d'arrêt : un poteau et une tête
   * à trois lampes dont la lampe allumée est celle de l'état de l'avenue (le même que pour Léo).
   */
  private drawMainHeads(state: LightState) {
    const g = this.mainHeads;
    if (!g || !g.active || this.mainHeadDrawn === state) return;
    this.mainHeadDrawn = state;
    const city = cityLayout();
    g.clear();
    const roadTop = ROAD_Y - ROAD_HALF_WIDTH;
    for (const x of [city.stopLineEast - 26, city.stopLineWest + 26]) {
      g.fillStyle(0x1d2430, 1).fillRect(x - 3, roadTop - 62, 6, 62);
      g.fillStyle(0x1d2430, 1).fillRoundedRect(x - 15, roadTop - 150, 30, 92, 7);
      g.lineStyle(2, 0x0b0f16, 1).strokeRoundedRect(x - 15, roadTop - 150, 30, 92, 7);
      const lamps: Array<[LightState, number, number]> = [["RED", -132, 0xff3b30], ["YELLOW", -104, 0xffc21a], ["GREEN", -76, 0x2ee06b]];
      for (const [lamp, offset, color] of lamps) {
        const lit = lamp === state;
        if (lit) g.fillStyle(color, 0.28).fillCircle(x, roadTop + offset, 17);
        g.fillStyle(lit ? color : 0x39414d, 1).fillCircle(x, roadTop + offset, 9);
      }
    }
  }

  /** Les têtes dessinées sur le panorama de zone 4 sont recouvertes par leur état réel. */
  private drawBoulevardHeads(state: LightState) {
    const g = this.boulevardHeads;
    if (!g || !g.active || this.boulevardHeadDrawn === state) return;
    this.boulevardHeadDrawn = state;
    g.clear();
    for (const signal of boulevardSignals()) {
      const w = 42;
      const h = 88;
      g.fillStyle(0x1d2430, 1).fillRoundedRect(signal.x - w / 2, signal.y - h / 2, w, h, 8);
      g.lineStyle(3, 0x0b0f16, 1).strokeRoundedRect(signal.x - w / 2, signal.y - h / 2, w, h, 8);
      const lamps: Array<[LightState, number, number]> = [["RED", -25, 0xff3b30], ["YELLOW", 0, 0xffc21a], ["GREEN", 25, 0x2ee06b]];
      for (const [lamp, offset, color] of lamps) {
        const lit = lamp === state;
        if (lit) g.fillStyle(color, 0.28).fillCircle(signal.x, signal.y + offset, 16);
        g.fillStyle(lit ? color : 0x39414d, 1).fillCircle(signal.x, signal.y + offset, 8);
      }
    }
  }

  /**
   * Indicateur d'approche : distance jusqu'à la ligne d'arrêt, dans les mêmes unités que le compteur. On ne republie
   * que lorsque ce qui est affiché change (dizaine de mètres, état du feu, consigne).
   */
  private updateSignalReadout() {
    const city = cityLayout();
    const east = Math.abs(this.motion.heading) < 1;
    const front = this.motion.x + VEHICLE_LENGTH / 2;
    const state = this.intersection.state.main;
    const readout = east ? signalReadout(front, city.stopLineEast, state, Math.abs(this.motion.speed)) : null;
    const key = readout ? `${readout.distance}|${readout.state}|${readout.prepare}` : "";
    if (key === this.signalReadoutKey) return;
    this.signalReadoutKey = key;
    this.signalReadoutValue = readout;
    this.publish();
  }

  /** Léo face au feu : messages pédagogiques, sans aucune sanction mécanique. */
  private judgeSignal(now: number) {
    const city = cityLayout();
    const east = Math.abs(this.motion.heading) < 1;
    const front = this.motion.x + VEHICLE_LENGTH / 2;
    let event: SignalEvent = null;
    if (east && front > city.stopLineEast - 700 && front < city.stopLineEast + 200) {
      event = this.signalJudge.update(this.intersection.state.main, front, this.motion.speed, city.stopLineEast);
    }
    if (event) {
      this.signalMessage = SIGNAL_MESSAGES[event];
      this.signalMessageUntil = now + 5000;
      this.publish();
    } else if (this.signalMessage && now > this.signalMessageUntil) {
      this.signalMessage = null;
      this.publish();
    }
  }

  /**
   * Décor de la route, par zone. La chaussée dessinée (asphalte, lignes, trottoirs) est la même
   * dans TOUTES les zones : le joueur ne voit jamais la route changer. Le pont ajoute seulement
   * des calques (garde-corps, arches, rivière, ciel) qui apparaissent et disparaissent en fondu,
   * si bien que village et pont forment une seule scène continue.
   * Les repères (ROAD_Y, voies, collisions) restent ceux de leoGeometry.
   */
  private createBridgeDecorZone(id: number) {
    const { startX, endX, kind } = zoneForWorldX(id * WORLD_ZONE_WIDTH);
    const layout = bridgeLayout();
    const objects: Phaser.GameObjects.GameObject[] = [];
    const bridgeStartX = 3 * WORLD_ZONE_WIDTH;
    const bridgeEndX = 5 * WORLD_ZONE_WIDTH;
    const ramp = layout.suspensionWidth * BRIDGE_ENTRY_FADE;

    /**
     * Pose une bande de texture répétée, entre a et b, restreinte à cette zone : chaque zone ne dessine
     * que sa part, donc aucune tuile n'est dupliquée ni coupée quand une zone voisine disparaît.
     */
    const strip = (
      key: string, anchor: number, tileWidth: number, scale: number,
      crop: { y: number; h: number }, topOfFrame: number, depth: number, a: number, b: number, alpha = 1,
    ) => {
      const from = Math.max(a, startX);
      const to = Math.min(b, endX);
      if (to <= from) return;
      for (let index = Math.floor((from - anchor) / tileWidth); anchor + index * tileWidth < to; index += 1) {
        const tileX = anchor + index * tileWidth;
        const x0 = Math.max(from, tileX);
        const x1 = Math.min(to, tileX + tileWidth);
        if (x1 <= x0) continue;
        objects.push(this.add.image(tileX, topOfFrame, key)
          .setOrigin(0, 0)
          .setScale(scale)
          .setCrop((x0 - tileX) / scale, crop.y, (x1 - x0) / scale, crop.h)
          .setAlpha(alpha)
          .setDepth(depth));
      }
    };
    /** Même bande, mais fondue : l'opacité monte (ou descend) par petits pas de 40 px. */
    const fadedStrip = (
      key: string, anchor: number, tileWidth: number, scale: number,
      crop: { y: number; h: number }, topOfFrame: number, depth: number, a: number, b: number,
    ) => {
      const inEnd = a + ramp;
      const outStart = b - ramp;
      if (outStart > inEnd) strip(key, anchor, tileWidth, scale, crop, topOfFrame, depth, inEnd, outStart);
      const step = 40;
      for (let x = a; x < Math.min(inEnd, b); x += step) {
        const alpha = Math.max(0.04, Math.min(1, (x + step / 2 - a) / ramp));
        strip(key, anchor, tileWidth, scale, crop, topOfFrame, depth, x, Math.min(x + step, inEnd), alpha);
      }
      for (let x = Math.max(outStart, inEnd); x < b; x += step) {
        const alpha = Math.max(0.04, Math.min(1, (b - (x + step / 2)) / ramp));
        strip(key, anchor, tileWidth, scale, crop, topOfFrame, depth, x, Math.min(x + step, b), alpha);
      }
    };

    // 3. Tablier : trottoir arrière, chaussée à lignes, trottoir avant — continu sur tout le monde.
    strip("leo-world-bridge-deck", 0, layout.deckTileWidth, layout.deckScale,
      { y: DECK.firstRow, h: DECK.lastRow - DECK.firstRow + 1 }, layout.deckTop - DECK.firstRow * layout.deckScale, 1,
      startX, endX);

    if (this.assets.state("city") === "ready") {
      this.addCityDecor(objects, strip, startX, endX);
      this.addBoulevardDecor(objects, strip, startX, endX);
    }

    if (endX <= bridgeStartX || startX >= bridgeEndX) return objects;
    // Pont pas encore téléchargé : aucune texture manquante affichée (la conduite attend le lot, voir assetsBlocking).
    if (this.assets.state("bridge") !== "ready") return objects;

    // Garde-corps arrière (lampadaires, jardinières) derrière les véhicules, avant devant eux : en fondu.
    fadedStrip("leo-world-bridge-rail", bridgeStartX, layout.railTileWidth, layout.railScale,
      { y: RAIL.lampTopRow - 4, h: RAIL.baseRow - RAIL.lampTopRow + 6 }, layout.backRailBase - RAIL.baseRow * layout.railScale, 2,
      bridgeStartX, bridgeEndX);
    fadedStrip("leo-world-bridge-rail", bridgeStartX, layout.railTileWidth, layout.railScale,
      { y: RAIL.wallTopRow, h: RAIL.baseRow - RAIL.wallTopRow + 6 }, layout.frontRailBase - RAIL.baseRow * layout.railScale, 11,
      bridgeStartX, bridgeEndX);

    // Calque de suspension : partie haute (pylônes, câbles) derrière, partie basse (arches, rivière) sous le tablier.
    if (kind === "bridge") {
      const width = layout.suspensionWidth;
      const span = bridgeEndX - bridgeStartX;
      const step = width * 0.76;
      const copies = Math.max(2, Math.ceil((span - width) / step) + 1);
      const copyStep = (span - width) / (copies - 1);
      const height = SUSPENSION.height;
      for (let copy = 0; copy < copies; copy += 1) {
        const imageX = bridgeStartX + copy * copyStep;
        // Une seule zone propriétaire par copie.
        if (imageX < startX || imageX >= endX) continue;
        const texture = copy === 0
          ? "leo-world-suspension-bridge-layer-faded-start"
          : copy === copies - 1 ? "leo-world-suspension-bridge-layer-faded-end" : "leo-world-suspension-bridge-layer-faded";
        const topRows = SUSPENSION.topEnd * height;
        objects.push(this.add.image(imageX, layout.topPartBottom - topRows * layout.suspensionScale, texture)
          .setOrigin(0, 0)
          .setScale(layout.suspensionScale)
          .setCrop(0, 0, SUSPENSION.width, topRows)
          .setDepth(-4));
        const bottomRows = SUSPENSION.bottomStart * height;
        objects.push(this.add.image(imageX, layout.bottomPartTop - bottomRows * layout.suspensionScale, texture)
          .setOrigin(0, 0)
          .setScale(layout.suspensionScale)
          .setCrop(0, bottomRows, SUSPENSION.width, height - bottomRows)
          .setDepth(-4));
      }
    }
    return objects;
  }

  /**
   * Zone 3 : l'illustration de référence est découpée en deux ressources (haut et bas) ; la chaussée du jeu
   * reste celle du tablier. Le panneau commence AVANT la fin du pont et se fond dans le calque du pont :
   * jamais de bande verte vide, jamais deux routes superposées.
   */
  private addCityDecor(
    objects: Phaser.GameObjects.GameObject[],
    strip: (
      key: string, anchor: number, tileWidth: number, scale: number,
      crop: { y: number; h: number }, topOfFrame: number, depth: number, a: number, b: number, alpha?: number,
    ) => void,
    startX: number,
    endX: number,
  ) {
    const city = cityLayout();
    if (endX <= city.panelX - CITY_FADE || startX >= city.panelEnd + CITY_FADE) return;
    const step = 40;
    const fadeStrip = (key: string, topOfFrame: number, cropY: number, cropH: number, depth: number) => {
      const from = city.panelX;
      const to = city.panelEnd;
      const inEnd = from + CITY_FADE;
      // La zone 4 recouvre les 300 derniers pixels de ce panneau. On garde donc la zone 3
      // totalement opaque jusqu'à son bord droit ; le panneau suivant passe devant en fondu.
      // Ainsi, la somme des opacités ne tombe jamais sous 1 et aucun ciel bleu ne transparaît.
      strip(key, from, city.panelWidth, city.scale, { y: cropY, h: cropH }, topOfFrame, depth, inEnd, to);
      for (let x = from; x < inEnd; x += step) {
        const alpha = Math.max(0.03, Math.min(1, (x + step / 2 - from) / CITY_FADE));
        strip(key, from, city.panelWidth, city.scale, { y: cropY, h: cropH }, topOfFrame, depth, x, Math.min(x + step, inEnd), alpha);
      }
    };
    // Ciel plein sous le fondu croisé pont → ville : pas de trou vert pendant la transition.
    const from = Math.max(startX, city.panelX - 430);
    const to = Math.min(endX, city.panelX + CITY_FADE);
    if (to > from) {
      const sky = this.add.graphics().setDepth(-4.6);
      sky.fillStyle(SKY_COLOR, 1).fillRect(from, 0, to - from, city.topBottom);
      objects.push(sky);
    }
    fadeStrip("leo-world-city-top", city.topY, 0, CITY_REF.topRows, 1.5);
    fadeStrip("leo-world-city-bottom", city.bottomTop, 0, CITY_REF.bottomRows, 1.5);

    // Lignes d'arrêt (une par sens) sur la chaussée du jeu, dans la voie concernée.
    const lines = this.add.graphics().setDepth(1.2);
    const roadTop = ROAD_Y - ROAD_HALF_WIDTH;
    const laneInner = 8;
    if (city.stopLineEast >= startX - 20 && city.stopLineEast < endX) {
      lines.fillStyle(0xffffff, 0.95).fillRect(city.stopLineEast, ROAD_Y + laneInner, 9, ROAD_HALF_WIDTH - laneInner - 4);
    }
    if (city.stopLineWest >= startX - 20 && city.stopLineWest < endX) {
      lines.fillStyle(0xffffff, 0.95).fillRect(city.stopLineWest, roadTop + 4, 9, ROAD_HALF_WIDTH - laneInner - 4);
    }
    objects.push(lines);

    // Tête du feu tricolore : l'état est dessiné par Léo-jeu, pas par l'image.
    if (city.lightX >= startX && city.lightX < endX) {
      this.mainHeads = this.add.graphics().setDepth(3);
      this.mainHeadDrawn = null;
      objects.push(this.mainHeads);
      this.lightGraphics = this.add.graphics().setDepth(3);
      this.lightDrawn = null;
      objects.push(this.lightGraphics);
      this.drawLight(this.intersection.state.side);
    }
  }

  /**
   * Zone 4 : le panorama fourni est utilisé sans sa chaussée peinte. Le haut et la promenade du bas
   * encadrent donc la route continue du moteur ; un fondu court le raccorde à l'entrée de ville puis
   * au quartier résidentiel suivant. Les trois boîtiers sont redessinés par Phaser afin d'afficher
   * leur cycle réel et d'arrêter le trafic à leurs lignes.
   */
  private addBoulevardDecor(
    objects: Phaser.GameObjects.GameObject[],
    strip: (
      key: string, anchor: number, tileWidth: number, scale: number,
      crop: { y: number; h: number }, topOfFrame: number, depth: number, a: number, b: number, alpha?: number,
    ) => void,
    startX: number,
    endX: number,
  ) {
    const boulevard = boulevardLayout();
    if (endX <= boulevard.panelX - BOULEVARD_FADE || startX >= boulevard.panelEnd + BOULEVARD_FADE) return;
    const step = 40;
    const drawSlice = (a: number, b: number, alpha = 1) => {
      strip(
        "leo-world-boulevard-zone4",
        boulevard.panelX,
        boulevard.panelWidth,
        boulevard.scale,
        { y: 0, h: BOULEVARD_REF.topRows },
        boulevard.topY,
        1.55,
        a,
        b,
        alpha,
      );
      strip(
        "leo-world-boulevard-zone4",
        boulevard.panelX,
        boulevard.panelWidth,
        boulevard.scale,
        { y: BOULEVARD_REF.bottomStartRow, h: BOULEVARD_REF.bottomRows },
        boulevard.bottomOriginY,
        1.55,
        a,
        b,
        alpha,
      );
    };
    const inEnd = boulevard.panelX + BOULEVARD_FADE;
    const outStart = boulevard.panelEnd - BOULEVARD_FADE;
    drawSlice(inEnd, outStart);
    for (let x = boulevard.panelX; x < inEnd; x += step) {
      const alpha = Math.max(0.03, Math.min(1, (x + step / 2 - boulevard.panelX) / BOULEVARD_FADE));
      drawSlice(x, Math.min(x + step, inEnd), alpha);
    }
    for (let x = outStart; x < boulevard.panelEnd; x += step) {
      const alpha = Math.max(0.03, Math.min(1, (boulevard.panelEnd - (x + step / 2)) / BOULEVARD_FADE));
      drawSlice(x, Math.min(x + step, boulevard.panelEnd), alpha);
    }
    // Le panorama s'arrête avant la limite verticale du monde. On prolonge son herbe
    // sous la promenade, plutôt que de laisser apparaître le vert générique de la scène.
    const grass = this.add.graphics().setDepth(1.5);
    // Dégradé raccordé à la dernière rangée d'herbe : aucune bande uniforme ne révèle la hauteur mobile.
    grass.fillGradientStyle(0x8fbd4c, 0x8fbd4c, 0x8da502, 0x8da502, 1, 1, 1, 1).fillRect(
      Math.max(startX, boulevard.panelX),
      boulevard.bottomEnd - 2,
      Math.min(endX, boulevard.panelEnd) - Math.max(startX, boulevard.panelX),
      WORLD_HEIGHT - boulevard.bottomEnd + 2,
    );
    objects.push(grass);
    const signals = boulevardSignals().filter((signal) => signal.x >= startX && signal.x < endX);
    if (signals.length === 0) return;
    const lines = this.add.graphics().setDepth(1.2);
    const roadTop = ROAD_Y - ROAD_HALF_WIDTH;
    for (const signal of signals) {
      lines.fillStyle(0xffffff, 0.95).fillRect(signal.stopLineEast, ROAD_Y + 8, 8, ROAD_HALF_WIDTH - 12);
      lines.fillStyle(0xffffff, 0.95).fillRect(signal.stopLineWest, roadTop + 4, 8, ROAD_HALF_WIDTH - 12);
    }
    objects.push(lines);
    this.boulevardHeads = this.add.graphics().setDepth(3);
    this.boulevardHeadDrawn = null;
    objects.push(this.boulevardHeads);
    this.drawBoulevardHeads(this.boulevardIntersection.state.main);
  }

  private addNearSideHouse(container: Phaser.GameObjects.Container, x: number, address: number, sidewalkEdge: number) {
    const plotIndex = address / 2 - 1;
    const direction = plotIndex % 3 === 1 ? -1 : 1;
    // Sur les 300 lignes du PNG, la silhouette occupe les lignes 19 à 282.
    const visibleTop = 19 / 300;
    const visibleHeight = 264 / 300;
    const height = Math.min(176 - (plotIndex % 3) * 3, (WORLD_HEIGHT - sidewalkEdge - 2) / visibleHeight);
    const top = sidewalkEdge + 1 - height * visibleTop;
    const plot = this.add.image(x, top, "leo-house-near-side").setOrigin(0.5, 0).setFlipX(direction < 0);
    plot.setDisplaySize(Math.min(305, height * (plot.width / plot.height) * 1.10), height);

    // Ancrages du portillon et du poteau, mesurés dans le sprite.
    const gateX = x + direction * plot.displayWidth * 0.274;
    const gateY = top + height * 0.29;
    const garden = this.add.graphics();
    garden.fillStyle(0xd9b998, 1).fillPoints([
      new Phaser.Math.Vector2(gateX + direction * 15 - 7, sidewalkEdge),
      new Phaser.Math.Vector2(gateX + direction * 15 + 7, sidewalkEdge),
      new Phaser.Math.Vector2(gateX + 7, gateY),
      new Phaser.Math.Vector2(gateX - 7, gateY),
    ], true);
    container.add([garden, plot]);

    const signX = x + direction * plot.displayWidth * 0.33;
    const signY = top + height * 0.254;
    container.add([
      this.add.rectangle(signX, signY, 26, 20, 0xfff4cf).setStrokeStyle(2, 0x2d5270),
      this.add.text(signX, signY, String(address), { ...HOUSE_SIGN_STYLE, fontSize: "16px" }).setOrigin(0.5),
    ]);
  }

  /** Arbres et massifs du côté de Léo, entre les jardins. `variant` choisit taille, sens et fleurs (stable par arbre). */
  private addNearSidePlanting(
    container: Phaser.GameObjects.Container, sidewalkEdge: number, trees: readonly { x: number; variant: number }[],
  ) {
    const shadows = this.add.graphics();
    container.add(shadows);
    for (const { x, variant: index } of trees) {
      const treeBase = WORLD_HEIGHT - [2, 6, 5, 3][index % 4];
      const crownTop = sidewalkEdge + [3, 8, 17, 6][index % 4];
      const tree = this.add.image(x, treeBase, "leo-tree").setOrigin(0.5, 1);
      tree.setScale((treeBase - crownTop) / tree.height).setFlipX(index % 2 === 1);
      shadows.fillStyle(0x304d24, 0.2).fillEllipse(x + 16, treeBase - 8, tree.displayWidth * 0.55, 15);
      container.add(tree);

      const direction = index % 2 === 0 ? 1 : -1;
      const flowers = this.add.image(x + direction * 51, treeBase - 13, "leo-flowers-near-side").setOrigin(0.5, 1);
      const width = 139 + (index % 3) * 9;
      flowers.setScale(width / flowers.width).setFlipX(direction < 0);
      container.add(flowers);
    }
  }

  /**
   * Rue résidentielle de la Zone 1 entre `fromX` et `endX` : fond de campagne, jardins et arbres du côté de Léo,
   * maisons numérotées des deux côtés. Sert à la Zone 1 et au quartier qui suit la ville (maisons 33 et suivantes).
   */
  private addResidentialStreet(
    container: Phaser.GameObjects.Container,
    fromX: number,
    endX: number,
    houses: readonly LeoDestination[],
    trees: readonly { x: number; variant: number }[],
  ) {
    const backdropWidth = 2172;
    const backdropHeight = 724;
    for (let tileX = Math.floor(fromX / backdropWidth) * backdropWidth; tileX < endX; tileX += backdropWidth) {
      const from = Math.max(fromX, tileX);
      const to = Math.min(endX, tileX + backdropWidth);
      if (to <= from) continue;
      container.add(this.add.image(tileX, 0, "leo-world-village-zone1-backdrop")
        .setOrigin(0, 0)
        .setCrop(from - tileX, 0, to - from, backdropHeight)
        .setDepth(-4.9));
    }
    const sidewalkEdge = bridgeLayout().deckBottom;
    const gardenFrame = this.textures.getFrame("leo-garden-near-side");
    const gardenScale = (WORLD_HEIGHT - sidewalkEdge) / gardenFrame.height;
    const gardenTileWidth = gardenFrame.width * gardenScale;
    // Le motif est ancré dans le monde et déborde visuellement d'une zone de chargement à l'autre.
    for (let tileX = Math.floor(fromX / gardenTileWidth) * gardenTileWidth; tileX < endX; tileX += gardenTileWidth) {
      const from = Math.max(fromX, tileX);
      const to = Math.min(endX, tileX + gardenTileWidth);
      if (to <= from) continue;
      container.add(this.add.image(tileX, sidewalkEdge, "leo-garden-near-side").setOrigin(0, 0)
        .setScale(gardenScale).setCrop((from - tileX) / gardenScale, 0, (to - from) / gardenScale, gardenFrame.height));
    }
    this.addNearSidePlanting(container, sidewalkEdge, trees.filter(({ x }) => x >= fromX && x < endX));
    for (const destination of houses) {
      const { x, y } = destination.house;
      if (x < fromX || x >= endX) continue;
      const number = Number(destination.id.replace("house-", ""));
      if (y > ROAD_Y) {
        this.addNearSideHouse(container, x, number, sidewalkEdge);
        continue;
      }
      const houseKey = FAR_SIDE_HOUSE_KEYS[((number - 1) / 2) % FAR_SIDE_HOUSE_KEYS.length];
      const houseSource = this.textures.get(houseKey).getSourceImage() as HTMLImageElement;
      const houseBaseY = ROAD_Y - ROAD_HALF_WIDTH - 100;
      container.add(this.add.image(x, houseBaseY, houseKey)
        .setOrigin(0.5, 1)
        .setScale(210 / houseSource.width)
        .setDepth(2));
      const signX = x + 70;
      const signY = houseBaseY - 28;
      // Les numéros à trois chiffres (100 et plus) ont besoin d'un panneau un peu plus large.
      container.add(this.add.rectangle(signX, signY, number >= 100 ? 40 : 30, 23, 0xfff4cf, 0.98)
        .setStrokeStyle(2, 0x2d5270, 1)
        .setDepth(2.5));
      container.add(this.add.text(signX, signY, String(number), HOUSE_SIGN_STYLE)
        .setOrigin(0.5)
        .setDepth(2.6));
    }
  }

  private createWorldZone(id: number) {
    const { startX, endX, kind } = zoneForWorldX(id * WORLD_ZONE_WIDTH);
    const container = this.add.container(0, 0).setDepth(-5);
    const width = endX - startX;
    const centerX = (startX + endX) / 2;
    container.add(this.add.rectangle(centerX, WORLD_HEIGHT / 2, width, WORLD_HEIGHT, WORLD_BACKGROUND_COLOR).setDepth(-5));
    if (kind === "bridge") {
      const bridge = bridgeLayout();
      const waterY = bridge.bottomPartTop + (1 - SUSPENSION.bottomStart) * SUSPENSION.height * bridge.suspensionScale - 4;
      container.add(this.add.rectangle(centerX, bridge.topPartBottom / 2, width, bridge.topPartBottom, SKY_COLOR).setDepth(-4.95));
      container.add(this.add.rectangle(centerX, (waterY + WORLD_HEIGHT) / 2, width, WORLD_HEIGHT - waterY, WATER_COLOR).setDepth(-4.95));
    }

    if (kind === "village") {
      const southHouses = DESTINATIONS.filter(({ house }) => house.y > ROAD_Y).map(({ house }) => house.x);
      const trees = [140, 415, ...southHouses.slice(1).map((x, index) => (southHouses[index] + x) / 2)]
        .map((x, variant) => ({ x, variant }));
      this.addResidentialStreet(container, startX, endX, DESTINATIONS, trees);
    } else if (kind !== "bridge") {
      // Ciel sous les panneaux illustrés de la ville : leurs fondus ne laissent jamais voir un écran vert vide.
      container.add(this.add.rectangle(
        centerX,
        (ROAD_Y - ROAD_HALF_WIDTH) / 2,
        width,
        ROAD_Y - ROAD_HALF_WIDTH,
        SKY_COLOR,
      ).setDepth(-4.9));
      // Après le boulevard, la rue de la Zone 1 reprend, sans fin, avec ses maisons numérotées à la suite (33, 34…).
      // Elle commence sous le fondu de sortie du boulevard, qui s'efface donc sur un vrai décor.
      const fromX = Math.max(startX, boulevardLayout().panelEnd - BOULEVARD_FADE);
      if (fromX < endX) {
        const houses = suburbHousesBetween(fromX, endX);
        // Un arbre entre deux jardins voisins du côté de Léo (voisins pris au-delà de la zone, pour les bords).
        const south = suburbHousesBetween(fromX - 420, endX + 420).filter(({ house }) => house.y > ROAD_Y);
        const trees = south.slice(1).map((destination, index) => ({
          x: (south[index].house.x + destination.house.x) / 2,
          variant: Number(destination.id.replace("house-", "")) / 2,
        }));
        this.addResidentialStreet(container, fromX, endX, houses, trees);
      }
    }
    return container;
  }

  // --- Trafic ---------------------------------------------------------------------

  /** Berline de la rue des Jardins : chaque illustration est posée telle quelle sur son point au sol, jamais tournée. */
  private syncDepthSprites(nearCity: boolean) {
    const pose = this.depthTraffic.pose();
    for (const [angle, sprite] of this.depthSprites) {
      const layer = nearCity && pose.visible ? pose.layers.find((candidate) => candidate.angle === angle) : undefined;
      const wheels = this.depthWheels.get(angle) ?? [];
      if (!layer) {
        sprite.setVisible(false);
        for (const wheel of wheels) wheel.holder.setVisible(false);
        continue;
      }
      sprite
        .setVisible(true)
        .setOrigin(layer.originX, layer.originY)
        .setPosition(layer.x, layer.y)
        .setDisplaySize(Math.max(layer.width, 1), Math.max(layer.height, 1))
        .setAlpha(layer.alpha)
        .setDepth(pose.depthOrder);
      // Roues : le disque tourne avec la distance parcourue, le conteneur l'aplatit en ellipse (roue vue de biais).
      wheels.forEach((wheel, index) => {
        const placed = layer.wheels[index];
        if (!placed) {
          wheel.holder.setVisible(false);
          return;
        }
        const size = wheel.disc.width;
        wheel.disc.setRotation(placed.rotation);
        wheel.holder
          .setVisible(true)
          .setPosition(placed.x, placed.y)
          .setScale((placed.radiusX * 2) / size, (placed.radiusY * 2) / size)
          .setAlpha(layer.alpha)
          .setDepth(pose.depthOrder + 0.001);
      });
    }
  }

  private updateTraffic(seconds: number, deltaMs: number) {
    this.traffic.laneCap = this.fixedLaneCap ?? this.governor.record(deltaMs);
    const view = this.cameras.main.worldView;
    const city = cityLayout();
    // Un seul contrôleur de feux pour tout le carrefour : l'avenue principale et la rue perpendiculaire.
    // Le contrôleur prolonge le rouge intégral tant qu'un mouvement incompatible occupe la zone de conflit.
    const box = { minX: city.mouthLeft - 40, maxX: city.mouthRight + 40 };
    const leoInBox = Math.abs(this.motion.speed) > 15 && this.motion.x + VEHICLE_LENGTH / 2 > box.minX && this.motion.x - VEHICLE_LENGTH / 2 < box.maxX;
    this.intersection.update(seconds, {
      mainBusy: this.traffic.movingIn(box.minX, box.maxX) || leoInBox,
      sideBusy: this.cross.turnZoneBusy() || this.depthTraffic.busy(),
    });
    const phase = this.intersection.state;
    const boulevardSignalList = boulevardSignals();
    const boulevardBox = {
      minX: boulevardSignalList[0].stopLineEast - 35,
      maxX: boulevardSignalList[boulevardSignalList.length - 1].stopLineWest + 35,
    };
    const leoOnBoulevard = Math.abs(this.motion.speed) > 15
      && this.motion.x + VEHICLE_LENGTH / 2 > boulevardBox.minX
      && this.motion.x - VEHICLE_LENGTH / 2 < boulevardBox.maxX;
    // Même machine à états que la zone 3 : les rues secondaires (et les passants) reçoivent le vert
    // uniquement quand l'axe principal est rouge. Aucun état de Léo n'est partagé avec le trafic.
    this.boulevardIntersection.update(seconds, {
      mainBusy: this.traffic.movingIn(boulevardBox.minX, boulevardBox.maxX) || leoOnBoulevard,
      sideBusy: false,
    });
    const boulevardPhase = this.boulevardIntersection.state;
    // La tête de feu de l'illustration surplombe l'avenue : elle montre l'état de la rue perpendiculaire.
    this.drawLight(phase.side);
    this.drawMainHeads(phase.main);
    this.drawBoulevardHeads(boulevardPhase.main);
    const nearCity = Math.abs(this.motion.x - city.mouthLeft) < 1600;
    // Expérience de la rue des Jardins : aucun virage. Le trafic perpendiculaire qui tourne est mis à l arrêt.
    this.cross.cap = 0;
    const leoBody = { pose: { x: this.motion.x, y: this.motion.y, heading: this.motion.heading }, speed: this.motion.speed };
    // Le trafic perpendiculaire ne lit aucune commande de Léo : il regarde son feu, ses voisins et la place libre.
    this.cross.update(seconds, { side: phase.side, main: this.traffic, leo: leoBody });
    this.crossViews?.sync(this.cross.vehicles, seconds);
    if (nearCity) this.depthTraffic.update(seconds, { side: phase.side, main: this.traffic });
    this.syncDepthSprites(nearCity);
    this.traffic.update(seconds, {
      extras: [...this.cross.extras(), ...this.depthTraffic.extras()],
      viewMinX: view.x,
      viewMaxX: view.x + view.width,
      leo: { pose: { x: this.motion.x, y: this.motion.y, heading: this.motion.heading }, speed: this.motion.speed },
      // Chaque véhicule décide seul s'il s'arrête : le feu n'envoie aucun ordre global.
      signals: [
        { lineX: city.stopLineEast, direction: 1, state: phase.main },
        { lineX: city.stopLineWest, direction: -1, state: phase.main },
        ...boulevardSignalList.flatMap((signal) => [
          { lineX: signal.stopLineEast, direction: 1 as const, state: boulevardPhase.main },
          { lineX: signal.stopLineWest, direction: -1 as const, state: boulevardPhase.main },
        ]),
      ],
    });
    this.listenToTraffic(seconds);
    this.traffic.vehicles.forEach((vehicle, index) => {
      const view2 = this.trafficViews[index];
      if (!view2) return;
      if (!vehicle.active) {
        view2.body.setVisible(false);
        view2.wheels[0].setVisible(false);
        view2.wheels[1].setVisible(false);
        return;
      }
      // Les profils du trafic regardent à gauche ; ceux des véhicules de la rue perpendiculaire, à droite.
      const flipped = needsMirror(vehicle.spec, vehicle.lane === "same");
      if (view2.spec !== vehicle.spec || view2.flipped !== flipped) this.configureTrafficView(view2, vehicle.spec, flipped);
      const display = vehicleDisplay(vehicle.spec);
      const y = laneY(vehicle.lane) + display.offsetY;
      const depth = vehicle.lane === "same" ? 7 : 6;
      view2.body.setPosition(vehicle.x, y).setDepth(depth).setVisible(true);
      display.wheels.forEach((_wheel, wheelIndex) => {
        // Position FIXE par rapport à la carrosserie ; la rotation vient du seul déplacement réel (trafficWheelPose).
        const pose = trafficWheelPose(vehicle, wheelIndex);
        view2.wheels[wheelIndex]
          .setPosition(pose.x, pose.y)
          .setRotation(pose.rotation)
          .setDepth(depth + 0.1)
          .setVisible(true);
      });
    });
    this.updateDebugOverlay();
  }

  /** Réaffecte une vue du pool à un autre type de véhicule : aucun objet Phaser n'est créé. */
  private configureTrafficView(view: TrafficView, spec: VehicleSpec, flipped: boolean) {
    const display = vehicleDisplay(spec);
    view.body
      .setTexture(spec.textureKey)
      .setOrigin(display.origin.x, display.origin.y)
      .setDisplaySize(display.width, display.height)
      .setFlipX(flipped);
    view.wheels.forEach((disc, index) => {
      disc
        .setTexture(wheelTextureKey(spec, index))
        .setDisplaySize(display.wheels[index].discRadius * 2, display.wheels[index].discRadius * 2)
        .setFlipX(flipped);
    });
    view.spec = spec;
    view.flipped = flipped;
  }

  private syncCar() {
    if (!this.car) return;
    this.car.setPosition(this.motion.x, this.motion.y);
    this.carShadow?.setPosition(this.motion.x, this.motion.y + VEHICLE_WIDTH / 2 - 4);
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
    // Roues de Léo : les disques d'origine tournent avec le déplacement ; de face ou de
    // dos on ne voit pas la jante, donc rien à animer. Vers l'ouest le sens s'inverse.
    for (const side of ["right", "left"] as const) {
      const visible = showSprite && view.sprite === side;
      for (const disc of this.leoWheels[side]) {
        disc.setVisible(visible).setRotation(side === "right" ? this.wheelSpin : -this.wheelSpin);
      }
    }
  }

  // --- Mode diagnostic (développement uniquement) -------------------------------

  private createDebugOverlay() {
    this.debugGuides = this.add.graphics().setDepth(4);
    // Limites des chaussées (blanc), axes (cyan), centres de voie (magenta).
    this.debugGuides.lineStyle(2, 0xffffff, 0.9);
    this.debugGuides.lineStyle(3, 0xff4fd8, 0.9);
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
    const guideStart = Math.max(MAIN_ROAD_X_MIN, x - 1800);
    const guideEnd = x + 1800;
    this.debugGuides?.clear();
    this.debugGuides?.lineStyle(2, 0xffffff, 0.9);
    this.debugGuides?.strokeRect(guideStart, ROAD_Y - ROAD_HALF_WIDTH, guideEnd - guideStart, ROAD_WIDTH);
    this.debugGuides?.lineStyle(2, 0x2ee6ff, 0.85);
    this.debugGuides?.lineBetween(guideStart, ROAD_Y, guideEnd, ROAD_Y);
    this.debugGuides?.lineStyle(3, 0xff4fd8, 0.9);
    this.debugGuides?.lineBetween(guideStart, MAIN_LANE_Y, guideEnd, MAIN_LANE_Y);
    this.debugGuides?.lineBetween(guideStart, ONCOMING_LANE_Y, guideEnd, ONCOMING_LANE_Y);
    // Rectangle d'empreinte : c'est lui que le moteur teste contre la chaussée et le trafic.
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
    // Point logique (centre de l'empreinte) et ligne de contact des pneus (bord inférieur).
    g.fillStyle(0x00e676, 1);
    g.fillCircle(x, y, 6);
    g.lineStyle(2, 0xff9800, 1);
    g.lineBetween(x - VEHICLE_LENGTH / 2, y + VEHICLE_WIDTH / 2, x + VEHICLE_LENGTH / 2, y + VEHICLE_WIDTH / 2);
    // Empreinte et centre de chaque véhicule du trafic.
    g.lineStyle(2, 0x00bcd4, 0.9);
    for (const vehicle of this.traffic.vehicles) {
      if (!vehicle.active) continue;
      const box = vehicleBounds(vehicle);
      g.strokeRect(box.minX, box.minY, box.maxX - box.minX, box.maxY - box.minY);
    }
    this.debugText
      .setPosition(x + VEHICLE_LENGTH / 2 + 8, y - VEHICLE_WIDTH / 2 - 70)
      .setText(
        `cap ${Math.round(Phaser.Math.RadToDeg(heading))}°  braq ${Math.round(Phaser.Math.RadToDeg(steeringAngle))}°\n`
        + `v ${Math.round(speed)}  ${laneAt(x, y)}\n`
        + `trafic ${this.traffic.activeCount}/${this.traffic.laneCap * 2}  ${this.governor.frameMs.toFixed(1)} ms`,
      );
  }
}

/**
 * Densité de rendu : celle de l'écran, plafonnée à 2 (au-delà, l'œil ne voit plus la différence mais le téléphone
 * calcule 2 à 4 fois plus de pixels). Jamais moins de 1.
 */
export function renderPixelRatio(devicePixelRatio: number | undefined) {
  const ratio = Number.isFinite(devicePixelRatio) && (devicePixelRatio as number) > 0 ? (devicePixelRatio as number) : 1;
  return Math.min(2, Math.max(1, ratio));
}

export function mountLeoLivreurGame(host: HTMLElement, onSnapshot: SnapshotListener): LeoLivreurController {
  const pixelRatio = renderPixelRatio(window.devicePixelRatio);
  const scene = new LeoLivreurScene(onSnapshot, pixelRatio);
  // Canvas en pixels réels de l'écran (net sur téléphone), affiché à la taille CSS du cadre (zoom 1 / densité) :
  // aucune déformation, mêmes proportions, même portion du monde visible.
  const backing = () => ({ width: Math.max(host.clientWidth, 1) * pixelRatio, height: Math.max(host.clientHeight, 1) * pixelRatio });
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: host,
    transparent: true,
    scene,
    // Réseau lent : un fichier qui ne répond pas en 45 s est considéré en échec (puis repris, voir ZoneAssetManager).
    loader: { timeout: 45_000 },
    // Le son du jeu est géré par LeoSound, créé seulement quand l'enfant l'active : Phaser n'ouvre aucun audio.
    audio: { noAudio: true },
    scale: {
      mode: Phaser.Scale.NONE,
      ...backing(),
      zoom: 1 / pixelRatio,
    },
  });

  return {
    destroy: () => {
      scene.destroySound();
      game.destroy(true);
    },
    refreshLayout: () => {
      const size = backing();
      game.scale.resize(size.width, size.height);
    },
    startMission: () => scene.startMission(),
    deliver: () => scene.deliver(),
    reset: () => scene.reset(),
    setControl: (control, active) => scene.setControl(control, active),
    turn: (direction) => scene.turn(direction),
    setPaused: (paused) => {
      scene.setSoundPaused(paused);
      if (paused) game.pause();
      else game.resume();
    },
    retryAssets: () => scene.retryAssets(),
    setSound: (on) => scene.setSound(on),
    horn: (active) => scene.horn(active),
  };
}
