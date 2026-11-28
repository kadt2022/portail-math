import { useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { GameCatalogueEntry } from "./game-catalogue";
import { intentHandlers } from "./preload/cardIntent";
import styles from "./GameCard.module.css";

interface GameCardProps {
  game: GameCatalogueEntry;
  /** Jeux intégrés à la page : le clic ouvre le jeu sur place au lieu de changer de page (l’adresse reste un vrai lien). */
  onOpen?: (game: GameCatalogueEntry) => void;
  /** Survol stable à la souris : le jeu peut se précharger avant le clic (voir intentPreloader). */
  onIntent?: (gameId: string, stillHovered: () => boolean) => void;
  /** Le pointeur quitte la carte : un préchargement qui n'a pas commencé est annulé. */
  onIntentEnd?: (gameId: string) => void;
}

// Toute la carte est le lien : pas de bouton « Jouer » séparé. L'illustration occupe
// la carte entière, le titre et les repères (âge, niveaux) sont posés sur une bande en bas.
export function GameCard({ game, onOpen, onIntent, onIntentEnd }: GameCardProps) {
  const { t } = useTranslation("games");
  const name = t(game.nameKey);
  // Seulement ce qui est connu : l'âge recommandé et le nombre de niveaux ; sans donnée, aucun repère n'est affiché.
  const meta = [game.minAge ? t("card.age", { age: game.minAge }) : null, game.levels ? t("card.levels", { count: game.levels }) : null].filter(Boolean).join(" · ");

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
          height={360}
          style={game.focus ? { objectPosition: game.focus } : undefined}
        />
      ) : null}
      {game.overlay ? <img className={styles.overlay} src={game.overlay} alt="" loading="lazy" decoding="async" width={400} height={428} /> : null}
      <span className={styles.bar}>
        <span className={styles.name}>{name}</span>
        {meta ? <span className={styles.meta}>{meta}</span> : null}
      </span>
    </>
  );
  const label = t("card.playAria", { name });
  const intent = intentHandlers(game.id, onIntent, onIntentEnd);

  if (game.availability === "react") {
    return (
      <Link className={styles.card} to={game.href} aria-label={label} onClick={game.embed ? openInPage : undefined} {...intent}>
        {content}
      </Link>
    );
  }

  return (
    <a
      className={styles.card}
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
