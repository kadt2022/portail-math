import { useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PRIMARY_COURSES } from "./course-navigation";
import { navigationLinks } from "./navigation";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
  navId: string;
}

function CourseIcon({ kind }: { kind: "primary" | "secondary" }) {
  if (kind === "primary") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5z" />
        <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5A2.5 2.5 0 0 1 20 21.5z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m3 9 9-5 9 5-9 5z" />
      <path d="M7 12.5V17c3 2 7 2 10 0v-4.5" />
      <path d="M21 9v6" />
    </svg>
  );
}

export function Sidebar({ open, onNavigate, navId }: SidebarProps) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const [primaryOpen, setPrimaryOpen] = useState(() =>
    location.pathname.startsWith("/apprentissages/primaire/"),
  );
  const [secondaryOpen, setSecondaryOpen] = useState(false);

  const [dashboardLink, ...remainingLinks] = navigationLinks;

  function renderPortalLink(link: (typeof navigationLinks)[number], index: number) {
    return (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.to === "/"}
        className={({ isActive }) =>
          isActive ? `${styles.link} ${styles.linkActive}` : styles.link
        }
        onClick={onNavigate}
      >
        <span className={styles.num} aria-hidden="true">
          {String(index + 1).padStart(2, "0")}
        </span>
        {t(link.labelKey)}
      </NavLink>
    );
  }

  return (
    <div className={open ? `${styles.sidebarShell} ${styles.sidebarOpen}` : styles.sidebarShell}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label={t("closeMenu")}
        onClick={onNavigate}
      />
      <aside id={navId} className={styles.sidebar}>
        <p className={styles.navLabel}>{t("navSectionLabel")}</p>
        <nav className={styles.nav} aria-label={t("mainNavigation")}>
          {renderPortalLink(dashboardLink, 0)}

          <section className={styles.mobileCourses} aria-label={t("courseNavigation.label")}>
            <p className={styles.mobileSectionLabel}>{t("courseNavigation.mobileSectionLabel")}</p>

            <div className={styles.courseGroup}>
              <button
                type="button"
                className={styles.courseTrigger}
                aria-expanded={primaryOpen}
                onClick={() => setPrimaryOpen((value) => !value)}
              >
                <span className={`${styles.courseIcon} ${styles.primaryIcon}`}>
                  <CourseIcon kind="primary" />
                </span>
                <span className={styles.courseTriggerText}>{t("courseNavigation.primary")}</span>
                <span className={styles.courseChevron} aria-hidden="true" />
              </button>

              {primaryOpen ? (
                <div className={styles.coursePanel}>
                  {PRIMARY_COURSES.map((course) => {
                    const selected = location.pathname === course.route;
                    return (
                      <Link
                        key={course.id}
                        to={course.route}
                        className={
                          selected
                            ? `${styles.levelLink} ${styles.levelLinkActive}`
                            : styles.levelLink
                        }
                        aria-current={selected ? "page" : undefined}
                        onClick={onNavigate}
                      >
                        <span className={styles.levelDot} aria-hidden="true">
                          {course.level}
                        </span>
                        <span className={styles.levelText}>
                          <span>{t(course.labelKey)}</span>
                          {course.availability === "coming-soon" ? (
                            <small>{t("courseNavigation.comingSoon")}</small>
                          ) : null}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className={styles.courseGroup}>
              <button
                type="button"
                className={styles.courseTrigger}
                aria-expanded={secondaryOpen}
                onClick={() => setSecondaryOpen((value) => !value)}
              >
                <span className={`${styles.courseIcon} ${styles.secondaryIcon}`}>
                  <CourseIcon kind="secondary" />
                </span>
                <span className={styles.courseTriggerText}>{t("courseNavigation.secondary")}</span>
                <span className={styles.courseChevron} aria-hidden="true" />
              </button>

              {secondaryOpen ? (
                <div className={styles.secondaryNotice}>
                  <span>{t("courseNavigation.secondaryInformation")}</span>
                  <strong>{t("courseNavigation.comingSoon")}</strong>
                </div>
              ) : null}
            </div>
          </section>

          {remainingLinks.map((link, index) => renderPortalLink(link, index + 1))}
        </nav>
      </aside>
    </div>
  );
}
