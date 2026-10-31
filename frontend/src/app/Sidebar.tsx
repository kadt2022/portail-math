import { useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PortalIcon, type PortalIconName } from "../components/PortalIcon";

import { PRIMARY_COURSES } from "./course-navigation";
import { navigationLinks } from "./navigation";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  open: boolean;
  collapsed: boolean;
  onExpand: () => void;
  onNavigate: () => void;
  navId: string;
}

export function Sidebar({ open, collapsed, onExpand, onNavigate, navId }: SidebarProps) {
  const { t } = useTranslation("common");
  const location = useLocation();
  const primaryActive = location.pathname.startsWith("/apprentissages/primaire/");
  const [primaryOpen, setPrimaryOpen] = useState(primaryActive);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const navigate = useNavigate();
  const examsSelected = location.pathname.startsWith("/exetat") || location.pathname.startsWith("/parcours-libre/examens");
  const testsSelected = location.pathname.startsWith("/parcours-libre/tests");
  const freePathActive = location.pathname.startsWith("/parcours-libre") || examsSelected;
  const [freePathOpen, setFreePathOpen] = useState(freePathActive);
  const [previousPath, setPreviousPath] = useState(location.pathname);

  // Le layout reste monté pendant la navigation : ouvrir aussi le groupe
  // lorsqu’une nouvelle route primaire devient active, pas seulement au montage.
  if (previousPath !== location.pathname) {
    setPreviousPath(location.pathname);
    if (primaryActive) setPrimaryOpen(true);
    if (freePathActive) setFreePathOpen(true);
  }


  const [dashboardLink, ...remainingLinks] = navigationLinks;
    const resourceLinks = remainingLinks.filter((link) => ["/bibliotheque", "/jeux"].includes(link.to));
  const referenceLinks = remainingLinks.filter((link) => !["/parcours-libre", "/exetat", "/bibliotheque", "/jeux"].includes(link.to));

  const linkIcons: Record<string, PortalIconName> = { "/": "home", "/exetat": "file", "/bibliotheque": "library", "/jeux": "game", "/progression": "progress", "/a-propos": "info" };

  function renderPortalLink(link: (typeof navigationLinks)[number]) {
    return (
      <NavLink
        key={link.to}
        to={link.to}
        end={link.to === "/"}
        aria-label={t(link.labelKey)}
        title={collapsed ? t(link.labelKey) : undefined}
        className={({ isActive }) =>
          isActive ? `${styles.link} ${styles.linkActive}` : styles.link
        }
        onClick={onNavigate}
      >
        <span className={styles.num} aria-hidden="true">
          <PortalIcon name={linkIcons[link.to]} />
        </span>
        <span className={styles.linkText}>{t(link.labelKey)}</span>
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

      <aside id={navId} className={`${styles.sidebar}${collapsed ? ` ${styles.collapsed}` : ""}`}>
        <nav className={styles.nav} aria-label={t("mainNavigation")}>
          {renderPortalLink(dashboardLink)}

          <div className={styles.navSection} role="group" aria-label={t("navGroups.learning")}>
            <p className={styles.navSectionTitle} aria-hidden="true">{t("navGroups.learning")}</p>
            <div className={styles.courseGroup}>
              <button
                type="button"
                className={`${styles.link} ${styles.courseMenuButton}${primaryActive ? ` ${styles.linkActive}` : ""}`}
                aria-label={t("courseNavigation.primaryLevels")}
                aria-expanded={primaryOpen && !collapsed}
                title={collapsed ? t("courseNavigation.primary") : undefined}
                onClick={() => {
                  if (collapsed) {
                    onExpand();
                    setPrimaryOpen(true);
                  } else {
                    setPrimaryOpen((value) => !value);
                  }
                }}
              >
                <span className={styles.num} aria-hidden="true"><PortalIcon name="book" /></span>
                <span className={styles.linkText}>{t("courseNavigation.primary")}</span>
                <span className={styles.chevron} aria-hidden="true" />
              </button>

              {primaryOpen && !collapsed ? (
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
                          •
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
                aria-expanded={secondaryOpen && !collapsed}
                title={collapsed ? t("courseNavigation.secondary") : undefined}
                onClick={() => {
                  if (collapsed) {
                    onExpand();
                    setSecondaryOpen(true);
                  } else {
                    setSecondaryOpen((value) => !value);
                  }
                }}
              >
                <span className={styles.num} aria-hidden="true"><PortalIcon name="cap" /></span>
                <span className={styles.linkText}>{t("courseNavigation.secondary")}</span>
                <span className={styles.chevron} aria-hidden="true" />
              </button>

              {secondaryOpen && !collapsed ? (
                <div className={styles.secondaryNotice}>
                  <span>{t("courseNavigation.secondaryInformation")}</span>
                  <strong>{t("courseNavigation.comingSoon")}</strong>
                </div>
              ) : null}
            </div>

            <div className={styles.courseGroup}>
              <button
                type="button"
                className={`${styles.link} ${styles.courseMenuButton}${freePathActive ? ` ${styles.linkActive}` : ""}`}
                aria-label={t("freePathMenu.sections")}
                aria-expanded={freePathOpen && !collapsed}
                title={collapsed ? t("freePathMenu.label") : undefined}
                // Un clic amène à la page de choix ; un second clic depuis cette page replie le groupe.
                onClick={() => {
                  if (collapsed) onExpand();
                  if (collapsed || !freePathOpen || location.pathname !== "/parcours-libre") {
                    setFreePathOpen(true);
                    navigate("/parcours-libre");
                  } else {
                    setFreePathOpen(false);
                  }
                }}
              >
                <span className={styles.num} aria-hidden="true"><PortalIcon name="compass" /></span>
                <span className={styles.linkText}>{t("freePathMenu.label")}</span>
                <span className={styles.chevron} aria-hidden="true" />
              </button>

              {freePathOpen && !collapsed ? (
                <div className={styles.coursePanel}>
                  {[
                    { id: "tests", to: "/parcours-libre/tests", selected: testsSelected, label: t("freePathMenu.tests") },
                    { id: "exams", to: "/parcours-libre/examens", selected: examsSelected, label: t("freePathMenu.exams") },
                  ].map(({ id, to, selected, label }) => (
                    <Link
                      key={id}
                      to={to}
                      className={selected ? `${styles.levelLink} ${styles.levelLinkActive}` : styles.levelLink}
                      aria-current={selected ? "page" : undefined}
                      onClick={onNavigate}
                    >
                      <span className={styles.levelBullet} aria-hidden="true">•</span>
                      <span className={styles.levelText}><span>{label}</span></span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className={styles.navSection} role="group" aria-label={t("navGroups.resources")}>
            <p className={styles.navSectionTitle} aria-hidden="true">{t("navGroups.resources")}</p>
            {resourceLinks.map((link) => renderPortalLink(link))}
          </div>

          <div className={styles.navSection} role="group" aria-label={t("navGroups.reference")}>
            <p className={styles.navSectionTitle} aria-hidden="true">{t("navGroups.reference")}</p>
            {referenceLinks.map((link) => renderPortalLink(link))}
          </div>
        </nav>
      </aside>
    </div>
  );
}
