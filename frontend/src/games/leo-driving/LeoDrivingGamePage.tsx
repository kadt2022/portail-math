import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { LeoLivreurPrototypePage } from "../../prototypes/leo-livreur/LeoLivreurPrototypePage";

/**
 * « Conduire avec Léo » : le jeu s'ouvre directement sur l'écran de conduite plein écran (tableau de bord, scène,
 * commandes). « Quitter » ramène au catalogue des jeux.
 */
export function LeoDrivingGamePage() {
  const navigate = useNavigate();
  const backToGames = useCallback(() => navigate("/jeux"), [navigate]);
  return <LeoLivreurPrototypePage startInDrivingMode onExit={backToGames} />;
}
