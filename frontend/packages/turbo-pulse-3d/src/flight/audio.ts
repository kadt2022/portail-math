// Les sons du vol, fabriqués à la volée avec Web Audio (aucun fichier à télécharger) : bruit de moteur qui suit la vitesse, choc,
// carillon d'arrivée. Le navigateur n'autorise le son qu'après un geste du joueur : `resume()` est appelé au clic sur « Décoller ».
//
// Écrit pour Yamba.

export interface FlightAudio {
  resume(): void;
  /** Vitesse du vaisseau de 0 (lent) à 1 (plein gaz) : change la hauteur et le souffle du moteur. */
  setSpeed(k: number): void;
  impact(size: number): void;
  arrive(): void;
  setMuted(muted: boolean): void;
  dispose(): void;
}

interface Engine {
  context: AudioContext;
  master: GainNode;
  osc: OscillatorNode;
  oscGain: GainNode;
  noiseFilter: BiquadFilterNode;
  noiseGain: GainNode;
  noise: AudioBuffer;
}

function noiseBuffer(context: AudioContext, seconds: number): AudioBuffer {
  const buffer = context.createBuffer(1, Math.floor(context.sampleRate * seconds), context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function build(): Engine | null {
  const Ctor = typeof window === "undefined" ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext);
  if (!Ctor) return null;
  const context = new Ctor();
  const master = context.createGain();
  master.gain.value = 0.6;
  master.connect(context.destination);
  const noise = noiseBuffer(context, 2);
  // Souffle : bruit en boucle passé dans un filtre dont la fréquence suit la vitesse.
  const source = context.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  const noiseFilter = context.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = 400;
  const noiseGain = context.createGain();
  noiseGain.gain.value = 0.0;
  source.connect(noiseFilter).connect(noiseGain).connect(master);
  source.start();
  // Ronronnement : une dent de scie grave, filtrée.
  const osc = context.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = 55;
  const low = context.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = 220;
  const oscGain = context.createGain();
  oscGain.gain.value = 0.0;
  osc.connect(low).connect(oscGain).connect(master);
  osc.start();
  return { context, master, osc, oscGain, noiseFilter, noiseGain, noise };
}

export function createFlightAudio(): FlightAudio {
  let engine: Engine | null = null;
  let muted = false;
  const ensure = () => {
    engine ??= build();
    return engine;
  };
  const now = (e: Engine) => e.context.currentTime;
  return {
    resume() {
      const e = ensure();
      if (e && e.context.state === "suspended") void e.context.resume();
    },
    setSpeed(k) {
      if (!engine) return;
      const t = now(engine);
      engine.osc.frequency.setTargetAtTime(48 + k * 70, t, 0.1);
      engine.oscGain.gain.setTargetAtTime(0.05 + k * 0.05, t, 0.1);
      engine.noiseFilter.frequency.setTargetAtTime(300 + k * 1800, t, 0.1);
      engine.noiseGain.gain.setTargetAtTime(0.03 + k * 0.1, t, 0.1);
    },
    impact(size) {
      if (!engine || muted) return;
      const e = engine;
      const t = now(e);
      const burst = e.context.createBufferSource();
      burst.buffer = e.noise;
      const filter = e.context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(3000, t);
      filter.frequency.exponentialRampToValueAtTime(200, t + 0.4);
      const gain = e.context.createGain();
      gain.gain.setValueAtTime(0.7, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      burst.connect(filter).connect(gain).connect(e.master);
      burst.start(t, Math.random(), 0.5);
      const thud = e.context.createOscillator();
      thud.type = "sine";
      thud.frequency.setValueAtTime(170 - size * 20, t);
      thud.frequency.exponentialRampToValueAtTime(40, t + 0.35);
      const thudGain = e.context.createGain();
      thudGain.gain.setValueAtTime(0.9, t);
      thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      thud.connect(thudGain).connect(e.master);
      thud.start(t);
      thud.stop(t + 0.45);
    },
    arrive() {
      if (!engine || muted) return;
      const e = engine;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const t = now(e) + i * 0.14;
        const o = e.context.createOscillator();
        o.type = "triangle";
        o.frequency.value = freq;
        const g = e.context.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.35, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
        o.connect(g).connect(e.master);
        o.start(t);
        o.stop(t + 0.75);
      });
    },
    setMuted(value) {
      muted = value;
      if (engine) engine.master.gain.setTargetAtTime(value ? 0 : 0.6, now(engine), 0.05);
    },
    dispose() {
      if (engine) void engine.context.close();
      engine = null;
    },
  };
}
