import type { RefObject } from "react";

import type { SessionView } from "../application/session";
import { isMessageKey, type MessageKey, type Translate } from "../i18n/messages";
import type { ExplanationLine } from "../domain/explanation";
import { AnswerText, QuestionText } from "./MathText";
import styles from "./RiverStage.module.css";
import { SteeringControls } from "./SteeringControls";

// La scène du jeu telle que l'enfant la voit : la rivière 3D (dessinée par le moteur dans l'élément hôte), la carte de
// la question, les commandes ◀ ▶, et les messages. Tous les textes viennent de la session et des traductions du jeu.

export interface StageStats {
  fps: number;
  activeMeshes: number;
  triangles: number;
  buildMs: number;
  boatS: number;
  boatD: number;
}

export interface RiverStageProps {
  hostRef: RefObject<HTMLDivElement | null>;
  view: SessionView;
  t: Translate;
  ready: boolean;
  unsupported: boolean;
  /** Message d'erreur visible (panneau « Recommencer » après un délai qui laisse voir le barrage). */
  showWrongPanel: boolean;
  showCompletedPanel: boolean;
  hint: string | null;
  stats: StageStats | null;
  onStart: () => void;
  onRestart: () => void;
  onSteer: (direction: -1 | 0 | 1) => void;
}

function line(t: Translate, entry: ExplanationLine): string {
  return isMessageKey(entry.key) ? t(entry.key as MessageKey, entry.params) : entry.key;
}

export function RiverStage({ hostRef, view, t, ready, unsupported, showWrongPanel, showCompletedPanel, hint, stats, onStart, onRestart, onSteer }: RiverStageProps) {
  const challenge = view.challenge;
  const feedback = view.feedback;
  const sailing = view.phase === "sailing";
  return (
    <div className={styles.stage} data-phase={view.phase} data-boat-s={stats?.boatS} data-boat-d={stats?.boatD}>
      <div ref={hostRef} className={styles.scene} />

      {challenge && sailing ? (
        <section className={styles.questionCard} aria-label={t("question.label")} aria-live="polite" data-expression={JSON.stringify(challenge.expression)}>
          <span className={styles.counter}>
            {t("challenge.counter", { current: challenge.rank + 1, total: view.total })}
            <ol className={styles.progress} aria-hidden="true">
              {Array.from({ length: view.total }, (_, index) => (
                <li key={index} className={styles.dot} data-state={index < view.solved ? "done" : index === view.solved ? "current" : "todo"} />
              ))}
            </ol>
            {challenge.rework ? <span className={styles.rework}>{t("challenge.rework")}</span> : null}
          </span>
          <QuestionText parts={challenge.parts} t={t} />
          <ol className={styles.lanes} aria-label={t("lanes.label")}>
            {challenge.laneAnswers.map((answer, lane) => (
              <li key={lane} className={styles.lane} data-answer={answer}>
                <span className={styles.laneName}>{t(`laneShort.${lane}` as MessageKey)}</span>
                <AnswerText text={answer} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {feedback?.kind === "correct" && sailing ? (
        <p className={styles.toast} role="status">
          <strong>{t("correct.title")}</strong> {t("correct.text", { answer: feedback.answer })}
        </p>
      ) : null}

      {hint && sailing ? (
        <p className={styles.hint} role="status">
          {hint}
        </p>
      ) : null}

      {ready && !unsupported && view.phase !== "wrong" && view.phase !== "completed" ? (
        <SteeringControls t={t} disabled={!sailing} onSteer={onSteer} />
      ) : null}

      {ready && view.phase === "intro" ? (
        <div className={styles.panel} role="dialog" aria-modal="false" aria-labelledby="riviere-intro-title">
          <h2 id="riviere-intro-title" className={styles.panelTitle}>{t("level.title")}</h2>
          <p>{t("intro.text")}</p>
          <button type="button" className={styles.action} onClick={onStart}>
            {t("intro.start")}
          </button>
        </div>
      ) : null}

      {feedback?.kind === "wrong" && showWrongPanel ? (
        <div className={styles.panel} role="alertdialog" aria-labelledby="riviere-wrong-title" aria-describedby="riviere-wrong-text">
          <h2 id="riviere-wrong-title" className={styles.panelTitle}>{t("wrong.title")}</h2>
          <div id="riviere-wrong-text" className={styles.explanation}>
            {feedback.explanation.mistake ? <p>{line(t, feedback.explanation.mistake)}</p> : null}
            <p>{line(t, feedback.explanation.rule)}</p>
            <p className={styles.answerLine}>{t("wrong.answer", { answer: feedback.answer, lane: t(`lane.${feedback.correctLane}` as MessageKey) })}</p>
            <p className={styles.reworkNote}>{t("wrong.rework")}</p>
          </div>
          <button type="button" className={styles.action} onClick={onRestart} autoFocus>
            {t("wrong.restart")}
          </button>
        </div>
      ) : null}

      {view.phase === "completed" && showCompletedPanel ? (
        <div className={styles.panel} role="dialog" aria-labelledby="riviere-done-title">
          <h2 id="riviere-done-title" className={styles.panelTitle}>{t("completed.title")}</h2>
          <p>{view.attempt === 1 ? t("completed.textOne") : t("completed.textMany", { attempts: view.attempt })}</p>
          <button type="button" className={styles.action} onClick={onRestart} autoFocus>
            {t("completed.replay")}
          </button>
        </div>
      ) : null}

      {unsupported ? (
        <div className={styles.panel} role="alert">
          <p>{t("error.webgl")}</p>
        </div>
      ) : null}

      {stats ? (
        <p className={styles.perf} aria-hidden="true">
          {stats.fps} {t("perf.fps")} · {stats.activeMeshes} mesh · {Math.round(stats.triangles / 1000)}k tri · {stats.buildMs} ms
        </p>
      ) : null}
    </div>
  );
}
