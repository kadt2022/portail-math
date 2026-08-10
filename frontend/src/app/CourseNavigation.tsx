import { useEffect, useId, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PRIMARY_COURSES } from "./course-navigation";
import styles from "./CourseNavigation.module.css";

type OpenMenu = "primary" | "secondary" | null;

export function CourseNavigation() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const rootRef = useRef<HTMLElement>(null);
  const primaryButtonRef = useRef<HTMLButtonElement>(null);
  const secondaryButtonRef = useRef<HTMLButtonElement>(null);
  const firstPrimaryLinkRef = useRef<HTMLAnchorElement>(null);
  const primaryPanelId = useId();
  const secondaryPanelId = useId();

  const primaryActive = location.pathname.startsWith("/apprentissages/primaire/");

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }
      const trigger = openMenu === "primary" ? primaryButtonRef.current : secondaryButtonRef.current;
      setOpenMenu(null);
      trigger?.focus();
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMenu]);

  function toggleMenu(menu: Exclude<OpenMenu, null>) {
    setOpenMenu((current) => (current === menu ? null : menu));
  }

  function openPrimaryWithKeyboard(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowDown") {
      return;
    }
    event.preventDefault();
    setOpenMenu("primary");
    window.requestAnimationFrame(() => firstPrimaryLinkRef.current?.focus());
  }

  return (
    <nav ref={rootRef} className={styles.navigation} aria-label={t("courseNavigation.label")}>
      <div className={styles.track}>
        <div className={styles.item}>
          <button
            ref={primaryButtonRef}
            type="button"
            className={primaryActive ? `${styles.trigger} ${styles.active}` : styles.trigger}
            aria-expanded={openMenu === "primary"}
            aria-controls={primaryPanelId}
            aria-haspopup="true"
            aria-current={primaryActive ? "page" : undefined}
            onClick={() => toggleMenu("primary")}
            onKeyDown={openPrimaryWithKeyboard}
          >
            <span>{t("courseNavigation.primary")}</span>
            <span className={styles.chevron} aria-hidden="true" />
          </button>

          {openMenu === "primary" ? (
            <div
              id={primaryPanelId}
              className={`${styles.panel} ${styles.primaryPanel}`}
              role="group"
              aria-label={t("courseNavigation.primaryLevels")}
            >
              <p className={styles.panelTitle}>{t("courseNavigation.primaryLevels")}</p>
              <div className={styles.levelGrid}>
                {PRIMARY_COURSES.map((course, index) => {
                  const selected = location.pathname === course.route;
                  return (
                    <Link
                      ref={index === 0 ? firstPrimaryLinkRef : undefined}
                      key={course.id}
                      to={course.route}
                      className={
                        selected ? `${styles.courseLink} ${styles.courseLinkSelected}` : styles.courseLink
                      }
                      aria-current={selected ? "page" : undefined}
                      onClick={() => setOpenMenu(null)}
                    >
                      <span>{t(course.labelKey)}</span>
                      {selected ? (
                        <span className={styles.selectedIndicator} aria-hidden="true">
                          ✓
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.item}>
          <button
            ref={secondaryButtonRef}
            type="button"
            className={styles.trigger}
            aria-expanded={openMenu === "secondary"}
            aria-controls={secondaryPanelId}
            aria-haspopup="true"
            onClick={() => toggleMenu("secondary")}
          >
            <span>{t("courseNavigation.secondary")}</span>
            <span className={styles.chevron} aria-hidden="true" />
          </button>

          {openMenu === "secondary" ? (
            <div
              id={secondaryPanelId}
              className={`${styles.panel} ${styles.secondaryPanel}`}
              role="group"
              aria-label={t("courseNavigation.secondaryInformation")}
            >
              <p className={styles.unavailableMessage}>
                <span>{t("courseNavigation.secondary")}</span>
                <strong>{t("courseNavigation.comingSoon")}</strong>
              </p>
            </div>
          ) : null}
        </div>

        <NavLink
          to="/exetat"
          className={({ isActive }) =>
            isActive ? `${styles.directLink} ${styles.active}` : styles.directLink
          }
        >
          {t("courseNavigation.exetat")}
        </NavLink>

        <NavLink
          to="/progression"
          className={({ isActive }) =>
            isActive ? `${styles.directLink} ${styles.active}` : styles.directLink
          }
        >
          {t("courseNavigation.progress")}
        </NavLink>
      </div>
    </nav>
  );
}
