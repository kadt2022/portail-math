import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import {
  getCoursePrimaryAction,
  getCourseProgress,
  getModuleProgress,
  type CoursePrimaryAction,
} from "../course-engine/course-progress";
import { useCourseProgress } from "../course-engine/useCourseProgress";
import baseStyles from "../primary-one/PrimaryOneCourse.module.css";
import { lessonPath, modulePath, PRIMARY_TWO_COURSE, PRIMARY_TWO_MODULES } from "./course-catalogue";
import styles from "./PrimaryTwoCourse.module.css";

function actionHref(action: CoursePrimaryAction) {
  if ("itemId" in action && action.itemId) {
    return lessonPath(action.moduleId, action.itemId);
  }
  return modulePath(action.moduleId);
}

function formatPercentage(value: number, language: string) {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value);
}

export function PrimaryTwoCoursePage() {
  const { t, i18n } = useTranslation("primaryTwo");
  const { progress } = useCourseProgress(PRIMARY_TWO_COURSE.id);
  const summary = getCourseProgress(progress, PRIMARY_TWO_COURSE);
  const primaryAction = getCoursePrimaryAction(progress, PRIMARY_TWO_COURSE);

  return (
    <div className={baseStyles.page}>
      <section className={baseStyles.courseHero} aria-labelledby="primary-two-title">
        <div className={baseStyles.heroCopy}>
          <p className={baseStyles.eyebrow}>{t("course.eyebrow")}</p>
          <h1 id="primary-two-title">{t("course.title")}</h1>
          <p className={baseStyles.lead}>{t("course.lead")}</p>
          <p className={styles.publishedNote}>{t("course.published", { count: 1 })}</p>
        </div>

        <div className={baseStyles.overallProgress}>
          <div className={baseStyles.progressHeading}>
            <div>
              <span className={baseStyles.progressLabel}>{t("progress.overall")}</span>
              <strong>
                {t("progress.lessons", {
                  completed: summary.completedLessons,
                  total: summary.totalLessons,
                })}
              </strong>
            </div>
            <span className={baseStyles.percentage}>
              {formatPercentage(summary.percentage, i18n.language)} %
            </span>
          </div>
          <div
            className={baseStyles.progressTrack}
            role="progressbar"
            aria-label={t("progress.overall")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={summary.percentage}
          >
            <span style={{ width: `${summary.percentage}%` }} />
          </div>
          <Link className={baseStyles.primaryAction} to={actionHref(primaryAction)}>
            {t(`actions.${primaryAction.type}`)}
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className={baseStyles.modulesSection} aria-labelledby="primary-two-modules">
        <div className={baseStyles.sectionHeading}>
          <div>
            <p className={baseStyles.eyebrow}>{t("modules.eyebrow")}</p>
            <h2 id="primary-two-modules">{t("modules.title")}</h2>
          </div>
          <p>{t("modules.orderHint")}</p>
        </div>

        <div className={baseStyles.moduleGrid}>
          {PRIMARY_TWO_MODULES.map((module) => {
            const moduleProgress = getModuleProgress(progress, module);
            const state = moduleProgress.state;
            return (
              <article className={baseStyles.moduleCard} key={module.id}>
                <div className={baseStyles.cardTopline}>
                  <span className={baseStyles.moduleNumber}>
                    {t("modules.number", { number: module.number })}
                  </span>
                  <span
                    className={`${baseStyles.status} ${
                      state ? baseStyles[state] : styles.comingSoonStatus
                    }`}
                  >
                    {state ? t(`status.${state}`) : t("status.coming-soon")}
                  </span>
                </div>
                <div className={baseStyles.moduleIllustration} aria-hidden="true">
                  {module.illustration}
                </div>
                <h3>{t(module.titleKey)}</h3>
                <div className={baseStyles.cardProgress}>
                  <span>
                    {state
                      ? t("progress.moduleLessons", {
                          completed: moduleProgress.completedLessons,
                          total: moduleProgress.totalLessons,
                        })
                      : t("progress.plannedLessons", { total: moduleProgress.totalLessons })}
                  </span>
                  {state ? (
                    <div
                      className={baseStyles.progressTrack}
                      role="progressbar"
                      aria-label={t("progress.module", { number: module.number })}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={moduleProgress.percentage}
                    >
                      <span style={{ width: `${moduleProgress.percentage}%` }} />
                    </div>
                  ) : null}
                </div>
                <Link className={baseStyles.cardAction} to={modulePath(module.id)}>
                  {state ? t(`moduleActions.${state}`) : t("moduleActions.view")}
                  <span aria-hidden="true">→</span>
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
