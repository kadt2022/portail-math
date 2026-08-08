import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { loadProgress, summarizeProgress } from "../exetat/progress-storage";
import styles from "./ProgressionPage.module.css";

export function ProgressionPage() {
  const { t } = useTranslation("progress");
  const progress = loadProgress();
  const summary = summarizeProgress(progress);
  const subjects = Object.values(progress.subjects)
    .filter((subject) => subject.attemptCount > 0)
    .sort((left, right) => (right.lastActivityAt ?? "").localeCompare(left.lastActivityAt ?? ""));

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>{t("page.eyebrow")}</p>
      <h1 className={styles.title}>{t("page.title")}</h1>
      <p className={styles.lead}>{t("page.description")}</p>
      <dl className={styles.summary}>
        <div>
          <dt>{t("summary.subjects")}</dt>
          <dd>{summary.startedSubjects}</dd>
        </div>
        <div>
          <dt>{t("summary.average")}</dt>
          <dd>{summary.bestAveragePercentage}%</dd>
        </div>
        <div>
          <dt>{t("summary.correct")}</dt>
          <dd>{summary.totalCorrectAnswers}</dd>
        </div>
        <div>
          <dt>{t("summary.review")}</dt>
          <dd>{summary.questionsToReview}</dd>
        </div>
      </dl>
      {subjects.length ? (
        <section className={styles.subjects} aria-labelledby="progress-subjects-title">
          <h2 id="progress-subjects-title">{t("subjects.title")}</h2>
          <div className={styles.grid}>
            {subjects.map((subject) => (
              <article className={styles.card} key={subject.subjectId}>
                <h3>{subject.subjectName}</h3>
                <p>{t(`status.${subject.status}`)}</p>
                <dl>
                  <div>
                    <dt>{t("subjects.best")}</dt>
                    <dd>{subject.bestScore}/5</dd>
                  </div>
                  <div>
                    <dt>{t("subjects.attempts")}</dt>
                    <dd>{subject.attemptCount}</dd>
                  </div>
                </dl>
                <Link to={`/exetat/matieres/${subject.subjectId}/quiz`}>
                  {t("subjects.continue")}
                </Link>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <div className={styles.empty}>
          <h2>{t("empty.title")}</h2>
          <p>{t("empty.description")}</p>
          <Link to="/exetat">{t("empty.cta")}</Link>
        </div>
      )}
    </div>
  );
}
