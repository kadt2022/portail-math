// L'eau : une seule technologie pour les sept niveaux. Cinq réglages décrivent son humeur ; la même formule de vagues
// est écrite ici en TypeScript (pour faire flotter les bateaux) et dans le shader (pour les dessiner).

export interface WaterSettings {
  /** Hauteur des vagues (m). */
  amplitude: number;
  /** Multiplie le nombre d'ondes : plus haut, vagues plus courtes. */
  frequency: number;
  /** Vitesse du courant le long du chenal (m/s), visible dans les ondulations. */
  current: number;
  /** Remous et bruit fin, de 0 (calme) à 1 (rapides). */
  turbulence: number;
  /** Force des reflets du ciel et du soleil, de 0 à 1. */
  reflection: number;
}

/** Niveau 1 : eau calme, petites ondulations, reflets doux, faible courant. */
export const CALM_WATER: WaterSettings = { amplitude: 0.06, frequency: 1, current: 0.6, turbulence: 0, reflection: 0.75 };

/** Ondes de base (direction en x/z, longueur d'onde en m, vitesse relative, part de l'amplitude). */
export const WAVES: readonly { dirX: number; dirZ: number; length: number; speed: number; weight: number }[] = [
  { dirX: 0.38, dirZ: 0.92, length: 9, speed: 1, weight: 1 },
  { dirX: -0.71, dirZ: 0.7, length: 5.3, speed: 1.3, weight: 0.55 },
  { dirX: 0.94, dirZ: -0.33, length: 3.1, speed: 1.6, weight: 0.3 },
];

/** Hauteur de l'eau (m) au point (x, z) du monde, au temps t (s). Jumeau exact du vertex shader. */
export function waterHeight(x: number, z: number, time: number, settings: WaterSettings): number {
  let height = 0;
  for (const wave of WAVES) {
    const k = (2 * Math.PI * settings.frequency) / wave.length;
    const phase = k * (wave.dirX * x + wave.dirZ * z) - time * wave.speed * Math.sqrt(9.8 * k) * 0.35;
    height += settings.amplitude * wave.weight * Math.sin(phase);
  }
  return height;
}
