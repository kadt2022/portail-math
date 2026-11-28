// Le modèle de vol de Turbo Pulse 3D, en logique pure (sans Babylon, sans écran) : on peut le tester et le régler seul.
//
// Principe : le vaisseau reste à l'origine ; c'est le monde qui vient vers lui. Le vaisseau se déplace seulement en x (gauche/droite) et
// en y (haut/bas) dans une boîte de jeu ; sa vitesse d'avance fait diminuer la distance restante et rapproche les boules (z décroissant).
// Les boules sont un tas fixe d'objets réutilisés : une boule sortie du jeu (derrière le vaisseau) est simplement rendue au tas.
//
// Écrit pour Yamba.

/** Boîte de jeu : le centre du vaisseau reste dans ±x, ±y. */
export const BOUNDS = { x: 4.2, y: 2.4 } as const;

export const SPEED = { min: 9, cruise: 22, max: 38 } as const;
/** Distance (en unités, ≈ mètres) du départ à la station. */
export const TRIP_LENGTH = 1000;
/** À cette distance de la station, le vaisseau est « arrivé » et s'arrête. */
export const ARRIVAL_DISTANCE = 24;
/** Les boules naissent à cette distance devant le vaisseau et disparaissent derrière lui. */
export const SPAWN_Z = 170;
export const DESPAWN_Z = -16;
/** Plus aucune boule ne naît dans les derniers mètres avant la station. */
const QUIET_ZONE = 150;

export interface FlightInput {
  /** −1 (gauche) … +1 (droite). */
  x: number;
  /** −1 (bas) … +1 (haut). */
  y: number;
  /** −1 (ralentir) … +1 (accélérer). */
  throttle: number;
}

export const NO_INPUT: FlightInput = { x: 0, y: 0, throttle: 0 };

export interface ShipState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  speed: number;
  /** Secondes d'invulnérabilité restantes après un choc. */
  shield: number;
  /** Secondes de ralentissement subi après un choc (bridage de la vitesse cible). */
  stun: number;
}

export const createShipState = (): ShipState => ({ x: 0, y: 0, vx: 0, vy: 0, speed: SPEED.cruise, shield: 0, stun: 0 });

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
/** Rapproche `value` de `target` de façon exponentielle (lissage indépendant du nombre d'images par seconde). */
const approach = (value: number, target: number, rate: number, dt: number) => value + (target - value) * (1 - Math.exp(-rate * dt));

const LATERAL_SPEED = 9;
const VERTICAL_SPEED = 6.5;

/** Inclinaisons à montrer sur le vaisseau, déduites de ses vitesses (radians) : roulis, tangage, lacet. */
export function attitude(ship: Readonly<ShipState>): { roll: number; pitch: number; yaw: number } {
  return {
    roll: -(ship.vx / LATERAL_SPEED) * 0.7,
    pitch: -(ship.vy / VERTICAL_SPEED) * 0.32,
    yaw: (ship.vx / LATERAL_SPEED) * 0.2,
  };
}

/** Fait avancer le vaisseau de dt secondes. À l'arrivée, il perd ses commandes, se recentre et s'arrête. */
export function stepShip(ship: ShipState, input: Readonly<FlightInput>, dt: number, arrived: boolean): void {
  const control = arrived ? NO_INPUT : input;
  const targetX = clamp(control.x, -1, 1) * LATERAL_SPEED;
  const targetY = clamp(control.y, -1, 1) * VERTICAL_SPEED;
  ship.vx = approach(ship.vx, targetX, 7, dt);
  ship.vy = approach(ship.vy, targetY, 7, dt);
  if (arrived) {
    ship.vx = approach(ship.vx, -ship.x * 1.5, 4, dt);
    ship.vy = approach(ship.vy, -ship.y * 1.5, 4, dt);
  }
  ship.x += ship.vx * dt;
  ship.y += ship.vy * dt;
  // Bords de la boîte : on y bute doucement, sans rebond.
  if (Math.abs(ship.x) > BOUNDS.x) {
    ship.x = Math.sign(ship.x) * BOUNDS.x;
    if (Math.sign(ship.vx) === Math.sign(ship.x)) ship.vx = 0;
  }
  if (Math.abs(ship.y) > BOUNDS.y) {
    ship.y = Math.sign(ship.y) * BOUNDS.y;
    if (Math.sign(ship.vy) === Math.sign(ship.y)) ship.vy = 0;
  }
  const t = clamp(control.throttle, -1, 1);
  let target: number = SPEED.cruise;
  if (t > 0) target = SPEED.cruise + t * (SPEED.max - SPEED.cruise);
  else if (t < 0) target = SPEED.cruise + t * (SPEED.cruise - SPEED.min);
  if (ship.stun > 0) target = Math.min(target, SPEED.min);
  if (arrived) target = 0;
  ship.speed = approach(ship.speed, target, arrived ? 2.2 : 3.2, dt);
  ship.shield = Math.max(0, ship.shield - dt);
  ship.stun = Math.max(0, ship.stun - dt);
}

// ─── Boules ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export const ORB_COLORS = 5;

export interface Orb {
  /** Emplacement fixe dans le tas ; la couleur en découle (index % ORB_COLORS). */
  readonly slot: number;
  readonly color: number;
  active: boolean;
  x: number;
  y: number;
  z: number;
  radius: number;
  /** Vitesse propre vers le vaisseau, en plus de la vitesse du vaisseau. */
  approach: number;
  /** Dérive latérale. */
  vx: number;
  /** Phase d'animation (rotation). */
  spin: number;
}

export type Rng = () => number;

/** Petit générateur pseudo-aléatoire reproductible (mulberry32). */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Box {
  cx: number;
  cy: number;
  cz: number;
  hx: number;
  hy: number;
  hz: number;
}

/** Le vaisseau pour les collisions : fuselage, ailes, moteurs. Un peu plus petit que l'image, pour rester indulgent avec les enfants. */
const SHIP_BOXES: readonly Box[] = [
  { cx: 0, cy: 0, cz: 0.1, hx: 0.95, hy: 0.6, hz: 2.7 },
  { cx: 0, cy: -0.1, cz: -0.7, hx: 2.9, hy: 0.15, hz: 1.4 },
  { cx: 0, cy: -0.05, cz: -1.6, hx: 1.5, hy: 0.5, hz: 1.1 },
];

function sphereHitsBox(sx: number, sy: number, sz: number, r: number, b: Box): boolean {
  const dx = sx - clamp(sx, b.cx - b.hx, b.cx + b.hx);
  const dy = sy - clamp(sy, b.cy - b.hy, b.cy + b.hy);
  const dz = sz - clamp(sz, b.cz - b.hz, b.cz + b.hz);
  return dx * dx + dy * dy + dz * dz < r * r;
}

/** Une boule touche-t-elle le vaisseau (centré en (shipX, shipY, 0)) ? */
export function orbHitsShip(orb: Readonly<Orb>, shipX: number, shipY: number): boolean {
  const r = orb.radius * 0.92;
  return SHIP_BOXES.some((b) => sphereHitsBox(orb.x - shipX, orb.y - shipY, orb.z, r, b));
}

export class ObstacleField {
  readonly orbs: Orb[];
  private timer = 1.2;
  constructor(
    size: number,
    private readonly rng: Rng,
  ) {
    this.orbs = Array.from({ length: size }, (_, slot) => ({
      slot,
      color: slot % ORB_COLORS,
      active: false,
      x: 0,
      y: 0,
      z: 0,
      radius: 1,
      approach: 0,
      vx: 0,
      spin: 0,
    }));
  }

  reset(): void {
    for (const orb of this.orbs) orb.active = false;
    this.timer = 1.2;
  }

  activeCount(): number {
    return this.orbs.reduce((n, o) => n + (o.active ? 1 : 0), 0);
  }

  /**
   * Fait avancer les boules, en fait naître de nouvelles, et rend les boules touchées. Une boule touchée est retirée du jeu.
   * @param remaining distance restante jusqu'à la station
   */
  step(dt: number, ship: Readonly<ShipState>, remaining: number, spawning: boolean): Orb[] {
    const hits: Orb[] = [];
    for (const orb of this.orbs) {
      if (!orb.active) continue;
      orb.z -= (ship.speed + orb.approach) * dt;
      orb.x += orb.vx * dt;
      orb.spin += dt;
      if (Math.abs(orb.x) > BOUNDS.x + 3) orb.vx = -orb.vx;
      if (orb.z < DESPAWN_Z) {
        orb.active = false;
      } else if (ship.shield <= 0 && orbHitsShip(orb, ship.x, ship.y)) {
        orb.active = false;
        hits.push(orb);
      }
    }
    this.timer -= dt;
    if (spawning && remaining > QUIET_ZONE && this.timer <= 0) {
      this.spawn(ship);
      this.timer = 0.3 + this.rng() * 0.25;
    }
    return hits;
  }

  private spawn(ship: Readonly<ShipState>): void {
    const free = this.orbs.filter((o) => !o.active);
    if (free.length === 0) return;
    const orb = free[Math.floor(this.rng() * free.length)];
    const aimed = this.rng() < 0.55;
    orb.x = aimed ? ship.x + (this.rng() - 0.5) * 4 : (this.rng() * 2 - 1) * (BOUNDS.x + 1.5);
    orb.y = aimed ? ship.y + (this.rng() - 0.5) * 2.4 : (this.rng() * 2 - 1) * (BOUNDS.y + 0.6);
    orb.x = clamp(orb.x, -BOUNDS.x - 1.5, BOUNDS.x + 1.5);
    orb.y = clamp(orb.y, -BOUNDS.y - 0.8, BOUNDS.y + 0.8);
    orb.z = SPAWN_Z + this.rng() * 20;
    orb.radius = 0.45 + this.rng() ** 1.6 * 1.1;
    orb.approach = this.rng() * 5;
    orb.vx = this.rng() < 0.25 ? (this.rng() < 0.5 ? -1 : 1) * (0.8 + this.rng() * 1.2) : 0;
    orb.spin = this.rng() * 6;
    orb.active = true;
  }
}

// ─── Partie ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

export type Phase = "ready" | "flying" | "arrived";

export interface FlightEvents {
  /** Une boule vient de toucher le vaisseau. */
  hits: Orb[];
  /** Le vaisseau vient d'arriver à la station. */
  arrivedNow: boolean;
}

export class Flight {
  readonly ship = createShipState();
  readonly field: ObstacleField;
  phase: Phase = "ready";
  remaining: number;
  constructor(
    readonly total: number = TRIP_LENGTH,
    seed = 1,
    poolSize = 40,
  ) {
    this.field = new ObstacleField(poolSize, createRng(seed));
    this.remaining = total;
  }

  start(): void {
    if (this.phase === "ready") this.phase = "flying";
  }

  restart(): void {
    Object.assign(this.ship, createShipState());
    this.field.reset();
    this.remaining = this.total;
    this.phase = "flying";
  }

  step(dt: number, input: Readonly<FlightInput>): FlightEvents {
    const events: FlightEvents = { hits: [], arrivedNow: false };
    const flying = this.phase === "flying";
    const arrived = this.phase === "arrived";
    if (this.phase === "ready") {
      // Au sol : le vaisseau attend, sans avancer.
      this.ship.speed = SPEED.cruise * 0.5;
      return events;
    }
    stepShip(this.ship, input, dt, arrived);
    this.remaining = Math.max(arrived ? ARRIVAL_DISTANCE * 0.5 : 0, this.remaining - this.ship.speed * dt);
    events.hits = this.field.step(dt, this.ship, this.remaining, flying);
    if (events.hits.length > 0) {
      this.ship.shield = 1.1;
      this.ship.stun = 0.9;
      this.ship.speed *= 0.5;
    }
    if (flying && this.remaining <= ARRIVAL_DISTANCE) {
      this.phase = "arrived";
      events.arrivedNow = true;
    }
    return events;
  }
}
