import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PortalIcon, type PortalIconName } from "../components/PortalIcon";
import styles from "./FreePathPages.module.css";

// Tests de raisonnement propres à Mbuyamba et préparation EXETAT, qui conserve sa route existante.
// Sans route, un test s'affiche en « Contenu à venir » et n'est pas cliquable.
// Ajouter un test = une entrée ici + ses textes dans freePath.json.
interface Preparation { id: string; route?: string; icon: PortalIconName; comingSoon: boolean; tone: string }

export const FREE_PATH_TESTS_ANCHOR = "tests-de-raisonnement";
export const FREE_PATH_EXAMS_ANCHOR = "preparations-examens";

const tests: Preparation[] = [
  { id: "trm", icon: "brain", comingSoon: true, tone: styles.toneTrm },
  { id: "qmt", icon: "calculator", comingSoon: true, tone: styles.toneQmt },
  { id: "mbd", icon: "bulb", comingSoon: true, tone: styles.toneMbd },
];
const exams: Preparation[] = [
  { id: "exetat", route: "/exetat", icon: "cap", comingSoon: false, tone: styles.toneRdc },
];

function PreparationCard({ id, route, icon, comingSoon, tone }: Preparation) {
  const { t } = useTranslation("freePath");

  return (
    <article className={route ? `${styles.card} ${tone}` : `${styles.card} ${tone} ${styles.cardSoon}`}>
      <span className={styles.cardIcon} aria-hidden="true"><PortalIcon name={icon} /></span>
      <div className={styles.cardBody}>
        <h3>{t(`${id}.title`)}</h3>
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
  );
}

export function FreePathPage() {
  const { t } = useTranslation("freePath");
  const { hash } = useLocation();

  // Les sous-menus du menu latéral pointent vers les sections de cette page.
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView?.();
  }, [hash]);

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <h1>{t("title")}</h1>
          <p>{t("description")}</p>
        </div>
      </header>

      <section id={FREE_PATH_TESTS_ANCHOR} className={styles.group} aria-labelledby="free-path-tests-title">
        <h2 id="free-path-tests-title" className={styles.groupTitle}>{t("groups.tests")}</h2>
        <div className={styles.grid}>
          {tests.map((test) => <PreparationCard key={test.id} {...test} />)}
        </div>

        <aside className={styles.other}>
          <PortalIcon name="brain" />
          <div>
            <strong>{t("other.text")}</strong>
          </div>
        </aside>
      </section>

      <section id={FREE_PATH_EXAMS_ANCHOR} className={styles.group} aria-labelledby="free-path-exams-title">
        <h2 id="free-path-exams-title" className={styles.groupTitle}>{t("groups.exams")}</h2>
        <div className={styles.grid}>
          {exams.map((exam) => <PreparationCard key={exam.id} {...exam} />)}
        </div>
      </section>
    </div>
  );
}
