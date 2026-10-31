import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { PortalIcon, type PortalIconName } from "../components/PortalIcon";
import styles from "./FreePathPages.module.css";

// Deux familles distinctes : les tests de raisonnement propres à Mbuyamba, et les préparations aux
// examens officiels (EXETAT, qui conserve sa route existante). Sans route, un test s'affiche en
// « Contenu à venir » et n'est pas cliquable. Ajouter un test = une entrée ici + ses textes dans freePath.json.
interface Preparation { id: string; route?: string; icon: PortalIconName; comingSoon: boolean; tone: string }

const tests: Preparation[] = [
  { id: "trm", icon: "brain", comingSoon: true, tone: styles.toneTrm },
  { id: "qmt", icon: "calculator", comingSoon: true, tone: styles.toneQmt },
  { id: "mbd", icon: "bulb", comingSoon: true, tone: styles.toneMbd },
];
const exams: Preparation[] = [
  { id: "exetat", route: "/exetat", icon: "cap", comingSoon: false, tone: styles.toneRdc },
];

function Hero({ title, description }: { title: string; description: string }) {
  return (
    <header className={styles.hero}>
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </header>
  );
}

function PreparationCard({ id, route, icon, comingSoon, tone }: Preparation) {
  const { t } = useTranslation("freePath");

  return (
    <article className={route ? `${styles.card} ${tone}` : `${styles.card} ${tone} ${styles.cardSoon}`}>
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
  );
}

// Page de choix : l'élève décide entre les tests Mbuyamba et les examens officiels.
export function FreePathPage() {
  const { t } = useTranslation("freePath");
  const choices = [
    { id: "tests", to: "/parcours-libre/tests", icon: "brain" as const, tone: styles.toneTrm },
    { id: "exams", to: "/parcours-libre/examens", icon: "cap" as const, tone: styles.toneExams },
  ];

  return (
    <div className={styles.page}>
      <Hero title={t("title")} description={t("description")} />
      <div className={styles.grid}>
        {choices.map(({ id, to, icon, tone }) => (
          <article key={id} className={`${styles.card} ${tone}`}>
            <span className={styles.cardIcon} aria-hidden="true"><PortalIcon name={icon} /></span>
            <div className={styles.cardBody}>
              <h2>{t(`choose.${id}.title`)}</h2>
              <p>{t(`choose.${id}.description`)}</p>
            </div>
            <Link to={to} className={styles.action} aria-label={`${t("choose.open")} : ${t(`choose.${id}.title`)}`}>
              <span aria-hidden="true">→</span>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

export function FreePathTestsPage() {
  const { t } = useTranslation("freePath");

  return (
    <div className={styles.page}>
      <Hero title={t("testsPage.title")} description={t("testsPage.description")} />
      <div className={styles.grid}>
        {tests.map((test) => <PreparationCard key={test.id} {...test} />)}
      </div>
      <aside className={styles.other}>
        <PortalIcon name="brain" />
        <div><strong>{t("other.text")}</strong></div>
      </aside>
    </div>
  );
}

export function FreePathExamsPage() {
  const { t } = useTranslation("freePath");

  return (
    <div className={styles.page}>
      <Hero title={t("examsPage.title")} description={t("examsPage.description")} />
      <div className={styles.grid}>
        {exams.map((exam) => <PreparationCard key={exam.id} {...exam} />)}
      </div>
    </div>
  );
}
