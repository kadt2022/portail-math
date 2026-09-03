import { useTranslation } from "react-i18next";

import styles from "./ProgressSummary.module.css";

type IconName = "book" | "target" | "star" | "close" | "trophy";

const STAT_ITEMS: Array<{
  key: string;
  icon: IconName;
  tone: "green" | "purple" | "gold" | "pink";
}> = [
  { key: "progress.gamesStarted", icon: "book", tone: "green" },
  { key: "progress.challengesCompleted", icon: "target", tone: "purple" },
  { key: "progress.firstTrySuccesses", icon: "star", tone: "gold" },
  { key: "progress.correctedErrors", icon: "close", tone: "pink" },
];

function StatIcon({ name }: { name: IconName }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "book") {
    return (
      <svg {...common}>
        <path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H19v17H7.5A2.5 2.5 0 0 0 5 21.5z" />
        <path d="M5 4.5v17" />
        <path d="M9 7h6" />
      </svg>
    );
  }

  if (name === "target") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <path d="m14.8 9.2 4.3-4.3" />
        <path d="M15.5 4.9h3.6v3.6" />
      </svg>
    );
  }

  if (name === "star") {
    return (
      <svg {...common}>
        <path d="m12 2.8 2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2-4.6-4.4 6.3-.9z" />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="m9 9 6 6" />
        <path d="m15 9-6 6" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M8 4h8v4a4 4 0 0 1-8 0z" />
      <path d="M9 18h6" />
      <path d="M10 14h4v4h-4z" />
      <path d="M8 6H5v1a4 4 0 0 0 4 4" />
      <path d="M16 6h3v1a4 4 0 0 1-4 4" />
    </svg>
  );
}

export function ProgressSummary() {
  const { t } = useTranslation("dashboard");

  return (
    <section className={styles.section} aria-labelledby="progression-titre">
      <div className={styles.headingRow}>
        <div>
          <p className={styles.kicker}>{t("progress.kicker")}</p>
          <h2 id="progression-titre" className={styles.heading}>
            {t("progress.heading")}
          </h2>
        </div>
        <p className={styles.empty}>{t("progress.empty")}</p>
      </div>
      <div className={styles.grid}>
        {STAT_ITEMS.map((item) => (
          <article className={`${styles.tile} ${styles[item.tone]}`} key={item.key}>
            <div className={styles.iconBadge}>
              <StatIcon name={item.icon} />
            </div>
            <div className={styles.statBody}>
              <p className={styles.label}>{t(item.key)}</p>
              <div className={styles.track} aria-hidden="true" />
            </div>
          </article>
        ))}

        <article className={`${styles.tile} ${styles.levelTile}`}>
          <div className={styles.iconBadge}>
            <StatIcon name="trophy" />
          </div>
          <div className={styles.statBody}>
            <p className={styles.levelLabel}>{t("progress.currentLevel")}</p>
            <div className={styles.levelTrack} aria-hidden="true" />
          </div>
        </article>
      </div>
    </section>
  );
}
