import { Link } from "react-router-dom";

import styles from "./NotFoundPage.module.css";

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Page introuvable</p>
      <h1 className={styles.title}>Cette page n'existe pas</h1>
      <p className={styles.lead}>
        Le lien suivi n'aboutit à aucune page du portail. Retourne au tableau de bord pour
        retrouver tes jeux et ta progression.
      </p>
      <Link className={styles.back} to="/">
        Retour au tableau de bord
      </Link>
    </div>
  );
}
