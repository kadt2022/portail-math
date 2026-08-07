import { Link } from "react-router-dom";

import styles from "./NewGameComingSoonPage.module.css";

// Écran d'attente pour /app/jeux/nouveau-jeu-react. Le vrai jeu arrive dans
// un récit dédié, construit sur le pont React–Phaser commun : cette page ne
// doit jamais laisser croire qu'une partie peut commencer.
export function NewGameComingSoonPage() {
  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Nouveau jeu éducatif</p>
      <h1 className={styles.title}>Le jeu est en préparation</h1>
      <p className={styles.lead}>
        Une nouvelle aventure mathématique arrive bientôt sur le portail. Reviens la retrouver
        dès qu'elle sera prête.
      </p>
      <Link className={styles.back} to="/jeux">
        Retour aux jeux
      </Link>
    </div>
  );
}
