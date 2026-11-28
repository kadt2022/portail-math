import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import styles from "../grille-magique/GrilleMagiquePage.module.css";
import { FLOW_VARIANTS, type FlowVariantId } from "./flow-variants";
import { MathFlowGame } from "./MathFlowGame";

// Page de jeu autonome des jeux Flow (adresses directes /jeux/addi-flow, /jeux/soustra-flow, /jeux/multipli-flow, /jeux/divi-flow).
// Depuis la page « Jeux », le même jeu se joue dans le lecteur du catalogue.
// Réglages d'essai facultatifs dans l'adresse : ?niveau=1..5 et ?graine=nombre (même plateau à chaque ouverture).
export function MathFlowPage({ variant }: { variant: FlowVariantId }) {
  const { t } = useTranslation("games");
  const [fullscreen, setFullscreen] = useState(false);
  const [params] = useSearchParams();
  const level = Number(params.get("niveau"));
  const seed = Number(params.get("graine"));
  const root = FLOW_VARIANTS[variant].i18n;

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t(`${root}.game.title`)}</h1>
      <MathFlowGame
        variant={variant}
        showTitle={false}
        fullscreen={fullscreen}
        onFullscreenChange={setFullscreen}
        initialLevel={Number.isFinite(level) && level >= 1 ? level : 1}
        initialSeed={Number.isInteger(seed) && seed > 0 ? seed : undefined}
      />
      <Link className={styles.backLink} to="/jeux">
        {t(`${root}.game.actions.backToGames`)}
      </Link>
    </div>
  );
}

export const AddiFlowPage = () => <MathFlowPage variant="addition" />;
export const SoustraFlowPage = () => <MathFlowPage variant="subtraction" />;
export const MultipliFlowPage = () => <MathFlowPage variant="multiplication" />;
export const DiviFlowPage = () => <MathFlowPage variant="division" />;
