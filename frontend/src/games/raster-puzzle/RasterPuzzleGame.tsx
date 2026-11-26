import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { useTranslation } from "react-i18next";

import { ILLUSTRATION_CATEGORY_ORDER, illustrationsOf, type IllustrationCategoryChoice } from "../../illustrations/catalogue";
import { illustrationUrl } from "../../illustrations/illustrations";
import { useGameAudio } from "../audio/useGameAudio";
import type { SoundEffect } from "../audio/sound-effects";
import { useGameLoading } from "../loading/GameLoaderHost";
import { GamePlayer, playerControlClass } from "../player/GamePlayer";
import { GuideHand } from "../player/GuideHand";
import { checkBoard, createPuzzle, DEFAULT_LEVEL, fitTiles, LEVELS, levelSize, pickImage, placePiece, remember, returnToTray, withClasses, type LevelId, type PuzzleState } from "./puzzle-engine";
import { PuzzleTile } from "./PuzzleTile";
import styles from "./RasterPuzzle.module.css";
import { Savanna } from "./Savanna";
import { readTileClasses } from "./tile-signature";

type Phase = "reveal" | "split" | "fly" | "play" | "won";

export interface RasterPuzzleGameProps {
  /** Titre visible dans l'en-tête du lecteur (faux sur la page autonome, qui a déjà son titre). */
  showTitle?: boolean;
  /** Le jeu se met en pause tout seul lorsqu'il n'est plus visible. */
  active?: boolean;
  fullscreen?: boolean;
  onFullscreenChange?: (next: boolean) => void;
  onClose?: () => void;
  cover?: boolean;
}

interface Round {
  key: number;
  image: string;
  size: number;
}

// Durées (ms) : l'image entière se montre, se découpe, puis les morceaux filent vers la zone de stockage.
const REVEAL_MS = 1900;
const SPLIT_MS = 900;
const FLY_MS = 1100;
const REDUCED = { reveal: 600, split: 0, fly: 150 };
const HINT_MS = 1800;
const NUDGE_MS = 8000;
const LOAD_FALLBACK_MS = 2500;
const DRAG_THRESHOLD = 8;
const GAP = 6;
const GUIDED_KEY = "raster.puzzle.guided";
// Musique de fond : un petit thème en boucle, téléchargé seulement à l'ouverture du jeu (environ 240 Ko). Le format Opus (.ogg) quand le
// navigateur le lit, le MP3 sinon. Les bruits de tuiles, eux, sont fabriqués par programmation (voir audio/sound-effects).
const MUSIC_VOLUME = 0.28;
const canPlayOpus = () => typeof document !== "undefined" && document.createElement("audio").canPlayType('audio/ogg; codecs="opus"') !== "";
const loadTheme = () => (canPlayOpus() ? import("../../assets/raster-puzzle/raster-puzzle-theme.ogg") : import("../../assets/raster-puzzle/raster-puzzle-theme.mp3"));

const prefersReducedMotion = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const readGuided = () => {
  try {
    return window.localStorage.getItem(GUIDED_KEY) === "1";
  } catch {
    return false;
  }
};
const saveGuided = () => {
  try {
    window.localStorage.setItem(GUIDED_KEY, "1");
  } catch {
    // Stockage indisponible (navigation privée) : le guide reviendra simplement à la prochaine visite.
  }
};

const CATEGORY_CHOICES: IllustrationCategoryChoice[] = ["all", ...ILLUSTRATION_CATEGORY_ORDER];

function Arrow({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" focusable="false">
      <path d={direction === "left" ? "M15 5 8 12l7 7z" : "m9 5 7 7-7 7z"} fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

// Raster Puzzle : une image est découpée en tuiles, l'enfant les replace dans la grille. La logique est dans puzzle-engine (pure, testée) ;
// ici : l'interface, les déplacements (toucher, souris, clavier), les animations et les sons.
export function RasterPuzzleGame({ showTitle = true, active = true, fullscreen, onFullscreenChange, onClose, cover }: RasterPuzzleGameProps) {
  const { t } = useTranslation("games");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const trayRef = useRef<HTMLElement | null>(null);
  const boardRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  const loading = useGameLoading();
  useEffect(() => {
    loading.milestone("mounted");
    loading.ready();
  }, [loading]);

  const [category, setCategory] = useState<IllustrationCategoryChoice>("all");
  const [level, setLevel] = useState<LevelId>(DEFAULT_LEVEL);
  const [round, setRound] = useState<Round>(() => ({ key: 1, image: pickImage(illustrationsOf("all"), []) ?? "lion", size: levelSize(DEFAULT_LEVEL) }));
  // La première image compte déjà parmi les images vues : elle ne ressort pas tout de suite.
  const [recent, setRecent] = useState<string[]>(() => [round.image]);
  const [puzzle, setPuzzle] = useState<PuzzleState>(() => createPuzzle(levelSize(DEFAULT_LEVEL)));
  const [basePhase, setBasePhase] = useState<Phase>("reveal");
  const [ready, setReady] = useState(false);
  const [finished, setFinished] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [hint, setHint] = useState(false);
  // Verdict affiché : les tuiles justes (coche) et fausses (croix), et ce qu'il faut en comprendre. Il disparaît dès que l'enfant bouge une tuile.
  const [verdict, setVerdict] = useState<{ correct: number[]; wrong: number[]; kind: "wrong" | "right" | "empty" } | null>(null);
  const [paused, setPaused] = useState(false);
  const [beginner, setBeginner] = useState(() => !readGuided());
  const [nudgedFor, setNudgedFor] = useState("");
  const [trayTile, setTrayTile] = useState(0);
  const reduced = useMemo(() => prefersReducedMotion(), []);

  const sound = useGameAudio({ rootRef, loadMusic: loadTheme, musicOn: active && !paused, musicVolume: MUSIC_VOLUME });
  const playSound = sound.play;
  const frozen = paused || !active;
  const won = puzzle.status === "won";
  const phase: Phase = won ? "won" : basePhase;
  const url = illustrationUrl(round.image);
  const solved = finished + (won ? 1 : 0);
  const puzzleRef = useRef(puzzle);
  useEffect(() => {
    puzzleRef.current = puzzle;
  });

  const beginRound = useCallback(
    (image: string, size: number, history: string[]) => {
      setRecent(remember(history, image));
      setRound((previous) => ({ key: previous.key + 1, image, size }));
      setPuzzle(createPuzzle(size));
      setBasePhase("reveal");
      setReady(false);
      setSelected(null);
      setHint(false);
      setVerdict(null);
      setFinished((count) => count + (puzzleRef.current.status === "won" ? 1 : 0));
      if (readGuided()) setBeginner(false);
    },
    [],
  );

  const nextImage = useCallback(
    (nextCategory: IllustrationCategoryChoice = category, nextLevel: LevelId = level) => {
      const image = pickImage(illustrationsOf(nextCategory), recent);
      if (image) beginRound(image, levelSize(nextLevel), recent);
    },
    [beginRound, category, level, recent],
  );

  // Lecture de l'image : les morceaux de fond blanc identiques deviennent interchangeables. Sans lecture possible (ou trop lente),
  // le jeu continue : chaque morceau est alors unique, ce qui reste juste.
  useEffect(() => {
    let cancelled = false;
    const finish = (classes: number[] | null) => {
      if (cancelled) return;
      window.clearTimeout(fallback);
      setReady(true);
      if (!classes) return;
      const next = withClasses(puzzleRef.current, classes);
      if (next.status === "won" && puzzleRef.current.status !== "won") playSound("puzzleDone");
      setPuzzle(next);
    };
    const fallback = window.setTimeout(() => finish(null), LOAD_FALLBACK_MS);
    if (url) {
      const image = new Image();
      image.onload = () => finish(readTileClasses(image, round.size));
      image.onerror = () => finish(null);
      image.src = url;
    }
    return () => {
      cancelled = true;
      window.clearTimeout(fallback);
    };
  }, [round.key, round.size, url, playSound]);

  // Déroulement : l'image entière, la découpe, le vol des morceaux vers la zone de stockage, puis le jeu. Pause : tout s'arrête.
  useEffect(() => {
    if (frozen || !ready || basePhase === "play" || basePhase === "won") return;
    const steps: Record<"reveal" | "split" | "fly", { ms: number; next: Phase }> = {
      reveal: { ms: reduced ? REDUCED.reveal : REVEAL_MS, next: "split" },
      split: { ms: reduced ? REDUCED.split : SPLIT_MS, next: "fly" },
      fly: { ms: reduced ? REDUCED.fly : FLY_MS, next: "play" },
    };
    const step = steps[basePhase];
    const timer = window.setTimeout(() => setBasePhase(step.next), step.ms);
    return () => window.clearTimeout(timer);
  }, [basePhase, ready, frozen, reduced, round.key]);

  // Vol des morceaux : chacun part de sa case dans l'image découpée et rejoint la zone de stockage (animation de position).
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (basePhase !== "fly" || reduced || !stage) return;
    const pieces = [...stage.querySelectorAll<HTMLElement>("[data-tray] [data-piece]")];
    pieces.forEach((element, index) => {
      const cell = stage.querySelector<HTMLElement>(`[data-cell="${element.dataset.piece}"]`);
      if (!cell || typeof element.animate !== "function") return;
      const from = cell.getBoundingClientRect();
      const to = element.getBoundingClientRect();
      element.animate(
        [{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / Math.max(1, to.width)})` }, { transform: "none" }],
        { duration: 700, delay: Math.min(40, 500 / pieces.length) * index, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "backwards" },
      );
    });
  }, [basePhase, reduced, round.key]);

  // Taille des tuiles dans la zone de stockage : la plus grande qui laisse tout tenir, sans jamais dépasser celle de la grille.
  useEffect(() => {
    const tray = trayRef.current;
    const board = boardRef.current;
    if (!tray || !board) return;
    const measure = () => {
      const inner = tray.getBoundingClientRect();
      const cell = board.getBoundingClientRect().width / round.size;
      setTrayTile(Math.min(Math.floor(cell), fitTiles(inner.width - 20, inner.height - 20, round.size * round.size, GAP)));
    };
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(tray);
    observer?.observe(board);
    return () => observer?.disconnect();
  }, [round.size]);

  useEffect(() => {
    if (!hint) return;
    const timer = window.setTimeout(() => setHint(false), HINT_MS);
    return () => window.clearTimeout(timer);
  }, [hint]);

  // --- Déplacements : toucher et souris (glisser-déposer), clic (choisir puis poser), clavier (les boutons) ---
  const apply = useCallback(
    (next: PuzzleState, effect: SoundEffect) => {
      // Grille pleine mais pas juste : la validation est automatique, les mauvaises tuiles sont marquées d'une croix (sans pénalité).
      const check = checkBoard(next);
      const full = next.status !== "won" && check.empty.length === 0;
      playSound(next.status === "won" ? "puzzleDone" : full ? "placeWrong" : effect);
      if (next.status === "won") saveGuided();
      setVerdict(full ? { correct: check.correct, wrong: check.wrong, kind: "wrong" } : null);
      setPuzzle(next);
      setSelected(null);
    },
    [playSound],
  );

  const putInCell = useCallback(
    (piece: number, cell: number) => {
      const next = placePiece(puzzle, piece, cell);
      if (next !== puzzle) apply(next, puzzle.board[cell] === null ? "tilePlace" : "tileSwap");
      else setSelected(null);
    },
    [puzzle, apply],
  );

  const sendBack = useCallback(
    (cell: number) => {
      const next = returnToTray(puzzle, cell);
      if (next !== puzzle) apply(next, "tileSwap");
    },
    [puzzle, apply],
  );

  const playing = phase === "play" && !frozen;
  const suppressClick = useRef(false);

  const onPieceClick = (piece: number) => {
    if (!playing || suppressClick.current) return;
    setSelected((current) => (current === piece ? null : piece));
  };
  const onCellClick = (cell: number) => {
    if (!playing || suppressClick.current) return;
    if (selected !== null) putInCell(selected, cell);
    else if (puzzle.board[cell] !== null) setSelected(puzzle.board[cell]);
  };
  // Une tuile posée est choisie : un vrai bouton (clic, toucher ou clavier) occupe le fond de la zone de stockage pour la ranger.
  const returnCell = playing && selected !== null ? puzzle.board.indexOf(selected) : -1;
  const onTrayReturn = () => {
    if (suppressClick.current || returnCell < 0) return;
    sendBack(returnCell);
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!playing || event.button > 0) return;
    const source = (event.target as HTMLElement).closest<HTMLElement>("[data-piece],[data-holds]");
    if (!source) return;
    const piece = Number(source.dataset.piece ?? source.dataset.holds);
    const fromCell = source.dataset.holds !== undefined ? Number(source.dataset.cell) : null;
    const origin = { x: event.clientX, y: event.clientY };
    const area = stageRef.current?.getBoundingClientRect();
    const size = source.getBoundingClientRect().width;
    let started = false;
    const move = (moveEvent: PointerEvent) => {
      if (!started && Math.hypot(moveEvent.clientX - origin.x, moveEvent.clientY - origin.y) < DRAG_THRESHOLD) return;
      if (!started) {
        started = true;
        setDragging(piece);
      }
      const ghost = ghostRef.current;
      if (ghost && area) ghost.style.transform = `translate(${moveEvent.clientX - area.left - size / 2}px, ${moveEvent.clientY - area.top - size / 2}px)`;
    };
    const end = (upEvent: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      if (!started) return;
      suppressClick.current = true;
      window.setTimeout(() => {
        suppressClick.current = false;
      }, 0);
      setDragging(null);
      const under = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      const cellElement = under?.closest<HTMLElement>("[data-cell]");
      if (cellElement) putInCell(piece, Number(cellElement.dataset.cell));
      else if (under?.closest("[data-tray]") && fromCell !== null) sendBack(fromCell);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // --- Commandes ---
  // Valider : à tout moment, les tuiles posées sont marquées d'une coche (juste) ou d'une croix (pas au bon endroit).
  const validate = () => {
    if (phase !== "play" || frozen) return;
    const check = checkBoard(puzzle);
    const placed = check.correct.length + check.wrong.length;
    const kind = placed === 0 ? "empty" : check.wrong.length > 0 ? "wrong" : "right";
    playSound(kind === "wrong" ? "placeWrong" : kind === "right" ? "tilePlace" : "tileSwap");
    setVerdict({ correct: check.correct, wrong: check.wrong, kind });
  };
  const restart = () => beginRound(round.image, round.size, recent.filter((image) => image !== round.image));
  const showHint = () => {
    if (phase === "play" && !frozen) setHint(true);
  };
  const chooseLevel = (next: LevelId) => {
    setLevel(next);
    nextImage(category, next);
  };
  const moveCategory = (step: number) => {
    const next = CATEGORY_CHOICES[(CATEGORY_CHOICES.indexOf(category) + step + CATEGORY_CHOICES.length) % CATEGORY_CHOICES.length];
    setCategory(next);
    nextImage(next, level);
  };

  // --- Main qui guide : montre où glisser les tuiles au premier puzzle, puis « Image suivante » ; ensuite seulement après inactivité ---
  const placedCount = puzzle.board.filter((piece) => piece !== null).length;
  const activity = `${round.key}|${phase}|${placedCount}`;
  useEffect(() => {
    const timer = window.setTimeout(() => setNudgedFor(activity), NUDGE_MS);
    return () => window.clearTimeout(timer);
  }, [activity]);
  const showGuide = !frozen && (beginner || nudgedFor === activity);
  const guideTarget = showGuide ? (phase === "won" ? "next" : phase === "play" && placedCount === 0 ? "tray" : null) : null;

  const levelLabel = (id: LevelId) => t(`rasterPuzzle.game.levels.${id}`);
  const side = puzzle.size;
  const verdictText = verdict ? t(`rasterPuzzle.game.verdict.${verdict.kind}`) : null;
  const status = verdictText ?? (phase === "won" ? t("rasterPuzzle.game.status.won") : phase === "play" ? (selected !== null ? t("rasterPuzzle.game.status.selected") : t("rasterPuzzle.game.status.play")) : t("rasterPuzzle.game.status.intro"));
  const howTo = [1, 2, 3].map((number) => ({ title: t(`rasterPuzzle.game.howTo.step${number}Title`), text: t(`rasterPuzzle.game.howTo.step${number}`) }));
  const introTiles = phase === "reveal" || phase === "split";
  const inTray = phase === "fly" || phase === "play" || phase === "won";

  return (
    <GamePlayer
      rootRef={rootRef}
      label={t("rasterPuzzle.game.screen.label")}
      title={showTitle ? t("rasterPuzzle.game.title") : undefined}
      stats={[{ label: t("rasterPuzzle.game.stats.solved"), value: solved }]}
      paused={paused}
      onPlay={() => setPaused(false)}
      onPause={() => setPaused(true)}
      ended={false}
      onRestart={restart}
      restartLabel={t("rasterPuzzle.game.actions.restartAria")}
      extraControls={
        <button type="button" className={playerControlClass} aria-pressed={!sound.muted} aria-label={sound.muted ? t("player.sound.off") : t("player.sound.on")} onClick={sound.toggleMuted}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <polygon points="4,9 8,9 13,5 13,19 8,15 4,15" />
            {sound.muted ? <path d="m16 9 5 6M21 9l-5 6" /> : <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />}
          </svg>
          <span>{sound.muted ? t("player.sound.off") : t("player.sound.on")}</span>
        </button>
      }
      howTo={howTo}
      fullscreen={fullscreen}
      onFullscreenChange={onFullscreenChange}
      onClose={onClose}
      cover={cover}
      initialOrientation="device"
    >
      <div
        ref={stageRef}
        className={styles.game}
        style={{ "--n": side, "--gap-on": `${GAP}px` } as CSSProperties}
        inert={frozen}
        data-phase={phase}
        data-split={(phase !== "reveal" && phase !== "won") || undefined}
        data-frozen={frozen || undefined}
        onPointerDown={onPointerDown}
      >
        <Savanna />

        <div className={styles.levels} role="group" aria-label={t("rasterPuzzle.game.levelTitle")}>
          <p className={styles.levelsTitle} aria-hidden="true">
            {t("rasterPuzzle.game.levelTitle")}
          </p>
          {LEVELS.map((entry) => (
            <button key={entry.id} type="button" className={styles.levelButton} aria-pressed={level === entry.id} aria-label={`${levelLabel(entry.id)}, ${entry.size} × ${entry.size}`} onClick={() => chooseLevel(entry.id)}>
              {entry.size} × {entry.size}
              {level === entry.id ? (
                <svg className={styles.check} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="m4 13 5 5L20 6" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </button>
          ))}
        </div>

        <div className={styles.category} role="group" aria-label={t("rasterPuzzle.game.categoryLabel")}>
          <button type="button" className={styles.arrow} aria-label={t("rasterPuzzle.game.categoryPrevious")} onClick={() => moveCategory(-1)}>
            <Arrow direction="left" />
          </button>
          <span className={styles.categoryName} aria-live="polite">
            {t(`rasterPuzzle.game.categories.${category}`)}
          </span>
          <button type="button" className={styles.arrow} aria-label={t("rasterPuzzle.game.categoryNext")} onClick={() => moveCategory(1)}>
            <Arrow direction="right" />
          </button>
        </div>

        <section className={styles.boardFrame} aria-label={t("rasterPuzzle.game.boardLabel")}>
          <div ref={boardRef} className={styles.board} role="grid" aria-label={t("rasterPuzzle.game.boardLabel")}>
            {puzzle.board.map((piece, cell) => (
              <button
                key={cell}
                type="button"
                role="gridcell"
                className={styles.cell}
                data-cell={cell}
                data-holds={piece ?? undefined}
                data-selected={piece !== null && selected === piece ? true : undefined}
                data-dragging={piece !== null && dragging === piece ? true : undefined}
                data-verdict={verdict?.wrong.includes(cell) ? "wrong" : verdict?.correct.includes(cell) ? "right" : undefined}
                aria-label={t(piece === null ? "rasterPuzzle.game.cellEmpty" : "rasterPuzzle.game.cellFilled", { row: Math.floor(cell / side) + 1, column: (cell % side) + 1 })}
                onClick={() => onCellClick(cell)}
              >
                {piece !== null ? <PuzzleTile url={url} size={side} piece={piece} /> : introTiles ? <PuzzleTile url={url} size={side} piece={cell} /> : null}
              </button>
            ))}
          </div>
          <img className={styles.fullImage} src={url} alt="" data-visible={hint || phase === "won" || (introTiles && phase === "reveal") || undefined} data-won={phase === "won" || undefined} aria-hidden="true" draggable={false} />
          {phase === "reveal" ? <p className={styles.banner}>{t("rasterPuzzle.game.banner")}</p> : null}
          {verdictText && phase === "play" ? (
            <p className={styles.verdict} data-kind={verdict?.kind}>
              {verdictText}
            </p>
          ) : null}
          {phase === "won" ? (
            <span className={styles.stars} aria-hidden="true">
              {Array.from({ length: 16 }, (_, index) => (
                <i key={index} style={{ "--a": `${index * 22.5}deg`, "--d": `${(index % 4) * 50}ms`, "--h": `${(index * 47) % 360}` } as CSSProperties} />
              ))}
            </span>
          ) : null}
        </section>

        <aside ref={trayRef} className={styles.tray} data-tray data-guide={guideTarget === "tray" ? "tray" : undefined} aria-label={t("rasterPuzzle.game.trayLabel")}>
          {returnCell >= 0 ? <button type="button" className={styles.trayReturn} aria-label={t("rasterPuzzle.game.trayReturn")} onClick={onTrayReturn} /> : null}
          <div className={styles.trayInner} style={{ "--tray-tile": `${trayTile}px` } as CSSProperties}>
            {inTray
              ? puzzle.tray.map((piece, index) => (
                  <button
                    key={piece}
                    type="button"
                    className={styles.piece}
                    data-piece={piece}
                    data-selected={selected === piece || undefined}
                    data-dragging={dragging === piece || undefined}
                    aria-pressed={selected === piece}
                    aria-label={t("rasterPuzzle.game.pieceLabel", { number: index + 1 })}
                    onClick={() => onPieceClick(piece)}
                  >
                    <PuzzleTile url={url} size={side} piece={piece} />
                  </button>
                ))
              : null}
          </div>
        </aside>

        <div className={styles.actions}>
          <button type="button" className={`${styles.action} ${styles.green} ${styles.validate}`} disabled={phase !== "play"} onClick={validate}>
            <svg className={styles.validateIcon} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="m4 13 5 5L20 6" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("rasterPuzzle.game.actions.validate")}
          </button>
          <button type="button" className={`${styles.action} ${styles.violet}`} onClick={restart}>
            {t("rasterPuzzle.game.actions.restart")}
          </button>
          <button type="button" className={`${styles.action} ${styles.violet}`} disabled={phase !== "play"} onClick={showHint}>
            {t("rasterPuzzle.game.actions.hint")}
          </button>
          <button type="button" className={styles.action} data-guide={guideTarget === "next" ? "next" : undefined} onClick={() => nextImage()}>
            {t("rasterPuzzle.game.actions.next")}
          </button>
        </div>

        <p className={styles.srOnly} role="status" aria-live="polite">
          {status}
        </p>

        {dragging !== null ? (
          <div ref={ghostRef} className={styles.ghost} style={{ width: trayTile || undefined, height: trayTile || undefined }}>
            <PuzzleTile url={url} size={side} piece={dragging} />
          </div>
        ) : null}

        {guideTarget ? <GuideHand rootRef={stageRef} target={guideTarget} stepKey={activity} text={guideTarget === "tray" ? t("rasterPuzzle.game.guide.drag") : undefined} /> : null}
      </div>
    </GamePlayer>
  );
}
