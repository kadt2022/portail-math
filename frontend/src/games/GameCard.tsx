import { Link } from "react-router-dom";

import type { GameCatalogueEntry } from "./game-catalogue";
import styles from "./GameCard.module.css";
import { NewGameScene, TrainScene } from "./GameScenes";

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
  return <NewGameScene />;
}

export function GameCard({ game }: GameCardProps) {
  const isComingSoon = game.availability === "coming-soon";
  const isInternal = game.availability === "react";

  return (
    <article className={styles.card}>
      <div className={styles.illustration}>
        <CardVisual game={game} />
        {isComingSoon ? <span className={styles.badge}>Nouveau</span> : null}
      </div>
      <div className={styles.body}>
        <h3 className={styles.name}>{game.name}</h3>
        <p className={styles.description}>{game.description}</p>
        {isComingSoon ? (
          <span className={styles.ctaDisabled} aria-disabled="true">
            {game.ctaLabel}
          </span>
        ) : isInternal ? (
          <Link className={styles.cta} to={game.href}>
            {game.ctaLabel}
          </Link>
        ) : (
          <a className={styles.cta} href={game.href}>
            {game.ctaLabel}
          </a>
        )}
      </div>
    </article>
  );
}
