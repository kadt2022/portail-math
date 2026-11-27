import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import styles from "../grille-magique/GrilleMagiquePage.module.css";
import { MultipliFlowGame } from "./MultipliFlowGame";

// Page de jeu autonome (adresse directe /jeux/multipli-flow). Le jeu reste hors catalogue pendant les essais.
// Réglages d'essai facultatifs dans l'adresse : ?niveau=1..5 et ?graine=nombre (même plateau à chaque ouverture).
export function MultipliFlowPage() {
  const { t } = useTranslation("games");
  const [fullscreen, setFullscreen] = useState(false);
  const [params] = useSearchParams();
  const level = Number(params.get("niveau"));
  const seed = Number(params.get("graine"));

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("multipliFlow.game.title")}</h1>
      <MultipliFlowGame
        showTitle={false}
        fullscreen={fullscreen}
        onFullscreenChange={setFullscreen}
        initialLevel={Number.isFinite(level) && level >= 1 ? level : 1}
        initialSeed={Number.isInteger(seed) && seed > 0 ? seed : undefined}
      />
      <Link className={styles.backLink} to="/jeux">
        {t("multipliFlow.game.actions.backToGames")}
      </Link>
    </div>
  );
}
