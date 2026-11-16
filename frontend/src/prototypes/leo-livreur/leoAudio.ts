// Son de Léo : moteur « Vroom », voitures qui passent, collisions et klaxon, entièrement calculés par l'API Web Audio
// du navigateur. Aucun fichier son téléchargé, aucune bibliothèque, aucun réglage enregistré (doctrine V1).
//
// Garde-fous :
// - son coupé au départ ; le contexte audio n'est créé qu'à l'activation par l'enfant (geste exigé par les navigateurs) ;
// - volume plafonné puis limiteur : aucun réglage ne produit de pic sonore ;
// - son suspendu en pause et quand l'onglet passe en arrière-plan ;
// - chaque son ponctuel (klaxon, passage, collision) libère ses nœuds à la fin ; trois voitures entendues au plus.
//
// Module sans Phaser : la scène lui transmet la vitesse et les pédales, il ne lit rien d'autre.

/** Rapports d'une petite citadine : km/h obtenus à 1000 tr/min dans chaque rapport (index 1 à 5). */
export const KMH_PER_1000 = [0, 7.6, 13.4, 19.8, 26.0, 31.5] as const;
export const IDLE_RPM = 850;
export const REDLINE_RPM = 6200;
const UP_SHIFT_PULL = 5600;
const UP_SHIFT_CRUISE = 2600;
const DOWN_SHIFT = 1500;
/** Durée (s) pendant laquelle le moteur se tait presque au passage d'un rapport : c'est ce qui fait « vroom… vroom ». */
const SHIFT_DIP_SECONDS = 0.14;

/** Plafond du volume général (gain) : même au maximum, le son reste modéré. */
export const VOLUME_CAP = 0.35;
export const DEFAULT_VOLUME = 0.4;
/** Nombre maximal de voitures entendues en même temps. */
export const MAX_PASSERS = 3;
/** Durée d'un passage de voiture (s). */
export const PASS_DURATION = 2.6;

export interface EngineState {
  rpm: number;
  gear: number;
  /** 0 à 1 : pied levé à pied au plancher. */
  throttle: number;
  /** Secondes restantes de la coupure brève du passage de rapport. */
  shiftDip: number;
}

/**
 * Régime moteur déduit de la vitesse réelle de Léo, avec une boîte à 5 rapports : en accélérant, le régime monte
 * puis retombe à chaque rapport passé. Pur et déterministe (testable).
 */
export class EngineModel {
  state: EngineState = { rpm: IDLE_RPM, gear: 1, throttle: 0.1, shiftDip: 0 };

  step(kmh: number, accelerating: boolean, braking: boolean, seconds: number): EngineState {
    const speed = Math.abs(kmh);
    const state = this.state;
    state.throttle = accelerating ? 1 : speed > 0.5 && !braking ? 0.25 : 0.1;
    const rpmIn = (gear: number) => (speed / KMH_PER_1000[gear]) * 1000;
    if (speed < 1) state.gear = 1;
    else {
      const up = accelerating ? UP_SHIFT_PULL : UP_SHIFT_CRUISE;
      while (state.gear < 5 && rpmIn(state.gear) > up) {
        state.gear += 1;
        state.shiftDip = SHIFT_DIP_SECONDS;
      }
      while (state.gear > 1 && rpmIn(state.gear) < DOWN_SHIFT) state.gear -= 1;
    }
    state.rpm = Math.max(IDLE_RPM, Math.min(REDLINE_RPM, rpmIn(state.gear)));
    if (state.shiftDip > 0) state.shiftDip = Math.max(0, state.shiftDip - seconds);
    return state;
  }
}

/** Fréquence des combustions d'un 4 cylindres 4 temps (deux par tour), avec un plancher grave audible. */
export function firingFrequency(rpm: number) {
  return Math.max(36, (rpm / 60) * 2);
}

/** Force d'une collision (0,25 à 1) selon la vitesse au moment du choc. */
export function collisionLevel(kmh: number) {
  return Math.min(1, Math.max(0.25, Math.abs(kmh) / 80));
}

export type CollisionKind = "petit choc" | "accrochage" | "accident";
export function collisionKind(level: number): CollisionKind {
  return level < 0.45 ? "petit choc" : level < 0.8 ? "accrochage" : "accident";
}

/** Tonalité de base (Hz) d'une voiture qui passe : les bus sont plus graves. */
export function passerPitch(kind: string, id: number) {
  if (kind.includes("bus")) return 55;
  return [80, 95, 110][Math.abs(id) % 3];
}

function softClip(drive: number) {
  const size = 1024;
  const curve = new Float32Array(size);
  for (let i = 0; i < size; i += 1) {
    const x = (i / (size - 1)) * 2 - 1;
    curve[i] = Math.tanh(drive * x);
  }
  return curve;
}

/** Bruit pseudo-aléatoire à graine fixe, calculé une seule fois par contexte audio (roulement, tôle froissée). */
const noiseCache = new WeakMap<BaseAudioContext, AudioBuffer>();
function noiseBuffer(ctx: BaseAudioContext) {
  const cached = noiseCache.get(ctx);
  if (cached) return cached;
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let seed = 1;
  for (let i = 0; i < length; i += 1) {
    seed = (seed * 16807) % 2147483647;
    data[i] = (seed / 2147483647) * 2 - 1;
  }
  noiseCache.set(ctx, buffer);
  return buffer;
}

/** Son ponctuel : ses nœuds, la source qui s'arrête en dernier (sa fin libère tout). */
interface OneShot {
  nodes: AudioNode[];
  last: AudioScheduledSourceNode;
}

/** Moteur « Vroom » : grave, aigus coupés, basse pure, grondement ; s'ouvre quand on accélère. */
function buildVroom(ctx: BaseAudioContext, out: AudioNode) {
  const saw = ctx.createOscillator();
  saw.type = "sawtooth";
  const thick = ctx.createOscillator();
  thick.type = "sawtooth";
  const thickLevel = ctx.createGain();
  thickLevel.gain.value = 0.5;
  const sub = ctx.createOscillator();
  sub.type = "sine";
  const subLevel = ctx.createGain();
  subLevel.gain.value = 0.9;
  const pre = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  shaper.curve = softClip(1.8);
  const low1 = ctx.createBiquadFilter();
  low1.type = "lowpass";
  low1.Q.value = 0.7;
  const low2 = ctx.createBiquadFilter();
  low2.type = "lowpass";
  low2.Q.value = 0.5;
  const bass = ctx.createBiquadFilter();
  bass.type = "lowshelf";
  bass.frequency.value = 140;
  bass.gain.value = 8;
  const growl = ctx.createGain();
  growl.gain.value = 0.7;
  const rumble = ctx.createOscillator();
  rumble.type = "sine";
  const rumbleDepth = ctx.createGain();
  rumbleDepth.gain.value = 0.2;
  const level = ctx.createGain();
  level.gain.value = 0;
  saw.connect(pre);
  thick.connect(thickLevel);
  thickLevel.connect(pre);
  sub.connect(subLevel);
  subLevel.connect(pre);
  pre.connect(shaper);
  shaper.connect(low1);
  low1.connect(low2);
  low2.connect(bass);
  bass.connect(growl);
  growl.connect(level);
  rumble.connect(rumbleDepth);
  rumbleDepth.connect(growl.gain);
  level.connect(out);
  for (const source of [saw, thick, sub, rumble]) source.start();
  const nodes: AudioNode[] = [saw, thick, thickLevel, sub, subLevel, pre, shaper, low1, low2, bass, growl, rumble, rumbleDepth, level];
  return {
    nodes,
    set(engine: EngineState, t: number) {
      const f = firingFrequency(engine.rpm);
      const load = engine.shiftDip > 0 ? 0.05 : engine.throttle;
      saw.frequency.setTargetAtTime(f, t, 0.07);
      thick.frequency.setTargetAtTime(f * 1.006, t, 0.07);
      sub.frequency.setTargetAtTime(f, t, 0.07);
      rumble.frequency.setTargetAtTime(f * 0.5, t, 0.07);
      pre.gain.setTargetAtTime(0.9 + load * 1.4, t, 0.05);
      const cutoff = 170 + engine.rpm * 0.07 + load * 520;
      low1.frequency.setTargetAtTime(cutoff, t, 0.06);
      low2.frequency.setTargetAtTime(cutoff * 1.4, t, 0.06);
      rumbleDepth.gain.setTargetAtTime(0.18 + load * 0.12, t, 0.06);
      level.gain.setTargetAtTime(0.17 + load * 0.1, t, 0.05);
    },
  };
}

/**
 * Voiture qui passe : elle arrive d'un côté et repart de l'autre (panoramique), son volume monte puis retombe, sa
 * tonalité baisse quand elle croise Léo (effet Doppler), avec le bruit des pneus.
 */
function buildPassBy(ctx: BaseAudioContext, out: AudioNode, when: number, direction: 1 | -1, pitch: number, loud: number): OneShot {
  const end = when + PASS_DURATION;
  const middle = when + PASS_DURATION / 2;
  const engine = ctx.createOscillator();
  engine.type = "sawtooth";
  engine.frequency.setValueAtTime(pitch * 1.07, when);
  engine.frequency.setValueAtTime(pitch * 1.07, middle - 0.3);
  engine.frequency.linearRampToValueAtTime(pitch * 0.92, middle + 0.3);
  const engineTone = ctx.createBiquadFilter();
  engineTone.type = "lowpass";
  engineTone.frequency.value = 480;
  engineTone.Q.value = 0.6;
  const engineLevel = ctx.createGain();
  engineLevel.gain.value = 0.7;
  const road = ctx.createBufferSource();
  road.buffer = noiseBuffer(ctx);
  road.loop = true;
  const roadBand = ctx.createBiquadFilter();
  roadBand.type = "bandpass";
  roadBand.Q.value = 0.6;
  roadBand.frequency.setValueAtTime(900, when);
  roadBand.frequency.linearRampToValueAtTime(550, end);
  const roadLevel = ctx.createGain();
  roadLevel.gain.value = 0.45;
  const level = ctx.createGain();
  level.gain.setValueAtTime(0.0001, when);
  level.gain.exponentialRampToValueAtTime(loud, middle);
  level.gain.exponentialRampToValueAtTime(0.0001, end);
  const pan = ctx.createStereoPanner();
  pan.pan.setValueAtTime(-direction, when);
  pan.pan.linearRampToValueAtTime(direction, end);
  engine.connect(engineTone);
  engineTone.connect(engineLevel);
  engineLevel.connect(level);
  road.connect(roadBand);
  roadBand.connect(roadLevel);
  roadLevel.connect(level);
  level.connect(pan);
  pan.connect(out);
  engine.start(when);
  road.start(when);
  road.stop(end);
  engine.stop(end + 0.05);
  return { nodes: [engine, engineTone, engineLevel, road, roadBand, roadLevel, level, pan], last: engine };
}

/**
 * Collision : « boum » sourd (tonalité qui chute), tôle froissée (bruit qui descend), résonance de la carrosserie ;
 * un accident ajoute des éclats de verre. La force suit la vitesse au moment du choc.
 */
function buildCrash(ctx: BaseAudioContext, out: AudioNode, when: number, intensity: number): OneShot {
  const nodes: AudioNode[] = [];
  const timed: Array<[AudioScheduledSourceNode, number]> = [];
  const keep = <T extends AudioNode>(node: T) => {
    nodes.push(node);
    return node;
  };
  const bus = keep(ctx.createGain());
  bus.gain.value = 0.55 + intensity * 0.45;
  bus.connect(out);

  const thump = keep(ctx.createOscillator());
  thump.type = "sine";
  thump.frequency.setValueAtTime(110 + intensity * 40, when);
  thump.frequency.exponentialRampToValueAtTime(38, when + 0.28);
  const thumpLevel = keep(ctx.createGain());
  thumpLevel.gain.setValueAtTime(0.0001, when);
  thumpLevel.gain.exponentialRampToValueAtTime(0.9, when + 0.006);
  thumpLevel.gain.exponentialRampToValueAtTime(0.0001, when + 0.35 + intensity * 0.25);
  thump.connect(thumpLevel);
  thumpLevel.connect(bus);
  timed.push([thump, when + 0.65]);

  const crunchLength = 0.18 + intensity * 0.5;
  const crunch = keep(ctx.createBufferSource());
  crunch.buffer = noiseBuffer(ctx);
  crunch.loop = true;
  const crunchBand = keep(ctx.createBiquadFilter());
  crunchBand.type = "bandpass";
  crunchBand.Q.value = 0.9;
  crunchBand.frequency.setValueAtTime(2200, when);
  crunchBand.frequency.exponentialRampToValueAtTime(500, when + crunchLength);
  const grit = keep(ctx.createWaveShaper());
  grit.curve = softClip(1.5 + intensity * 2);
  const crunchLevel = keep(ctx.createGain());
  crunchLevel.gain.setValueAtTime(0.0001, when);
  crunchLevel.gain.exponentialRampToValueAtTime(0.25 + intensity * 0.45, when + 0.01);
  crunchLevel.gain.exponentialRampToValueAtTime(0.0001, when + crunchLength);
  crunch.connect(crunchBand);
  crunchBand.connect(grit);
  grit.connect(crunchLevel);
  crunchLevel.connect(bus);
  timed.push([crunch, when + crunchLength + 0.05]);

  [233, 367, 541].forEach((frequency, index) => {
    const ring = keep(ctx.createOscillator());
    ring.type = "triangle";
    ring.frequency.value = frequency;
    const ringLevel = keep(ctx.createGain());
    ringLevel.gain.setValueAtTime(0.0001, when);
    ringLevel.gain.exponentialRampToValueAtTime((0.06 + intensity * 0.06) / (index + 1), when + 0.01);
    ringLevel.gain.exponentialRampToValueAtTime(0.0001, when + 0.5 + intensity * 0.4);
    ring.connect(ringLevel);
    ringLevel.connect(bus);
    timed.push([ring, when + 1]);
  });

  if (collisionKind(intensity) === "accident") {
    [0.05, 0.11, 0.16, 0.24, 0.31].forEach((offset, index) => {
      const at = when + offset;
      const shard = keep(ctx.createOscillator());
      shard.type = "sine";
      shard.frequency.value = [3100, 4200, 2700, 3700, 4600][index];
      const shardLevel = keep(ctx.createGain());
      // Silencieux depuis l'impact (la source démarre avec les autres), puis l'éclat à son instant.
      shardLevel.gain.setValueAtTime(0.0001, when);
      shardLevel.gain.setValueAtTime(0.0001, at);
      shardLevel.gain.exponentialRampToValueAtTime(0.05, at + 0.003);
      shardLevel.gain.exponentialRampToValueAtTime(0.0001, at + 0.09);
      shard.connect(shardLevel);
      shardLevel.connect(bus);
      timed.push([shard, at + 0.12]);
    });
  }

  let last = timed[0];
  for (const entry of timed) {
    entry[0].start(when);
    entry[0].stop(entry[1]);
    if (entry[1] > last[1]) last = entry;
  }
  return { nodes, last: last[0] };
}

/** Klaxon à deux tons, tenu tant que le bouton est maintenu. */
function buildHorn(ctx: BaseAudioContext, out: AudioNode, when: number) {
  const level = ctx.createGain();
  level.gain.setValueAtTime(0, when);
  level.gain.linearRampToValueAtTime(0.14, when + 0.02);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = 1100;
  band.Q.value = 0.7;
  const low = ctx.createOscillator();
  low.type = "square";
  low.frequency.value = 415;
  const high = ctx.createOscillator();
  high.type = "square";
  high.frequency.value = 523;
  low.connect(band);
  high.connect(band);
  band.connect(level);
  level.connect(out);
  low.start(when);
  high.start(when);
  return { level, sources: [low, high], nodes: [low, high, band, level] as AudioNode[] };
}

export type AudioContextFactory = () => AudioContext | null;

const defaultFactory: AudioContextFactory = () => (typeof AudioContext === "undefined" ? null : new AudioContext());

/**
 * Chef d'orchestre du son de Léo. Coupé au départ : rien n'est créé tant que l'enfant n'a pas activé le son.
 */
export class LeoSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engine: ReturnType<typeof buildVroom> | null = null;
  private horn: ReturnType<typeof buildHorn> | null = null;
  private readonly model = new EngineModel();
  private passers = 0;
  private live = 0;
  private enabledFlag = false;
  private paused = false;
  private readonly onVisibility = () => this.applyRunning();

  constructor(
    private readonly createContext: AudioContextFactory = defaultFactory,
    private readonly doc: Document | null = typeof document === "undefined" ? null : document,
  ) {
    this.doc?.addEventListener("visibilitychange", this.onVisibility);
  }

  get enabled() {
    return this.enabledFlag;
  }

  /** Nœuds audio en vie (moteur, sortie et sons ponctuels en cours) : sert à vérifier qu'aucun n'est oublié. */
  get activeNodes() {
    return this.live;
  }

  get engineState(): Readonly<EngineState> {
    return this.model.state;
  }

  /**
   * Active ou coupe le son. À appeler depuis le geste de l'enfant (clic) : c'est là que le contexte audio est créé.
   * Renvoie l'état obtenu (faux si le navigateur ne fournit pas de son).
   */
  setEnabled(on: boolean) {
    if (on && !this.ctx) {
      const ctx = this.createContext();
      if (!ctx) return false;
      this.ctx = ctx;
      const master = ctx.createGain();
      master.gain.value = DEFAULT_VOLUME * VOLUME_CAP;
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.knee.value = 0;
      limiter.ratio.value = 20;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.1;
      master.connect(limiter);
      limiter.connect(ctx.destination);
      this.master = master;
      this.engine = buildVroom(ctx, master);
      this.live += 2 + this.engine.nodes.length;
      this.engine.set(this.model.state, ctx.currentTime);
    }
    this.enabledFlag = on && this.ctx !== null;
    if (!this.enabledFlag) this.hornOff();
    this.applyRunning();
    return this.enabledFlag;
  }

  /** Pause du jeu : le son se tait (calcul suspendu) et reprend avec le jeu. */
  setPaused(paused: boolean) {
    this.paused = paused;
    if (paused) this.hornOff();
    this.applyRunning();
  }

  /** Nouvelle image du jeu : vitesse réelle de Léo et pédales. Le régime est calculé même son coupé (sans coût). */
  update(kmh: number, accelerating: boolean, braking: boolean, seconds: number) {
    const state = this.model.step(kmh, accelerating, braking, seconds);
    if (this.audible() && this.engine && this.ctx) this.engine.set(state, this.ctx.currentTime);
  }

  hornOn() {
    if (!this.audible() || this.horn || !this.ctx || !this.master) return;
    this.horn = buildHorn(this.ctx, this.master, this.ctx.currentTime);
    this.live += this.horn.nodes.length;
  }

  hornOff() {
    const horn = this.horn;
    if (!horn || !this.ctx) return;
    this.horn = null;
    const t = this.ctx.currentTime;
    horn.level.gain.cancelScheduledValues(t);
    horn.level.gain.setTargetAtTime(0, t, 0.03);
    horn.sources[0].onended = () => this.release(horn.nodes);
    for (const source of horn.sources) source.stop(t + 0.15);
  }

  /** Une voiture croise Léo. `closeness` (0 à 1) : plus elle passe près, plus on l'entend. */
  passBy(direction: 1 | -1, pitch: number, closeness: number) {
    if (!this.audible() || !this.ctx || !this.master || this.passers >= MAX_PASSERS) return false;
    const loud = 0.06 + Math.max(0, Math.min(1, closeness)) * 0.16;
    const shot = buildPassBy(this.ctx, this.master, this.ctx.currentTime + 0.02, direction, pitch, loud);
    this.passers += 1;
    this.play(shot, () => { this.passers -= 1; });
    return true;
  }

  /** Choc à `kmh` : petit choc, accrochage ou accident. */
  crash(kmh: number) {
    const intensity = collisionLevel(kmh);
    if (!this.audible() || !this.ctx || !this.master) return null;
    this.play(buildCrash(this.ctx, this.master, this.ctx.currentTime + 0.01, intensity));
    return collisionKind(intensity);
  }

  destroy() {
    this.doc?.removeEventListener("visibilitychange", this.onVisibility);
    this.enabledFlag = false;
    const ctx = this.ctx;
    this.ctx = null;
    this.engine = null;
    this.master = null;
    this.horn = null;
    if (ctx) void ctx.close();
  }

  private audible() {
    return this.enabledFlag && !this.paused && !(this.doc?.hidden ?? false);
  }

  /** Suspend le calcul audio quand le son n'a pas à être entendu (coupé, pause, onglet caché). */
  private applyRunning() {
    const ctx = this.ctx;
    if (!ctx) return;
    if (this.audible()) {
      if (ctx.state !== "running") void ctx.resume();
    } else {
      this.hornOff();
      if (ctx.state === "running") void ctx.suspend();
    }
  }

  private play(shot: OneShot, onDone?: () => void) {
    this.live += shot.nodes.length;
    shot.last.onended = () => {
      this.release(shot.nodes);
      onDone?.();
    };
  }

  private release(nodes: AudioNode[]) {
    for (const node of nodes) node.disconnect();
    this.live -= nodes.length;
  }
}
