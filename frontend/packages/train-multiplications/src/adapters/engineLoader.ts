// Seul point d'entrée vers la scène Babylon.js : un import dynamique. L'interface du jeu ne charge jamais Babylon.js
// directement ; le bundler en fait un morceau à part, téléchargé à l'ouverture du jeu ou à son préchargement.
//
// Repris de la Rivière des fractions (écrit pour Yamba).

export type TrainEngineModule = typeof import("../engine/scene/trainEngine");

let pending: Promise<TrainEngineModule> | null = null;

export function loadTrainEngine(): Promise<TrainEngineModule> {
  if (!pending) {
    pending = import("../engine/scene/trainEngine").catch((error: unknown) => {
      // Un échec (réseau coupé) ne doit pas rester en mémoire : « Réessayer » relance vraiment le téléchargement.
      pending = null;
      throw error;
    });
  }
  return pending;
}
