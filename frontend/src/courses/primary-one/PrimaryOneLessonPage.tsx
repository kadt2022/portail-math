import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CourseActionIcon } from "../components/CourseActionIcon";
import { LessonVideoPlayer } from "../components/LessonVideoPlayer";
import { YambaGuide } from "../components/YambaGuide";
import {
  getLearningItem,
  getPrimaryOneModule,
  modulePath,
  PRIMARY_ONE_BASE_PATH,
  questionsForStep,
} from "./course-catalogue";
import styles from "./PrimaryOneCourse.module.css";
import { useCourseProgress } from "./useCourseProgress";
import { PrimaryOneActivity } from "./PrimaryOneActivity";
import { AssessmentResult } from "./AssessmentResult";
import { PrimaryOneCompletion, PrimaryOneTrail } from "./PrimaryOneJourney";
import { EVALUATIONS } from "./lesson-content";
import { LESSON_VIDEOS } from "./lesson-videos";

export function PrimaryOneLessonPage() {
  const { moduleId, lessonId } = useParams();
  const { t, i18n } = useTranslation("primaryOne");
  const frenchContent = (i18n.resolvedLanguage ?? i18n.language).startsWith("fr");
  const { progress, startItem, completeStep, invalidateStep } = useCourseProgress();
  const module = getPrimaryOneModule(moduleId);
  const item = module ? getLearningItem(module, lessonId) : undefined;
  const [viewByItem, setViewByItem] = useState<Record<string, string | "done">>({});

  const storedItem = item ? progress.items[item.id] : undefined;
  const defaultView = item
    ? storedItem?.completed
      ? item.steps[0]?.id
      : storedItem?.currentStepId ?? item.steps[0]?.id
    : undefined;
  const view = item ? viewByItem[item.id] ?? defaultView : undefined;

  useEffect(() => {
    if (frenchContent && item && !progress.items[item.id]) {
      startItem(item);
    }
  }, [item, frenchContent, progress.items, startItem]);

  if (!module || !item || !view) {
    return (
      <div className={styles.missingPage}>
        <h1>{t("errors.lessonNotFound")}</h1>
        <Link className={styles.secondaryAction} to={PRIMARY_ONE_BASE_PATH}>
          <CourseActionIcon className={styles.actionIcon} name="return-to-modules" />
          {t("actions.backToCourse")}
        </Link>
      </div>
    );
  }

  if (!frenchContent) return <section className={styles.missingPage}>
    <p>{t("lesson.languageNotice")}</p>
    <button type="button" className={styles.primaryAction} onClick={() => { void i18n.changeLanguage("fr"); }}>{t("lesson.switchFrench")}</button>
  </section>;

  const setView = (next: string | "done") => {
    setViewByItem((current) => ({ ...current, [item.id]: next }));
  };

  if (view === "done") {
    // Un seul gros bouton « Continuer » : leçon suivante, évaluation, puis
    // module suivant, jusqu'au bilan final (chemin commun de la navigation).
    const title = item.kind === "evaluation" ? t("lessonComplete.evaluationTitle") : t("lessonComplete.title");
    return (
      <div className={styles.lessonPage}>
        <PrimaryOneCompletion module={module} item={item} progress={progress} title={title} modulePath={modulePath(module.id)}>
          {item.kind === "evaluation" ? <AssessmentResult questions={EVALUATIONS[item.id]} /> : null}
        </PrimaryOneCompletion>
      </div>
    );
  }

  const stepIndex = item.steps.findIndex((step) => step.id === view);
  const safeStepIndex = stepIndex >= 0 ? stepIndex : 0;
  const step = item.steps[safeStepIndex];
  const nextStep = item.steps[safeStepIndex + 1];
  const wasAlreadyCompleted = Boolean(storedItem?.completed);
  const questions = questionsForStep(item, step);
  const stepCompleted = Boolean(storedItem?.completedStepIds.includes(step.id));
  const canContinue = questions.length === 0 || stepCompleted;
  const lessonVideo = step.kind === "discover" ? LESSON_VIDEOS[item.id] : undefined;

  const continueLesson = () => {
    if (!canContinue) return;
    if (!stepCompleted) completeStep(item, step.id, true);
    setView(nextStep?.id ?? "done");
  };

  return (
    <div className={styles.lessonPage}>
      <header className={styles.lessonHeader}>
        <nav className={styles.breadcrumbs} aria-label={t("breadcrumbs.label")}>
          <Link to={PRIMARY_ONE_BASE_PATH}>{t("breadcrumbs.course")}</Link>
          <span aria-hidden="true">/</span>
          <Link to={modulePath(module.id)}>{t("modules.number", { number: module.number })}</Link>
        </nav>
        <div className={styles.lessonTitleRow}>
          <div>
            <p className={styles.eyebrow}>
              {item.kind === "evaluation" ? t("evaluation.label") : t("lesson.label")}
            </p>
            <h1>{t(item.titleKey)}</h1>
          </div>
          {wasAlreadyCompleted ? (
            <span className={`${styles.status} ${styles.completed}`}>{t("status.completed")}</span>
          ) : null}
        </div>
        <PrimaryOneTrail module={module} currentItemId={item.id} progress={progress} />
        {safeStepIndex === 0 ? (
          <YambaGuide compact name={t("yamba.name")} message={t("yamba.lessonTip")} />
        ) : null}
        <div className={styles.stepProgressLine}>
          <strong>
            {t("lesson.stepProgress", {
              current: safeStepIndex + 1,
              total: item.steps.length,
              label: t(step.labelKey),
            })}
          </strong>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label={t("lesson.progressLabel")}
            aria-valuemin={1}
            aria-valuemax={item.steps.length}
            aria-valuenow={safeStepIndex + 1}
          >
            <span style={{ width: `${((safeStepIndex + 1) / item.steps.length) * 100}%` }} />
          </div>
        </div>
      </header>

      {questions.length > 0 ? <>
        {step.kind === "remember" ? <p>{t(`content.${item.id}.remember`)}</p> : null}
        <PrimaryOneActivity key={`${item.id}:${step.id}`} questions={questions} completed={stepCompleted} onRestart={() => { setView(step.id); invalidateStep(item, step.id); }} onValidated={() => { setView(step.id); completeStep(item, step.id, true); }} />
      </> : <section className={styles.activityCard} aria-labelledby="activity-step-title">
        <div className={styles.activityCopy}>
          <p className={styles.eyebrow}>{t(`content.${item.id}.objective`)}</p>
          <h2 id="activity-step-title">{t(step.labelKey)}</h2>
          <p>{t(`content.${item.id}.${step.kind}`)}</p>
        </div>
        {lessonVideo ? (
          <LessonVideoPlayer
            src={lessonVideo}
            title={t("lessonVideo.label", { title: t(item.titleKey) })}
          />
        ) : null}
      </section>}
      {!canContinue ? <p aria-live="polite">{t("lesson.validationRequired")}</p> : null}

      <div className={styles.lessonActions}>
        <Link className={styles.secondaryAction} to={modulePath(module.id)}>
          <CourseActionIcon className={styles.actionIcon} name="back" />
          {t("lesson.back")}
        </Link>
        <button className={styles.primaryAction} type="button" disabled={!canContinue} onClick={continueLesson}>
          <CourseActionIcon className={styles.actionIcon} name="continue" />
          {nextStep
            ? t("lesson.continue")
            : item.kind === "evaluation"
              ? t("lesson.finishEvaluation")
              : t("lesson.finish")}
        </button>
      </div>
    </div>
  );
}
