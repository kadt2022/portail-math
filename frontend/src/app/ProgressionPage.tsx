import styles from "./ProgressionPage.module.css";

// Route posée dès cette PR pour que l'actualisation directe fonctionne et que
// la navigation soit complète. La lecture réelle de la progression locale
// arrive dans un récit dédié : aucun accès à localStorage n'a lieu ici.
export function ProgressionPage() {
  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Progression</p>
      <h1 className={styles.title}>Ta progression</h1>
      <p className={styles.lead}>
        Le détail de ta progression arrivera bientôt ici. En attendant, retrouve tes jeux
        depuis le tableau de bord.
      </p>
    </div>
  );
}
