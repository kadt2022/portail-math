import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PortalIcon } from "../components/PortalIcon";
import styles from "./FreePathPages.module.css";

// EXETAT conserve sa route existante. GRE attend son premier contenu.
const preparations = [
  { id: "gre", route: "/parcours-libre/gre", comingSoon: true },
  { id: "exetat", route: "/exetat", comingSoon: false },
] as const;

export function FreePathPage() {
  const { t } = useTranslation("freePath");

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>{t("back")}</Link>
      <header className={styles.header}>
        <PortalIcon name="cap" />
        <h1>{t("title")}</h1>
        <p>{t("description")}</p>
      </header>
      <div className={styles.grid}>
        {preparations.map(({ id, route, comingSoon }) => (
          <article key={id} className={styles.card}>
            <PortalIcon name="file" />
            <h2>{t(`${id}.title`)}</h2>
            <p>{t(`${id}.description`)}</p>
            {comingSoon ? <span className={styles.status}>{t("comingSoon")}</span> : null}
            <Link
              to={route}
              className={styles.action}
              aria-label={`${t("discover")} : ${t(`${id}.title`)}`}
            >
              {t("discover")} →
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

export function GrePage() {
  const { t } = useTranslation("freePath");

  return (
    <div className={styles.page}>
      <Link to="/parcours-libre" className={styles.back}>{t("gre.back")}</Link>
      <header className={styles.header}>
        <PortalIcon name="file" />
        <h1>{t("gre.title")}</h1>
        <p>{t("gre.description")}</p>
      </header>
      <section className={styles.card} aria-labelledby="gre-availability">
        <h2 id="gre-availability">{t("comingSoon")}</h2>
        <p>{t("gre.empty")}</p>
      </section>
    </div>
  );
}
