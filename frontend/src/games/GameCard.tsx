import { useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { GameCatalogueEntry } from "./game-catalogue";
import type { CardPlacement } from "./gallery-layout";
import styles from "./GameCard.module.css";

interface GameCardProps {
  game: GameCatalogueEntry;
  /** Place dans la galerie (colonnes et proportions) ; sans elle, la carte prend sa taille naturelle. */
  placement?: CardPlacement;
}

// Toute la carte est le lien : pas de bouton « Jouer » séparé. L'illustration occupe
// la carte entière, le titre et l'accroche sont posés sur une bande en bas.
export function GameCard({ game, placement }: GameCardProps) {
  const { t } = useTranslation("games");
  const navigate = useNavigate();
  const name = t(game.nameKey);
  const style: React.CSSProperties | undefined = placement
    ? {
        gridColumn: placement.start ? `${placement.start} / span ${placement.span}` : `span ${placement.span}`,
        aspectRatio: placement.ratio,
      }
    : undefined;

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

  if (game.availability === "react") {
    return (
      <Link className={styles.card} style={style} to={game.href} aria-label={label} onClick={game.id === "turbo-pulse" ? launchTurboPulseFullscreen : undefined}>
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
