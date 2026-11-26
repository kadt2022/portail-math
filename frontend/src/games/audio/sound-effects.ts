// Effets sonores des jeux, fabriqués par programmation (Web Audio) : aucun fichier à télécharger, et chaque son part à l'instant
// exact de l'événement (tir, explosion…). Chaque effet est une fonction pure qui dessine son son dans un contexte audio, à
// l'heure demandée, vers une sortie donnée : le même code sert au jeu et au rendu hors ligne (écoute, tests).

export type SoundEffect =
  // Turbo Pulse
  | "shot"
  | "explosion"
  | "levelStart"
  | "combo"
  | "wrong"
  | "intrusion"
  | "levelComplete"
  | "levelFailed"
  // Les Tuiles magiques : sons doux et cristallins, accordés à un jeu de réflexion.
  | "tileSlide"
  | "tileBlocked"
  | "cardReveal"
  | "hint"
  | "placeWrong"
  | "gridWin"
  // Le jeu d’écriture Yamba : une machine mécanique, des sons de bois et de laiton, jamais agressifs.
  | "reelTick"
  | "dropThud"
  | "letterPlace";

export interface EffectOptions {
  /** Force de l'effet, de 0 à 1 (ex. taille du combo, fruit visé ou non). */
  intensity?: number;
  /** Nombre d'objets concernés (ex. boules détruites d'un seul tir) : l'explosion grandit avec lui. */
  count?: number;
}

type Context = BaseAudioContext;

const noiseBuffers = new WeakMap<Context, AudioBuffer>();

/** Bruit blanc de deux secondes, fabriqué une fois par contexte (base des explosions et des souffles). */
function noise(context: Context): AudioBuffer {
  let buffer = noiseBuffers.get(context);
  if (!buffer) {
    buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
    noiseBuffers.set(context, buffer);
  }
  return buffer;
}

/** Enveloppe percussive : montée très courte, puis décroissance exponentielle jusqu'au silence. */
function envelope(context: Context, output: AudioNode, when: number, peak: number, attack: number, decay: number): GainNode {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, when);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);
  gain.connect(output);
  return gain;
}

function tone(context: Context, output: AudioNode, when: number, type: OscillatorType, from: number, to: number, duration: number, peak: number, attack = 0.005) {
  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(from, when);
  if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(to, when + duration);
  oscillator.connect(envelope(context, output, when, peak, attack, duration));
  oscillator.start(when);
  oscillator.stop(when + attack + duration + 0.05);
}

function burst(context: Context, output: AudioNode, when: number, filterType: BiquadFilterType, fromHz: number, toHz: number, duration: number, peak: number) {
  const source = context.createBufferSource();
  source.buffer = noise(context);
  const filter = context.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(fromHz, when);
  filter.frequency.exponentialRampToValueAtTime(toHz, when + duration);
  source.connect(filter);
  filter.connect(envelope(context, output, when, peak, 0.004, duration));
  source.start(when);
  source.stop(when + duration + 0.05);
}

const effects: Record<SoundEffect, (context: Context, output: AudioNode, when: number, intensity: number, count: number) => void> = {
  // Tir du canon : un « pew » énergique qui descend, avec un petit claquement.
  shot(context, output, when) {
    tone(context, output, when, "square", 900, 240, 0.11, 0.18);
    tone(context, output, when, "triangle", 1400, 500, 0.08, 0.12);
    burst(context, output, when, "highpass", 3500, 1800, 0.05, 0.12);
  },
  // Explosion, proportionnelle au nombre de boules détruites d'un seul tir :
  // - une boule : un souffle qui se referme, un coup sourd et un claquement ;
  // - à partir de deux : le coup principal devient plus grave et plus long, une détonation de plus éclate en cascade pour
  //   chaque boule supplémentaire, et des éclats crépitent dans la queue du son ;
  // - à partir de trois : un grondement grave prolonge l'explosion.
  explosion(context, output, when, intensity, count) {
    const balls = Math.max(1, Math.min(8, Math.round(count)));
    const big = Math.min(1, (balls - 1) / 4); // 0 pour une boule, 1 dès cinq
    const size = 0.6 + 0.4 * intensity;
    // Coup principal.
    burst(context, output, when, "lowpass", 2600 * size + 1400 * big, 160 - 90 * big, 0.45 + 0.6 * big, (0.38 - 0.06 * big) * size);
    tone(context, output, when, "sine", 150 - 40 * big, 42 - 14 * big, 0.32 + 0.5 * big, 0.45 * size, 0.004);
    burst(context, output, when, "bandpass", 4200, 2200, 0.08, 0.18);
    // Cascade : une détonation par boule supplémentaire, de plus en plus grave.
    for (let index = 1; index < balls; index += 1) {
      const at = when + index * 0.085;
      const level = 0.26 * (1 - index / (balls + 2));
      burst(context, output, at, "lowpass", 2200 - index * 180, 140, 0.32, level);
      tone(context, output, at, "sine", 120 - index * 8, 40, 0.28, level * 0.9, 0.004);
    }
    // Éclats qui crépitent, plus nombreux avec le combo.
    if (balls >= 2) {
      for (let index = 0; index < 4 * balls; index += 1) {
        const at = when + 0.05 + Math.random() * (0.25 + 0.15 * balls);
        burst(context, output, at, "highpass", 5000 + Math.random() * 3000, 3000, 0.03, 0.05 + 0.03 * big);
      }
    }
    // Grondement grave.
    if (balls >= 3) burst(context, output, when + 0.04, "lowpass", 320, 60, 0.9 + 0.5 * big, 0.08 + 0.22 * big);
  },
  // Combo (deux boules ou plus) : une montée scintillante, plus longue et plus haute avec le nombre de boules.
  combo(context, output, when, intensity) {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568];
    const count = 3 + Math.round(3 * intensity);
    for (let index = 0; index < count; index += 1) {
      tone(context, output, when + index * 0.055, "triangle", notes[index], notes[index], 0.22, 0.16);
      tone(context, output, when + index * 0.055, "sine", notes[index] * 2, notes[index] * 2, 0.16, 0.06);
    }
    burst(context, output, when, "bandpass", 1200, 6000, 0.35 + 0.25 * intensity, 0.12 + 0.1 * intensity);
  },
  // Début de niveau : deux notes d'annonce, trois pour les niveaux experts.
  levelStart(context, output, when, intensity) {
    const notes = intensity >= 0.8 ? [329.63, 440, 554.37] : [392, 523.25];
    notes.forEach((note, index) => tone(context, output, when + index * 0.09, "triangle", note, note, 0.16, 0.16));
  },
  // Mauvaise boule : un bourdonnement grave, bref, qui retombe (jamais agressif).
  wrong(context, output, when) {
    tone(context, output, when, "sawtooth", 196, 140, 0.22, 0.12);
    tone(context, output, when, "sawtooth", 200, 143, 0.22, 0.1);
  },
  // Intrusion : deux notes d'alerte descendantes.
  intrusion(context, output, when) {
    tone(context, output, when, "square", 440, 440, 0.1, 0.1);
    tone(context, output, when + 0.13, "square", 330, 330, 0.14, 0.1);
  },
  // Niveau réussi : une petite fanfare ascendante qui finit sur un accord.
  levelComplete(context, output, when) {
    [523.25, 659.25, 783.99].forEach((note, index) => tone(context, output, when + index * 0.11, "triangle", note, note, 0.16, 0.2));
    [523.25, 659.25, 783.99, 1046.5].forEach((note) => tone(context, output, when + 0.36, "triangle", note, note, 0.7, 0.13, 0.02));
  },
  // Niveau perdu : trois notes qui descendent doucement.
  levelFailed(context, output, when) {
    [392, 329.63, 261.63].forEach((note, index) => tone(context, output, when + index * 0.16, "triangle", note, note * 0.97, 0.26, 0.18));
  },

  // --- Les Tuiles magiques ---
  // Tuile qui glisse : un léger souffle et un petit « toc » de bois.
  tileSlide(context, output, when) {
    burst(context, output, when, "bandpass", 900, 2600, 0.09, 0.07);
    tone(context, output, when + 0.06, "triangle", 620, 440, 0.07, 0.12);
  },
  // Tuile qui ne peut pas bouger : un coup feutré, bref, jamais agressif.
  tileBlocked(context, output, when) {
    tone(context, output, when, "sine", 170, 115, 0.12, 0.16);
    burst(context, output, when, "lowpass", 600, 200, 0.06, 0.05);
  },
  // Carte magique révélée : une pluie de notes claires qui monte, avec un scintillement.
  cardReveal(context, output, when) {
    [1046.5, 1318.5, 1568, 2093, 2637].forEach((note, index) => tone(context, output, when + index * 0.05, "sine", note, note, 0.32, 0.1, 0.004));
    burst(context, output, when, "highpass", 6000, 9000, 0.55, 0.035);
  },
  // Indice : un carillon de deux notes, doux et long.
  hint(context, output, when) {
    tone(context, output, when, "sine", 880, 880, 0.5, 0.13, 0.01);
    tone(context, output, when + 0.12, "sine", 1318.5, 1318.5, 0.6, 0.11, 0.01);
  },
  // Carte posée mais grille encore fausse : deux notes douces qui redescendent (« pas encore »).
  placeWrong(context, output, when) {
    tone(context, output, when, "triangle", 440, 435, 0.18, 0.14);
    tone(context, output, when + 0.16, "triangle", 370, 360, 0.26, 0.13);
  },
  // Grille réussie : un arpège magique qui monte, puis un accord de cloches qui se prolonge.
  gridWin(context, output, when) {
    [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568].forEach((note, index) => tone(context, output, when + index * 0.07, "triangle", note, note, 0.22, 0.14));
    [523.25, 783.99, 1046.5, 1568].forEach((note) => {
      tone(context, output, when + 0.46, "sine", note, note, 1.2, 0.1, 0.02);
      tone(context, output, when + 0.46, "sine", note * 2, note * 2, 0.8, 0.03, 0.02);
    });
    burst(context, output, when + 0.4, "highpass", 5000, 8000, 0.9, 0.03);
  },

  // --- Jeu d’écriture Yamba ---
  // Cran du rouleau qui passe : un petit « tic » de rochet, bref et mat.
  reelTick(context, output, when) {
    tone(context, output, when, "square", 1500, 900, 0.025, 0.07, 0.002);
    burst(context, output, when, "bandpass", 2400, 1800, 0.02, 0.05);
  },
  // Illustration qui touche le réceptacle : un « toc » rond et grave, avec un léger tintement de métal.
  dropThud(context, output, when) {
    tone(context, output, when, "sine", 190, 70, 0.22, 0.3, 0.003);
    burst(context, output, when, "lowpass", 1400, 250, 0.12, 0.12);
    tone(context, output, when + 0.02, "triangle", 1320, 1180, 0.18, 0.05, 0.003);
  },
  // Lettre posée dans sa case : un « clic » de bois, clair.
  letterPlace(context, output, when) {
    tone(context, output, when, "triangle", 720, 520, 0.07, 0.12, 0.002);
    burst(context, output, when, "bandpass", 1800, 1200, 0.03, 0.05);
  },
};

/** Dessine l'effet dans le contexte, à l'heure `when` (temps du contexte), vers `output`. */
export function renderSoundEffect(context: Context, output: AudioNode, effect: SoundEffect, when: number, options: EffectOptions = {}): void {
  const intensity = Math.min(1, Math.max(0, options.intensity ?? 0.5));
  effects[effect](context, output, when, intensity, Math.max(1, options.count ?? 1));
}

export const SOUND_EFFECTS = Object.keys(effects) as SoundEffect[];
