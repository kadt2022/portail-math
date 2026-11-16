import { describe, expect, it, vi } from "vitest";

import {
  DEFAULT_VOLUME,
  EngineModel,
  IDLE_RPM,
  LeoSound,
  MAX_PASSERS,
  REDLINE_RPM,
  VOLUME_CAP,
  collisionKind,
  collisionLevel,
  firingFrequency,
  passerPitch,
} from "./leoAudio";

/**
 * Contexte audio simulé : enregistre chaque nœud créé, ses branchements et ses réglages. Les sources ne s'arrêtent
 * que lorsque le test le décide (`finish`), comme le ferait le moteur audio du navigateur.
 */
class FakeParam {
  value = 0;
  readonly calls: Array<[string, number]> = [];
  setValueAtTime(value: number) { this.calls.push(["set", value]); this.value = value; return this; }
  setTargetAtTime(value: number) { this.calls.push(["target", value]); this.value = value; return this; }
  linearRampToValueAtTime(value: number) { this.calls.push(["linear", value]); this.value = value; return this; }
  exponentialRampToValueAtTime(value: number) { this.calls.push(["exp", value]); this.value = value; return this; }
  cancelScheduledValues() { this.calls.push(["cancel", 0]); return this; }
}

class FakeNode {
  connected = 0;
  disconnected = false;
  type = "";
  Q = new FakeParam();
  gain = new FakeParam();
  frequency = new FakeParam();
  pan = new FakeParam();
  threshold = new FakeParam();
  knee = new FakeParam();
  ratio = new FakeParam();
  attack = new FakeParam();
  release = new FakeParam();
  curve: Float32Array | null = null;
  buffer: unknown = null;
  loop = false;
  started = false;
  stopped = false;
  onended: (() => void) | null = null;
  constructor(readonly kind: string) {}
  connect() { this.connected += 1; return this; }
  disconnect() { this.disconnected = true; }
  start() { this.started = true; }
  stop() { this.stopped = true; }
}

class FakeContext {
  state: "running" | "suspended" | "closed" = "suspended";
  currentTime = 1;
  sampleRate = 8000;
  destination = new FakeNode("destination");
  readonly nodes: FakeNode[] = [];
  resume = vi.fn(async () => { this.state = "running"; });
  suspend = vi.fn(async () => { this.state = "suspended"; });
  close = vi.fn(async () => { this.state = "closed"; });
  private make(kind: string) { const node = new FakeNode(kind); this.nodes.push(node); return node; }
  createGain() { return this.make("gain"); }
  createOscillator() { return this.make("oscillator"); }
  createBiquadFilter() { return this.make("filter"); }
  createWaveShaper() { return this.make("shaper"); }
  createBufferSource() { return this.make("buffer-source"); }
  createStereoPanner() { return this.make("panner"); }
  createDynamicsCompressor() { return this.make("compressor"); }
  createBuffer(_channels: number, length: number) { return { getChannelData: () => new Float32Array(length) }; }
  /** Fin de tous les sons ponctuels en cours : déclenche leurs `onended`. */
  finish() { for (const node of this.nodes) if (node.stopped && node.onended) { const done = node.onended; node.onended = null; done(); } }
}

function setup(options: { hidden?: boolean } = {}) {
  const ctx = new FakeContext();
  const listeners = new Set<() => void>();
  const doc = {
    hidden: options.hidden ?? false,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  };
  const factory = vi.fn(() => ctx as unknown as AudioContext);
  const sound = new LeoSound(factory, doc as unknown as Document);
  const fireVisibility = (hidden: boolean) => { doc.hidden = hidden; listeners.forEach((listener) => listener()); };
  return { ctx, sound, factory, fireVisibility, listeners };
}

describe("régime moteur (boîte à 5 rapports)", () => {
  it("tourne au ralenti à l'arrêt, en première", () => {
    const model = new EngineModel();
    const state = model.step(0, false, false, 0.016);
    expect(state.rpm).toBe(IDLE_RPM);
    expect(state.gear).toBe(1);
    expect(state.throttle).toBeLessThan(0.25);
  });

  it("fait « vroom… vroom » : le régime monte puis retombe à chaque rapport passé en accélérant", () => {
    const model = new EngineModel();
    const trace: Array<{ kmh: number; rpm: number; gear: number; dip: number }> = [];
    for (let kmh = 0; kmh <= 120; kmh += 1) {
      const state = model.step(kmh, true, false, 0.016);
      trace.push({ kmh, rpm: state.rpm, gear: state.gear, dip: state.shiftDip });
    }
    const shifts = trace.filter((point, index) => index > 0 && point.gear > trace[index - 1].gear);
    // Pied au plancher jusqu'à 120 km/h : 1re → 4e (la 4e monte jusqu'à environ 145 km/h).
    expect(shifts.length).toBe(3);
    for (const shift of shifts) {
      const before = trace[trace.indexOf(shift) - 1];
      expect(shift.rpm).toBeLessThan(before.rpm);
      expect(shift.dip).toBeGreaterThan(0);
    }
    expect(Math.max(...trace.map((point) => point.rpm))).toBeLessThanOrEqual(REDLINE_RPM);
    expect(trace.at(-1)?.gear).toBe(4);
    // Pied levé à 120 km/h : la 5e passe, le moteur s'apaise.
    expect(model.step(120, false, false, 0.016).gear).toBe(5);
  });

  it("passe les rapports plus tôt pied levé et rétrograde en ralentissant", () => {
    const pulling = new EngineModel();
    const cruising = new EngineModel();
    pulling.step(40, true, false, 0.016);
    cruising.step(40, false, false, 0.016);
    expect(cruising.state.gear).toBeGreaterThan(pulling.state.gear);
    const slowing = new EngineModel();
    slowing.step(100, false, false, 0.016);
    const high = slowing.state.gear;
    slowing.step(15, false, true, 0.016);
    expect(slowing.state.gear).toBeLessThan(high);
    expect(slowing.state.throttle).toBe(0.1);
  });

  it("donne une fréquence grave, jamais en dessous d'un plancher audible", () => {
    expect(firingFrequency(IDLE_RPM)).toBe(36);
    expect(firingFrequency(3000)).toBe(100);
  });
});

describe("collisions et voitures qui passent", () => {
  it("règle la force du choc sur la vitesse", () => {
    expect(collisionLevel(0)).toBe(0.25);
    expect(collisionKind(collisionLevel(15))).toBe("petit choc");
    expect(collisionKind(collisionLevel(50))).toBe("accrochage");
    expect(collisionKind(collisionLevel(100))).toBe("accident");
    expect(collisionLevel(-100)).toBe(1);
  });

  it("donne aux bus une tonalité plus grave", () => {
    expect(passerPitch("city-bus", 1)).toBe(55);
    expect(passerPitch("school-bus", 2)).toBe(55);
    expect(passerPitch("compact", 4)).toBeGreaterThan(55);
  });
});

describe("son de Léo", () => {
  it("reste coupé au départ : aucun contexte audio créé avant le geste de l'enfant", () => {
    const { sound, factory, ctx } = setup();
    sound.update(50, true, false, 0.016);
    sound.hornOn();
    expect(sound.passBy(1, 80, 1)).toBe(false);
    expect(sound.crash(80)).toBeNull();
    expect(factory).not.toHaveBeenCalled();
    expect(sound.enabled).toBe(false);
    expect(ctx.nodes).toHaveLength(0);
  });

  it("démarre le moteur à l'activation, avec un volume plafonné et un limiteur", () => {
    const { sound, ctx, factory } = setup();
    expect(sound.setEnabled(true)).toBe(true);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(ctx.resume).toHaveBeenCalled();
    const master = ctx.nodes[0];
    expect(master.gain.value).toBeCloseTo(DEFAULT_VOLUME * VOLUME_CAP);
    expect(master.gain.value).toBeLessThanOrEqual(VOLUME_CAP);
    expect(ctx.nodes.some((node) => node.kind === "compressor")).toBe(true);
    expect(sound.activeNodes).toBe(ctx.nodes.length);
    // Le moteur suit la vitesse : sa tonalité monte quand Léo accélère.
    const saw = ctx.nodes.find((node) => node.kind === "oscillator") as FakeNode;
    sound.update(0, false, false, 0.016);
    const idle = saw.frequency.value;
    sound.update(40, true, false, 0.016);
    expect(saw.frequency.value).toBeGreaterThan(idle);
    // Réactiver ne recrée rien.
    sound.setEnabled(true);
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("se tait quand on coupe le son, puis reprend", () => {
    const { sound, ctx } = setup();
    sound.setEnabled(true);
    expect(sound.setEnabled(false)).toBe(false);
    expect(ctx.suspend).toHaveBeenCalled();
    expect(ctx.state).toBe("suspended");
    sound.setEnabled(true);
    expect(ctx.state).toBe("running");
  });

  it("reste coupé si le navigateur ne fournit pas de son", () => {
    const sound = new LeoSound(() => null, null);
    expect(sound.setEnabled(true)).toBe(false);
    expect(sound.enabled).toBe(false);
    sound.destroy();
  });

  it("klaxonne tant que le bouton est tenu, puis libère ses nœuds", () => {
    const { sound, ctx } = setup();
    sound.setEnabled(true);
    const base = sound.activeNodes;
    sound.hornOn();
    sound.hornOn();
    expect(sound.activeNodes).toBe(base + 4);
    sound.hornOff();
    sound.hornOff();
    ctx.finish();
    expect(sound.activeNodes).toBe(base);
    expect(ctx.nodes.filter((node) => node.disconnected)).toHaveLength(4);
  });

  it("fait entendre trois voitures au plus, et libère chaque passage", () => {
    const { sound, ctx } = setup();
    sound.setEnabled(true);
    const base = sound.activeNodes;
    const accepted = [1, -1, 1, -1, 1].map((direction) => sound.passBy(direction as 1 | -1, 80, 0.5));
    expect(accepted.filter(Boolean)).toHaveLength(MAX_PASSERS);
    expect(sound.activeNodes).toBe(base + MAX_PASSERS * 8);
    const panners = ctx.nodes.filter((node) => node.kind === "panner");
    expect(panners[0].pan.calls[0]).toEqual(["set", -1]);
    ctx.finish();
    expect(sound.activeNodes).toBe(base);
    expect(sound.passBy(1, 55, 2)).toBe(true);
  });

  it("joue un choc plus riche pour un accident (éclats de verre) et libère tout", () => {
    const { sound, ctx } = setup();
    sound.setEnabled(true);
    const base = sound.activeNodes;
    expect(sound.crash(15)).toBe("petit choc");
    const small = sound.activeNodes - base;
    ctx.finish();
    expect(sound.activeNodes).toBe(base);
    expect(sound.crash(100)).toBe("accident");
    expect(sound.activeNodes - base).toBe(small + 10);
    ctx.finish();
    expect(sound.activeNodes).toBe(base);
  });

  it("se suspend en pause et quand l'onglet est caché, puis reprend seulement si le son est activé", () => {
    const { sound, ctx, fireVisibility } = setup();
    sound.setEnabled(true);
    sound.hornOn();
    sound.setPaused(true);
    expect(ctx.state).toBe("suspended");
    expect(sound.passBy(1, 80, 1)).toBe(false);
    sound.setPaused(false);
    expect(ctx.state).toBe("running");
    fireVisibility(true);
    expect(ctx.state).toBe("suspended");
    expect(sound.crash(50)).toBeNull();
    fireVisibility(false);
    expect(ctx.state).toBe("running");
    sound.setEnabled(false);
    fireVisibility(true);
    fireVisibility(false);
    expect(ctx.state).toBe("suspended");
  });

  it("ferme le contexte audio et cesse d'écouter la page à la destruction", () => {
    const { sound, ctx, listeners } = setup();
    sound.setEnabled(true);
    sound.destroy();
    expect(ctx.close).toHaveBeenCalled();
    expect(listeners.size).toBe(0);
    expect(sound.enabled).toBe(false);
    new LeoSound(() => null, null).destroy();
  });
});
