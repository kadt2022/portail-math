import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { GameCatalogueEntry } from "./game-catalogue";
import { intentHandlers } from "./preload/cardIntent";
import type { CardPlacement } from "./gallery-layout";
import styles from "./GameCard.module.css";

interface GameCardProps {
  game: GameCatalogueEntry;
  /** Place dans la galerie (colonnes et proportions) ; sans elle, la carte prend sa taille naturelle. */
  placement?: CardPlacement;
  /** Jeux intégrés à la page : le clic ouvre le jeu sur place au lieu de changer de page (l’adresse reste un vrai lien). */
  onOpen?: (game: GameCatalogueEntry) => void;
  /** Survol stable à la souris : le jeu peut se précharger avant le clic (voir intentPreloader). */
  onIntent?: (gameId: string, stillHovered: () => boolean) => void;
  /** Le pointeur quitte la carte : un préchargement qui n'a pas commencé est annulé. */
  onIntentEnd?: (gameId: string) => void;
}

// Toute la carte est le lien : pas de bouton « Jouer » séparé. L'illustration occupe
// la carte entière, le titre et l'accroche sont posés sur une bande en bas.
export function GameCard({ game, placement, onOpen, onIntent, onIntentEnd }: GameCardProps) {
  const { t } = useTranslation("games");
  const name = t(game.nameKey);
  const style: React.CSSProperties | undefined = placement
    ? {
        gridColumn: placement.start ? `${placement.start} / span ${placement.span}` : `span ${placement.span}`,
        aspectRatio: placement.ratio,
      }
    : undefined;

  // Clic simple : le jeu s’ouvre dans la page. Clic avec modificateur (nouvel onglet) : le lien normal s’applique.
  const openInPage = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (!onOpen || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      onOpen(game);
    },
    [game, onOpen],
  );

  const content = (
    <>
      {game.thumbnail ? (
        <img
          className={styles.image}
          src={game.thumbnail}
          alt=""
          loading="lazy"
          decoding="async"
          width={640}
          height={400}
          style={game.focus ? { objectPosition: game.focus } : undefined}
        />
      ) : null}
      {game.overlay ? <img className={styles.overlay} src={game.overlay} alt="" loading="lazy" decoding="async" width={400} height={428} /> : null}
      <span className={styles.category}>{t(`categories.${game.categoryId}`)}</span>
      <span className={styles.bar}>
        <span className={styles.name}>{name}</span>
        <span className={styles.tagline}>{t(game.taglineKey)}</span>
      </span>
    </>
  );
  const label = t("card.playAria", { name });
  const intent = intentHandlers(game.id, onIntent, onIntentEnd);

  if (game.availability === "react") {
    return (
      <Link className={styles.card} style={style} to={game.href} aria-label={label} onClick={game.embed ? openInPage : undefined} {...intent}>
        {content}
      </Link>
    );
  }

  return (
    <a
      className={styles.card} style={style}
      href={game.href}
      aria-label={label}
      data-game-direct-launch
      data-game-title={name}
      data-game-mark={game.id === "multiplication-train" ? "🚂" : game.id === "flux-forge" ? "🏗️" : "🏞️"}
    >
      {content}
    </a>
  );
}
