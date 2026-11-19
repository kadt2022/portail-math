import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import styles from "./MobileTabBar.module.css";

export type MobilePanel = "search" | "filters" | null;

type Props = {
  label: string;
  labels: { home: string; search: string; filters: string; mine: string };
  panel: MobilePanel;
  onTogglePanel: (panel: "search" | "filters") => void;
  searchId: string;
  filtersId: string;
  filtersActive: boolean;
  mineActive: boolean;
  onMine: () => void;
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

// Barre de navigation basse des catalogues (Jeux, Bibliothèque) : téléphone uniquement, fixée au bas de la fenêtre,
// sur toute la largeur, comme celle de CrazyGames. Elle porte Accueil, Recherche, Filtres et la liste complète.
export function MobileTabBar({ label, labels, panel, onTogglePanel, searchId, filtersId, filtersActive, mineActive, onMine }: Props) {
  return (
    <nav className={styles.bar} aria-label={label}>
      <Link to="/" className={styles.item}>
        <Icon><path d="M3 11 12 3l9 8" /><path d="M5 10v10h5v-6h4v6h5V10" /></Icon>
        <span>{labels.home}</span>
      </Link>
      <button type="button" className={styles.item} aria-expanded={panel === "search"} aria-controls={searchId} data-active={panel === "search"} onClick={() => onTogglePanel("search")}>
        <Icon><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></Icon>
        <span>{labels.search}</span>
      </button>
      <button type="button" className={styles.item} aria-expanded={panel === "filters"} aria-controls={filtersId} data-active={panel === "filters" || filtersActive} onClick={() => onTogglePanel("filters")}>
        <Icon><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></Icon>
        <span>{labels.filters}</span>
      </button>
      <button type="button" className={styles.item} data-active={mineActive} aria-current={mineActive ? "page" : undefined} onClick={onMine}>
        <Icon><path d="M12 6.5C10 5 7 4.5 3 4.5v14c4 0 7 .5 9 2 2-1.5 5-2 9-2v-14c-4 0-7 .5-9 2Z" /><path d="M12 6.5v14" /></Icon>
        <span>{labels.mine}</span>
      </button>
    </nav>
  );
}
