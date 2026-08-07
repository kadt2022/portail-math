import { upcomingGames } from "../games/game-catalogue";
import styles from "./UpcomingGames.module.css";

// « Le Marché... » et « Le Constructeur... » donneraient tous deux « L » :
// l'article ne porte aucune information distinctive, on l'ignore.
const LEADING_ARTICLE = /^(le|la|les|l')\s+/i;

function initialOf(name: string): string {
  return name.replace(LEADING_ARTICLE, "").charAt(0).toUpperCase();
}

// Puce colorée avec l'initiale du jeu : distincte des cartes jouables (pas
// d'illustration, pas de bouton), mais toujours vivante, pas grisée.
export function UpcomingGames() {
  return (
    <section className={styles.section} aria-labelledby="futures-aventures-titre">
      <h2 id="futures-aventures-titre" className={styles.heading}>
        À découvrir bientôt
      </h2>
      <div className={styles.list}>
        {upcomingGames.map((game) => (
          <div className={styles.item} key={game.id}>
            <span className={styles.avatar} style={{ background: game.accent }} aria-hidden="true">
              {initialOf(game.name)}
            </span>
            <span className={styles.text}>
              <span className={styles.name}>{game.name}</span>
              <span className={styles.description}>{game.description}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
