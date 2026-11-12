import { normalizeAngle } from "./leoGeometry";

export type LeoVehicleSprite = "right" | "left" | "front" | "back";

export interface LeoVehicleView {
  sprite: LeoVehicleSprite;
  /** Rotation du corps en degrés : l'écart entre le cap réel et l'axe de l'illustration. */
  angleDeg: number;
}

const toDegrees = (radians: number) => (radians * 180) / Math.PI;

/**
 * Choisit l'illustration réellement tournée vers la direction de roulage :
 * profil droit vers l'est, profil gauche vers l'ouest, face vers le bas de
 * l'écran, dos vers le haut. Un seul sprite à la fois, jamais de mélange ni
 * de décalage arbitraire : chaque illustration est un vrai profil dont l'axe
 * avant-arrière est horizontal, donc l'angle affiché est le cap logique.
 */
export function vehicleViewForHeading(heading: number): LeoVehicleView {
  const h = normalizeAngle(heading);
  if (Math.abs(Math.cos(h)) < 0.5) return { sprite: Math.sin(h) > 0 ? "front" : "back", angleDeg: 0 };
  if (Math.cos(h) > 0) return { sprite: "right", angleDeg: toDegrees(h) };
  return { sprite: "left", angleDeg: toDegrees(normalizeAngle(h - Math.PI)) };
}
