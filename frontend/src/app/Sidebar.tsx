import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { legacyPortalUrl, navigationLinks } from "./navigation";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  open: boolean;
  onNavigate: () => void;
  navId: string;
}

export function Sidebar({ open, onNavigate, navId }: SidebarProps) {
  const { t } = useTranslation("common");

  return (
    <div className={open ? `${styles.sidebarShell} ${styles.sidebarOpen}` : styles.sidebarShell}>
      <div className={styles.backdrop} />
      <aside id={navId} className={styles.sidebar}>
        <p className={styles.navLabel}>{t("navSectionLabel")}</p>
        <nav className={styles.nav} aria-label={t("mainNavigation")}>
          {navigationLinks.map((link, index) => (
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
          ))}
        </nav>
        <a className={styles.legacyLink} href={legacyPortalUrl}>
          {t("legacyPortal")}
        </a>
      </aside>
    </div>
  );
}
