import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useImmersiveDevice } from "../useImmersiveDevice";
import { GrilleMagiqueGame } from "./GrilleMagiqueGame";
import styles from "./GrilleMagiquePage.module.css";

// Page de jeu autonome (adresse directe /jeux/grille-magique). Depuis la page « Jeux », le même jeu se joue
// directement dans le catalogue (voir GamesCataloguePage) : ici, il occupe sa propre page.
export function GrilleMagiquePage() {
  const { t } = useTranslation("games");
  const [fullscreen, setFullscreen] = useState(false);
  const immersiveDevice = useImmersiveDevice();

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("grilleMagique.game.title")}</h1>
      <GrilleMagiqueGame
        showTitle={false}
        tutorial="auto"
        fullscreen={fullscreen}
        onFullscreenChange={setFullscreen}
        // Sur téléphone, « quitter » le plein écran ramène à la page de jeu (affichage normal).
        mobileImmersive={immersiveDevice && fullscreen}
        onClose={immersiveDevice && fullscreen ? () => setFullscreen(false) : undefined}
      />
      <Link className={styles.backLink} to="/jeux">
        {t("grilleMagique.game.actions.backToGames")}
      </Link>
    </div>
  );
}
