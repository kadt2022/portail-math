import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  getLearningItems,
  getPrimaryOneModule,
  lessonPath,
  modulePath,
  PRIMARY_ONE_BASE_PATH,
  PRIMARY_ONE_MODULES,
  type LearningItem,
} from "./course-catalogue";
import {
  getLearningState,
  getModuleProgress,
  type CourseProgress,
} from "./course-progress";
import styles from "./PrimaryOneCourse.module.css";
import { useCourseProgress } from "./useCourseProgress";

interface LearningCardProps {
  item: LearningItem;
  index: number;
  progress: CourseProgress;
}

function LearningCard({ item, index, progress }: LearningCardProps) {
  const { t } = useTranslation("primaryOne");
  const state = getLearningState(progress, item);
  const itemProgress = progress.items[item.id];
  const completedSteps = itemProgress?.completedStepIds.length ?? 0;
  const percentage = Math.round((completedSteps / item.steps.length) * 100);

  return (
    <article className={item.kind === "evaluation" ? styles.evaluationCard : styles.lessonCard}>
      <div className={styles.lessonNumber} aria-hidden="true">
        {item.kind === "evaluation" ? "✓" : index + 1}
      </div>
      <div className={styles.lessonCopy}>
        <span className={styles.lessonKind}>
          {item.kind === "evaluation"
            ? t("evaluation.label")
            : t("lessons.number", { number: index + 1 })}
        </span>
        <h3>{t(item.titleKey)}</h3>
        <div className={styles.lessonMeta}>
          <span className={`${styles.status} ${styles[state]}`}>{t(`status.${state}`)}</span>
          <span>{t("progress.steps", { completed: completedSteps, total: item.steps.length })}</span>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-label={t("progress.item", { title: t(item.titleKey) })}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
        >
          <span style={{ width: `${percentage}%` }} />
        </div>
      </div>
      <Link className={styles.cardAction} to={lessonPath(item.moduleId, item.id)}>
        {t(`moduleActions.${state}`)}
        <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}

export function PrimaryOneModulePage() {
  const { moduleId } = useParams();
  const { t } = useTranslation("primaryOne");
  const { progress } = useCourseProgress();
  const module = getPrimaryOneModule(moduleId);

  if (!module) {
    return (
      <div className={styles.missingPage}>
        <h1>{t("errors.moduleNotFound")}</h1>
        <Link className={styles.secondaryAction} to={PRIMARY_ONE_BASE_PATH}>
          {t("actions.backToCourse")}
        </Link>
      </div>
    );
  }

  const moduleProgress = getModuleProgress(progress, module);
  const items = getLearningItems(module);
  const nextModule = PRIMARY_ONE_MODULES[module.number];

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label={t("breadcrumbs.label")}>
        <Link to={PRIMARY_ONE_BASE_PATH}>{t("breadcrumbs.course")}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t("modules.number", { number: module.number })}</span>
      </nav>

      <section className={styles.moduleHero}>
        <div>
          <p className={styles.eyebrow}>{t("modules.number", { number: module.number })}</p>
          <h1>{t(module.titleKey)}</h1>
          <p className={styles.lead}>
            {items.length > 0 ? t("module.referenceLead") : t("module.pendingLead")}
          </p>
        </div>
        <div className={styles.moduleSummary}>
          <span className={`${styles.status} ${styles[moduleProgress.state]}`}>
            {t(`status.${moduleProgress.state}`)}
          </span>
          <strong>
            {t("progress.moduleLessons", {
              completed: moduleProgress.completedLessons,
              total: moduleProgress.totalLessons,
            })}
          </strong>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label={t("progress.module", { number: module.number })}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={moduleProgress.percentage}
          >
            <span style={{ width: `${moduleProgress.percentage}%` }} />
          </div>
        </div>
      </section>

      {items.length > 0 ? (
        <section className={styles.lessonSection} aria-labelledby="lesson-list-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.eyebrow}>{t("module.pathEyebrow")}</p>
              <h2 id="lesson-list-title">{t("module.pathTitle")}</h2>
            </div>
            <p>{t("module.pathHint")}</p>
          </div>
          <div className={styles.lessonList}>
            {items.map((item, index) => (
              <LearningCard key={item.id} item={item} index={index} progress={progress} />
            ))}
          </div>
        </section>
      ) : (
        <section className={styles.contentPending}>
          <span aria-hidden="true">✎</span>
          <div>
            <h2>{t("contentPending.title")}</h2>
            <p>{t("contentPending.moduleMessage")}</p>
          </div>
        </section>
      )}

      <div className={styles.moduleFooterActions}>
        <Link className={styles.secondaryAction} to={PRIMARY_ONE_BASE_PATH}>
          ← {t("actions.backToCourse")}
        </Link>
        {moduleProgress.state === "completed" && nextModule ? (
          <Link className={styles.primaryAction} to={modulePath(nextModule.id)}>
            {t("actions.next-module")} <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
