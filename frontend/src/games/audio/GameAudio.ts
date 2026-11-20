import { renderSoundEffect, type EffectOptions, type SoundEffect } from "./sound-effects";

// Moteur audio des jeux : une piste musicale d'ambiance et des effets sonores événementiels, sur deux pistes indépendantes,
// chacune avec son volume, sous une commande générale qui coupe tout.
//
//   musique (boucle) → fondu ─→ piste musique (volume) ─┐
//                                                        ├→ général (coupé / actif) → haut-parleurs
//   effets (tir, explosion…) ─→ piste effets (volume) → limiteur ┘
//
// Un effet part à l'instant exact de l'événement et ne touche jamais à la musique. Les navigateurs n'autorisent le son qu'après
// un geste du joueur : unlock() est appelé à chaque toucher dans le lecteur, et la musique ne démarre qu'à ce moment-là.

export interface GameAudioOptions {
  /** Volume de la musique, de 0 à 1 (par défaut 0,25 : discret, les effets restent au-dessus). */
  musicVolume?: number;
  /** Volume des effets, de 0 à 1. */
  effectsVolume?: number;
  /** Clé de stockage du choix « son coupé » (mémorisé d'une visite à l'autre). Absente : rien n'est mémorisé. */
  storageKey?: string;
  /** Fabrique de contexte audio (tests) ; par défaut celle du navigateur. */
  createContext?: () => AudioContext;
}

export const DEFAULT_MUSIC_VOLUME = 0.25;
export const DEFAULT_EFFECTS_VOLUME = 0.7;
export const MUSIC_FADE_IN_MS = 1200;
export const MUSIC_FADE_OUT_MS = 600;

/** Choix « son coupé » mémorisé sous cette clé. */
export function isMutedPreference(key: string | undefined): boolean {
  if (!key) return false;
  try {
    return window.localStorage.getItem(key) === "muted";
  } catch {
    return false;
  }
}

function writeMuted(key: string | undefined, muted: boolean) {
  if (!key) return;
  try {
    if (muted) window.localStorage.setItem(key, "muted");
    else window.localStorage.removeItem(key);
  } catch {
    // Stockage indisponible (navigation privée) : le choix vaut pour cette visite seulement.
  }
}

function defaultContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

/**
 * Bornes de la boucle (secondes) : le silence technique ajouté par la compression (MP3 : quelques millisecondes au début et à la
 * fin) est écarté, sinon il s'entendrait comme un petit blanc à chaque tour de boucle.
 */
export function loopBounds(buffer: AudioBuffer, threshold = 1e-4): { start: number; end: number } {
  let first = buffer.length;
  let last = -1;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    let index = 0;
    while (index < data.length && Math.abs(data[index]) <= threshold) index += 1;
    first = Math.min(first, index);
    let end = data.length - 1;
    while (end > index && Math.abs(data[end]) <= threshold) end -= 1;
    last = Math.max(last, end);
  }
  if (last < first) return { start: 0, end: buffer.duration };
  return { start: first / buffer.sampleRate, end: (last + 1) / buffer.sampleRate };
}

export class GameAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private effectsBus: GainNode | null = null;
  private limiter: DynamicsCompressorNode | null = null;
  private musicFade: GainNode | null = null;
  private musicBuffer: AudioBuffer | null = null;
  private loop = { start: 0, end: 0 };
  private musicData: ArrayBuffer | null = null;
  private musicSource: AudioBufferSourceNode | null = null;
  /** Position de lecture (s) dans le morceau, pour reprendre la musique là où elle s'était arrêtée. */
  private musicOffset = 0;
  private musicStartedAt = 0;
  private musicWanted = false;
  private musicVolume: number;
  private effectsVolume: number;
  private mutedValue: boolean;
  private disposed = false;
  private readonly storageKey?: string;
  private readonly createContext: () => AudioContext | null;

  constructor(options: GameAudioOptions = {}) {
    this.musicVolume = options.musicVolume ?? DEFAULT_MUSIC_VOLUME;
    this.effectsVolume = options.effectsVolume ?? DEFAULT_EFFECTS_VOLUME;
    this.storageKey = options.storageKey;
    this.mutedValue = isMutedPreference(options.storageKey);
    this.createContext = options.createContext ?? defaultContext;
  }

  get muted(): boolean {
    return this.mutedValue;
  }

  /** La musique joue-t-elle (ou démarre-t-elle) en ce moment ? */
  get musicPlaying(): boolean {
    return this.musicSource !== null && this.musicWanted;
  }

  /** Contexte audio, créé au premier besoin, avec ses trois pistes. */
  private ensureContext(): AudioContext | null {
    if (this.disposed) return null;
    if (this.context) return this.context;
    const context = this.createContext();
    if (!context) return null;
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = this.mutedValue ? 0 : 1;
    this.master.connect(context.destination);
    this.musicBus = context.createGain();
    this.musicBus.gain.value = this.musicVolume;
    this.musicBus.connect(this.master);
    this.effectsBus = context.createGain();
    this.effectsBus.gain.value = this.effectsVolume;
    // Limiteur sur les effets : une grande explosion empile beaucoup de couches ; elles ne saturent jamais.
    this.limiter = context.createDynamicsCompressor();
    this.limiter.threshold.value = -10;
    this.limiter.knee.value = 6;
    this.limiter.ratio.value = 12;
    this.limiter.attack.value = 0.003;
    this.limiter.release.value = 0.15;
    this.effectsBus.connect(this.limiter);
    this.limiter.connect(this.master);
    this.musicFade = context.createGain();
    this.musicFade.gain.value = 0;
    this.musicFade.connect(this.musicBus);
    if (this.musicData) void this.decodeMusic();
    return context;
  }

  /** À appeler dans un geste du joueur (toucher, clic) : réveille le son si le navigateur l'avait suspendu. */
  unlock(): void {
    const context = this.ensureContext();
    if (context && context.state === "suspended") {
      void context.resume().then(() => this.syncMusic(), () => undefined);
    } else {
      this.syncMusic();
    }
  }

  /** Télécharge le morceau d'ambiance (il ne sera décodé qu'au premier besoin du contexte audio). */
  async loadMusic(url: string): Promise<void> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Musique introuvable : ${url}`);
    this.musicData = await response.arrayBuffer();
    if (this.context) await this.decodeMusic();
  }

  private async decodeMusic(): Promise<void> {
    const context = this.context;
    const data = this.musicData;
    if (!context || !data || this.musicBuffer) return;
    this.musicData = null;
    const buffer = await context.decodeAudioData(data);
    this.loop = loopBounds(buffer);
    this.musicBuffer = buffer;
    this.syncMusic();
  }

  /** Musique demandée : elle démarre (en fondu) dès que le son est disponible et le morceau prêt. */
  playMusic(): void {
    this.musicWanted = true;
    this.syncMusic();
  }

  /** Musique arrêtée en fondu (pause, fermeture) ; elle reprendra au même endroit. */
  pauseMusic(): void {
    this.musicWanted = false;
    this.syncMusic();
  }

  private syncMusic() {
    const context = this.context;
    if (!context || !this.musicFade || !this.musicBuffer || context.state !== "running") return;
    const now = context.currentTime;
    const fade = this.musicFade.gain;
    if (this.musicWanted && !this.musicSource) {
      const source = context.createBufferSource();
      source.buffer = this.musicBuffer;
      // Boucle sans coupure : le morceau est rejoué par le moteur audio, sans le blanc d'un lecteur classique.
      source.loop = true;
      source.loopStart = this.loop.start;
      source.loopEnd = this.loop.end;
      source.connect(this.musicFade);
      source.start(now, this.loop.start + this.musicOffset);
      this.musicSource = source;
      this.musicStartedAt = now - this.musicOffset;
      fade.cancelScheduledValues(now);
      fade.setValueAtTime(fade.value, now);
      fade.linearRampToValueAtTime(1, now + MUSIC_FADE_IN_MS / 1000);
    } else if (!this.musicWanted && this.musicSource) {
      const source = this.musicSource;
      const end = now + MUSIC_FADE_OUT_MS / 1000;
      this.musicOffset = (end - this.musicStartedAt) % (this.loop.end - this.loop.start || this.musicBuffer.duration);
      this.musicSource = null;
      fade.cancelScheduledValues(now);
      fade.setValueAtTime(fade.value, now);
      fade.linearRampToValueAtTime(0, end);
      source.stop(end + 0.02);
    }
  }

  /** Effet sonore, à l'instant exact de l'appel ; il ne coupe jamais la musique. */
  play(effect: SoundEffect, options: EffectOptions = {}): void {
    const context = this.ensureContext();
    if (!context || !this.effectsBus || this.mutedValue || context.state !== "running") return;
    renderSoundEffect(context, this.effectsBus, effect, context.currentTime, options);
  }

  /** Commande générale : coupe ou rétablit tous les sons (musique et effets), avec un fondu très court. */
  setMuted(muted: boolean): void {
    this.mutedValue = muted;
    writeMuted(this.storageKey, muted);
    const context = this.context;
    if (!context || !this.master) return;
    const now = context.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(muted ? 0 : 1, now + 0.08);
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.min(1, Math.max(0, volume));
    if (this.musicBus) this.musicBus.gain.value = this.musicVolume;
  }

  setEffectsVolume(volume: number): void {
    this.effectsVolume = Math.min(1, Math.max(0, volume));
    if (this.effectsBus) this.effectsBus.gain.value = this.effectsVolume;
  }

  get volumes(): { music: number; effects: number } {
    return { music: this.musicVolume, effects: this.effectsVolume };
  }

  /** Fermeture du jeu : tout s'arrête et le contexte audio est rendu au navigateur. */
  dispose(): void {
    this.disposed = true;
    try {
      this.musicSource?.stop();
    } catch {
      // Déjà arrêtée.
    }
    this.musicSource = null;
    void this.context?.close().catch(() => undefined);
    this.context = null;
  }
}
