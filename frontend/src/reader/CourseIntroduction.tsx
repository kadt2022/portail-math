import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { READER_COURSES } from "./reader-courses";
import { findReaderCourseById, getReaderStats } from "./reader-model";
import styles from "./CourseReader.module.css";

interface CourseIntroductionProps {
  courseId: string;
  titleId: string;
  eyebrow: string;
  title: string;
  lead: string;
  action: { label: string; to: string; icon?: ReactNode };
  progress: { label: string; text: string; percentage: number; percentageText: string };
  guide?: ReactNode;
}

// « 00 — Bien démarrer » : grand panneau de bienvenue du parcours. Les pastilles et les chiffres
// viennent du contenu réel (modules, leçons et évaluations publiés) ; aucune durée n'est inventée.
export function CourseIntroduction({
  courseId,
  titleId,
  eyebrow,
  title,
  lead,
  action,
  progress,
  guide,
}: CourseIntroductionProps) {
  const { t } = useTranslation("reader");
  const course = findReaderCourseById(READER_COURSES, courseId);
  const stats = course ? getReaderStats(course) : undefined;

  return (
    <>
      <section className={styles.hero} aria-labelledby={titleId}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>{eyebrow}</span>
          <h1 id={titleId} className={styles.heroTitle}>{title}</h1>
          <p className={styles.heroLead}>{lead}</p>
          {stats ? (
            <ul className={styles.heroMeta}>
              <li>{t("intro.badgeModules", { count: stats.modules })}</li>
              <li>{t("intro.badgeLessons", { count: stats.lessons })}</li>
              {stats.evaluations > 0 ? <li>{t("intro.badgeEvaluations", { count: stats.evaluations })}</li> : null}
            </ul>
          ) : null}
          <Link className={styles.startButton} to={action.to}>
            {action.icon}
            {action.label}
          </Link>
        </div>
      </section>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <span>{progress.label}</span>
          <strong>{progress.percentageText}</strong>
          <span>{progress.text}</span>
          <div
            className={styles.statTrack}
            role="progressbar"
            aria-label={progress.label}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress.percentage}
          >
            <span className={styles.statFill} style={{ width: `${progress.percentage}%` }} />
          </div>
        </div>
        {stats ? (
          <>
            <div className={styles.statCard}>
              <strong>{stats.publishedModules}</strong>
              <span>{t("intro.statModules", { total: stats.modules })}</span>
            </div>
            <div className={styles.statCard}>
              <strong>{stats.lessons}</strong>
              <span>{t("intro.statLessons")}</span>
            </div>
          </>
        ) : null}
      </div>

      {guide}
    </>
  );
}
