import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  getAllLearningItems,
  getLearningItem,
  getPrimaryOneModule,
  lessonPath,
  modulePath,
  PRIMARY_ONE_BASE_PATH,
  PRIMARY_ONE_MODULES,
} from "./course-catalogue";
import styles from "./PrimaryOneCourse.module.css";
import { useCourseProgress } from "./useCourseProgress";

export function PrimaryOneLessonPage() {
  const { moduleId, lessonId } = useParams();
  const { t } = useTranslation("primaryOne");
  const { progress, startItem, completeStep } = useCourseProgress();
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
    if (item && !progress.items[item.id]) {
      startItem(item);
    }
  }, [item, progress.items, startItem]);

  if (!module || !item || !view) {
    return (
      <div className={styles.missingPage}>
        <h1>{t("errors.lessonNotFound")}</h1>
        <Link className={styles.secondaryAction} to={PRIMARY_ONE_BASE_PATH}>
          {t("actions.backToCourse")}
        </Link>
      </div>
    );
  }

  const setView = (next: string | "done") => {
    setViewByItem((current) => ({ ...current, [item.id]: next }));
  };

  if (view === "done") {
    const allItems = getAllLearningItems();
    const itemIndex = allItems.findIndex((candidate) => candidate.id === item.id);
    const nextItem = allItems[itemIndex + 1];
    const nextModule = PRIMARY_ONE_MODULES[module.number];
    const primaryHref = nextItem
      ? lessonPath(nextItem.moduleId, nextItem.id)
      : nextModule
        ? modulePath(nextModule.id)
        : PRIMARY_ONE_BASE_PATH;
    const primaryLabel = nextItem
      ? "lessonComplete.nextLesson"
      : nextModule
        ? "lessonComplete.nextModule"
        : "lessonComplete.reviewCourse";

    return (
      <div className={styles.lessonPage}>
        <section className={styles.completionCard} aria-live="polite">
          <span className={styles.completionMark} aria-hidden="true">✓</span>
          <p className={styles.eyebrow}>{t("lessonComplete.eyebrow")}</p>
          <h1>
            {item.kind === "evaluation"
              ? t("lessonComplete.evaluationTitle")
              : t("lessonComplete.title")}
          </h1>
          <p>{t("lessonComplete.message")}</p>
          <div className={styles.completionActions}>
            <Link className={styles.secondaryAction} to={modulePath(module.id)}>
              {t("lessonComplete.backToModule")}
            </Link>
            <Link className={styles.primaryAction} to={primaryHref}>
              {t(primaryLabel)} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const stepIndex = item.steps.findIndex((step) => step.id === view);
  const safeStepIndex = stepIndex >= 0 ? stepIndex : 0;
  const step = item.steps[safeStepIndex];
  const nextStep = item.steps[safeStepIndex + 1];
  const wasAlreadyCompleted = Boolean(storedItem?.completed);

  const continueLesson = () => {
    if (!wasAlreadyCompleted) {
      completeStep(item, step.id);
    }
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

      <section className={styles.activityCard} aria-labelledby="activity-step-title">
        <div className={styles.activityVisual} aria-hidden="true">
          <span>●</span><span>▲</span><span>■</span>
        </div>
        <div className={styles.activityCopy}>
          <p className={styles.eyebrow}>{t("lesson.currentStep")}</p>
          <h2 id="activity-step-title">{t(step.labelKey)}</h2>
          <div className={styles.pendingNotice}>
            <strong>{t("contentPending.title")}</strong>
            <p>{t("contentPending.activityMessage")}</p>
          </div>
          <p className={styles.prototypeNote}>{t("contentPending.prototypeNote")}</p>
        </div>
      </section>

      <div className={styles.lessonActions}>
        <Link className={styles.secondaryAction} to={modulePath(module.id)}>
          ← {t("lesson.back")}
        </Link>
        <button className={styles.primaryAction} type="button" onClick={continueLesson}>
          {nextStep
            ? t("lesson.continue")
            : item.kind === "evaluation"
              ? t("lesson.finishEvaluation")
              : t("lesson.finish")}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
