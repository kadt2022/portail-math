import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PortalIcon } from "../components/PortalIcon";
import styles from "./FreePathPages.module.css";

// Seules les préparations de mathématiques figurent ici. Couleurs du logo = drapeau du pays de l'examen (États-Unis, RDC).
// EXETAT conserve sa route existante. GRE attend son premier contenu.
// Ajouter une préparation = une entrée ici + ses textes dans freePath.json.
// Sans route, la préparation s'affiche en « Contenu à venir » et n'est pas cliquable.
const preparations: { id: string; route?: string; comingSoon: boolean; tone: string }[] = [
  { id: "gre", route: "/parcours-libre/gre", comingSoon: true, tone: styles.toneUs },
  { id: "sat", comingSoon: true, tone: styles.toneUs },
  { id: "act", comingSoon: true, tone: styles.toneUs },
  { id: "exetat", route: "/exetat", comingSoon: false, tone: styles.toneRdc },
];

const greSections = ["resources", "exercises", "assessments"] as const;

export function FreePathPage() {
  const { t } = useTranslation("freePath");

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <h1>{t("title")}</h1>
          <p>{t("description")}</p>
        </div>
      </header>

      <div className={styles.grid}>
        {preparations.map(({ id, route, comingSoon, tone }) => (
          <article key={id} className={route ? `${styles.card} ${tone}` : `${styles.card} ${tone} ${styles.cardSoon}`}>
            <span className={styles.cardIcon} aria-hidden="true"><PortalIcon name="cap" /></span>
            <div className={styles.cardBody}>
              <h2>{t(`${id}.title`)}</h2>
              <p>{t(`${id}.description`)}</p>
              <span className={comingSoon ? styles.status : `${styles.status} ${styles.statusOn}`}>
                {comingSoon ? t("comingSoon") : t("available")}
              </span>
            </div>
            {route ? (
              <Link
                to={route}
                className={styles.action}
                aria-label={`${t("discover")} : ${t(`${id}.title`)}`}
              >
                <span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </article>
        ))}
      </div>

      <aside className={styles.other}>
        <PortalIcon name="cap" />
        <div>
          <strong>{t("other.title")}</strong>
          <p>{t("other.text")}</p>
        </div>
      </aside>
    </div>
  );
}

export function GrePage() {
  const { t } = useTranslation("freePath");

  return (
    <div className={styles.page}>
      <Link to="/parcours-libre" className={styles.back}>{t("gre.back")}</Link>
      <header className={`${styles.hero} ${styles.toneUs}`}>
        <div>
          <h1>{t("gre.title")}</h1>
          <p>{t("gre.description")}</p>
        </div>
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
