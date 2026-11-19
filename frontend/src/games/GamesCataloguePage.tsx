import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { MobileTabBar, type MobilePanel } from "../components/MobileTabBar";
import { availableCategories, featuredGame, playableGames, type GameCategoryId } from "./game-catalogue";
import { FeaturedGame } from "./FeaturedGame";
import { GameCard } from "./GameCard";
import { galleryPlacements, maxCardsPerRow } from "./gallery-layout";
import { useImmersiveDevice } from "./useImmersiveDevice";
import styles from "./GamesCataloguePage.module.css";

// Le jeu intégré ne se charge qu’à son ouverture : le catalogue reste léger.
const GrilleMagiqueGame = lazy(() => import("./grille-magique/GrilleMagiqueGame").then((m) => ({ default: m.GrilleMagiqueGame })));

type Stage = "closed" | "inline" | "immersive";

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

  // Sur téléphone, la recherche et les filtres sont rangés dans la barre basse : un seul panneau ouvert à la fois.
  const [panel, setPanel] = useState<MobilePanel>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const searchId = "games-search";
  const filtersId = "games-filters";

  // Jeu intégré à la page (Les Tuiles magiques) : sur ordinateur il se joue dans la page, avec un plein écran au choix ;
  // sur téléphone il s’ouvre directement en plein écran immersif. Une fois ouvert, il reste monté (partie conservée) jusqu’au départ de la page.
  const immersiveDevice = useImmersiveDevice();
  const [stage, setStage] = useState<Stage>("closed");
  const [stageMounted, setStageMounted] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const immersive = stage === "immersive";
  const openEmbedded = useCallback(() => {
    setStageMounted(true);
    setStage(immersiveDevice ? "immersive" : "inline");
  }, [immersiveDevice]);
  const closeEmbedded = useCallback(() => setStage("closed"), []);
  const changeFullscreen = useCallback((next: boolean) => setStage(next ? "immersive" : "inline"), []);
  useEffect(() => {
    if (stage === "inline") stageRef.current?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  }, [stage]);

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
        // Le jeu ouvert dans la page n’est plus proposé en dessous : on y voit les autres jeux.
        !(game.embed && stage !== "closed") &&
        (category === "all" || game.categoryId === category) &&
        normalize(t(game.nameKey)).includes(needle),
    );
  }, [category, query, t, stage]);

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

  useEffect(() => {
    if (panel === "search") searchInputRef.current?.focus();
  }, [panel]);

  // Échap referme le panneau ouvert.
  useEffect(() => {
    if (!panel) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPanel(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [panel]);

  // « Mes jeux » : retour à la liste complète (panneaux fermés, recherche et univers vidés), en haut de la page.
  function showAllGames() {
    setPanel(null);
    setCategory("all");
    setQuery("");
    // Le défilement se fait dans le conteneur de la page (pas dans la fenêtre) : on ramène le haut de la page à l’écran.
    pageRef.current?.scrollIntoView?.({ block: "start" });
  }

  const placements = galleryPlacements(visibleGames.length, maxPerRow);

  return (
    <div ref={pageRef} className={styles.page}>
      {/* En plein écran immersif, le reste de la page est inerte : pas de focus ni de lecture d’écran derrière le jeu. */}
      <div className={styles.contents} inert={immersive}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t("cataloguePage.title")}</h1>
          <p className={styles.subtitle}>{t("cataloguePage.subtitle")}</p>
        </div>
        <div id={searchId} className={`${styles.search}${panel === "search" ? ` ${styles.panelOpen}` : ""}`} role="search">
          <input
            ref={searchInputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("cataloguePage.searchPlaceholder")}
            aria-label={t("cataloguePage.searchLabel")}
          />
        </div>
      </header>
      </div>

      {stageMounted ? (
        <div ref={stageRef} className={styles.stage} hidden={stage === "closed"}>
          <Suspense fallback={<p className={styles.stageLoading}>{t("cataloguePage.loading")}</p>}>
            <GrilleMagiqueGame
              fullscreen={immersive}
              active={stage !== "closed"}
              tutorial="auto"
              mobileImmersive={immersive && immersiveDevice}
              onFullscreenChange={changeFullscreen}
              onClose={immersive && !immersiveDevice ? undefined : closeEmbedded}
            />
          </Suspense>
        </div>
      ) : null}

      <div className={styles.contents} inert={immersive}>
      {featuredGame && !filtering && stage === "closed" ? <FeaturedGame key={visitKey} game={featuredGame} /> : null}

      {stage !== "closed" ? <h2 className={styles.otherGames}>{t("cataloguePage.otherGames")}</h2> : null}
      <div id={filtersId} className={`${styles.chips}${panel === "filters" ? ` ${styles.panelOpen}` : ""}`} role="group" aria-label={t("cataloguePage.filterLabel")}>
        <div className={styles.sheetHead}>
          <strong>{t("bar.panelTitle")}</strong>
          <button type="button" className={styles.sheetClose} onClick={() => setPanel(null)}>{t("bar.close")}</button>
        </div>
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
        <button type="button" className={styles.sheetShow} onClick={() => setPanel(null)}>
          {t("bar.show")} ({visibleGames.length})
        </button>
      </div>
      {panel === "filters" && <div className={styles.scrim} aria-hidden="true" onClick={() => setPanel(null)} />}

      <p className={styles.count} role="status">{t("cataloguePage.resultCount", { count: visibleGames.length })}</p>
      {visibleGames.length > 0 ? (
        <div ref={gridRef} className={styles.grid}>
          {visibleGames.map((game, index) => (
            <GameCard key={game.id} game={game} placement={placements[index]} onOpen={openEmbedded} />
          ))}
        </div>
      ) : (
        <p className={styles.empty}>{t("cataloguePage.noResult")}</p>
      )}

      <MobileTabBar
        label={t("bar.label")}
        labels={{ home: t("bar.home"), search: t("bar.search"), filters: t("bar.filters"), mine: t("bar.myGames") }}
        panel={panel}
        onTogglePanel={(next) => setPanel((current) => (current === next ? null : next))}
        searchId={searchId}
        filtersId={filtersId}
        filtersActive={category !== "all"}
        mineActive={panel === null && !filtering}
        onMine={showAllGames}
      />
      </div>
    </div>
  );
}
