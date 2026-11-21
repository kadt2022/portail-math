// Son de Léo : moteur « Vroom », voitures qui passent, collisions et klaxon, entièrement calculés par l'API Web Audio
// du navigateur, sur un fond sonore de ville (un seul fichier MP3, joué en boucle). Aucune bibliothèque, aucun
// réglage enregistré (doctrine V1).
//
// Garde-fous :
// - son coupé au départ ; le contexte audio n'est créé qu'à l'activation par l'enfant (geste exigé par les navigateurs) ;
//   le fond sonore n'est téléchargé qu'à ce moment-là, jamais si l'enfant garde le son coupé ;
// - volume plafonné puis limiteur : aucun réglage ne produit de pic sonore ;
// - son suspendu en pause et quand l'onglet passe en arrière-plan (fond sonore compris, repris au même endroit) ;
// - chaque son ponctuel (klaxon, passage, collision) libère ses nœuds à la fin ; trois voitures entendues au plus.
//
// Module sans Phaser : la scène lui transmet la vitesse et les pédales, il ne lit rien d'autre.

import { loopBounds } from "../../games/audio/GameAudio";

import cityAmbienceUrl from "./assets/leo-ambiance-ville.mp3";

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
  /** Vitesse réelle (km/h, sans signe) : règle le bruit des pneus sur la route. */
  kmh: number;
}

/**
 * Régime moteur déduit de la vitesse réelle de Léo, avec une boîte à 5 rapports : en accélérant, le régime monte
 * puis retombe à chaque rapport passé. Pur et déterministe (testable).
 */
export class EngineModel {
  state: EngineState = { rpm: IDLE_RPM, gear: 1, throttle: 0.1, shiftDip: 0, kmh: 0 };

  step(kmh: number, accelerating: boolean, braking: boolean, seconds: number): EngineState {
    const speed = Math.abs(kmh);
    const state = this.state;
    state.kmh = speed;
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

/** Vitesse (km/h) à laquelle le bruit des pneus atteint son niveau maximal. */
const TIRE_FULL_KMH = 90;

/**
 * Moteur d'une petite citadine moderne : un ronronnement grave et lisse (ondes douces, aucune saturation, aucun
 * battement), à peine plus présent à l'accélération, et le bruit des pneus sur la route qui monte avec la vitesse.
 * C'est ce roulement, plus que le moteur, qu'on entend dans une voiture d'aujourd'hui.
 */
function buildVroom(ctx: BaseAudioContext, out: AudioNode) {
  // Fondamentale douce (triangle) et son octave grave (sinus) : un timbre rond, sans la râpe des dents de scie.
  const hum = ctx.createOscillator();
  hum.type = "triangle";
  const body = ctx.createOscillator();
  body.type = "sine";
  const bodyLevel = ctx.createGain();
  bodyLevel.gain.value = 0.8;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.Q.value = 0.5;
  const engineLevel = ctx.createGain();
  engineLevel.gain.value = 0;
  // Roulement des pneus : bruit large, centré dans les graves-médiums, réglé sur la vitesse.
  const tires = ctx.createBufferSource();
  tires.buffer = noiseBuffer(ctx);
  tires.loop = true;
  const tireBand = ctx.createBiquadFilter();
  tireBand.type = "bandpass";
  tireBand.Q.value = 0.7;
  const tireLevel = ctx.createGain();
  tireLevel.gain.value = 0;
  const level = ctx.createGain();
  level.gain.value = 1;
  hum.connect(tone);
  body.connect(bodyLevel);
  bodyLevel.connect(tone);
  tone.connect(engineLevel);
  engineLevel.connect(level);
  tires.connect(tireBand);
  tireBand.connect(tireLevel);
  tireLevel.connect(level);
  level.connect(out);
  for (const source of [hum, body, tires]) source.start();
  const nodes: AudioNode[] = [hum, body, bodyLevel, tone, engineLevel, tires, tireBand, tireLevel, level];
  return {
    nodes,
    set(engine: EngineState, t: number) {
      const f = firingFrequency(engine.rpm);
      // Boîte moderne : le passage de rapport s'entend à peine (léger creux, pas de coupure).
      const load = engine.shiftDip > 0 ? engine.throttle * 0.6 : engine.throttle;
      hum.frequency.setTargetAtTime(f, t, 0.12);
      body.frequency.setTargetAtTime(f / 2, t, 0.12);
      tone.frequency.setTargetAtTime(220 + engine.rpm * 0.05 + load * 160, t, 0.1);
      engineLevel.gain.setTargetAtTime(0.24 + load * 0.1, t, 0.1);
      const roll = Math.min(1, engine.kmh / TIRE_FULL_KMH);
      tireBand.frequency.setTargetAtTime(350 + roll * 450, t, 0.2);
      tireLevel.gain.setTargetAtTime(roll * 0.28, t, 0.15);
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

/** Petits signaux de la mission : remise des pizzas, bonne réponse, invitation à réessayer. */
export type LeoCue = "deliver" | "correct" | "retry";

/** Notes (Hz) de chaque signal : courtes, douces, jamais stridentes. Réessayer reste neutre (pas de son d'échec). */
export const CUE_NOTES: Record<LeoCue, readonly number[]> = {
  deliver: [587, 784],
  correct: [523, 659, 784],
  retry: [392, 349],
};
/** Volume d'un signal : discret, sous le moteur. */
export const CUE_VOLUME = 0.12;
const CUE_NOTE_SECONDS = 0.14;

function buildCue(ctx: BaseAudioContext, out: AudioNode, when: number, kind: LeoCue): OneShot {
  const nodes: AudioNode[] = [];
  let last: OscillatorNode | null = null;
  CUE_NOTES[kind].forEach((frequency, index) => {
    const start = when + index * CUE_NOTE_SECONDS;
    const note = ctx.createOscillator();
    note.type = "sine";
    note.frequency.value = frequency;
    const level = ctx.createGain();
    level.gain.setValueAtTime(0.0001, start);
    level.gain.exponentialRampToValueAtTime(CUE_VOLUME, start + 0.015);
    level.gain.exponentialRampToValueAtTime(0.0001, start + CUE_NOTE_SECONDS * 1.6);
    note.connect(level);
    level.connect(out);
    note.start(start);
    note.stop(start + CUE_NOTE_SECONDS * 1.7);
    nodes.push(note, level);
    last = note;
  });
  return { nodes, last: last as unknown as OscillatorNode };
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
 * Volume du fond sonore de ville (gain avant le limiteur) : un murmure tout juste perceptible, très loin sous le moteur et les klaxons. Le
 * plafond est fixé ici et non par l'appareil : même volume du téléphone à fond, le fond reste doux.
 */
export const AMBIENCE_VOLUME = 0.04;
/** Les aigus du bruit (souffle, ressac) sont adoucis au-dessus de cette fréquence (Hz) : un fond feutré, jamais agressif. */
export const AMBIENCE_LOWPASS_HZ = 1200;
/** Montée progressive du fond sonore à son arrivée (s) : jamais d'entrée brutale. */
export const AMBIENCE_FADE_SECONDS = 1.5;

/** Charge et décode le fond sonore ; `null` si le navigateur ne peut pas le fournir. */
export type AmbienceLoader = (ctx: AudioContext) => Promise<AudioBuffer | null>;

export const loadCityAmbience: AmbienceLoader = async (ctx) => {
  if (typeof fetch === "undefined") return null;
  const response = await fetch(cityAmbienceUrl);
  if (!response.ok) return null;
  return ctx.decodeAudioData(await response.arrayBuffer());
};

/**
 * Chef d'orchestre du son de Léo. Coupé au départ : rien n'est créé tant que l'enfant n'a pas activé le son.
 */
export class LeoSound {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambience: GainNode | null = null;
  private ambienceSource: AudioBufferSourceNode | null = null;
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
    private readonly loadAmbience: AmbienceLoader | null = loadCityAmbience,
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
      // Fond sonore : sa propre piste, branchée sur le limiteur (son volume ne dépend pas de celui du moteur).
      const ambience = ctx.createGain();
      ambience.gain.value = 0;
      ambience.connect(limiter);
      this.ambience = ambience;
      this.live += 1;
      this.loadAmbience?.(ctx)
        .then((buffer) => this.startAmbience(ctx, buffer))
        // Fond sonore indisponible (réseau, format) : le jeu garde ses autres sons, sans erreur visible.
        .catch(() => undefined);
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

  /** Signal de la mission (remise des pizzas, réponse). Silencieux si le son est coupé. */
  cue(kind: LeoCue) {
    if (!this.audible() || !this.ctx || !this.master) return false;
    this.play(buildCue(this.ctx, this.master, this.ctx.currentTime + 0.01, kind));
    return true;
  }

  destroy() {
    this.doc?.removeEventListener("visibilitychange", this.onVisibility);
    this.enabledFlag = false;
    const ctx = this.ctx;
    this.ctx = null;
    this.engine = null;
    this.master = null;
    this.ambience = null;
    this.ambienceSource = null;
    this.horn = null;
    if (ctx) void ctx.close();
  }

  /** Fond sonore en boucle continue (sans le silence de compression aux bornes), monté en douceur. */
  private startAmbience(ctx: AudioContext, buffer: AudioBuffer | null) {
    const gain = this.ambience;
    // Contexte fermé ou remplacé entre-temps : le fond sonore arrivé en retard est ignoré.
    if (!buffer || this.ctx !== ctx || !gain || this.ambienceSource) return;
    const { start, end } = loopBounds(buffer);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.loopStart = start;
    source.loopEnd = end;
    const soften = ctx.createBiquadFilter();
    soften.type = "lowpass";
    soften.frequency.value = AMBIENCE_LOWPASS_HZ;
    soften.Q.value = 0.5;
    source.connect(soften);
    soften.connect(gain);
    this.live += 1;
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(AMBIENCE_VOLUME, t + AMBIENCE_FADE_SECONDS);
    source.start(t, start);
    this.ambienceSource = source;
    this.live += 1;
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
