// Sons de la rivière, synthétisés sur place avec Web Audio : murmure de l'eau, oiseaux, carillon d'une bonne voie,
// note grave d'une erreur, petite fanfare d'arrivée. Aucun fichier son à télécharger.

export type RiverSound = "correct" | "wrong" | "complete" | "castOff";

export interface RiverAudio {
  /** Allume ou coupe le son ; renvoie faux si le navigateur ne peut pas jouer de son. */
  setEnabled(enabled: boolean): boolean;
  /** À appeler dans un geste de l'enfant : le navigateur n'autorise le son qu'après. */
  unlock(): void;
  play(sound: RiverSound): void;
  /** Coupe l'ambiance pendant une pause, sans changer le réglage du son. */
  setSuspended(suspended: boolean): void;
  dispose(): void;
}

type AudioContextConstructor = new () => AudioContext;

function audioContextClass(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null;
  const candidate = (window as unknown as { AudioContext?: AudioContextConstructor; webkitAudioContext?: AudioContextConstructor });
  return candidate.AudioContext ?? candidate.webkitAudioContext ?? null;
}

export function createRiverAudio(): RiverAudio {
  const Context = audioContextClass();
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let ambience: AudioBufferSourceNode | null = null;
  let birds: ReturnType<typeof setTimeout> | null = null;
  let enabled = false;
  let suspended = false;

  const ensure = (): AudioContext | null => {
    if (!Context) return null;
    if (!context) {
      try {
        context = new Context();
      } catch {
        return null;
      }
      master = context.createGain();
      master.gain.value = 0;
      master.connect(context.destination);
    }
    return context;
  };

  const startAmbience = () => {
    const ctx = ensure();
    if (!ctx || !master || ambience) return;
    // Murmure de l'eau : bruit filtré, lentement modulé.
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < samples.length; i += 1) {
      last = 0.97 * last + 0.03 * (Math.random() * 2 - 1);
      samples[i] = last * 3.2;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.value = 0.16;
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 0.13;
    depth.gain.value = 0.05;
    lfo.connect(depth).connect(gain.gain);
    source.connect(filter).connect(gain).connect(master);
    source.start();
    lfo.start();
    ambience = source;
    const chirp = () => {
      birds = setTimeout(() => {
        if (enabled && !suspended) playBird();
        chirp();
      }, 5000 + Math.random() * 8000);
    };
    chirp();
  };

  const tone = (frequency: number, start: number, duration: number, type: OscillatorType, volume: number) => {
    const ctx = context;
    if (!ctx || !master) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime + start);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);
    osc.connect(gain).connect(master);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration + 0.05);
  };

  const playBird = () => {
    const ctx = context;
    if (!ctx || !master) return;
    const base = 2200 + Math.random() * 1400;
    for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i += 1) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const t = ctx.currentTime + i * 0.13;
      osc.frequency.setValueAtTime(base, t);
      osc.frequency.exponentialRampToValueAtTime(base * 1.35, t + 0.08);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.03, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      osc.connect(gain).connect(master);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  };

  const applyVolume = () => {
    if (!context || !master) return;
    master.gain.setTargetAtTime(enabled && !suspended ? 0.9 : 0, context.currentTime, 0.15);
  };

  return {
    setEnabled(next) {
      enabled = next;
      if (!next) {
        applyVolume();
        return false;
      }
      const ctx = ensure();
      if (!ctx) {
        enabled = false;
        return false;
      }
      startAmbience();
      applyVolume();
      return true;
    },
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => undefined);
    },
    play(sound) {
      if (!enabled || !context) return;
      if (sound === "correct") {
        tone(659.25, 0, 0.35, "sine", 0.22);
        tone(987.77, 0.12, 0.5, "sine", 0.2);
        tone(1975.5, 0.12, 0.4, "sine", 0.05);
      } else if (sound === "wrong") {
        tone(220, 0, 0.4, "triangle", 0.2);
        tone(164.81, 0.22, 0.6, "triangle", 0.18);
      } else if (sound === "complete") {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, i * 0.14, 0.6, "sine", 0.18));
        tone(1567.98, 0.56, 0.9, "sine", 0.08);
      } else {
        tone(392, 0, 0.25, "sine", 0.12);
        tone(523.25, 0.1, 0.35, "sine", 0.12);
      }
    },
    setSuspended(next) {
      suspended = next;
      applyVolume();
    },
    dispose() {
      if (birds) clearTimeout(birds);
      ambience?.stop();
      ambience = null;
      void context?.close().catch(() => undefined);
      context = null;
      master = null;
    },
  };
}
