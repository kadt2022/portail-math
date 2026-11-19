import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import yambaHead from "../../assets/yamba-head.jpg";
import { useInertOutside } from "../useInertOutside";
import { enterNativeFullscreen, exitNativeFullscreen, fullscreenElement } from "../fullscreen";
import {
  applyMove,
  canMoveTile,
  canPlaceCard,
  computeScore,
  createInitialState,
  type Difficulty,
  DIFFICULTY_ORDER,
  type GameState,
  generateGridSpec,
  type GridSpec,
  placeCardAndValidate,
  revealCard,
  type ValidationResult,
} from "./grille-magique-engine";
import { getHint, type Hint } from "./grille-magique-hint";
import {
  createTutorialGame,
  EXPLANATION_STEPS,
  isTutorialDone,
  markTutorialDone,
  tutorialStep,
} from "./grille-magique-tutorial";
import { TutorialHand } from "./TutorialHand";
import styles from "./GrilleMagiqueGame.module.css";

function formatElapsed(totalSeconds: number): string {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M8 4.5v15a1 1 0 0 0 1.5.9l12-7.5a1 1 0 0 0 0-1.8l-12-7.5A1 1 0 0 0 8 4.5Z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true" focusable="false">
      <rect x="5" y="4" width="5" height="16" rx="1.6" />
      <rect x="14" y="4" width="5" height="16" rx="1.6" />
    </svg>
  );
}

const HINT_DURATION_MS = 5000;

// Quatre grandes étapes pour l'enfant : révéler, comprendre, déplacer, poser.
const TUTORIAL_PHASES = ["reveal", "understand", "move", "place"] as const;

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="30" height="30" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M7 3h10v2h3a1 1 0 0 1 1 1c0 3.2-1.9 5.4-4.6 5.9A5 5 0 0 1 13 14.9V17h3v2H8v-2h3v-2.1A5 5 0 0 1 7.6 11.9C4.9 11.4 3 9.2 3 6a1 1 0 0 1 1-1h3V3Zm-1.9 4c.2 1.6 1 2.6 2.2 3A9 9 0 0 1 7 7H5.1Zm13.8 0H17a9 9 0 0 1-.3 3c1.2-.4 2-1.4 2.2-3ZM8 21h8v1H8v-1Z" />
    </svg>
  );
}

export interface GrilleMagiqueGameProps {
  /** Présentation immersive : le jeu occupe toute la fenêtre (plein écran natif quand le navigateur le permet). */
  fullscreen?: boolean;
  /** Demande de passage en plein écran ou de retour à l'affichage normal (ordinateur). Absent : pas de bouton. */
  onFullscreenChange?: (next: boolean) => void;
  /** Ferme le jeu (retour à la page des jeux). Absent : pas de bouton. */
  onClose?: () => void;
  /** Téléphone : le plein écran est la seule présentation, le bouton principal quitte le jeu et l'orientation paysage est demandée. */
  mobileImmersive?: boolean;
  /** Le chronomètre ne tourne que lorsque le jeu est visible. */
  active?: boolean;
  /** Titre affiché dans la barre (la page de jeu a déjà son propre titre). */
  showTitle?: boolean;
  /**
   * Tutoriel de la première partie (main animée) : « on » le lance, « auto » le lance tant que l'enfant ne l'a ni terminé ni passé,
   * « off » (par défaut) ne le montre jamais. « Passer le tutoriel » et « Revoir le tutoriel » restent disponibles.
   */
  tutorial?: "auto" | "on" | "off";
}

// Interface jouable des Tuiles magiques. Le moteur (grille-magique-engine) est inchangé : ce composant n'en modifie
// aucune règle. L'état de la partie vit ici : passer du mode normal au plein écran ne remonte pas le composant, donc rien n'est perdu.
export function GrilleMagiqueGame({
  fullscreen = false,
  onFullscreenChange,
  onClose,
  mobileImmersive = false,
  active = true,
  showTitle = true,
  tutorial = "off",
}: GrilleMagiqueGameProps) {
  const { t } = useTranslation("games");

  // Première partie : avec le tutoriel, la grille est une grille pédagogique (Facile, courte, résolution garantie).
  const [initial] = useState(() => {
    const on = tutorial === "on" || (tutorial === "auto" && !isTutorialDone());
    return { on, game: on ? createTutorialGame() : null };
  });
  const [difficulty, setDifficulty] = useState<Difficulty>("facile");
  const [gridSpec, setGridSpec] = useState<GridSpec>(() => initial.game?.gridSpec ?? generateGridSpec("facile"));
  const [gameState, setGameState] = useState<GameState>(() => initial.game?.state ?? createInitialState(gridSpec));
  const [tutorialOn, setTutorialOn] = useState(initial.on);
  // Écrans d'explication déjà compris (ligne, colonne), et dernière action de l'enfant différente de l'indication.
  const [explained, setExplained] = useState(0);
  const [replanned, setReplanned] = useState(false);
  // Dernière tuile glissée : elle arrive depuis sa case d'origine avec un éclat lumineux.
  const [lastMove, setLastMove] = useState<{ to: number; dx: number; dy: number } | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  // Lecteur : la partie démarre à l'ouverture ; « Pause » suspend le chronomètre et bloque le plateau, « Jouer » reprend.
  const [paused, setPaused] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);

  const rootRef = useRef<HTMLDivElement>(null);
  // Plein écran (natif ou repli CSS) : le reste de l’application est inerte, le focus reste dans le jeu.
  useInertOutside(rootRef, fullscreen);
  const nativeFullscreen = useRef(false);
  const tileRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const focusTargetRef = useRef<number | null>(null);

  // Un déplacement remplace le bouton de la tuile activée par une case vide
  // (div non focusable) : sans ce recalage, le focus clavier disparaît à
  // chaque coup, obligeant à retourner dans la grille avec la souris.
  useEffect(() => {
    if (focusTargetRef.current !== null) {
      tileRefs.current[focusTargetRef.current]?.focus();
      focusTargetRef.current = null;
    }
  }, [gameState.tiles]);

  useEffect(() => {
    if (gameState.status !== "playing" || !active || paused) {
      return;
    }
    const intervalId = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(intervalId);
  }, [gameState.status, active, paused]);

  // Étape du tutoriel : recalculée d'après l'état réel du plateau et les vraies règles, jamais d'après une liste de clics.
  const step = useMemo(
    () => (tutorialOn ? tutorialStep(gameState, gridSpec, explained) : null),
    [tutorialOn, gameState, gridSpec, explained],
  );
  const tutorialWon = step?.kind === "victory";
  useEffect(() => {
    // Le tutoriel est terminé quand le vrai moteur déclare la victoire : il ne se relancera plus tout seul.
    if (tutorialWon) {
      markTutorialDone();
    }
  }, [tutorialWon]);

  // L'indice s'efface seul au bout de quelques secondes.
  useEffect(() => {
    if (!hint) {
      return;
    }
    const timeoutId = window.setTimeout(() => setHint(null), HINT_DURATION_MS);
    return () => window.clearTimeout(timeoutId);
  }, [hint]);

  // Plein écran natif quand il est disponible ; sinon la présentation immersive CSS (classe « fullscreen ») suffit.
  // Le jeu reste le même élément : la partie n'est jamais réinitialisée par ce passage.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }
    if (fullscreen) {
      void enterNativeFullscreen(root, mobileImmersive).then((entered) => {
        nativeFullscreen.current = entered;
      });
    } else if (nativeFullscreen.current) {
      nativeFullscreen.current = false;
      void exitNativeFullscreen();
    }
  }, [fullscreen, mobileImmersive]);

  // Sortie par le système (geste retour, touche Échap) : le jeu suit, au lieu de rester dans un état incohérent.
  useEffect(() => {
    function onChange() {
      if (nativeFullscreen.current && !fullscreenElement()) {
        nativeFullscreen.current = false;
        if (mobileImmersive) {
          onClose?.();
        } else {
          onFullscreenChange?.(false);
        }
      }
    }
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, [mobileImmersive, onClose, onFullscreenChange]);

  useEffect(
    () => () => {
      if (nativeFullscreen.current) {
        nativeFullscreen.current = false;
        void exitNativeFullscreen();
      }
    },
    [],
  );

  function resetBoard(nextDifficulty: Difficulty, nextGridSpec: GridSpec, nextState: GameState) {
    setDifficulty(nextDifficulty);
    setGridSpec(nextGridSpec);
    setGameState(nextState);
    setElapsedSeconds(0);
    setLastValidation(null);
    setHint(null);
    setLastMove(null);
    setReplanned(false);
    setPaused(false);
  }

  function startNewGrid(nextDifficulty: Difficulty) {
    if (tutorialOn && nextDifficulty === "facile") {
      // Recommencer pendant le tutoriel : nouvelle grille pédagogique, démonstration depuis le début.
      const game = createTutorialGame();
      resetBoard("facile", game.gridSpec, game.state);
      setExplained(0);
      return;
    }
    if (tutorialOn) {
      // Changer de difficulté, c'est jouer librement : le tutoriel s'arrête.
      markTutorialDone();
      setTutorialOn(false);
    }
    const nextGridSpec = generateGridSpec(nextDifficulty);
    resetBoard(nextDifficulty, nextGridSpec, createInitialState(nextGridSpec));
  }

  function skipTutorial() {
    markTutorialDone();
    setTutorialOn(false);
  }

  // « Revoir le tutoriel » : nouvelle grille pédagogique, démonstration depuis le début (niveau et score repartent de zéro).
  function replayTutorial() {
    const game = createTutorialGame();
    resetBoard("facile", game.gridSpec, game.state);
    setExplained(0);
    setScore(0);
    setLevel(1);
    setTutorialOn(true);
  }

  function handleChangeDifficulty(nextDifficulty: Difficulty) {
    if (nextDifficulty !== difficulty) {
      startNewGrid(nextDifficulty);
    }
  }

  function handleNextLevel() {
    setLevel((current) => current + 1);
    // Le tutoriel est fini : le niveau suivant est une vraie grille, jouée librement.
    setTutorialOn(false);
    const nextGridSpec = generateGridSpec(difficulty);
    resetBoard(difficulty, nextGridSpec, createInitialState(nextGridSpec));
  }

  function handleTileClick(index: number) {
    if (paused || !canMoveTile(gameState, index)) {
      return;
    }
    // La tuile activée se retrouve à l'ancienne position de la case vide.
    const blank = gameState.tiles.indexOf(null);
    focusTargetRef.current = blank;
    setLastMove({ to: blank, dx: (index % 3) - (blank % 3), dy: Math.floor(index / 3) - Math.floor(blank / 3) });
    // Tutoriel : si l'enfant touche une autre tuile que celle conseillée, l'indication est recalculée depuis la nouvelle position.
    setReplanned(step?.kind === "move" && step.index !== index);
    setGameState((current) => applyMove(current, index));
    setLastValidation(null);
    setHint(null);
  }

  function handleCardClick() {
    if (paused || gameState.status !== "playing") {
      return;
    }
    if (!gameState.cardRevealed) {
      setGameState((current) => revealCard(current));
      return;
    }
    if (!canPlaceCard(gameState)) {
      return;
    }
    const { state: nextState, result } = placeCardAndValidate(gameState, gridSpec);
    setGameState(nextState);
    setLastValidation(result);
    setHint(null);
    if (result.valid) {
      setScore((current) => current + computeScore(difficulty, elapsedSeconds, nextState.moves));
    }
  }

  const canPlace = canPlaceCard(gameState);
  const cardAriaLabel = !gameState.cardRevealed
    ? t("grilleMagique.game.card.hiddenAria")
    : gameState.status === "won"
      ? t("grilleMagique.game.card.wonLabel", { value: gridSpec.magicValue })
      : t("grilleMagique.game.card.revealedAria", { value: gridSpec.magicValue });
  const cardHint =
    gameState.status === "won"
      ? null
      : gameState.cardRevealed
        ? canPlace
          ? t("grilleMagique.game.card.placeHintReady")
          : t("grilleMagique.game.card.placeHintNotReady")
        : null;

  const hintMessage =
    hint === null
      ? ""
      : hint.kind === "move"
        ? t("grilleMagique.game.hint.move", { value: hint.value, row: hint.row, col: hint.col })
        : hint.kind === "center"
          ? t("grilleMagique.game.hint.center")
          : t("grilleMagique.game.hint.done");
  const tutorialTargetIndex = step?.kind === "move" ? step.index : -1;
  const tutorialPhase =
    step === null
      ? -1
      : step.kind === "reveal"
        ? 0
        : step.kind === "rows" || step.kind === "cols"
          ? 1
          : step.kind === "move"
            ? 2
            : 3;
  const tutorialMessage =
    step === null
      ? ""
      : step.kind === "reveal"
        ? t("grilleMagique.game.tutorial.reveal")
        : step.kind === "rows"
          ? t("grilleMagique.game.tutorial.rows")
          : step.kind === "cols"
            ? t("grilleMagique.game.tutorial.cols")
            : step.kind === "move"
              ? replanned
                ? t("grilleMagique.game.tutorial.replan")
                : step.first
                  ? t("grilleMagique.game.tutorial.moveFirst")
                  : t("grilleMagique.game.tutorial.move")
              : step.kind === "place"
                ? t("grilleMagique.game.tutorial.place")
                : t("grilleMagique.game.tutorial.victory");
  const explaining = step?.kind === "rows" || step?.kind === "cols";
  const feedbackMessage =
    gameState.status === "won"
      ? // Pendant le tutoriel, la bulle de victoire porte déjà le message : pas de doublon à l’écran.
        tutorialWon
        ? ""
        : t("grilleMagique.game.feedback.win")
      : hintMessage || (lastValidation && !lastValidation.valid ? t("grilleMagique.game.feedback.incorrect") : "");

  const hintedIndex = hint?.kind === "move" ? hint.index : -1;
  const won = gameState.status === "won";
  const exitLabel = mobileImmersive ? t("grilleMagique.game.screen.leave") : t("grilleMagique.game.screen.close");
  const exitShort = mobileImmersive ? t("grilleMagique.game.screen.leave") : t("grilleMagique.game.screen.closeShort");

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className={`${styles.root}${fullscreen ? ` ${styles.fullscreen}` : ""}`}
      role="region"
      aria-label={t("grilleMagique.game.screen.label")}
    >
      <div className={styles.sky} aria-hidden="true" />

      <header className={styles.bar}>
        {showTitle ? <p className={styles.title}>{t("grilleMagique.game.title")}</p> : null}

        <div className={styles.difficultyGroup} role="group" aria-label={t("grilleMagique.game.difficultyLabel")}>
          {DIFFICULTY_ORDER.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={difficulty === option}
              className={difficulty === option ? styles.difficultyButtonActive : styles.difficultyButton}
              onClick={() => handleChangeDifficulty(option)}
            >
              <span className={`${styles.pillGem} ${option === "facile" ? styles.pillGemEasy : styles.pillGemMedium}`} aria-hidden="true" />
              {t(`grilleMagique.game.difficulty.${option}`)}
            </button>
          ))}
        </div>

        <dl className={styles.stats}>
          {/* La difficulté est déjà montrée par les pastilles ; ce couple reste pour les lecteurs d’écran. */}
          <div className={`${styles.statItem} ${styles.srOnly}`}>
            <dt>{t("grilleMagique.game.difficultyLabel")}</dt>
            <dd>{t(`grilleMagique.game.difficulty.${difficulty}`)}</dd>
          </div>
          <div className={styles.statItem}>
            <dt>{t("grilleMagique.game.stats.time")}</dt>
            <dd>{formatElapsed(elapsedSeconds)}</dd>
          </div>
          <div className={styles.statItem}>
            <dt>{t("grilleMagique.game.stats.moves")}</dt>
            <dd>{gameState.moves}</dd>
          </div>
          <div className={styles.statItem}>
            <dt>{t("grilleMagique.game.stats.score")}</dt>
            <dd>{score}</dd>
          </div>
          <div className={styles.statItem}>
            <dt>{t("grilleMagique.game.stats.level")}</dt>
            <dd>{level}</dd>
          </div>
        </dl>

        <button type="button" className={styles.howToButton} aria-expanded={howToOpen} aria-label={t("grilleMagique.game.howTo.button")} onClick={() => setHowToOpen((open) => !open)}>
          ?
        </button>
      </header>

      <div className={styles.body}>
        <div className={styles.play}>
        <div className={styles.character} aria-hidden="true">
          <img src={yambaHead} alt="" className={styles.characterImage} draggable={false} />
        </div>
        <div className={`${styles.boardFrame}${won ? ` ${styles.boardWon}` : ""}`}>
          {won ? <span className={styles.wave} aria-hidden="true" /> : null}
          {paused && !won ? (
            <div className={styles.pauseVeil} role="status">
              <p className={styles.pauseTitle}>{t("grilleMagique.game.player.pausedTitle")}</p>
              <button type="button" className={styles.pauseResume} onClick={() => setPaused(false)}>
                {t("grilleMagique.game.player.resume")}
              </button>
            </div>
          ) : null}
          <div className={styles.board}>
            {step?.kind === "rows" ? (
              <span className={styles.lineHighlight} style={{ gridColumn: "1 / 8", gridRow: 1 }} aria-hidden="true" />
            ) : null}
            {step?.kind === "cols" ? (
              <span className={styles.lineHighlight} style={{ gridColumn: 1, gridRow: "1 / 8" }} aria-hidden="true" />
            ) : null}
            {[0, 1, 2].map((row) =>
              [0, 1, 2].map((col) => {
                const index = row * 3 + col;
                const value = gameState.tiles[index];
                const cellStyle = { gridColumn: col * 2 + 1, gridRow: row * 2 + 1 };
                if (value === null) {
                  return (
                    <div
                      key={index}
                      className={styles.blank}
                      style={cellStyle}
                      aria-label={t("grilleMagique.game.tile.blankAria", { row: row + 1, col: col + 1 })}
                    />
                  );
                }
                const movable = !paused && canMoveTile(gameState, index);
                return (
                  <button
                    key={index}
                    ref={(el) => {
                      tileRefs.current[index] = el;
                    }}
                    type="button"
                    style={
                      {
                        ...cellStyle,
                        "--i": index,
                        ...(lastMove?.to === index ? { "--dx": lastMove.dx, "--dy": lastMove.dy } : {}),
                      } as CSSProperties
                    }
                    data-value={value}
                    data-tutorial-target={tutorialTargetIndex === index ? "true" : undefined}
                    className={`${movable ? styles.tileMovable : styles.tile}${hintedIndex === index ? ` ${styles.hinted}` : ""}${
                      tutorialTargetIndex === index ? ` ${styles.tutorialPulse}` : ""
                    }${lastMove?.to === index && !won ? ` ${styles.glide}` : ""}${won ? ` ${styles.tileWon}` : ""}`}
                    disabled={!movable}
                    onClick={() => handleTileClick(index)}
                    aria-label={t(movable ? "grilleMagique.game.tile.movableAria" : "grilleMagique.game.tile.blockedAria", {
                      row: row + 1,
                      col: col + 1,
                      value,
                    })}
                  >
                    <span className={styles.gem} aria-hidden="true" />
                    <span className={styles.number}>{value}</span>
                  </button>
                );
              }),
            )}

            {[0, 1, 2].map((row) => (
              <span key={`row-op-a-${row}`} className={styles.operator} style={{ gridColumn: 2, gridRow: row * 2 + 1 }}>
                {gridSpec.rowOperators[row][0]}
              </span>
            ))}
            {[0, 1, 2].map((row) => (
              <span key={`row-op-b-${row}`} className={styles.operator} style={{ gridColumn: 4, gridRow: row * 2 + 1 }}>
                {gridSpec.rowOperators[row][1]}
              </span>
            ))}
            {[0, 1, 2].map((col) => (
              <span key={`col-op-a-${col}`} className={styles.operator} style={{ gridColumn: col * 2 + 1, gridRow: 2 }}>
                {gridSpec.colOperators[col][0]}
              </span>
            ))}
            {[0, 1, 2].map((col) => (
              <span key={`col-op-b-${col}`} className={styles.operator} style={{ gridColumn: col * 2 + 1, gridRow: 4 }}>
                {gridSpec.colOperators[col][1]}
              </span>
            ))}

            {[0, 1, 2].map((row) => (
              <span key={`row-eq-${row}`} className={styles.equals} style={{ gridColumn: 6, gridRow: row * 2 + 1 }}>
                =
              </span>
            ))}
            {[0, 1, 2].map((row) => (
              <span
                key={`row-result-${row}`}
                className={styles.result}
                style={{ gridColumn: 7, gridRow: row * 2 + 1 }}
              >
                {gridSpec.rowResults[row]}
                {lastValidation && !lastValidation.valid && !lastValidation.rowValid[row] ? (
                  <span className={styles.invalidMark}>
                    {" "}
                    ✕<span className={styles.srOnly}>{t("grilleMagique.game.feedback.rowIncorrect", { index: row + 1 })}</span>
                  </span>
                ) : null}
              </span>
            ))}

            {[0, 1, 2].map((col) => (
              <div key={`col-result-${col}`} className={styles.columnResultItem} style={{ gridColumn: col * 2 + 1, gridRow: 7 }}>
                <span className={styles.verticalEquals}>=</span>
                <span className={styles.result}>
                  {gridSpec.colResults[col]}
                  {lastValidation && !lastValidation.valid && !lastValidation.colValid[col] ? (
                    <span className={styles.invalidMark}>
                      {" "}
                      ✕
                      <span className={styles.srOnly}>{t("grilleMagique.game.feedback.colIncorrect", { index: col + 1 })}</span>
                    </span>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        </div>

        <aside className={styles.side}>
          {step ? (
            <div className={styles.tutorial} data-testid="tutorial-panel" aria-live="polite">
              <ol className={styles.tutorialSteps} aria-label={t("grilleMagique.game.tutorial.progress", { current: Math.min(tutorialPhase + 1, TUTORIAL_PHASES.length), total: TUTORIAL_PHASES.length })}>
                {TUTORIAL_PHASES.map((phase, position) => (
                  <li
                    key={phase}
                    className={`${styles.tutorialStepDot}${position < tutorialPhase || tutorialWon ? ` ${styles.tutorialStepDone}` : ""}${
                      position === tutorialPhase && !tutorialWon ? ` ${styles.tutorialStepCurrent}` : ""
                    }`}
                  />
                ))}
              </ol>
              {tutorialWon ? (
                <p className={styles.victory}>
                  <TrophyIcon />
                  <span>{tutorialMessage}</span>
                </p>
              ) : (
                <p className={styles.tutorialText}>{tutorialMessage}</p>
              )}
              <div className={styles.tutorialActions}>
                {explaining ? (
                  <button type="button" className={styles.tutorialNext} data-tutorial-target="true" onClick={() => setExplained((current) => Math.min(current + 1, EXPLANATION_STEPS))}>
                    {t("grilleMagique.game.tutorial.next")}
                  </button>
                ) : null}
                {tutorialWon ? null : (
                  <button type="button" className={styles.tutorialLink} onClick={skipTutorial}>
                    {t("grilleMagique.game.tutorial.skip")}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className={styles.instructions}>{t("grilleMagique.game.instructions")}</p>
          )}

          <div className={styles.cardSection}>
            <p className={styles.cardHeading}>{t("grilleMagique.game.card.heading")}</p>
            <button
              type="button"
              className={`${styles.card}${gameState.status === "won" ? ` ${styles.cardWon}` : ""}${
                step?.kind === "reveal" || step?.kind === "place" ? ` ${styles.tutorialPulse}` : ""
              }`}
              data-tutorial-target={step?.kind === "reveal" || step?.kind === "place" ? "true" : undefined}
              disabled={gameState.status === "won" || paused}
              onClick={handleCardClick}
              aria-label={cardAriaLabel}
            >
              {gameState.cardRevealed ? gridSpec.magicValue : "?"}
            </button>
            {cardHint && !step ? <p className={styles.cardHint}>{cardHint}</p> : null}
          </div>

          <div
            aria-live="polite"
            className={lastValidation && !lastValidation.valid && !hintMessage ? styles.feedbackError : styles.feedback}
          >
            {feedbackMessage}
          </div>

          {gameState.status === "won" ? (
            <div className={styles.actions}>
              <button type="button" className={styles.primaryAction} onClick={handleNextLevel}>
                {t("grilleMagique.game.actions.nextLevel")}
              </button>
            </div>
          ) : null}

          {tutorial !== "off" && !tutorialOn ? (
            <button type="button" className={styles.tutorialLink} onClick={replayTutorial}>
              {t("grilleMagique.game.tutorial.replay")}
            </button>
          ) : null}
        </aside>
        </div>
      </div>

      <div className={styles.controls} role="toolbar" aria-label={t("grilleMagique.game.player.controls")}>
        <button type="button" className={`${styles.ctl} ${styles.ctlPlay}`} aria-pressed={!paused && !won} disabled={won} onClick={() => setPaused(false)}>
          <PlayIcon />
          <span>{t("grilleMagique.game.player.play")}</span>
        </button>
        <button type="button" className={`${styles.ctl} ${styles.ctlPause}`} aria-pressed={paused} disabled={won} onClick={() => setPaused(true)}>
          <PauseIcon />
          <span>{t("grilleMagique.game.player.pause")}</span>
        </button>
        <button type="button" className={`${styles.ctl} ${styles.ctlRestart}`} aria-label={t("grilleMagique.game.actions.restartAria")} onClick={() => startNewGrid(difficulty)}>
          <Icon>
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
          </Icon>
          <span>{t("grilleMagique.game.actions.restart")}</span>
        </button>
        <span className={styles.ctlSeparator} aria-hidden="true" />
        <button
          type="button"
          className={`${styles.ctl} ${styles.ctlHint}`}
          aria-label={t("grilleMagique.game.hint.aria")}
          disabled={paused || won}
          onClick={() => setHint(getHint(gameState, gridSpec))}
        >
          <Icon>
            <path d="M9 18h6M10 21h4" />
            <path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3Z" />
          </Icon>
          <span>{t("grilleMagique.game.hint.button")}</span>
        </button>
        {onFullscreenChange && !mobileImmersive ? (
          <button
            type="button"
            className={`${styles.ctl} ${styles.ctlScreen}`}
            aria-label={fullscreen ? t("grilleMagique.game.screen.exit") : t("grilleMagique.game.screen.enter")}
            onClick={() => onFullscreenChange(!fullscreen)}
          >
            <Icon>
              {fullscreen ? (
                <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
              ) : (
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
              )}
            </Icon>
            <span>{fullscreen ? t("grilleMagique.game.screen.exitShort") : t("grilleMagique.game.screen.enterShort")}</span>
          </button>
        ) : null}
        {onClose ? (
          <button type="button" className={`${styles.ctl} ${styles.ctlExit}`} aria-label={exitLabel} onClick={onClose}>
            <Icon>
              <path d="M6 6l12 12M18 6 6 18" />
            </Icon>
            <span>{exitShort}</span>
          </button>
        ) : null}
      </div>

      {howToOpen ? (
        <section className={styles.howTo} aria-label={t("grilleMagique.game.howTo.title")}>
          <div className={styles.howToHeader}>
            <h3 className={styles.howToTitle}>{t("grilleMagique.game.howTo.title")}</h3>
            <button type="button" className={styles.howToClose} aria-label={t("grilleMagique.game.howTo.close")} onClick={() => setHowToOpen(false)}>
              ×
            </button>
          </div>
          <ol className={styles.howToList}>
            {[1, 2, 3, 4].map((number) => (
              <li key={number} className={styles.howToItem}>
                <span className={styles.howToNumber} aria-hidden="true">
                  {number}
                </span>
                <span>
                  <strong>{t(`grilleMagique.game.howTo.step${number}Title`)}</strong>
                  <span className={styles.howToText}>{t(`grilleMagique.game.howTo.step${number}`)}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {tutorial !== "off" ? (
        <TutorialHand
          rootRef={rootRef}
          stepKey={`${step?.kind ?? "none"}-${step?.kind === "move" ? step.index : ""}-${gameState.moves}-${explained}`}
          active={tutorialOn && !tutorialWon && active && !paused && step !== null}
        />
      ) : null}

      {fullscreen && mobileImmersive ? <p className={styles.rotateHint}>{t("grilleMagique.game.screen.rotate")}</p> : null}
    </div>
  );
}
