import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { exitNativeFullscreen } from "../fullscreen";
import { TurboPulsePlayer } from "./TurboPulsePlayer";

// Page de jeu autonome (adresse directe /jeux/turbo-pulse). Depuis la page « Jeux », le même lecteur se joue
// directement dans le catalogue (voir GamesCataloguePage) : ici, il occupe sa propre page, en affichage normal (plein écran au choix du joueur).
export function TurboPulsePage() {
  const navigate = useNavigate();
  const [fullscreen, setFullscreen] = useState(false);

  const leave = useCallback(async () => {
    await exitNativeFullscreen();
    navigate("/jeux");
  }, [navigate]);

  return (
    <TurboPulsePlayer
      pageHeading
      fullscreen={fullscreen}
      onFullscreenChange={setFullscreen}
      onClose={() => void leave()}
    />
  );
}
