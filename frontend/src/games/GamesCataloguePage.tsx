import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { MobileTabBar, type MobilePanel } from "../components/MobileTabBar";
import { availableCategories, featuredGame, playableGames, recommendedGames, type GameCatalogueEntry, type GameCategoryId } from "./game-catalogue";
import { GrilleMagiqueGame, LeoDrivingPlayer, onGameChosen, onGameIntent, onGameIntentEnd, RiviereFractionsPlayer, TrainMultiplicationsPlayer, TurboPulsePlayer } from "./embedded-games";
import { FeaturedGame } from "./FeaturedGame";
import { enterNativeFullscreen, exitNativeFullscreen, fullscreenElement } from "./fullscreen";
import { GameCard } from "./GameCard";
import { GameInfo } from "./GameInfo";
import { GameLoaderHost, ReachMilestone } from "./loading/GameLoaderHost";
import { startGameLoading } from "./loading/gameLoadingProfiles";
import type { LoadingSession } from "./loading/loadingSession";
import { GamePlayerFrame } from "./player/GamePlayerFrame";
import { GameWatchLayout } from "./player/GameWatchLayout";
import { RecommendedGameCard } from "./RecommendedGameCard";
import { galleryPlacements, maxCardsPerRow } from "./gallery-layout";
import { useGamesQuery } from "./useGamesQuery";
import { useImmersiveDevice } from "./useImmersiveDevice";
import styles from "./GamesCataloguePage.module.css";


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
  // La recherche vit dans l'adresse (?q=) : la grande barre de l'en-tête et la recherche du téléphone partagent la même valeur.
  const [query, setQuery] = useGamesQuery();

  // Sur téléphone, la recherche et les filtres sont rangés dans la barre basse : un seul panneau ouvert à la fois.
  const [panel, setPanel] = useState<MobilePanel>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const searchId = "games-search";
  const filtersId = "games-filters";

  // Jeu intégré à la page (Turbo Pulse, Les Tuiles magiques). Sur ordinateur, il s'ouvre dans le lecteur de la page. Sur téléphone,
  // le lecteur occupe tout l'écran dès l'ouverture, avec sa barre, et l'écran passe en paysage : le navigateur ne permet de tourner
  // l'écran qu'en plein écran natif, demandé ici dans le geste du clic (après, il serait refusé). Le bouton Plein écran ne fait
  // ensuite que masquer la barre. Une fois ouvert, le jeu reste monté (partie conservée) jusqu’au départ de la page.
  const immersiveDevice = useImmersiveDevice();
  const [stage, setStage] = useState<Stage>("closed");
  // Jeu ouvert (id du catalogue) et jeux déjà montés : un jeu fermé reste monté (partie conservée), en pause.
  const [openGameId, setOpenGameId] = useState<string | null>(null);
  const [mountedIds, setMountedIds] = useState<string[]>([]);
  // Séance de chargement de chaque jeu ouvert, créée dans le geste du clic : le chargeur commun s'affiche aussitôt, avant
  // même le téléchargement du code du jeu, et son horloge (seuil des 90 s) part de ce clic.
  const [loadingSessions, setLoadingSessions] = useState<Readonly<Record<string, LoadingSession>>>({});
  const stageRef = useRef<HTMLDivElement>(null);
  const immersive = stage === "immersive";
  const openEmbedded = useCallback((game: GameCatalogueEntry) => {
    // Le jeu choisi passe avant tout préchargement en attente (il se charge normalement, préchargé ou non).
    onGameChosen();
    const session = startGameLoading(game.id);
    setLoadingSessions((sessions) => (sessions[game.id] ? sessions : { ...sessions, [game.id]: session }));
    setOpenGameId(game.id);
    setMountedIds((ids) => (ids.includes(game.id) ? ids : [...ids, game.id]));
    if (immersiveDevice && !fullscreenElement()) {
      void enterNativeFullscreen(document.documentElement, true);
    }
    setStage("inline");
  }, [immersiveDevice]);
  const closeEmbedded = useCallback(() => {
    // Téléphone : on rend la page et l'orientation libre.
    if (fullscreenElement()) void exitNativeFullscreen();
    setStage("closed");
  }, []);
  const changeFullscreen = useCallback((next: boolean) => setStage(next ? "immersive" : "inline"), []);
  // Le lecteur revient à l'écran à l'ouverture, ET à chaque changement de jeu lecteur déjà ouvert (jeu recommandé, carte plus
  // bas dans la page) : l'effet suit aussi le jeu ouvert. Les gestes dans le jeu ne changent ni l'un ni l'autre : aucun défilement.
  // Il s'exécute après le rendu, quand le cadre du nouveau jeu existe (il porte alors la référence du lecteur).
  useEffect(() => {
    if (stage !== "inline") return;
    // Défilement immédiat (sans glissement animé) : le lecteur apparaît en place, sans impression de changement de page ; aucune
    // animation, donc la préférence « réduire les animations » est respectée d'office. L'en-tête du site est hors du conteneur
    // qui défile : le haut du lecteur s'aligne juste dessous, jamais masqué.
    const scroll = () => stageRef.current?.scrollIntoView?.({ block: "start" });
    // Retour du plein écran natif : on attend qu'il soit vraiment quitté, sinon la position visée est celle du lecteur plein écran.
    if (!fullscreenElement()) {
      scroll();
      return;
    }
    document.addEventListener("fullscreenchange", scroll, { once: true });
    document.addEventListener("webkitfullscreenchange", scroll, { once: true });
    return () => {
      document.removeEventListener("fullscreenchange", scroll);
      document.removeEventListener("webkitfullscreenchange", scroll);
    };
  }, [stage, openGameId]);

  // Jeu ouvert et jeux recommandés à côté du lecteur : ils ne sont pas répétés dans « Autres jeux du portail ».
  const open = stage !== "closed";
  // Téléphone : le lecteur ouvert occupe tout l'écran (barre comprise) ; la page derrière est inerte.
  const covered = open && immersiveDevice;
  const openGame = open ? playableGames.find((game) => game.id === openGameId) : undefined;
  const recommended = useMemo(() => (openGame ? recommendedGames(openGame, 3) : []), [openGame]);

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
        // Le jeu ouvert et les jeux recommandés ne sont pas répétés en dessous.
        !(open && (game.id === openGameId || recommended.some((item) => item.id === game.id))) &&
        (category === "all" || game.categoryId === category) &&
        normalize(t(game.nameKey)).includes(needle),
    );
  }, [category, query, t, open, openGameId, recommended]);

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
    <div ref={pageRef} className={`${styles.page}${open ? ` ${styles.pagePlaying}` : ""}`}>
      {/* En plein écran immersif, le reste de la page est inerte : pas de focus ni de lecture d’écran derrière le jeu. */}
      <div className={styles.contents} inert={immersive || covered}>
      {/* Mode lecteur : le titre et le sous-titre s'effacent (le titre reste lu par les lecteurs d'écran), le lecteur monte sous le menu. */}
      <header className={open ? styles.headerPlaying : styles.header}>
        <div className={open ? styles.srOnly : undefined}>
          <h1 className={styles.title}>{t("cataloguePage.title")}</h1>
          {open ? null : <p className={styles.subtitle}>{t("cataloguePage.subtitle")}</p>}
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

      <GameWatchLayout
        open={open}
        asideInert={immersive || covered}
        asideLabel={t("cataloguePage.recommended")}
        aside={
          openGame ? (
            <>
              <h2 className={styles.recommendedTitle}>{t("cataloguePage.recommended")}</h2>
              {recommended.map((game) => (
                <RecommendedGameCard key={game.id} game={game} onOpen={game.embed ? openEmbedded : undefined} onIntent={game.embed ? onGameIntent : undefined} onIntentEnd={game.embed ? onGameIntentEnd : undefined} />
              ))}
            </>
          ) : undefined
        }
      >
        {mountedIds.map((id) => {
          const shown = id === openGameId && stage !== "closed";
          return (
            <div key={id} ref={shown ? stageRef : undefined} className={`${styles.stage}${shown && covered ? ` ${styles.stageCover}` : ""}`} hidden={!shown}>
              {/* Chargeur commun posé sur le cadre du lecteur dès le clic ; pendant le téléchargement du code du jeu, le cadre
                  garde déjà la taille du lecteur, pour que la page ne bouge pas. */}
              <GameLoaderHost game={id} session={loadingSessions[id]} visible={shown} square={shown && covered} onClose={closeEmbedded}>
              <Suspense fallback={<GamePlayerFrame />}>
                <ReachMilestone id="player" />
                {id === "conduire-avec-leo" ? (
                  <LeoDrivingPlayer
                    fullscreen={shown && immersive}
                    active={shown}
                    onFullscreenChange={changeFullscreen}
                    onClose={closeEmbedded}
                    cover={shown && covered}
                  />
                ) : id === "train-des-multiplications" ? (
                  <TrainMultiplicationsPlayer
                    fullscreen={shown && immersive}
                    active={shown}
                    onFullscreenChange={changeFullscreen}
                    onClose={closeEmbedded}
                    cover={shown && covered}
                  />
                ) : id === "riviere-des-fractions" ? (
                  <RiviereFractionsPlayer
                    fullscreen={shown && immersive}
                    active={shown}
                    onFullscreenChange={changeFullscreen}
                    onClose={closeEmbedded}
                    cover={shown && covered}
                  />
                ) : id === "turbo-pulse" ? (
                  <TurboPulsePlayer
                    fullscreen={shown && immersive}
                    active={shown}
                    onFullscreenChange={changeFullscreen}
                    onClose={closeEmbedded}
                    cover={shown && covered}
                  />
                ) : (
                  <GrilleMagiqueGame
                    fullscreen={shown && immersive}
                    active={shown}
                    tutorial="auto"
                    onFullscreenChange={changeFullscreen}
                    onClose={closeEmbedded}
                    cover={shown && covered}
                  />
                )}
              </Suspense>
              </GameLoaderHost>
            </div>
          );
        })}
        {openGame ? (
          <div className={styles.contents} inert={immersive || covered}>
            <GameInfo game={openGame} />
          </div>
        ) : null}
      </GameWatchLayout>

      <div className={styles.contents} inert={immersive || covered}>
      {featuredGame && !filtering && stage === "closed" ? <FeaturedGame key={visitKey} game={featuredGame} onOpen={featuredGame.embed ? openEmbedded : undefined} onIntent={featuredGame.embed ? onGameIntent : undefined} onIntentEnd={featuredGame.embed ? onGameIntentEnd : undefined} /> : null}

      {open && visibleGames.length > 0 ? <h2 className={styles.otherGames}>{t("cataloguePage.otherGames")}</h2> : null}
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
            <GameCard key={game.id} game={game} placement={placements[index]} onOpen={openEmbedded} onIntent={game.embed ? onGameIntent : undefined} onIntentEnd={game.embed ? onGameIntentEnd : undefined} />
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
