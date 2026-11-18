import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { availableCategories, featuredGame, playableGames, type GameCategoryId } from "./game-catalogue";
import { FeaturedGame } from "./FeaturedGame";
import { GameCard } from "./GameCard";
import { galleryPlacements, maxCardsPerRow } from "./gallery-layout";
import styles from "./GamesCataloguePage.module.css";

// Compare sans tenir compte des accents ni de la casse : « riviere » trouve « Rivière ».
function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

export function GamesCataloguePage() {
  const { t } = useTranslation("games");
  // La clé de navigation change à chaque sélection de « Jeux » (même depuis la page des jeux) : l'arrivée de Léo rejoue.
  const { key: visitKey } = useLocation();
  const [category, setCategory] = useState<GameCategoryId | "all">("all");
  const [query, setQuery] = useState("");

  const gridRef = useRef<HTMLDivElement>(null);
  const [maxPerRow, setMaxPerRow] = useState(3);

  const filtering = category !== "all" || query.trim() !== "";

  // Le jeu à la une a sa bannière, mais reste aussi dans la galerie, juste avant le dernier jeu.
  const visibleGames = useMemo(() => {
    const needle = normalize(query);
    const others = playableGames.filter((game) => !game.featured);
    const lead = playableGames.filter((game) => game.featured);
    const ordered = [...others.slice(0, -1), ...lead, ...others.slice(-1)];
    return ordered.filter(
      (game) =>
        (category === "all" || game.categoryId === category) &&
        normalize(t(game.nameKey)).includes(needle),
    );
  }, [category, query, t]);

  // La composition suit la largeur réelle de la galerie (et non celle de la fenêtre : le menu vertical
  // en retire une partie). Sans ResizeObserver, la valeur par défaut reste utilisable.
  const hasGrid = visibleGames.length > 0;
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const update = () => setMaxPerRow(maxCardsPerRow(grid.getBoundingClientRect().width || window.innerWidth));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(grid);
    return () => observer.disconnect();
  }, [hasGrid]);

  const placements = galleryPlacements(visibleGames.length, maxPerRow);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("cataloguePage.title")}</h1>
        </div>
        <div className={styles.search} role="search">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("cataloguePage.searchPlaceholder")}
            aria-label={t("cataloguePage.searchLabel")}
          />
        </div>
      </header>

      {featuredGame && !filtering ? <FeaturedGame key={visitKey} game={featuredGame} /> : null}

      <div className={styles.chips} role="group" aria-label={t("cataloguePage.filterLabel")}>
        <button type="button" className={styles.chip} aria-pressed={category === "all"} onClick={() => setCategory("all")}>
          {t("cataloguePage.all")}
        </button>
        {availableCategories.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.chip}
            aria-pressed={category === item.id}
            onClick={() => setCategory(item.id)}
          >
            {t(item.labelKey)}
          </button>
        ))}
      </div>

      <p className={styles.count} role="status">{t("cataloguePage.resultCount", { count: visibleGames.length })}</p>
      {visibleGames.length > 0 ? (
        <div ref={gridRef} className={styles.grid}>
          {visibleGames.map((game, index) => (
            <GameCard key={game.id} game={game} placement={placements[index]} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>{t("cataloguePage.noResult")}</p>
      )}
    </div>
  );
}
