import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { exitNativeFullscreen } from "../fullscreen";
import { LeoDrivingPlayer } from "./LeoDrivingPlayer";

/**
 * Page autonome de « Conduire avec Léo » (adresse directe /jeux/conduire-avec-leo). Depuis la page « Jeux », le même lecteur
 * se joue directement dans le catalogue ; ici, il occupe sa propre page, en affichage normal (plein écran au choix).
 * « Fermer » ramène au catalogue des jeux.
 */
export function LeoDrivingGamePage() {
  const navigate = useNavigate();
  const [fullscreen, setFullscreen] = useState(false);
  const backToGames = useCallback(async () => {
    await exitNativeFullscreen();
    navigate("/jeux");
  }, [navigate]);
  return <LeoDrivingPlayer pageHeading fullscreen={fullscreen} onFullscreenChange={setFullscreen} onClose={() => void backToGames()} />;
}
