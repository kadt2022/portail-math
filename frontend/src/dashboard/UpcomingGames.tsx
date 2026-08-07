import { useTranslation } from "react-i18next";

import { upcomingGames } from "../games/game-catalogue";
import styles from "./UpcomingGames.module.css";

// L'initiale vient de l'identifiant stable du jeu, pas du nom traduit :
// « Le Marché » / « Le Constructeur » donnaient tous deux « L », et
// « The Number Market » / « The Shape Builder » auraient donné « T » en
// anglais pour la même raison. L'id ne change jamais avec la langue.
function initialOf(id: string): string {
  return id.charAt(0).toUpperCase();
}

// Puce colorée avec l'initiale du jeu : distincte des cartes jouables (pas
// d'illustration, pas de bouton), mais toujours vivante, pas grisée.
export function UpcomingGames() {
  const { t: tDashboard } = useTranslation("dashboard");
  const { t: tGames } = useTranslation("games");

  return (
    <section className={styles.section} aria-labelledby="futures-aventures-titre">
      <h2 id="futures-aventures-titre" className={styles.heading}>
        {tDashboard("upcomingGames.heading")}
      </h2>
      <div className={styles.list}>
        {upcomingGames.map((game) => (
          <div className={styles.item} key={game.id}>
            <span className={styles.avatar} style={{ background: game.accent }} aria-hidden="true">
              {initialOf(game.id)}
            </span>
            <span className={styles.text}>
              <span className={styles.name}>{tGames(game.nameKey)}</span>
              <span className={styles.description}>{tGames(game.descriptionKey)}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
