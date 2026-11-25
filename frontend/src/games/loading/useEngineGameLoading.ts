import { useEffect } from "react";

import { useGameLoading } from "./GameLoaderHost";

/** Ce que le module d'un jeu 3D (Babylon.js) annonce de son chargement. */
export interface EngineLoadingState {
  /** Moteur 3D téléchargé. */
  engineLoaded: boolean;
  /** Construction de la scène, de 0 à 1. */
  buildProgress: number;
  /** Scène prête : le chargeur disparaît. */
  ready: boolean;
  /** Échec réel (moteur introuvable, réseau coupé). */
  failed: boolean;
  /** Appareil sans WebGL ni WebGPU. */
  unsupported: boolean;
  retry: () => void;
}

// Branche le chargement d'un jeu 3D sur le chargeur commun posé par l'hôte du lecteur (voir GameLoaderHost). Moteur téléchargé :
// jalon de l'initialisation ; construction de la scène : progression des ressources ; scène prête : le chargeur disparaît.
// Échec réel : Réessayer, dans le chargeur. Appareil non compatible : le chargeur s'efface pour laisser lire le message du jeu.
export function useEngineGameLoading(loading: EngineLoadingState): void {
  const session = useGameLoading();
  useEffect(() => {
    session.milestone("mounted");
  }, [session]);
  useEffect(() => {
    if (loading.engineLoaded) session.milestone("engine");
  }, [session, loading.engineLoaded]);
  useEffect(() => {
    session.reportResources(loading.buildProgress);
  }, [session, loading.buildProgress]);
  useEffect(() => {
    if (loading.ready) session.ready();
  }, [session, loading.ready]);
  useEffect(() => {
    if (loading.unsupported) session.ready();
    else if (loading.failed) session.fail(loading.retry);
  }, [session, loading.failed, loading.unsupported, loading.retry]);
}
