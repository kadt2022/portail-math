import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import { exitNativeFullscreen } from "../fullscreen";
import { useImmersiveDevice } from "../useImmersiveDevice";
import { TurboPulsePlayer } from "./TurboPulsePlayer";

// Page de jeu autonome (adresse directe /jeux/turbo-pulse). Depuis la page « Jeux », le même lecteur se joue
// directement dans le catalogue (voir GamesCataloguePage) : ici, il occupe sa propre page, en plein écran.
export function TurboPulsePage() {
  const navigate = useNavigate();
  const immersiveDevice = useImmersiveDevice();
  const [fullscreen, setFullscreen] = useState(true);

  const leave = useCallback(async () => {
    await exitNativeFullscreen();
    navigate("/jeux");
  }, [navigate]);

  return (
    <TurboPulsePlayer
      fullscreen={fullscreen}
      onFullscreenChange={setFullscreen}
      mobileImmersive={immersiveDevice && fullscreen}
      onClose={() => void leave()}
    />
  );
}
