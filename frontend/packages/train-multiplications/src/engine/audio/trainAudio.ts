// Sons du train, synthétisés à la volée avec la Web Audio API (aucun fichier à télécharger) : coups d'échappement
// (« tchou ») au rythme des roues, sifflet à deux tons, chuintement des freins, cloche d'arrivée en gare.
// Rien ne sonne avant un geste de l'utilisateur (règle des navigateurs) : resume() est appelé dans le clic.
//
// Écrit pour Yamba.

export interface TrainAudio {
  readonly enabled: boolean;
  setEnabled(on: boolean): void;
  /** À appeler dans un geste de l'utilisateur. */
  resume(): void;
  /** Coup d'échappement : force de 0 à 1 (admission) et vitesse (m/s) pour le timbre. */
  chuff(strength: number, speed: number): void;
  whistle(): void;
  /** Freinage en cours (0 à 1) : chuintement continu. */
  setBrake(level: number, speed: number): void;
  chime(): void;
  dispose(): void;
}

type AudioCtor = typeof AudioContext;

export function createTrainAudio(): TrainAudio {
  const Ctor: AudioCtor | undefined = typeof window === "undefined" ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext);
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let noise: AudioBuffer | null = null;
  let brake: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  let enabled = true;

  const ensure = () => {
    if (!Ctor) return null;
    if (!context) {
      context = new Ctor();
      master = context.createGain();
      master.gain.value = 0.55;
      master.connect(context.destination);
      noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = noise.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    }
    return context;
  };

  const noiseBurst = (frequency: number, q: number, peak: number, attack: number, decay: number) => {
    const ctx = ensure();
    if (!ctx || !master || !noise || !enabled || ctx.state !== "running") return;
    const source = ctx.createBufferSource();
    source.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(peak, t + attack);
    gain.gain.exponentialRampToValueAtTime(0.0005, t + attack + decay);
    source.connect(filter).connect(gain).connect(master);
    source.start(t, Math.random());
    source.stop(t + attack + decay + 0.05);
  };

  return {
    get enabled() {
      return enabled;
    },
    setEnabled(on) {
      enabled = on;
      if (!on && brake) brake.gain.gain.value = 0;
    },
    resume() {
      const ctx = ensure();
      if (ctx && ctx.state === "suspended") void ctx.resume();
    },
    chuff(strength, speed) {
      // Coup sourd à basse vitesse, plus bref et plus clair en vitesse ; plus fort quand le régulateur est ouvert.
      const peak = 0.08 + strength * 0.32;
      noiseBurst(380 + speed * 22, 1.1, peak, 0.012, Math.max(0.07, 0.24 - speed * 0.009));
    },
    whistle() {
      const ctx = ensure();
      if (!ctx || !master || !enabled || ctx.state !== "running") return;
      const t = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.22, t + 0.06);
      gain.gain.setValueAtTime(0.22, t + 0.85);
      gain.gain.exponentialRampToValueAtTime(0.0005, t + 1.15);
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 900;
      filter.Q.value = 0.9;
      filter.connect(gain).connect(master);
      for (const [f, type] of [[523, "sawtooth"], [659, "sawtooth"], [784, "triangle"]] as const) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.setValueAtTime(f * 0.97, t);
        osc.frequency.linearRampToValueAtTime(f, t + 0.12);
        osc.connect(filter);
        osc.start(t);
        osc.stop(t + 1.2);
      }
      // Souffle de vapeur mêlé au sifflet.
      noiseBurst(2600, 0.7, 0.05, 0.05, 1.0);
    },
    setBrake(level, speed) {
      const ctx = ensure();
      if (!ctx || !master || !noise || ctx.state !== "running") return;
      if (!brake) {
        const source = ctx.createBufferSource();
        source.buffer = noise;
        source.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = "highpass";
        filter.frequency.value = 3200;
        const gain = ctx.createGain();
        gain.gain.value = 0;
        source.connect(filter).connect(gain).connect(master);
        source.start();
        brake = { source, gain };
      }
      const target = enabled && speed > 0.5 ? level * Math.min(1, speed / 6) * 0.07 : 0;
      brake.gain.gain.setTargetAtTime(target, ctx.currentTime, 0.08);
    },
    chime() {
      const ctx = ensure();
      if (!ctx || !master || !enabled || ctx.state !== "running") return;
      const t = ctx.currentTime;
      [784, 988, 1175].forEach((f, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = f;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t + i * 0.16);
        gain.gain.linearRampToValueAtTime(0.16, t + i * 0.16 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0005, t + i * 0.16 + 0.9);
        osc.connect(gain).connect(master!);
        osc.start(t + i * 0.16);
        osc.stop(t + i * 0.16 + 1);
      });
    },
    dispose() {
      brake?.source.stop();
      void context?.close();
      context = null;
    },
  };
}
