import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CourseActionIcon } from "../components/CourseActionIcon";
import { getModuleItems, type CourseItem } from "../course-engine/course-model";
import {
  getLearningState,
  getModuleProgress,
  type CourseProgress,
} from "../course-engine/course-progress";
import { useCourseProgress } from "../course-engine/useCourseProgress";
import baseStyles from "../primary-one/PrimaryOneCourse.module.css";
import {
  getPrimaryTwoModule,
  lessonPath,
  PRIMARY_TWO_BASE_PATH,
  PRIMARY_TWO_COURSE,
} from "./course-catalogue";
import styles from "./PrimaryTwoCourse.module.css";

interface LearningCardProps {
  item: CourseItem;
  index: number;
  progress: CourseProgress;
}

function LearningCard({ item, index, progress }: LearningCardProps) {
  const { t } = useTranslation("primaryTwo");
  const state = getLearningState(progress, item);
  const itemProgress = progress.items[item.id];
  const completedSteps = itemProgress?.completedStepIds.length ?? 0;
  const percentage = item.steps.length === 0 ? 0 : Math.round((completedSteps / item.steps.length) * 100);
  const title = t(item.titleKey, { number: index + 1 });

  return (
    <article className={item.kind === "evaluation" ? baseStyles.evaluationCard : baseStyles.lessonCard}>
      <div className={baseStyles.lessonNumber} aria-hidden="true">
        {item.kind === "evaluation" ? "✓" : index + 1}
      </div>
      <div className={baseStyles.lessonCopy}>
        <span className={baseStyles.lessonKind}>
          {item.kind === "evaluation"
            ? t("evaluation.label")
            : t("lessons.number", { number: index + 1 })}
        </span>
        <h3>{title}</h3>
        {state ? (
          <>
            <div className={baseStyles.lessonMeta}>
              <span className={`${baseStyles.status} ${baseStyles[state]}`}>{t(`status.${state}`)}</span>
              <span>{t("progress.steps", { completed: completedSteps, total: item.steps.length })}</span>
            </div>
            <div
              className={baseStyles.progressTrack}
              role="progressbar"
              aria-label={t("progress.item", { title })}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percentage}
            >
              <span style={{ width: `${percentage}%` }} />
            </div>
          </>
        ) : (
          <span className={`${baseStyles.status} ${styles.comingSoonStatus}`}>
            {t("status.coming-soon")}
          </span>
        )}
      </div>
      {state ? (
        <Link className={baseStyles.cardAction} to={lessonPath(item.moduleId, item.id)}>
          <CourseActionIcon className={baseStyles.actionIcon} name={state} />
          {t(`moduleActions.${state}`)}
        </Link>
      ) : (
        <span className={styles.unavailableLabel}>{t("status.coming-soon")}</span>
      )}
    </article>
  );
}

export function PrimaryTwoModulePage() {
  const { moduleId } = useParams();
  const { t } = useTranslation("primaryTwo");
  const { progress } = useCourseProgress(PRIMARY_TWO_COURSE.id);
  const module = getPrimaryTwoModule(moduleId);

  if (!module) {
    return (
      <div className={baseStyles.missingPage}>
        <h1>{t("errors.moduleNotFound")}</h1>
        <Link className={baseStyles.secondaryAction} to={PRIMARY_TWO_BASE_PATH}>
          <CourseActionIcon className={baseStyles.actionIcon} name="return-to-modules" />
          {t("actions.backToCourse")}
        </Link>
      </div>
    );
  }

  const summary = getModuleProgress(progress, module);
  const items = getModuleItems(module) as readonly CourseItem[];

  return (
    <div className={baseStyles.page}>
      <nav className={baseStyles.breadcrumbs} aria-label={t("breadcrumbs.label") }>
        <Link to={PRIMARY_TWO_BASE_PATH}>{t("breadcrumbs.course")}</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">{t("modules.number", { number: module.number })}</span>
      </nav>

      <section className={baseStyles.moduleHero}>
        <div>
          <p className={baseStyles.eyebrow}>{t("modules.number", { number: module.number })}</p>
          <h1>{t(module.titleKey)}</h1>
          <p className={baseStyles.lead}>
            {summary.state ? t("module.referenceLead") : t("module.pendingLead")}
          </p>
        </div>
        <div className={baseStyles.moduleSummary}>
          <span
            className={`${baseStyles.status} ${
              summary.state ? baseStyles[summary.state] : styles.comingSoonStatus
            }`}
          >
            {summary.state ? t(`status.${summary.state}`) : t("status.coming-soon")}
          </span>
          <strong>
            {summary.state
              ? t("progress.moduleLessons", {
                  completed: summary.completedLessons,
                  total: summary.totalLessons,
                })
              : t("progress.plannedLessons", { total: summary.totalLessons })}
          </strong>
          {summary.state ? (
            <div
              className={baseStyles.progressTrack}
              role="progressbar"
              aria-label={t("progress.module", { number: module.number })}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={summary.percentage}
            >
              <span style={{ width: `${summary.percentage}%` }} />
            </div>
          ) : null}
        </div>
      </section>

      <section className={baseStyles.lessonSection} aria-labelledby="primary-two-lessons">
        <div className={baseStyles.sectionHeading}>
          <div>
            <p className={baseStyles.eyebrow}>{t("module.pathEyebrow")}</p>
            <h2 id="primary-two-lessons">{t("module.pathTitle")}</h2>
          </div>
          <p>{t("module.pathHint")}</p>
        </div>
        <div className={baseStyles.lessonList}>
          {items.map((item, index) => (
            <LearningCard key={item.id} item={item} index={index} progress={progress} />
          ))}
        </div>
      </section>

      <div className={baseStyles.moduleFooterActions}>
        <Link className={baseStyles.secondaryAction} to={PRIMARY_TWO_BASE_PATH}>
          <CourseActionIcon className={baseStyles.actionIcon} name="return-to-modules" />
          {t("actions.backToCourse")}
        </Link>
      </div>
    </div>
  );
}
