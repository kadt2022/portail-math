import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_MUSIC_VOLUME, GameAudio, loopBounds, MUSIC_FADE_IN_MS, MUSIC_FADE_OUT_MS } from "./GameAudio";
import { SOUND_EFFECTS } from "./sound-effects";

// Faux contexte audio : il enregistre les nœuds créés, leurs connexions et les automatisations de volume.
class FakeParam {
  value: number;
  events: { type: string; value: number; time: number }[] = [];
  constructor(value = 1) {
    this.value = value;
  }
  setValueAtTime(value: number, time: number) {
    this.events.push({ type: "set", value, time });
    return this;
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.events.push({ type: "linear", value, time });
    return this;
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    this.events.push({ type: "exp", value, time });
    return this;
  }
  cancelScheduledValues() {
    return this;
  }
  /** Dernière valeur visée par une rampe. */
  get target() {
    return this.events.length ? this.events[this.events.length - 1].value : this.value;
  }
}

class FakeNode {
  outputs: FakeNode[] = [];
  constructor(readonly kind: string) {}
  connect(node: FakeNode) {
    this.outputs.push(node);
    return node;
  }
  disconnect() {}
}

class FakeGain extends FakeNode {
  gain: FakeParam;
  constructor(value = 1) {
    super("gain");
    this.gain = new FakeParam(value);
  }
}

class FakeSource extends FakeNode {
  buffer: unknown = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  started: { when: number; offset?: number } | null = null;
  stoppedAt: number | null = null;
  frequency = new FakeParam(440);
  type = "sine";
  constructor(kind: string) {
    super(kind);
  }
  start(when = 0, offset?: number) {
    this.started = { when, offset };
  }
  stop(when = 0) {
    this.stoppedAt = when;
  }
}

function fakeBuffer(samples: number[][], sampleRate = 100) {
  return {
    numberOfChannels: samples.length,
    length: samples[0].length,
    sampleRate,
    duration: samples[0].length / sampleRate,
    getChannelData: (channel: number) => Float32Array.from(samples[channel]),
  } as unknown as AudioBuffer;
}

class FakeContext {
  state: AudioContextState = "running";
  currentTime = 10;
  sampleRate = 100;
  destination = new FakeNode("destination");
  gains: FakeGain[] = [];
  sources: FakeSource[] = [];
  oscillators: FakeSource[] = [];
  decoded = fakeBuffer([[0, 0, 0.5, 0.4, 0.3, 0.2, 0.1, 0.2, 0, 0]]);
  createGain() {
    const node = new FakeGain();
    this.gains.push(node);
    return node;
  }
  createBufferSource() {
    const node = new FakeSource("source");
    this.sources.push(node);
    return node;
  }
  createOscillator() {
    const node = new FakeSource("oscillator");
    this.oscillators.push(node);
    return node;
  }
  createDynamicsCompressor() {
    const node = new FakeNode("compressor") as FakeNode & Record<string, FakeParam>;
    for (const name of ["threshold", "knee", "ratio", "attack", "release"]) node[name] = new FakeParam(0);
    this.compressors.push(node);
    return node;
  }
  compressors: FakeNode[] = [];
  createBiquadFilter() {
    const node = new FakeSource("filter");
    return node;
  }
  createBuffer(channels: number, length: number, rate: number) {
    return fakeBuffer(Array.from({ length: channels }, () => new Array(length).fill(0)), rate);
  }
  decodeAudioData() {
    return Promise.resolve(this.decoded);
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  close() {
    this.state = "closed";
    return Promise.resolve();
  }
}

function setup(options: { storageKey?: string } = {}) {
  const context = new FakeContext();
  const audio = new GameAudio({ ...options, createContext: () => context as unknown as AudioContext });
  return { audio, context };
}

// Pistes, dans l'ordre de création : général, musique, effets, fondu de la musique.
const tracks = (context: FakeContext) => ({ master: context.gains[0], music: context.gains[1], effects: context.gains[2], fade: context.gains[3] });

async function withMusic() {
  const { audio, context } = setup();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }));
  audio.unlock();
  await audio.loadMusic("/musique.mp3");
  return { audio, context, musicSource: () => context.sources.find((source) => source.loop) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
});

describe("moteur audio des jeux", () => {
  it("deux pistes indépendantes (musique, effets) sous une commande générale ; musique discrète à 25 %", () => {
    const { audio, context } = setup();
    audio.unlock();
    const { master, music, effects, fade } = tracks(context);
    expect(master.outputs).toContain(context.destination);
    expect(music.outputs).toEqual([master]);
    // Les effets passent par un limiteur avant la sortie générale.
    expect(effects.outputs).toEqual([context.compressors[0]]);
    expect(context.compressors[0].outputs).toEqual([master]);
    expect(fade.outputs).toEqual([music]);
    expect(music.gain.value).toBe(DEFAULT_MUSIC_VOLUME);
    expect(DEFAULT_MUSIC_VOLUME).toBe(0.25);
    audio.setMusicVolume(0.1);
    audio.setEffectsVolume(0.9);
    expect(music.gain.value).toBe(0.1);
    expect(effects.gain.value).toBe(0.9);
  });

  it("la musique tourne en boucle sans le silence technique de la compression, et démarre en fondu", async () => {
    const { audio, context, musicSource } = await withMusic();
    audio.playMusic();
    const source = musicSource()!;
    expect(source.loop).toBe(true);
    // Le faux morceau a deux échantillons de silence au début et à la fin : la boucle les écarte.
    expect(source.loopStart).toBeCloseTo(0.02);
    expect(source.loopEnd).toBeCloseTo(0.08);
    const fade = tracks(context).fade.gain;
    expect(fade.events.at(-1)).toEqual({ type: "linear", value: 1, time: 10 + MUSIC_FADE_IN_MS / 1000 });
  });

  it("pause : fondu vers le silence puis arrêt ; la reprise repart au même endroit du morceau", async () => {
    const { audio, context, musicSource } = await withMusic();
    audio.playMusic();
    const first = musicSource()!;
    context.currentTime = 10.03;
    audio.pauseMusic();
    const fade = tracks(context).fade.gain;
    expect(fade.events.at(-1)).toEqual({ type: "linear", value: 0, time: 10.03 + MUSIC_FADE_OUT_MS / 1000 });
    expect(first.stoppedAt).toBeCloseTo(10.03 + MUSIC_FADE_OUT_MS / 1000 + 0.02);
    expect(audio.musicPlaying).toBe(false);
    audio.playMusic();
    const second = context.sources.filter((source) => source.loop).at(-1)!;
    expect(second).not.toBe(first);
    // Reprise dans la boucle (bornes 0,02 → 0,08 s), jamais au début du fichier.
    expect(second.started!.offset).toBeGreaterThanOrEqual(0.02);
    expect(second.started!.offset).toBeLessThan(0.08);
  });

  it("un effet part à l'instant exact de l'appel, sur la piste des effets, sans toucher à la musique", async () => {
    const { audio, context, musicSource } = await withMusic();
    audio.playMusic();
    const music = musicSource()!;
    const fadeEvents = tracks(context).fade.gain.events.length;
    context.currentTime = 12.5;
    audio.play("explosion", { intensity: 1 });
    const started = [...context.oscillators, ...context.sources.filter((source) => !source.loop)].map((node) => node.started?.when);
    expect(started.length).toBeGreaterThan(0);
    expect(started.every((when) => when === 12.5)).toBe(true);
    // La musique continue : ni arrêt, ni fondu.
    expect(music.stoppedAt).toBeNull();
    expect(tracks(context).fade.gain.events).toHaveLength(fadeEvents);
  });

  it("explosion proportionnelle au nombre de boules : plus de couches et plus longue à chaque boule de plus", () => {
    const layers: number[] = [];
    const lengths: number[] = [];
    for (const count of [1, 2, 3, 5]) {
      const { audio, context } = setup();
      audio.unlock();
      audio.play("explosion", { intensity: 1, count });
      const nodes = [...context.oscillators, ...context.sources];
      layers.push(nodes.length);
      lengths.push(Math.max(...nodes.map((node) => node.stoppedAt ?? 0)) - 10);
    }
    for (let index = 1; index < layers.length; index += 1) {
      expect(layers[index]).toBeGreaterThan(layers[index - 1]);
      expect(lengths[index]).toBeGreaterThan(lengths[index - 1]);
    }
  });

  it("chaque effet sonore se fabrique sans fichier, sur la piste des effets", () => {
    const { audio, context } = setup();
    audio.unlock();
    for (const effect of SOUND_EFFECTS) {
      const before = context.oscillators.length + context.sources.length;
      audio.play(effect);
      expect(context.oscillators.length + context.sources.length, effect).toBeGreaterThan(before);
    }
  });

  it("commande générale : coupe musique et effets ensemble, choix mémorisé pour la visite suivante", async () => {
    const { audio, context } = await withMusic().then((value) => ({ ...value, audio: value.audio }));
    const master = tracks(context).master.gain;
    audio.setMuted(true);
    expect(master.target).toBe(0);
    const nodes = context.oscillators.length;
    audio.play("shot");
    expect(context.oscillators.length).toBe(nodes);
    audio.setMuted(false);
    expect(master.target).toBe(1);

    const remembered = setup({ storageKey: "test.son" });
    remembered.audio.setMuted(true);
    expect(setup({ storageKey: "test.son" }).audio.muted).toBe(true);
  });

  it("sans geste du joueur (son suspendu par le navigateur), rien ne joue ; le premier toucher réveille la musique", async () => {
    const context = new FakeContext();
    context.state = "suspended";
    const audio = new GameAudio({ createContext: () => context as unknown as AudioContext });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }));
    await audio.loadMusic("/musique.mp3");
    audio.playMusic();
    audio.play("shot");
    expect(context.sources.filter((source) => source.loop)).toHaveLength(0);
    audio.unlock();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(context.sources.filter((source) => source.loop)).toHaveLength(1);
  });

  it("bornes de boucle : silence écarté au début et à la fin, morceau entier s'il n'y a pas de son", () => {
    expect(loopBounds(fakeBuffer([[0, 0, 0.3, 0.2, 0, 0]]))).toEqual({ start: 0.02, end: 0.04 });
    expect(loopBounds(fakeBuffer([[0, 0, 0, 0]]))).toEqual({ start: 0, end: 0.04 });
  });
});
