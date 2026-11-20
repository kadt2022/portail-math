import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

import { GameAudio, isMutedPreference } from "./GameAudio";
import type { EffectOptions, SoundEffect } from "./sound-effects";

/** Choix « son coupé », commun à tous les jeux du portail et mémorisé d'une visite à l'autre. */
export const GAMES_SOUND_STORAGE_KEY = "mbuyamba.games.sound";

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
const pageVisible = () => document.visibilityState !== "hidden";

/** L'onglet est-il affiché ? (la musique se tait quand il est caché) */
export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribeVisibility, pageVisible, () => true);
}

export interface UseGameAudioOptions {
  /** Élément du lecteur : chaque toucher dedans réveille le son (navigateurs qui l'exigent, iPhone). */
  rootRef: RefObject<HTMLElement | null>;
  /** Téléchargement du morceau d'ambiance, lancé seulement à l'ouverture du jeu. */
  loadMusic: () => Promise<{ default: string }>;
  /** La musique doit-elle jouer (partie en cours, jeu visible) ? Elle s'arrête en fondu sinon. */
  musicOn: boolean;
  musicVolume?: number;
}

// Son d'un jeu dans le lecteur commun : moteur audio (musique + effets, voir GameAudio), musique d'ambiance qui suit la partie,
// et commande générale du bouton Son. Le moteur est créé à l'ouverture et rendu au navigateur à la fermeture.
export function useGameAudio({ rootRef, loadMusic, musicOn, musicVolume }: UseGameAudioOptions) {
  const audioRef = useRef<GameAudio | null>(null);
  const loadMusicRef = useRef(loadMusic);
  const [muted, setMuted] = useState(() => isMutedPreference(GAMES_SOUND_STORAGE_KEY));

  useEffect(() => {
    const audio = new GameAudio({ storageKey: GAMES_SOUND_STORAGE_KEY, musicVolume });
    audioRef.current = audio;
    void loadMusicRef
      .current()
      .then((module) => audio.loadMusic(module.default))
      .catch(() => undefined);
    // Le toucher qui a ouvert le jeu autorise déjà le son sur la plupart des navigateurs ; sinon, le prochain toucher le réveille.
    audio.unlock();
    const root = rootRef.current;
    const unlock = () => audio.unlock();
    root?.addEventListener("pointerdown", unlock, true);
    root?.addEventListener("keydown", unlock, true);
    return () => {
      root?.removeEventListener("pointerdown", unlock, true);
      root?.removeEventListener("keydown", unlock, true);
      audio.dispose();
      audioRef.current = null;
    };
  }, [rootRef, musicVolume]);

  const visible = usePageVisible();
  const playing = musicOn && visible;
  useEffect(() => {
    if (playing) audioRef.current?.playMusic();
    else audioRef.current?.pauseMusic();
  }, [playing]);

  const play = useCallback((effect: SoundEffect, options?: EffectOptions) => audioRef.current?.play(effect, options), []);
  // Commande générale : le moteur audio est réglé tout de suite (pas dans une mise à jour d'état, que React peut rejouer).
  const mutedRef = useRef(muted);
  const toggleMuted = useCallback(() => {
    const next = !mutedRef.current;
    mutedRef.current = next;
    audioRef.current?.setMuted(next);
    setMuted(next);
  }, []);

  return { play, muted, toggleMuted };
}
