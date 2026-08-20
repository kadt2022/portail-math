import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { CourseDefinition, CourseModule } from "../course-engine/course-model";
import { getPublishedModuleItems } from "../course-engine/course-model";
import {
  getCoursePrimaryAction,
  getCourseProgress,
  getModuleProgress,
  type CoursePrimaryAction,
} from "../course-engine/course-progress";
import { useCourseProgress } from "../course-engine/useCourseProgress";
import baseStyles from "../primary-one/PrimaryOneCourse.module.css";
import { CourseActionIcon } from "./CourseActionIcon";
import { YambaGuide } from "./YambaGuide";

interface GenericCoursePageProps {
  namespace: string;
  course: CourseDefinition;
  modules: readonly CourseModule[];
  comingSoonClassName: string;
  lessonPath: (moduleId: string, lessonId: string) => string;
  modulePath: (moduleId: string) => string;
}

function actionHref(
  action: CoursePrimaryAction,
  lessonPath: (moduleId: string, lessonId: string) => string,
  modulePath: (moduleId: string) => string,
) {
  if ("itemId" in action && action.itemId) {
    return lessonPath(action.moduleId, action.itemId);
  }
  return modulePath(action.moduleId);
}

function formatPercentage(value: number, language: string) {
  return new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(value);
}

// Page d'accueil d'un cours (liste des modules + progression générale),
// commune à tous les niveaux dont les leçons sont pilotées par le moteur de
// progression partagé (voir ../course-engine). Chaque niveau ne fournit que
// ses propres données (catalogue, traductions, styles "à venir").
export function GenericCoursePage({
  namespace,
  course,
  modules,
  comingSoonClassName,
  lessonPath,
  modulePath,
}: GenericCoursePageProps) {
  const { t, i18n } = useTranslation(namespace);
  const { progress } = useCourseProgress(course.id);
  const summary = getCourseProgress(progress, course);
  const primaryAction = getCoursePrimaryAction(progress, course);
  const publishedCount = modules.reduce((total, module) => total + getPublishedModuleItems(module).length, 0);

  return (
    <div className={baseStyles.page}>
      <section className={baseStyles.courseHero} aria-labelledby="course-title">
        <div className={baseStyles.heroCopy}>
          <p className={baseStyles.eyebrow}>{t("course.eyebrow")}</p>
          <h1 id="course-title">{t("course.title")}</h1>
          <p className={baseStyles.lead}>{t("course.lead")}</p>
          <p className={comingSoonClassName}>{t("course.published", { count: publishedCount })}</p>
          <YambaGuide name={t("yamba.name")} message={t("yamba.courseWelcome")} />
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
          <Link className={baseStyles.primaryAction} to={actionHref(primaryAction, lessonPath, modulePath)}>
            <CourseActionIcon className={baseStyles.actionIcon} name={primaryAction.type} />
            {t(`actions.${primaryAction.type}`)}
          </Link>
        </div>
      </section>

      <section className={baseStyles.modulesSection} aria-labelledby="course-modules">
        <div className={baseStyles.sectionHeading}>
          <div>
            <p className={baseStyles.eyebrow}>{t("modules.eyebrow")}</p>
            <h2 id="course-modules">{t("modules.title")}</h2>
          </div>
          <p>{t("modules.orderHint")}</p>
        </div>

        <div className={baseStyles.moduleGrid}>
          {modules.map((module) => {
            const moduleProgress = getModuleProgress(progress, module);
            const state = moduleProgress.state;
            return (
              <article className={baseStyles.moduleCard} key={module.id}>
                <div className={baseStyles.cardTopline}>
                  <span className={baseStyles.moduleNumber}>
                    {t("modules.number", { number: module.number })}
                  </span>
                  <span
                    className={`${baseStyles.status} ${state ? baseStyles[state] : comingSoonClassName}`}
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
                  <CourseActionIcon className={baseStyles.actionIcon} name={state ?? "view"} />
                  {state ? t(`moduleActions.${state}`) : t("moduleActions.view")}
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}
