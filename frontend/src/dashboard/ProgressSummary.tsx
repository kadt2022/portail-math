import { useTranslation } from "react-i18next";

import styles from "./ProgressSummary.module.css";

type IconName = "gamepad" | "target" | "retry" | "trophy";

const STAT_ITEMS: Array<{
  key: string;
  icon: IconName;
  tone: "green" | "purple" | "pink";
}> = [
  { key: "progress.gamesStarted", icon: "gamepad", tone: "green" },
  { key: "progress.challengesCompleted", icon: "target", tone: "purple" },
  { key: "progress.correctedErrors", icon: "retry", tone: "pink" },
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

  if (name === "gamepad") {
    return (
      <svg {...common}>
        <path d="M8 8h8a5 5 0 0 1 4.8 6.5l-1 3a2.4 2.4 0 0 1-4.1 1l-1.4-1.6H9.7l-1.4 1.6a2.4 2.4 0 0 1-4.1-1l-1-3A5 5 0 0 1 8 8Z" />
        <path d="M7 12v4" />
        <path d="M5 14h4" />
        <circle cx="16.5" cy="13" r="0.8" fill="currentColor" stroke="none" />
        <circle cx="18.5" cy="15" r="0.8" fill="currentColor" stroke="none" />
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

  if (name === "retry") {
    return (
      <svg {...common}>
        <path d="M20 7v5h-5" />
        <path d="M4.8 9a7.5 7.5 0 0 1 12.3-2.5L20 9" />
        <path d="M4 17v-5h5" />
        <path d="M19.2 15a7.5 7.5 0 0 1-12.3 2.5L4 15" />
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
      <h2 id="progression-titre" className={styles.heading}>
        {t("progress.heading")}
      </h2>
      <div className={styles.grid}>
        {STAT_ITEMS.map((item) => (
          <article className={`${styles.tile} ${styles[item.tone]}`} key={item.key}>
            <div className={styles.iconBadge}>
              <StatIcon name={item.icon} />
            </div>
            <div className={styles.statBody}>
              <p className={styles.label}>{t(item.key)}</p>
              <div className={styles.track} aria-hidden="true">
                <span className={styles.trackReady} />
              </div>
            </div>
          </article>
        ))}

        <article className={`${styles.tile} ${styles.levelTile}`}>
          <div className={styles.iconBadge}>
            <StatIcon name="trophy" />
          </div>
          <div className={styles.statBody}>
            <p className={styles.levelLabel}>{t("progress.currentLevel")}</p>
            <div className={styles.levelTrack} aria-hidden="true">
              <span />
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
