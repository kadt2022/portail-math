import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { exitNativeFullscreen } from "../fullscreen";
import { TrainMultiplicationsPlayer } from "./TrainMultiplicationsPlayer";

/**
 * Page autonome du Train des multiplications 3D (adresse directe /jeux/train-des-multiplications). Depuis la page « Jeux », le même
 * lecteur se joue directement dans le catalogue ; ici, il occupe sa propre page. « Fermer » ramène au catalogue des jeux.
 */
export function TrainMultiplicationsGamePage() {
  const navigate = useNavigate();
  const [fullscreen, setFullscreen] = useState(false);
  const backToGames = useCallback(async () => {
    await exitNativeFullscreen();
    navigate("/jeux");
  }, [navigate]);
  return <TrainMultiplicationsPlayer pageHeading fullscreen={fullscreen} onFullscreenChange={setFullscreen} onClose={() => void backToGames()} />;
}
