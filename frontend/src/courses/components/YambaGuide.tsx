import yambaHead from "../../assets/yamba-head.jpg";

import styles from "./YambaGuide.module.css";

interface YambaGuideProps {
  name: string;
  message: string;
  compact?: boolean;
}

export function YambaGuide({ name, message, compact = false }: YambaGuideProps) {
  return (
    <aside
      className={`${styles.guide}${compact ? ` ${styles.compact}` : ""}`}
      aria-label={`${name} : ${message}`}
    >
      <span className={styles.medallion} aria-hidden="true">
        <img className={styles.portrait} src={yambaHead} alt="" />
      </span>
      <p className={styles.bubble}>
        <strong className={styles.name}>{name}</strong>
        <span className={styles.message}>{message}</span>
      </p>
    </aside>
  );
}
