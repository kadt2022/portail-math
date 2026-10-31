import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PortalIcon } from "../components/PortalIcon";
import styles from "./FreePathPages.module.css";

// EXETAT conserve sa route existante. GRE attend son premier contenu.
// Ajouter une préparation = une entrée ici + ses textes dans freePath.json.
const preparations = [
  { id: "gre", route: "/parcours-libre/gre", comingSoon: true, tone: styles.toneGre },
  { id: "exetat", route: "/exetat", comingSoon: false, tone: styles.toneExetat },
] as const;

const highlights = ["pace", "content", "noAccount"] as const;
const greSections = ["resources", "exercises", "assessments"] as const;

export function FreePathPage() {
  const { t } = useTranslation("freePath");

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>{t("back")}</Link>
      <header className={styles.hero}>
        <span className={styles.heroGlow} aria-hidden="true" />
        <p className={styles.eyebrow}>{t("eyebrow")}</p>
        <h1>{t("title")}</h1>
        <p className={styles.heroText}>{t("description")}</p>
        <ul className={styles.highlights}>
          {highlights.map((key) => (
            <li key={key}><PortalIcon name="progress" />{t(`highlights.${key}`)}</li>
          ))}
        </ul>
      </header>
      <div className={styles.grid}>
        {preparations.map(({ id, route, comingSoon, tone }) => (
          <article key={id} className={`${styles.card} ${tone}`}>
            <div className={styles.cardTop}>
              <span className={styles.sigil} aria-hidden="true">{t(`${id}.sigil`)}</span>
              <span className={comingSoon ? styles.status : `${styles.status} ${styles.statusOn}`}>
                {comingSoon ? t("comingSoon") : t("available")}
              </span>
            </div>
            <h2>{t(`${id}.title`)}</h2>
            <p>{t(`${id}.description`)}</p>
            <Link
              to={route}
              className={styles.action}
              aria-label={`${t("discover")} : ${t(`${id}.title`)}`}
            >
              {t("discover")} <span aria-hidden="true">→</span>
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
      <header className={`${styles.hero} ${styles.toneGre}`}>
        <span className={styles.heroGlow} aria-hidden="true" />
        <p className={styles.eyebrow}>{t("gre.sigil")}</p>
        <h1>{t("gre.title")}</h1>
        <p className={styles.heroText}>{t("gre.description")}</p>
      </header>
      <section className={styles.empty} aria-labelledby="gre-availability">
        <h2 id="gre-availability">{t("comingSoon")}</h2>
        <p>{t("gre.empty")}</p>
        <ul className={styles.soonGrid}>
          {greSections.map((key) => (
            <li key={key}>
              <PortalIcon name={key === "resources" ? "library" : key === "exercises" ? "game" : "file"} />
              <strong>{t(`gre.sections.${key}`)}</strong>
              <span>{t("soon")}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
