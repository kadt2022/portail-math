// Taille minimale du monde de Turbo Pulse, sans dépendance à Phaser : le lecteur React s'en sert pour mettre la scène à
// l'échelle sans attendre le téléchargement du moteur (voir TurboPulsePlayer), et le moteur la passe à Phaser via
// scale.minWidth / minHeight (voir TurboPulseGame).
export const MIN_WORLD_WIDTH = 480;
export const MIN_WORLD_HEIGHT = 270;
