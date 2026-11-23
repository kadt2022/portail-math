import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { GameCatalogueEntry } from "./game-catalogue";
import { intentHandlers } from "./preload/cardIntent";
import styles from "./RecommendedGameCard.module.css";

interface RecommendedGameCardProps {
  game: GameCatalogueEntry;
  /** Jeux intégrés à la page : le clic les ouvre dans le lecteur principal (l'adresse reste un vrai lien). */
  onOpen?: (game: GameCatalogueEntry) => void;
  /** Intention de jouer (survol, focus, toucher) : le jeu commence à se télécharger avant le clic. */
  /** Survol stable à la souris : le jeu peut se précharger avant le clic (voir intentPreloader). */
  onIntent?: (gameId: string, stillHovered: () => boolean) => void;
  /** Le pointeur quitte la carte : un préchargement qui n'a pas commencé est annulé. */
  onIntentEnd?: (gameId: string) => void;
}

// Petite carte horizontale des jeux recommandés, à droite du lecteur : miniature, titre et catégorie.
export function RecommendedGameCard({ game, onOpen, onIntent, onIntentEnd }: RecommendedGameCardProps) {
  const { t } = useTranslation("games");
  const name = t(game.nameKey);
  const label = t("card.playAria", { name });
  const intent = intentHandlers(game.id, onIntent, onIntentEnd);

  const openInPlayer = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (!onOpen || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      onOpen(game);
    },
    [game, onOpen],
  );

  const content = (
    <>
      {game.thumbnail ? (
        <img className={styles.thumb} src={game.thumbnail} alt="" loading="lazy" decoding="async" width={160} height={100} style={game.focus ? { objectPosition: game.focus } : undefined} />
      ) : (
        <span className={styles.thumb} aria-hidden="true" />
      )}
      <span className={styles.text}>
        <span className={styles.name}>{name}</span>
        <span className={styles.tagline}>{t(game.taglineKey)}</span>
        <span className={styles.category}>{t(`categories.${game.categoryId}`)}</span>
      </span>
    </>
  );

  if (game.availability === "react") {
    return (
      <Link className={styles.card} to={game.href} aria-label={label} onClick={game.embed ? openInPlayer : undefined} {...intent}>
        {content}
      </Link>
    );
  }
  return (
    <a className={styles.card} href={game.href} aria-label={label} data-game-direct-launch data-game-title={name}>
      {content}
    </a>
  );
}
