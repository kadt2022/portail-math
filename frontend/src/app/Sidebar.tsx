import { type ReactNode, useState } from "react";
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

type SidebarIconName =
  | "dashboard"
  | "primary"
  | "secondary"
  | "exetat"
  | "library"
  | "games"
  | "progress"
  | "about";

const portalIcons: Record<string, SidebarIconName> = {
  "/": "dashboard",
  "/exetat": "exetat",
  "/bibliotheque": "library",
  "/jeux": "games",
  "/progression": "progress",
  "/a-propos": "about",
};

function SidebarIcon({ name }: { name: SidebarIconName }) {
  let content: ReactNode;

  switch (name) {
    case "dashboard":
      content = (
        <>
          <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.3" />
          <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.3" />
          <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.3" />
          <rect x="14" y="14" width="6.5" height="6.5" rx="1.3" />
        </>
      );
      break;
    case "primary":
      content = (
        <>
          <path d="M4 5.5c2.8-1.2 5.3-.9 8 1v12c-2.7-1.9-5.2-2.2-8-1V5.5Z" />
          <path d="M20 5.5c-2.8-1.2-5.3-.9-8 1v12c2.7-1.9 5.2-2.2 8-1V5.5Z" />
        </>
      );
      break;
    case "secondary":
      content = (
        <>
          <path d="m3 9 9-4 9 4-9 4-9-4Z" />
          <path d="M7 11.2v4.4c3.2 2 6.8 2 10 0v-4.4" />
          <path d="M21 9v6" />
        </>
      );
      break;
    case "exetat":
      content = (
        <>
          <rect x="5" y="4.5" width="14" height="16" rx="2" />
          <path d="M9 4.5V3h6v1.5" />
          <path d="m8.5 12 2 2 5-5" />
        </>
      );
      break;
    case "library":
      content = (
        <path d="M7 3.5h10a1.5 1.5 0 0 1 1.5 1.5v16L12 17l-6.5 4V5A1.5 1.5 0 0 1 7 3.5Z" />
      );
      break;
    case "games":
      content = (
        <path d="M8.5 4.5a3 3 0 0 1 3 3v1h1v-1a3 3 0 1 1 3 3h-1v3h1a3 3 0 1 1-3 3v-1h-3v1a3 3 0 1 1-3-3h1v-3h-1a3 3 0 1 1 2-5.3" />
      );
      break;
    case "progress":
      content = (
        <>
          <path d="M4 19.5h16" />
          <path d="m5 15 4-4 3 2 5-6 2 2" />
          <path d="M17 7h2v2" />
        </>
      );
      break;
    case "about":
      content = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10.5v6" />
          <path d="M12 7.5h.01" />
        </>
      );
      break;
  }

  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {content}
    </svg>
  );
}

export function Sidebar({ open, onNavigate, navId }: SidebarProps) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const primaryActive = location.pathname.startsWith("/apprentissages/primaire/");
  const [primaryOpen, setPrimaryOpen] = useState(primaryActive);
  const [secondaryOpen, setSecondaryOpen] = useState(false);

  const [dashboardLink, ...remainingLinks] = navigationLinks;
  const availablePrimaryCourses = PRIMARY_COURSES.filter(
    (course) => course.availability === "available",
  ).length;

  function renderPortalLink(link: (typeof navigationLinks)[number]) {
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
        <span className={styles.iconWrap} aria-hidden="true">
          <SidebarIcon name={portalIcons[link.to]} />
        </span>
        <span className={styles.linkLabel}>{t(link.labelKey)}</span>
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
        <nav className={styles.nav} aria-label={t("mainNavigation")}>
          {renderPortalLink(dashboardLink)}

          <div className={styles.courseGroup}>
            <button
              type="button"
              className={`${styles.link} ${styles.courseMenuButton}${primaryActive ? ` ${styles.linkActive}` : ""}`}
              aria-label={t("courseNavigation.primaryLevels")}
              aria-expanded={primaryOpen}
              onClick={() => setPrimaryOpen((value) => !value)}
            >
              <span className={styles.iconWrap} aria-hidden="true">
                <SidebarIcon name="primary" />
              </span>
              <span className={styles.linkText}>
                <span>{t("courseNavigation.primary")}</span>
                <small className={styles.primarySummary}>
                  {t("sidebar.primaryProgress", {
                    completed: availablePrimaryCourses,
                    total: PRIMARY_COURSES.length,
                  })}
                </small>
              </span>
              <span className={styles.courseActions} aria-hidden="true">
                <span className={styles.chevron} />
              </span>
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
                      <span className={styles.levelBullet} aria-hidden="true">
                        ○
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
              className={`${styles.link} ${styles.courseMenuButton}`}
              aria-label={t("courseNavigation.secondaryInformation")}
              aria-expanded={secondaryOpen}
              onClick={() => setSecondaryOpen((value) => !value)}
            >
              <span className={`${styles.iconWrap} ${styles.secondaryIcon}`} aria-hidden="true">
                <SidebarIcon name="secondary" />
              </span>
              <span className={styles.linkLabel}>{t("courseNavigation.secondary")}</span>
              <span className={styles.courseActions} aria-hidden="true">
                <span className={styles.comingSoonBadge}>{t("sidebar.comingSoon")}</span>
                <span className={styles.chevron} />
              </span>
            </button>

            {secondaryOpen ? (
              <div className={styles.secondaryNotice}>
                <span>{t("courseNavigation.secondaryInformation")}</span>
                <strong>{t("courseNavigation.comingSoon")}</strong>
              </div>
            ) : null}
          </div>

          {remainingLinks.map((link) => renderPortalLink(link))}
        </nav>
      </aside>
    </div>
  );
}
