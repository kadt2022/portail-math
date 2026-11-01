import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { getReaderNeighbors, type ReaderCourse, type ReaderStop } from "./reader-model";
import styles from "./CourseReader.module.css";

// Passage au module précédent ou suivant (« Bien démarrer » compris), sans quitter le lecteur.
export function ModuleNavigation({ course, pathname }: { course: ReaderCourse; pathname: string }) {
  const { t } = useTranslation("reader");
  const { t: tc } = useTranslation(course.namespace);
  const { previous, next } = getReaderNeighbors(course, pathname);

  if (!previous && !next) {
    return null;
  }

  function title(stop: ReaderStop) {
    return stop.kind === "intro"
      ? t("moduleNav.intro")
      : `${t("moduleNav.module", { number: stop.module.number })} · ${tc(stop.module.titleKey)}`;
  }

  return (
    <nav className={styles.moduleNav} aria-label={t("moduleNav.label")}>
      {previous ? (
        <Link to={previous.path} className={styles.moduleNavLink} rel="prev">
          <span className={styles.moduleNavHint}>← {t("moduleNav.previous")}</span>
          <span className={styles.moduleNavTitle}>{title(previous)}</span>
        </Link>
      ) : null}
      {next ? (
        <Link to={next.path} className={`${styles.moduleNavLink} ${styles.moduleNavNext}`} rel="next">
          <span className={styles.moduleNavHint}>{t("moduleNav.next")} →</span>
          <span className={styles.moduleNavTitle}>{title(next)}</span>
        </Link>
      ) : null}
    </nav>
  );
}
