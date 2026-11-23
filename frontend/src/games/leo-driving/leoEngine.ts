// Moteur de Conduire avec Léo (Phaser et la scène) : un module à part, téléchargé à la demande. Un seul point d'entrée,
// appelé dès l'ouverture du jeu (route ou catalogue) en même temps que le lecteur, puis par le lecteur lui-même : le
// navigateur ne télécharge le module qu'une fois, et la partie n'attend pas que le lecteur soit affiché pour le demander.
export function loadLeoEngine() {
  return import("../../prototypes/leo-livreur/LeoLivreurGame");
}
