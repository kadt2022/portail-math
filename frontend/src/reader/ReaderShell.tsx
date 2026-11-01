import { useEffect, useId, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useSyncDocumentLanguage } from "../i18n/useSyncDocumentLanguage";
import { ModuleNavigation } from "./ModuleNavigation";
import { ModuleSidebar } from "./ModuleSidebar";
import type { ReaderCourse } from "./reader-model";
import { ReaderSearch } from "./ReaderSearch";
import { useReaderProgress } from "./useReaderProgress";
import styles from "./CourseReader.module.css";

type ReaderTheme = "light" | "dark";

function isTypingTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.matches("input, textarea, select") || target.isContentEditable);
}

// Coque du lecteur : barre supérieure, menu des modules et zone de lecture. Les pages de cours,
// de module et de leçon existantes s'affichent dans la zone de lecture (<Outlet />), elles ne sont pas
// recopiées. Le thème n'est pas mémorisé : il revient au clair au rechargement, rien n'est écrit.
export function ReaderShell({ course }: { course: ReaderCourse }) {
  const { t } = useTranslation("reader");
  const { t: tc } = useTranslation(course.namespace);
  const { t: common } = useTranslation("common");
  const { pathname } = useLocation();
  const navId = useId();
  const progress = useReaderProgress(course, pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [theme, setTheme] = useState<ReaderTheme>("light");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);

  useSyncDocumentLanguage();

  // Échap referme le menu mobile et rend le focus à son bouton.
  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // La page derrière le menu mobile ne défile pas pendant qu'il est ouvert.
  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  // Si la fenêtre s'élargit, le menu est toujours affiché : on oublie l'état « tiroir ouvert ».
  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 980) {
        setMenuOpen(false);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Raccourcis de recherche : « / » (hors champ de saisie) et Ctrl/Cmd + K.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const slash = event.key === "/" && !isTypingTarget(event.target);
      const palette = event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey);
      if (slash || palette) {
        event.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className={styles.reader} data-theme={theme}>
      <a className={styles.skipLink} href="#contenu">{t("skipToContent")}</a>

      <header className={styles.topbar}>
        <button
          ref={menuButtonRef}
          type="button"
          className={`${styles.control} ${styles.menuButton}`}
          aria-expanded={menuOpen}
          aria-controls={navId}
          aria-label={menuOpen ? t("menu.close") : t("menu.open")}
          onClick={() => setMenuOpen((open) => !open)}
        >
          ☰
        </button>

        <Link to="/" className={styles.brand} aria-label={`${common("appName")} — ${t("backToPortal")}`} title={t("backToPortal")}>
          <span className={styles.brandMark} aria-hidden="true" />
          <span className={styles.brandText}>
            {common("appName")}
            <small>{common("tagline")}</small>
          </span>
        </Link>

        <div className={styles.topProgress}>
          <p className={styles.topTitle}>{tc("course.title")}</p>
          {progress ? (
            <>
              <div className={styles.progressLabel}>
                <span>{t("progress.label")}</span>
                <span>
                  {t("progress.summary", { completed: progress.completedLessons, total: progress.totalLessons })}
                </span>
              </div>
              <div
                className={styles.progressTrack}
                role="progressbar"
                aria-label={t("progress.aria")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.percentage}
              >
                <span className={styles.progressFill} style={{ width: `${progress.percentage}%` }} />
              </div>
            </>
          ) : null}
        </div>

        <div className={styles.topActions}>
          <button
            ref={searchButtonRef}
            type="button"
            className={`${styles.control} ${styles.searchButton}`}
            aria-label={t("search.aria")}
            aria-haspopup="dialog"
            onClick={() => setSearchOpen(true)}
          >
            {t("search.button")} <kbd className={styles.kbd}>/</kbd>
          </button>
          <button
            type="button"
            className={`${styles.control} ${styles.iconButton}`}
            aria-pressed={theme === "dark"}
            aria-label={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
            title={theme === "dark" ? t("theme.toLight") : t("theme.toDark")}
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          >
            ◐
          </button>
          <LanguageSwitcher />
        </div>
      </header>

      {menuOpen ? (
        <button type="button" className={`${styles.backdrop} ${styles.backdropOpen}`} aria-label={t("menu.close")} onClick={() => setMenuOpen(false)} />
      ) : null}

      <ModuleSidebar course={course} pathname={pathname} open={menuOpen} navId={navId} onNavigate={() => setMenuOpen(false)} />

      <main id="contenu" className={styles.layout}>
        <div className={styles.content}>
          <div className={styles.stage}>
            <Outlet />
          </div>
          <ModuleNavigation course={course} pathname={pathname} />
        </div>
      </main>

      {searchOpen ? (
        <ReaderSearch
          course={course}
          onDismiss={() => {
            setSearchOpen(false);
            searchButtonRef.current?.focus();
          }}
          onSelect={() => setSearchOpen(false)}
        />
      ) : null}
    </div>
  );
}
