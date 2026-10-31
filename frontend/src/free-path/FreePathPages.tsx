import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PortalIcon, type PortalIconName } from "../components/PortalIcon";
import styles from "./FreePathPages.module.css";

// Tests de raisonnement propres à Mbuyamba et EXETAT,
// qui conserve sa route existante. Sans route, un test s'affiche en « Contenu à venir » et n'est pas cliquable.
// Ajouter un test = une entrée ici + ses textes dans freePath.json.
const preparations: { id: string; route?: string; icon: PortalIconName; comingSoon: boolean; tone: string }[] = [
  { id: "trm", icon: "brain", comingSoon: true, tone: styles.toneTrm },
  { id: "qmt", icon: "calculator", comingSoon: true, tone: styles.toneQmt },
  { id: "mbd", icon: "bulb", comingSoon: true, tone: styles.toneMbd },
  { id: "exetat", route: "/exetat", icon: "cap", comingSoon: false, tone: styles.toneRdc },
];

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
        {preparations.map(({ id, route, icon, comingSoon, tone }) => (
          <article key={id} className={route ? `${styles.card} ${tone}` : `${styles.card} ${tone} ${styles.cardSoon}`}>
            <span className={styles.cardIcon} aria-hidden="true"><PortalIcon name={icon} /></span>
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
        <PortalIcon name="brain" />
        <div>
          <strong>{t("other.text")}</strong>
        </div>
      </aside>
    </div>
  );
}
