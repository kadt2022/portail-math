// Seul point d'entrée vers la scène Babylon.js : un import dynamique. L'interface du jeu ne charge jamais Babylon.js
// directement ; le bundler en fait un morceau à part, téléchargé à l'ouverture du jeu ou à son préchargement.

export type RiverEngineModule = typeof import("../engine/scene/riverEngine");

let pending: Promise<RiverEngineModule> | null = null;

export function loadRiverEngine(): Promise<RiverEngineModule> {
  if (!pending) {
    pending = import("../engine/scene/riverEngine").catch((error: unknown) => {
      // Un échec (réseau coupé) ne doit pas rester en mémoire : « Réessayer » relance vraiment le téléchargement.
      pending = null;
      throw error;
    });
  }
  return pending;
}
