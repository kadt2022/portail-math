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

export function Sidebar({ open, onNavigate, navId }: SidebarProps) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const primaryActive = location.pathname.startsWith("/apprentissages/primaire/");
  const [primaryOpen, setPrimaryOpen] = useState(primaryActive);
  const [secondaryOpen, setSecondaryOpen] = useState(false);

  const [dashboardLink, ...remainingLinks] = navigationLinks;

  function renderPortalLink(link: (typeof navigationLinks)[number], number: number) {
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
          {String(number).padStart(2, "0")}
        </span>
        <span>{t(link.labelKey)}</span>
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
          {renderPortalLink(dashboardLink, 1)}

          <div className={styles.courseGroup}>
            <button
              type="button"
              className={`${styles.link} ${styles.courseMenuButton}${primaryActive ? ` ${styles.linkActive}` : ""}`}
              aria-expanded={primaryOpen}
              onClick={() => setPrimaryOpen((value) => !value)}
            >
              <span className={styles.num} aria-hidden="true">02</span>
              <span>{t("courseNavigation.primary")}</span>
              <span className={styles.chevron} aria-hidden="true" />
            </button>

            {primaryOpen ? (
              <div className={styles.coursePanel}>
                {PRIMARY_COURSES.map((course) => {
                  const selected = location.pathname === course.route;
                  return (
                    <Link
                      key={course.id}
                      to={course.route}
                      className={selected ? `${styles.levelLink} ${styles.levelLinkActive}` : styles.levelLink}
                      aria-current={selected ? "page" : undefined}
                      onClick={onNavigate}
                    >
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
              className={`${styles.link} ${styles.courseMenuButton}`}
              aria-expanded={secondaryOpen}
              onClick={() => setSecondaryOpen((value) => !value)}
            >
              <span className={styles.num} aria-hidden="true">03</span>
              <span>{t("courseNavigation.secondary")}</span>
              <span className={styles.chevron} aria-hidden="true" />
            </button>

            {secondaryOpen ? (
              <div className={styles.secondaryNotice}>
                <span>{t("courseNavigation.secondaryInformation")}</span>
                <strong>{t("courseNavigation.comingSoon")}</strong>
              </div>
            ) : null}
          </div>

          {remainingLinks.map((link, index) => renderPortalLink(link, index + 4))}
        </nav>
      </aside>
    </div>
  );
}
