import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CourseActionIcon } from "../components/CourseActionIcon";
import { YambaGuide } from "../components/YambaGuide";
import {
  lessonPath,
  modulePath,
  PRIMARY_ONE_MODULES,
} from "./course-catalogue";
import {
  getCoursePrimaryAction,
  getCourseProgress,
  getModuleProgress,
  type CoursePrimaryAction,
  type LearningState,
} from "./course-progress";
import styles from "./PrimaryOneCourse.module.css";
import { useCourseProgress } from "./useCourseProgress";

function stateKey(state: LearningState) {
  return `status.${state}`;
}

function actionHref(action: CoursePrimaryAction) {
  if (action.type === "next-module") {
    return modulePath(action.moduleId);
  }
  if ("itemId" in action && action.itemId) {
    return lessonPath(action.moduleId, action.itemId);
  }
  return modulePath(action.moduleId);
}

function actionLabelKey(action: CoursePrimaryAction) {
  return `actions.${action.type}`;
}

export function PrimaryOneCoursePage() {
  const { t } = useTranslation("primaryOne");
  const { progress } = useCourseProgress();
  const summary = getCourseProgress(progress);
  const primaryAction = getCoursePrimaryAction(progress);

  return (
    <div className={styles.page}>
      <section className={styles.courseHero} aria-labelledby="primary-one-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{t("course.eyebrow")}</p>
          <h1 id="primary-one-title">{t("course.title")}</h1>
          <p className={styles.lead}>{t("course.lead")}</p>
          <YambaGuide name={t("yamba.name")} message={t("yamba.courseWelcome")} />
        </div>

        <div className={styles.overallProgress}>
          <div className={styles.progressHeading}>
            <div>
              <span className={styles.progressLabel}>{t("progress.overall")}</span>
              <strong>
                {t("progress.lessons", {
                  completed: summary.completedLessons,
                  total: summary.totalLessons,
                })}
              </strong>
            </div>
            <span className={styles.percentage}>{summary.percentage} %</span>
          </div>
          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label={t("progress.overall")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={summary.percentage}
          >
            <span style={{ width: `${summary.percentage}%` }} />
          </div>
          <Link className={styles.primaryAction} to={actionHref(primaryAction)}>
            <CourseActionIcon className={styles.actionIcon} name={primaryAction.type} />
            {t(actionLabelKey(primaryAction))}
          </Link>
        </div>
      </section>

      <section className={styles.modulesSection} aria-labelledby="modules-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>{t("modules.eyebrow")}</p>
            <h2 id="modules-title">{t("modules.title")}</h2>
          </div>
          <p>{t("modules.orderHint")}</p>
        </div>

        <div className={styles.moduleGrid}>
          {PRIMARY_ONE_MODULES.map((module) => {
            const moduleProgress = getModuleProgress(progress, module);
            const hasPublishedLessons = moduleProgress.totalLessons > 0;
            return (
              <article className={styles.moduleCard} key={module.id}>
                <div className={styles.cardTopline}>
                  <span className={styles.moduleNumber}>
                    {t("modules.number", { number: module.number })}
                  </span>
                  <span className={`${styles.status} ${styles[moduleProgress.state]}`}>
                    {t(stateKey(moduleProgress.state))}
                  </span>
                </div>
                <div className={styles.moduleIllustration} aria-hidden="true">
                  {module.illustration}
                </div>
                <h3>{t(module.titleKey)}</h3>
                <div className={styles.cardProgress}>
                  <span>
                    {hasPublishedLessons
                      ? t("progress.moduleLessons", {
                          completed: moduleProgress.completedLessons,
                          total: moduleProgress.totalLessons,
                        })
                      : t("progress.contentPending")}
                  </span>
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
                <Link className={styles.cardAction} to={modulePath(module.id)}>
                  <CourseActionIcon className={styles.actionIcon} name={moduleProgress.state} />
                  {t(`moduleActions.${moduleProgress.state}`)}
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
