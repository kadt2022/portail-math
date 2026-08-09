import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { GameCatalogueEntry } from "./game-catalogue";
import styles from "./GameCard.module.css";
import { GrilleMagiqueScene, NewGameScene, TrainScene } from "./GameScenes";

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
  return <NewGameScene />;
}

export function GameCard({ game }: GameCardProps) {
  const { t } = useTranslation("games");
  const isComingSoon = game.availability === "coming-soon";
  const isReactRoute = game.availability === "react";
  const name = t(game.nameKey);
  const ctaLabel = t(game.ctaLabelKey);

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
          <Link className={styles.cta} to={game.href}>
            {ctaLabel}
          </Link>
        ) : (
          <a
            className={styles.cta}
            href={game.href}
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
