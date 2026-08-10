import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { CourseNavigationItem } from "../app/course-navigation";
import styles from "./PrimaryCoursePage.module.css";

interface PrimaryCoursePageProps {
  course: CourseNavigationItem;
}

export function PrimaryCoursePage({ course }: PrimaryCoursePageProps) {
  const { t } = useTranslation("common");

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>{t("courseNavigation.primary")}</p>
      <h1 className={styles.title}>{t(course.labelKey)}</h1>
      <div className={styles.notice}>
        <span className={styles.badge}>{t("courseNavigation.comingSoon")}</span>
        <p>{t("primaryCourse.comingSoon")}</p>
      </div>
      <Link className={styles.back} to="/">
        {t("primaryCourse.back")}
      </Link>
    </div>
  );
}
