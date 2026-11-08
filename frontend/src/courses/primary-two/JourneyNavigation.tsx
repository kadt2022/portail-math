import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { CourseItem, CourseModule } from "../course-engine/course-model";
import type { CourseProgress } from "../course-engine/course-progress";
import { getLearningState } from "../course-engine/course-progress";
import { lessonPath, PRIMARY_TWO_COURSE, PRIMARY_TWO_MODULES } from "./course-catalogue";
import { isFinalAssessment, moduleLessonsCompleted, moduleStops, nextStop } from "./journey";
import styles from "./JourneyNavigation.module.css";

// Navigation pensée pour un enfant de 7 ans : un petit chemin de ronds pour
// savoir où il est, et un seul gros bouton « Continuer » qui mène toujours
// au bon endroit (leçon suivante, évaluation, module suivant, bilan).

function stopSymbol(item: CourseItem) {
  if (isFinalAssessment(item)) return "🎓";
  if (item.kind === "evaluation") return "🏅";
  return String(Number(item.id.slice(-2)));
}

export function JourneyTrail({
  module,
  currentItemId,
  progress,
}: {
  module: CourseModule;
  currentItemId: string;
  progress: CourseProgress;
}) {
  const { t } = useTranslation("primaryTwo");
  const stops = moduleStops(module);
  return (
    <nav className={styles.trail} aria-label={t("journey.trailLabel", { number: module.number })}>
      <ol>
        {stops.map((item) => {
          const state = getLearningState(progress, item);
          const current = item.id === currentItemId;
          const label = t("journey.stopLabel", {
            title: t(item.titleKey),
            state: t(current ? "journey.state.current" : `journey.state.${state ?? "not-started"}`),
          });
          return (
            <li key={item.id}>
              <Link
                to={lessonPath(module.id, item.id)}
                aria-label={label}
                aria-current={current ? "step" : undefined}
                className={`${styles.stop} ${state === "completed" ? styles.done : ""} ${current ? styles.current : ""}`}
              >
                <span aria-hidden="true">{state === "completed" && !current ? "★" : stopSymbol(item)}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function itemTitle(t: (key: string, options?: Record<string, unknown>) => string, item: CourseItem, module: CourseModule) {
  if (item.kind === "evaluation" && !isFinalAssessment(item)) {
    return `${t(item.titleKey)} ${module.number}`;
  }
  return t(item.titleKey);
}

/**
 * Écran de fin commun à toutes les leçons et évaluations de 2e primaire.
 * - leçon : bravo, étoile sur le chemin, « Continuer » vers la suite ;
 * - évaluation : petite fête du module, « Continuer » vers le module suivant ;
 * - bilan : fin du parcours.
 */
export function PrimaryTwoCompletion({
  module,
  item,
  progress,
  title,
  basePath,
  modulePath,
}: {
  module: CourseModule;
  item: CourseItem;
  progress: CourseProgress;
  title: string;
  basePath: string;
  modulePath: string;
}) {
  const { t } = useTranslation("primaryTwo");
  const next = nextStop(item.id);
  const finished = isFinalAssessment(item);
  const moduleEnd = item.kind === "evaluation" && !finished;
  const moduleSuccess = moduleEnd && moduleLessonsCompleted(progress, module);
  const completedLessons = PRIMARY_TWO_MODULES.flatMap((candidate) => candidate.lessons).filter(
    (lesson) => getLearningState(progress, lesson) === "completed",
  ).length;

  const heading = finished
    ? t("journey.courseFinished")
    : moduleSuccess
      ? t("journey.moduleSuccess", { number: module.number })
      : title;
  const nextTitle = next ? itemTitle(t, next.item, next.module) : "";
  const yamba = finished
    ? t("journey.yambaFinished")
    : next && next.module.id !== module.id
      ? t("journey.yambaNextModule", { number: next.module.number, title: t(next.module.titleKey) })
      : t("journey.yambaNext", { title: nextTitle });

  return (
    <section className={styles.completion} aria-live="polite">
      <span className={styles.badge} aria-hidden="true">
        {finished ? "🎓" : moduleEnd ? "🏅" : "★"}
      </span>
      <h1>{heading}</h1>
      {moduleSuccess ? <p className={styles.subtitle}>{title}</p> : null}
      <JourneyTrail module={module} currentItemId="" progress={progress} />
      <p className={styles.yamba}>
        <strong>{t("yamba.name")}</strong> {yamba}
      </p>
      <p className={styles.count}>
        {t("lessonComplete.progressMessage", { count: completedLessons, total: PRIMARY_TWO_COURSE.plannedLessonCount })}
      </p>
      {next ? (
        <Link className={styles.continue} to={lessonPath(next.module.id, next.item.id)}>
          {t("journey.continue")} <span aria-hidden="true">▶</span>
        </Link>
      ) : (
        <Link className={styles.continue} to={basePath}>
          {t("journey.backToCourse")} <span aria-hidden="true">▶</span>
        </Link>
      )}
      {next ? <span className={styles.nextName}>{nextTitle}</span> : null}
      <Link className={styles.quiet} to={modulePath}>
        {t("lessonComplete.backToModule")}
      </Link>
    </section>
  );
}
