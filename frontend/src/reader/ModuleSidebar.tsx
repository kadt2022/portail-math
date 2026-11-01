import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { getActiveStopIndex, type ReaderCourse } from "./reader-model";
import styles from "./CourseReader.module.css";

interface ModuleSidebarProps {
  course: ReaderCourse;
  pathname: string;
  open: boolean;
  navId: string;
  onNavigate: () => void;
}

const pad = (value: number) => String(value).padStart(2, "0");

// Menu vertical : « Bien démarrer », puis un lien par module du parcours. Les leçons du module
// affiché apparaissent en dessous (Parcours → Modules → Leçons). Rien n'est codé en dur : la liste
// vient entièrement du parcours sélectionné.
export function ModuleSidebar({ course, pathname, open, navId, onNavigate }: ModuleSidebarProps) {
  const { t } = useTranslation("reader");
  const { t: tc } = useTranslation(course.namespace);
  const activeIndex = getActiveStopIndex(course, pathname);

  return (
    <aside id={navId} className={open ? `${styles.sidebar} ${styles.sidebarOpen}` : styles.sidebar}>
      <p className={styles.navLabel}>{t("nav.heading")}</p>
      <nav aria-label={t("nav.label")}>
        <ul className={styles.nav}>
          <li>
            <Link
              to={course.basePath}
              className={activeIndex === 0 ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink}
              aria-current={activeIndex === 0 ? "page" : undefined}
              onClick={onNavigate}
            >
              <span className={styles.navNum} aria-hidden="true">00</span>
              <span>{t("nav.start")}</span>
            </Link>
          </li>

          {course.modules.map((module, index) => {
            const active = activeIndex === index + 1;
            const onModulePage = pathname === module.path;
            return (
              <li key={module.id}>
                <Link
                  to={module.path}
                  className={active ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink}
                  aria-current={onModulePage ? "page" : active ? "true" : undefined}
                  onClick={onNavigate}
                >
                  <span className={styles.navNum} aria-hidden="true">{pad(module.number)}</span>
                  <span>{tc(module.titleKey)}</span>
                  {module.published ? null : <span className={styles.navTag}>{t("nav.comingSoon")}</span>}
                </Link>

                {active && module.items.some((item) => item.published) ? (
                  <ul className={styles.subNav} aria-label={t("nav.lessonsOf", { number: module.number })}>
                    {module.items
                      .filter((item) => item.published)
                      .map((item) => {
                        const current = pathname === item.path;
                        return (
                          <li key={item.id}>
                            <Link
                              to={item.path}
                              className={current ? `${styles.subLink} ${styles.subLinkActive}` : styles.subLink}
                              aria-current={current ? "page" : undefined}
                              onClick={onNavigate}
                            >
                              {tc(item.titleKey, item.titleValues)}
                            </Link>
                          </li>
                        );
                      })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
