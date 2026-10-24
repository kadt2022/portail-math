import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { lessonPath } from "./course-catalogue";
import { getAssessmentSummary } from "./learning-results";
import type { Question } from "./exercise-model";
import styles from "./PrimaryOneActivity.module.css";

export function AssessmentResult({ questions }: { questions: readonly Question[] }) {
  const { t } = useTranslation("primaryOne");
  const summary = getAssessmentSummary(questions);
  return <section className={styles.notice} aria-label={t("evaluation.results")}>
    <h2>{t("evaluation.results")}</h2>
    <p>{t("evaluation.score", { count: summary.correct, total: summary.total })}</p>
    <p>{t("evaluation.firstTry", { count: summary.firstTry, total: summary.total })}</p>
    {summary.reviewLessonIds.length ? <><h3>{t("evaluation.review")}</h3><ul>{summary.reviewLessonIds.map((id) => <li key={id}><Link to={lessonPath(id.split("-").slice(0,3).join("-"),id)}>{t(`content.${id}.title`)}</Link></li>)}</ul></> : <p>{t("evaluation.mastered")}</p>}
  </section>;
}
