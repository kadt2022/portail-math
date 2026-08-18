import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { GameCatalogueEntry } from "./game-catalogue";
import styles from "./GameCard.module.css";
import { FluxForgeScene, GrilleMagiqueScene, NewGameScene, TrainScene, TurboPulseCardScene } from "./GameScenes";

interface GameCardProps {
  game: GameCatalogueEntry;
}

function CardVisual({ game }: GameCardProps) {
  if (game.imageSrc) {
    return <img className={styles.photo} src={game.imageSrc} alt="" loading="lazy" />;
  }
  if (game.sceneId === "train") {
    return <TrainScene />;
  }
  if (game.sceneId === "grille-magique") {
    return <GrilleMagiqueScene />;
  }
  if (game.sceneId === "turbo-pulse") {
    return <TurboPulseCardScene />;
  }
  if (game.sceneId === "flux-forge") {
    return <FluxForgeScene />;
  }
  return <NewGameScene />;
}

export function GameCard({ game }: GameCardProps) {
  const { t } = useTranslation("games");
  const navigate = useNavigate();
  const isComingSoon = game.availability === "coming-soon";
  const isReactRoute = game.availability === "react";
  const name = t(game.nameKey);
  const ctaLabel = t(game.ctaLabelKey);

  // Turbo Pulse doit s'ouvrir immédiatement en plein écran paysage au clic.
  // C'est le seul endroit où requestFullscreen() peut être appelé depuis une
  // action utilisateur directe (clic). Dès que fullscreen est accordé,
  // naviguer vers la page de jeu.
  const launchTurboPulseFullscreen = useCallback(
    async (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (game.id !== "turbo-pulse") return;
      e.preventDefault();
      const root = document.documentElement;
      try {
        await root.requestFullscreen?.();
        try {
          await screen.orientation?.lock?.("landscape");
        } catch {
          // Verrouillage refusé ou non supporté : continuer sans lui.
        }
      } catch {
        // Fullscreen refusé : continuer avec fallback responsive.
      }
      navigate(game.href);
    },
    [game, navigate],
  );

  return (
    <article className={styles.card}>
      <div className={styles.illustration}>
        <CardVisual game={game} />
        {isComingSoon ? <span className={styles.badge}>{t("badge.new")}</span> : null}
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{name}</h3>
        <p className={styles.description}>{t(game.descriptionKey)}</p>
        {isComingSoon ? (
          <span className={styles.ctaDisabled} aria-disabled="true">
            {ctaLabel}
          </span>
        ) : isReactRoute ? (
          <Link className={styles.cta} to={game.href} onClick={game.id === "turbo-pulse" ? launchTurboPulseFullscreen : undefined}>
            {ctaLabel}
          </Link>
        ) : (
          <a
            className={styles.cta}
            href={game.href}
            onClick={game.id === "turbo-pulse" ? launchTurboPulseFullscreen : undefined}
            data-game-direct-launch
            data-game-title={name}
            data-game-mark={game.id === "multiplication-train" ? "🚂" : "🏞️"}
          >
            {ctaLabel}
          </a>
        )}
      </div>
    </article>
  );
}
