import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import styles from "../grille-magique/GrilleMagiquePage.module.css";
import { RasterPuzzleGame } from "./RasterPuzzleGame";

// Page de jeu autonome (adresse directe /jeux/raster-puzzle). Depuis la page « Jeux », le même jeu se joue directement dans le
// catalogue (voir GamesCataloguePage) : ici, il occupe sa propre page. Elle reprend la mise en page des autres pages de jeu.
export function RasterPuzzlePage() {
  const { t } = useTranslation("games");
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("rasterPuzzle.game.title")}</h1>
      <RasterPuzzleGame showTitle={false} fullscreen={fullscreen} onFullscreenChange={setFullscreen} />
      <Link className={styles.backLink} to="/jeux">
        {t("rasterPuzzle.game.actions.backToGames")}
      </Link>
    </div>
  );
}
