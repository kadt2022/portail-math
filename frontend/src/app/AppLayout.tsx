import { useEffect, useId, useRef, useState } from "react";
import { Link, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useSyncDocumentLanguage } from "../i18n/useSyncDocumentLanguage";
import { CourseNavigation } from "./CourseNavigation";
import { Sidebar } from "./Sidebar";
import styles from "./AppLayout.module.css";

export function AppLayout() {
  const { t } = useTranslation("common");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const currentYear = new Date().getFullYear();

  useSyncDocumentLanguage();

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

  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#contenu">
        {t("skipToContent")}
      </a>

      <header className={styles.header}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true" />
          <span className={styles.brandText}>
            <span className={styles.brandName}>{t("appName")}</span>
            <span className={styles.brandTagline}>{t("tagline")}</span>
          </span>
        </Link>

        <CourseNavigation concealed={sidebarOpen} />

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
