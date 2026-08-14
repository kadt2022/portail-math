import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { isPublished } from "../course-engine/course-model";
import { useCourseProgress } from "../course-engine/useCourseProgress";
import baseStyles from "../primary-one/PrimaryOneCourse.module.css";
import {
  getPrimaryTwoItem,
  getPrimaryTwoModule,
  modulePath,
  PRIMARY_TWO_BASE_PATH,
  PRIMARY_TWO_COURSE,
} from "./course-catalogue";
import { PrimaryTwoLessonActivity } from "./PrimaryTwoLessonActivities";
import styles from "./PrimaryTwoLesson.module.css";

export function PrimaryTwoLessonPage() {
  const { moduleId, lessonId } = useParams();
  const { t, i18n } = useTranslation("primaryTwo");
  const { progress, startItem, completeStep } = useCourseProgress(PRIMARY_TWO_COURSE.id);
  const module = getPrimaryTwoModule(moduleId);
  const item = module ? getPrimaryTwoItem(module, lessonId) : undefined;
  const frenchContent = (i18n.resolvedLanguage ?? i18n.language).startsWith("fr");
  const [viewByItem, setViewByItem] = useState<Record<string, string | "done">>({});

  const storedItem = item ? progress.items[item.id] : undefined;
  const defaultView = item
    ? storedItem?.completed
      ? item.steps[0]?.id
      : storedItem?.currentStepId ?? item.steps[0]?.id
    : undefined;
  const view = item ? viewByItem[item.id] ?? defaultView : undefined;

  useEffect(() => {
    if (frenchContent && item && isPublished(item) && !progress.items[item.id]) {
      startItem(item);
    }
  }, [frenchContent, item, progress.items, startItem]);

  if (!module || !item || !isPublished(item) || !view) {
    return (
      <div className={baseStyles.missingPage}>
        <h1>{t("errors.lessonNotFound")}</h1>
        <Link className={baseStyles.secondaryAction} to={PRIMARY_TWO_BASE_PATH}>
          {t("actions.backToCourse")}
        </Link>
      </div>
    );
  }

  if (!frenchContent) {
    return (
      <div className={baseStyles.lessonPage}>
        <section className={styles.languageNotice} aria-live="polite">
          <span aria-hidden="true">EN</span>
          <p className={baseStyles.eyebrow}>{t("status.coming-soon")}</p>
          <h1>{t("lesson.contentUnavailableTitle")}</h1>
          <p>{t("lesson.contentUnavailableMessage")}</p>
          <Link className={baseStyles.secondaryAction} to={modulePath(module.id)}>
            ← {t("lesson.back")}
          </Link>
        </section>
      </div>
    );
  }

  const setView = (next: string | "done") => {
    setViewByItem((current) => ({ ...current, [item.id]: next }));
  };

  if (view === "done") {
    return (
      <div className={baseStyles.lessonPage}>
        <section className={baseStyles.completionCard} aria-live="polite">
          <span className={baseStyles.completionMark} aria-hidden="true">✓</span>
          <p className={baseStyles.eyebrow}>{t("lessonComplete.eyebrow")}</p>
          <h1>{t("lessonComplete.title")}</h1>
          <p>{t("lessonComplete.message")}</p>
          <p className={styles.nextComing}>{t("lessonComplete.nextComing")}</p>
          <div className={baseStyles.completionActions}>
            <Link className={baseStyles.primaryAction} to={modulePath(module.id)}>
              {t("lessonComplete.backToModule")} <span aria-hidden="true">→</span>
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
  const stepCompleted = Boolean(storedItem?.completedStepIds.includes(step.id));

  return (
    <div className={baseStyles.lessonPage}>
      <header className={baseStyles.lessonHeader}>
        <nav className={baseStyles.breadcrumbs} aria-label={t("breadcrumbs.label")}>
          <Link to={PRIMARY_TWO_BASE_PATH}>{t("breadcrumbs.course")}</Link>
          <span aria-hidden="true">/</span>
          <Link to={modulePath(module.id)}>{t("modules.number", { number: module.number })}</Link>
        </nav>
        <div className={baseStyles.lessonTitleRow}>
          <div>
            <p className={baseStyles.eyebrow}>{t("lesson.label")}</p>
            <h1>{t(item.titleKey)}</h1>
          </div>
          <span className={styles.duration}>{t("lesson.duration")}</span>
        </div>
        <div className={styles.lessonContext}>
          <p><strong>{t("lesson.objectiveLabel")} :</strong> {t("lesson.objective")}</p>
          <p>{t("lesson.situation")}</p>
        </div>
        <div className={baseStyles.stepProgressLine}>
          <strong>
            {t("lesson.stepProgress", {
              current: safeStepIndex + 1,
              total: item.steps.length,
              label: t(step.labelKey),
            })}
          </strong>
          <div
            className={baseStyles.progressTrack}
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

      <PrimaryTwoLessonActivity
        key={step.id}
        kind={step.kind}
        completed={stepCompleted}
        onValidated={() => {
          setView(step.id);
          completeStep(item, step.id, true);
        }}
      />

      <div className={`${baseStyles.lessonActions} ${styles.lessonActions}`}>
        <Link className={baseStyles.secondaryAction} to={modulePath(module.id)}>
          ← {t("lesson.back")}
        </Link>
        {stepCompleted ? (
          <button
            className={baseStyles.primaryAction}
            type="button"
            onClick={() => setView(nextStep?.id ?? "done")}
          >
            {nextStep ? t("lesson.continue") : t("lesson.finish")}
            <span aria-hidden="true">→</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
