// Commandes de conduite actives dans cette version de Léo. Pur (sans Phaser ni React).
//
// La direction (gauche, droite) est désactivée pour la V1 : sur la route droite du jeu, elle ne fait qu'incliner la
// voiture vers le bord et laisse croire à un vrai volant. Son code reste en place ; passer l'indicateur à vrai la
// réactive partout (boutons, clavier, appels du moteur).

import type { LeoLivreurControl } from "./LeoLivreurGame";

export const STEERING_CONTROLS_ENABLED = false;

/** Une commande est-elle disponible ? Avancer, freiner et reculer le sont toujours. */
export function isControlEnabled(control: LeoLivreurControl) {
  if (control === "left" || control === "right") return STEERING_CONTROLS_ENABLED;
  return true;
}
