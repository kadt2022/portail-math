import { useTranslation } from "react-i18next";

import styles from "./GamesHeaderSearch.module.css";
import { useGamesQuery } from "./useGamesQuery";

// Grande barre de recherche centrale de l'en-tête, propre à la page Jeux (elle remplace les liens de cours, toujours accessibles
// dans le menu principal). La recherche vit dans l'adresse (?q=) : la page Jeux la lit pour filtrer ses jeux.
export function GamesHeaderSearch() {
  const { t } = useTranslation("games");
  const [query, setQuery] = useGamesQuery();

  return (
    <div className={styles.search} role="search">
      <svg className={styles.icon} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true" focusable="false">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("cataloguePage.headerSearchPlaceholder")}
        aria-label={t("cataloguePage.headerSearchLabel")}
      />
    </div>
  );
}
