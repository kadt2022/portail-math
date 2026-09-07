import { useEffect, useId, useRef, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useSyncDocumentLanguage } from "../i18n/useSyncDocumentLanguage";
import { CourseNavigation } from "./CourseNavigation";
import { Sidebar } from "./Sidebar";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const isLibraryReader = /^\/bibliotheque\/[^/]+$/.test(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navId = useId();
  const shellRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const currentYear = new Date().getFullYear();

  useSyncDocumentLanguage();

  // isLibraryReader en dépendance : sur une route de lecteur, aucun en-tête
  // n'est rendu et l'effet ressort sans rien mesurer. En revenant vers la
  // bibliothèque, l'en-tête réapparaît et l'effet doit se rejouer, sinon
  // --pm-header-height reste absent et le repli mobile (156px) décale la mise
  // en page.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const updateHeight = () => {
      shellRef.current?.style.setProperty("--pm-header-height", `${header.getBoundingClientRect().height}px`);
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, [isLibraryReader]);

  // La sidebar mobile se referme avec Échap et rend le focus au bouton qui
  // l'a ouverte : sans ça, un utilisateur au clavier perdrait sa position.
  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        menuButtonRef.current?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  // La page derrière la sidebar ne doit pas défiler pendant qu'elle est ouverte.
  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  if (isLibraryReader) {
    return (
      <div ref={shellRef} className={`${styles.shell} ${styles.readerShell}`}>
        <a className={styles.skipLink} href="#contenu">{t("skipToContent")}</a>
        <main id="contenu" className={styles.readerMain}><Outlet /></main>
      </div>
    );
  }

  return (
    <div ref={shellRef} className={styles.shell}>
      <a className={styles.skipLink} href="#contenu">
        {t("skipToContent")}
      </a>

      <header ref={headerRef} className={styles.header}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          <span className={styles.brandText}>
            <span className={styles.brandName}>{t("appName")}</span>
            <span className={styles.brandTagline}>{t("tagline")}</span>
          </span>
        </Link>

        <CourseNavigation />

        <LanguageSwitcher />

        <button
          ref={menuButtonRef}
          type="button"
          className={styles.menuButton}
          aria-expanded={sidebarOpen}
          aria-controls={navId}
          aria-label={sidebarOpen ? t("closeMenu") : t("openMenu")}
          onClick={() => setSidebarOpen((open) => !open)}
        >
          <span />
        </button>
      </header>

      <Sidebar open={sidebarOpen} onNavigate={() => setSidebarOpen(false)} navId={navId} />

      <div className={styles.body}>
        <main id="contenu" className={styles.main}>
          <Outlet />
        </main>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <strong>{t("appName")}</strong>
            <span>{t("tagline")}</span>
          </div>

          <div className={styles.footerMeta}>
            <Link to="/a-propos" className={styles.footerLink}>
              {t("nav.about")}
            </Link>
            <span className={styles.footerDot} aria-hidden="true">·</span>
            <span>© {currentYear} {t("appName")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
