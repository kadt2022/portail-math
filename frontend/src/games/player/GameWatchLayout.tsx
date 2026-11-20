import type { ReactNode } from "react";

import styles from "./GameWatchLayout.module.css";

interface GameWatchLayoutProps {
  /** Faux : la disposition est masquée (les jeux restent montés, parties conservées). */
  open: boolean;
  /** Colonne de droite : jeux recommandés (petites cartes horizontales). Absente : le lecteur prend toute la largeur. */
  aside?: ReactNode;
  /** Nom accessible de la colonne de droite. */
  asideLabel?: string;
  /** Plein écran : la colonne de droite devient inerte derrière le jeu. */
  asideInert?: boolean;
  /** Colonne principale : le lecteur du jeu, puis ses informations. */
  children: ReactNode;
}

// Structure commune des pages de jeu, sur le principe de YouTube et de CrazyGames : le lecteur à gauche (environ 70 à 75 % de la
// largeur) avec ses informations dessous, les recommandations à droite (environ 25 à 30 %). Sur écran étroit, tout passe en une colonne.
// La section « Autres jeux du portail » vient ensuite, pleine largeur : elle est posée par la page, sous cette disposition.
export function GameWatchLayout({ open, aside, asideLabel, asideInert = false, children }: GameWatchLayoutProps) {
  return (
    <div className={`${styles.watch}${aside ? ` ${styles.withAside}` : ""}`} hidden={!open}>
      <div className={styles.main}>{children}</div>
      {aside ? (
        <aside className={styles.aside} aria-label={asideLabel} inert={asideInert}>
          {aside}
        </aside>
      ) : null}
    </div>
  );
}
