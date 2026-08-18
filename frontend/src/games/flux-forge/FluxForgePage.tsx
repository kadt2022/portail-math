import { type PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { mountFluxForgeGame, type FluxForgeController } from "./FluxForgeGame";
import {
  createEmptyResolvedExercises,
  createInitialLevelState,
  houseLabel,
  isHouseCompleted,
  levelProgress,
  PART_ORDER,
  pickExercise,
  submitAnswer,
  type Exercise,
  type HouseIndex,
  type HousePart,
  type LevelState,
  type ResolvedExercises,
} from "./flux-forge-engine";
import styles from "./FluxForgePage.module.css";

type Feedback = { kind: "idle" } | { kind: "incorrect" } | { kind: "invalid" };

function exerciseFormula(t: (key: string, options?: Record<string, unknown>) => string, part: HousePart, exercise: Exercise): string {
  if (part === "conversion") {
    return t("fluxForge.game.exercise.conversion.formula", { volume: exercise.expectedAnswer / 1000 });
  }
  return t(`fluxForge.game.exercise.${part}.formula`, exercise.dimensions);
}

function answerUnitKey(exercise: Exercise): "surface" | "volume" | "conversion" {
  if (exercise.type === "surface") return "surface";
  if (exercise.type === "volume") return "volume";
  return "conversion";
}

export function FluxForgePage() {
  const { t } = useTranslation("games");
  const gameHostRef = useRef<HTMLDivElement | null>(null);
  const canvasFrameRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<FluxForgeController | null>(null);

  const [levelState, setLevelState] = useState<LevelState>(() => createInitialLevelState());
  const [exercises, setExercises] = useState<ResolvedExercises>(() => createEmptyResolvedExercises());
  const [engaged, setEngaged] = useState(false);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback>({ kind: "idle" });
  // Message de réussite affiché brièvement après une bonne réponse : distinct
  // de `feedback`, qui est remis à zéro dès que l'étape active change (voir
  // plus bas), pour que "Bravo, c'est construit !" reste visible le temps que
  // l'enfant le voie au lieu de disparaître au même rendu.
  const [celebration, setCelebration] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [dragPoint, setDragPoint] = useState<{ x: number; y: number } | null>(null);
  const [dropReady, setDropReady] = useState(false);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);

  const activeHouse = levelState.currentHouse;
  const activePart = levelState.currentPart;
  const stepKey = activePart ? `${activeHouse}-${activePart}` : null;

  // Résout l'exercice d'une étape la première fois qu'elle devient active, et
  // réinitialise l'engagement/la réponse/le retour pour la nouvelle étape :
  // ajustement d'état pendant le rendu (motif documenté par React pour
  // réagir à un changement de props/état dérivé) plutôt qu'un effet, pour ne
  // jamais déclencher de setState synchrone dans le corps d'un effet.
  const [resolvedStepKey, setResolvedStepKey] = useState<string | null>(null);
  let exercisesForRender = exercises;
  if (activePart && stepKey !== resolvedStepKey) {
    setResolvedStepKey(stepKey);
    setEngaged(false);
    setAnswer("");
    setFeedback({ kind: "idle" });
    if (!exercises[activeHouse][activePart]) {
      const picked = pickExercise(activeHouse, activePart);
      const next = [...exercises] as ResolvedExercises;
      next[activeHouse] = { ...next[activeHouse], [activePart]: picked };
      exercisesForRender = next;
      setExercises(next);
    }
  }
  const activeExercise = activePart ? (exercisesForRender[activeHouse][activePart] ?? null) : null;

  useEffect(() => {
    if (!celebration) return;
    const timer = window.setTimeout(() => setCelebration(false), 1400);
    return () => window.clearTimeout(timer);
  }, [celebration]);

  useEffect(() => {
    if (!gameHostRef.current) return;
    controllerRef.current = mountFluxForgeGame(gameHostRef.current, {
      onPartSelected: () => setEngaged(true),
    });
    return () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.syncState(levelState, exercises);
  }, [levelState, exercises]);

  useEffect(() => {
    if (!gameHostRef.current) return;
    const observer = new ResizeObserver(() => controllerRef.current?.refreshLayout());
    observer.observe(gameHostRef.current);
    return () => observer.disconnect();
  }, []);

  const handleValidate = () => {
    if (!activeExercise || !engaged) return;
    const numeric = Number(answer.trim().replace(",", "."));
    if (answer.trim() === "" || Number.isNaN(numeric)) {
      setFeedback({ kind: "invalid" });
      return;
    }
    const result = submitAnswer(levelState, activeExercise, numeric);
    if (result.correct) {
      setLevelState(result.state);
      setCelebration(true);
    } else {
      setFeedback({ kind: "incorrect" });
    }
  };

  const handleHint = () => {
    if (!activeExercise) return;
    setAnswer(String(activeExercise.expectedAnswer));
  };

  const withinCanvas = (clientX: number, clientY: number): boolean => {
    const rect = canvasFrameRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  };

  const handlePalettePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!activePart) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragOriginRef.current = { x: event.clientX, y: event.clientY };
    setDragPoint({ x: event.clientX, y: event.clientY });
  };

  const handlePalettePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragOriginRef.current) return;
    setDragPoint({ x: event.clientX, y: event.clientY });
    setDropReady(withinCanvas(event.clientX, event.clientY));
  };

  const handlePalettePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!dragOriginRef.current || !activePart) return;
    const origin = dragOriginRef.current;
    const moved = Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 6;
    // Un simple tap (pas de déplacement) équivaut au clic ; un glissement ne
    // déclenche la construction que s'il se termine sur la scène 3D (snap),
    // sinon la pièce "retourne" visuellement à la palette (aucune action).
    if (!moved || withinCanvas(event.clientX, event.clientY)) {
      controllerRef.current?.activateCurrentPart();
    }
    dragOriginRef.current = null;
    setDragPoint(null);
    setDropReady(false);
  };

  const progress = levelProgress(levelState);
  const progressPercent = Math.round((progress.completedParts / progress.totalParts) * 100);

  return (
    <main className={styles.page} aria-labelledby="flux-forge-title">
      <header className={styles.header}>
        <Link to="/jeux" className={styles.backLink}>
          <span aria-hidden="true">←</span> {t("fluxForge.game.backToGames")}
        </Link>
        <div className={styles.titleBlock}>
          <h1 id="flux-forge-title">{t("fluxForge.game.title")}</h1>
          <p>{t("fluxForge.game.subtitle")}</p>
        </div>
        <div className={styles.houseChips} role="list" aria-label={t("fluxForge.game.progress")}>
          {([0, 1, 2] as HouseIndex[]).map((houseIndex) => {
            const houseStatus = isHouseCompleted(levelState.houses[houseIndex])
              ? "completed"
              : houseIndex === activeHouse
                ? "active"
                : "locked";
            return (
              <span
                key={houseIndex}
                role="listitem"
                className={`${styles.houseChip} ${styles[`houseChip_${houseStatus}`]}`}
                aria-label={`${t("fluxForge.game.houseLabel", { label: houseLabel(houseIndex) })} — ${t(`fluxForge.game.houseStatus.${houseStatus}`)}`}
              >
                {houseLabel(houseIndex)}
              </span>
            );
          })}
        </div>
      </header>

      <section className={styles.playArea}>
        <div ref={canvasFrameRef} className={dropReady ? `${styles.canvasFrame} ${styles.canvasFrameDropReady}` : styles.canvasFrame}>
          <div ref={gameHostRef} className={styles.gameHost} role="img" aria-label={t("fluxForge.game.canvasLabel")} />

          {levelState.levelCompleted ? (
            <div className={styles.completeBackdrop} role="dialog" aria-modal="true" aria-labelledby="flux-forge-complete-title">
              <section className={styles.completeCard}>
                <span className={styles.completeIcon} aria-hidden="true">🏘️</span>
                <h2 id="flux-forge-complete-title">{t("fluxForge.game.villageComplete.title")}</h2>
                <p>{t("fluxForge.game.villageComplete.message")}</p>
                <div className={styles.completeActions}>
                  <button type="button" className={styles.nextLevelButton} disabled aria-disabled="true">
                    {t("fluxForge.game.villageComplete.nextLevel")}
                    <span>{t("fluxForge.game.villageComplete.nextLevelLocked")}</span>
                  </button>
                  <Link to="/jeux" className={styles.primaryAction}>
                    {t("fluxForge.game.villageComplete.backToGames")}
                  </Link>
                </div>
              </section>
            </div>
          ) : null}
        </div>

        <aside
          className={panelOpen ? styles.sidePanel : `${styles.sidePanel} ${styles.sidePanelCollapsed}`}
          aria-label={t("fluxForge.game.progress")}
        >
          <button
            type="button"
            className={styles.panelToggle}
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen((open) => !open)}
          >
            {panelOpen ? t("fluxForge.game.actions.expandPanel") : t("fluxForge.game.actions.collapsePanel")}
          </button>

          <div className={styles.panelBody}>
            {activePart ? (
              <>
                <ol className={styles.stepsList} aria-label={t("fluxForge.game.houseLabel", { label: houseLabel(activeHouse) })}>
                  {PART_ORDER.map((part) => {
                    const status = levelState.houses[activeHouse][part];
                    return (
                      <li key={part} className={`${styles.step} ${styles[`step_${status}`]}`}>
                        {status === "completed" ? "✓ " : ""}
                        {t(`fluxForge.game.stepLabel.${part}`)}
                      </li>
                    );
                  })}
                </ol>

                <section className={styles.exerciseCard}>
                  {celebration ? <p className={styles.feedback}>{t("fluxForge.game.feedback.correct")}</p> : null}
                  {!engaged ? (
                    <p className={styles.engagePrompt}>{t(`fluxForge.game.engagePrompt.${activePart}`)}</p>
                  ) : activeExercise ? (
                    <>
                      <p className={styles.exercisePrompt}>{t(`fluxForge.game.exercise.${activePart}.prompt`)}</p>
                      <p className={styles.exerciseFormula}>{exerciseFormula(t, activePart, activeExercise)}</p>
                      {activePart === "conversion" ? (
                        <p className={styles.exerciseHintRule}>{t("fluxForge.game.exercise.conversion.hintRule")}</p>
                      ) : null}

                      <label className={styles.answerLabel} htmlFor="flux-forge-answer">
                        {t("fluxForge.game.answerLabel")} ({t(`fluxForge.game.answerUnit.${answerUnitKey(activeExercise)}`)})
                      </label>
                      <input
                        id="flux-forge-answer"
                        className={styles.answerInput}
                        type="number"
                        inputMode="decimal"
                        placeholder={t("fluxForge.game.answerPlaceholder")}
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") handleValidate();
                        }}
                      />
                      <div className={styles.exerciseActions}>
                        <button type="button" className={styles.primaryAction} onClick={handleValidate}>
                          {t("fluxForge.game.actions.validate")}
                        </button>
                        <button type="button" className={styles.secondaryAction} onClick={handleHint}>
                          {t("fluxForge.game.actions.hint")}
                        </button>
                      </div>

                      <p
                        className={feedback.kind === "idle" ? styles.feedbackHidden : styles.feedbackError}
                        aria-live="polite"
                      >
                        {feedback.kind === "incorrect"
                          ? t("fluxForge.game.feedback.incorrect")
                          : feedback.kind === "invalid"
                            ? t("fluxForge.game.feedback.invalidNumber")
                            : ""}
                      </p>
                    </>
                  ) : null}

                  <div className={styles.paletteZone}>
                    <button
                      type="button"
                      className={styles.paletteTile}
                      onPointerDown={handlePalettePointerDown}
                      onPointerMove={handlePalettePointerMove}
                      onPointerUp={handlePalettePointerUp}
                    >
                      {t(`fluxForge.game.paletteLabel.${activePart}`)}
                    </button>
                    <p className={styles.dragHint}>{t("fluxForge.game.dragHint")}</p>
                  </div>
                </section>
              </>
            ) : null}
          </div>
        </aside>
      </section>

      <div className={styles.progressTrack} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progressPercent} aria-label={t("fluxForge.game.progress")}>
        <span style={{ width: `${progressPercent}%` }} />
      </div>

      {dragPoint ? (
        <div className={styles.dragGhost} style={{ left: dragPoint.x, top: dragPoint.y }} aria-hidden="true">
          {activePart ? t(`fluxForge.game.paletteLabel.${activePart}`) : ""}
        </div>
      ) : null}
    </main>
  );
}
