import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { exitNativeFullscreen } from "../fullscreen";
import { RiviereFractionsPlayer } from "./RiviereFractionsPlayer";

/**
 * Page autonome de La Rivière des Fractions (adresse directe /jeux/riviere-des-fractions). Depuis la page « Jeux », le même
 * lecteur se joue directement dans le catalogue ; ici, il occupe sa propre page. « Fermer » ramène au catalogue des jeux.
 */
export function RiviereFractionsGamePage() {
  const navigate = useNavigate();
  const [fullscreen, setFullscreen] = useState(false);
  const backToGames = useCallback(async () => {
    await exitNativeFullscreen();
    navigate("/jeux");
  }, [navigate]);
  return <RiviereFractionsPlayer pageHeading fullscreen={fullscreen} onFullscreenChange={setFullscreen} onClose={() => void backToGames()} />;
}
