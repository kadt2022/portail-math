import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

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
import styles from "./GrilleMagiquePage.module.css";

function formatElapsed(totalSeconds: number): string {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function GrilleMagiquePage() {
  const { t } = useTranslation("games");

  const [difficulty, setDifficulty] = useState<Difficulty>("facile");
  const [gridSpec, setGridSpec] = useState<GridSpec>(() => generateGridSpec("facile"));
  const [gameState, setGameState] = useState<GameState>(() => createInitialState(gridSpec));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lastValidation, setLastValidation] = useState<ValidationResult | null>(null);

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
    if (gameState.status !== "playing") {
      return;
    }
    const intervalId = window.setInterval(() => setElapsedSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(intervalId);
  }, [gameState.status]);

  function startNewGrid(nextDifficulty: Difficulty) {
    const nextGridSpec = generateGridSpec(nextDifficulty);
    setDifficulty(nextDifficulty);
    setGridSpec(nextGridSpec);
    setGameState(createInitialState(nextGridSpec));
    setElapsedSeconds(0);
    setLastValidation(null);
  }

  function handleChangeDifficulty(nextDifficulty: Difficulty) {
    if (nextDifficulty !== difficulty) {
      startNewGrid(nextDifficulty);
    }
  }

  function handleNewGrid() {
    startNewGrid(difficulty);
  }

  function handleNextLevel() {
    setLevel((current) => current + 1);
    startNewGrid(difficulty);
  }

  function handleTileClick(index: number) {
    if (!canMoveTile(gameState, index)) {
      return;
    }
    // La tuile activée se retrouve à l'ancienne position de la case vide.
    focusTargetRef.current = gameState.tiles.indexOf(null);
    setGameState((current) => applyMove(current, index));
    setLastValidation(null);
  }

  function handleCardClick() {
    if (gameState.status !== "playing") {
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

  const feedbackMessage =
    gameState.status === "won"
      ? t("grilleMagique.game.feedback.win")
      : lastValidation && !lastValidation.valid
        ? t("grilleMagique.game.feedback.incorrect")
        : "";

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("grilleMagique.game.title")}</h1>
      <p className={styles.instructions}>{t("grilleMagique.game.instructions")}</p>

      <div className={styles.difficultyGroup} role="group" aria-label={t("grilleMagique.game.difficultyLabel")}>
        {DIFFICULTY_ORDER.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={difficulty === option}
            className={difficulty === option ? styles.difficultyButtonActive : styles.difficultyButton}
            onClick={() => handleChangeDifficulty(option)}
          >
            {t(`grilleMagique.game.difficulty.${option}`)}
          </button>
        ))}
      </div>

      <dl className={styles.stats}>
        <div className={styles.statItem}>
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

      <div className={styles.board}>
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
            const movable = canMoveTile(gameState, index);
            return (
              <button
                key={index}
                ref={(el) => {
                  tileRefs.current[index] = el;
                }}
                type="button"
                style={cellStyle}
                className={movable ? styles.tileMovable : styles.tile}
                disabled={!movable}
                onClick={() => handleTileClick(index)}
                aria-label={t(movable ? "grilleMagique.game.tile.movableAria" : "grilleMagique.game.tile.blockedAria", {
                  row: row + 1,
                  col: col + 1,
                  value,
                })}
              >
                {value}
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
          <span key={`row-result-${row}`} className={styles.result} style={{ gridColumn: 7, gridRow: row * 2 + 1 }}>
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
          <div
            key={`col-result-${col}`}
            className={styles.columnResultItem}
            style={{ gridColumn: col * 2 + 1, gridRow: 7 }}
          >
            <span className={styles.verticalEquals}>=</span>
            <span className={styles.result}>
              {gridSpec.colResults[col]}
              {lastValidation && !lastValidation.valid && !lastValidation.colValid[col] ? (
                <span className={styles.invalidMark}>
                  {" "}
                  ✕
                  <span className={styles.srOnly}>
                    {t("grilleMagique.game.feedback.colIncorrect", { index: col + 1 })}
                  </span>
                </span>
              ) : null}
            </span>
          </div>
        ))}
      </div>

      <div className={styles.cardSection}>
        <p className={styles.cardHeading}>{t("grilleMagique.game.card.heading")}</p>
        <button
          type="button"
          className={styles.card}
          disabled={gameState.status === "won"}
          onClick={handleCardClick}
          aria-label={cardAriaLabel}
        >
          {gameState.cardRevealed ? gridSpec.magicValue : "?"}
        </button>
        {cardHint ? <p className={styles.cardHint}>{cardHint}</p> : null}
      </div>

      <div
        aria-live="polite"
        className={lastValidation && !lastValidation.valid ? styles.feedbackError : styles.feedback}
      >
        {feedbackMessage}
      </div>

      <div className={styles.actions}>
        {gameState.status === "won" ? (
          <button type="button" className={styles.primaryAction} onClick={handleNextLevel}>
            {t("grilleMagique.game.actions.nextLevel")}
          </button>
        ) : null}
        <button type="button" className={styles.secondaryAction} onClick={handleNewGrid}>
          {t("grilleMagique.game.actions.newGrid")}
        </button>
      </div>

      <Link className={styles.backLink} to="/jeux">
        {t("grilleMagique.game.actions.backToGames")}
      </Link>
    </div>
  );
}
