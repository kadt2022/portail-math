import { gameCatalogue } from "../games/game-catalogue";
import { GameCard } from "../games/GameCard";
import { ContinuePlaying } from "./ContinuePlaying";
import styles from "./DashboardPage.module.css";
import { ProgressSummary } from "./ProgressSummary";
import { UpcomingGames } from "./UpcomingGames";
import { WelcomeHero } from "./WelcomeHero";

export function DashboardPage() {
  return (
    <div className={styles.page}>
      <WelcomeHero />
      <ProgressSummary />
      <ContinuePlaying />

      <section className={styles.gamesSection} id="jeux-disponibles" aria-labelledby="jeux-titre">
        <h2 id="jeux-titre" className={styles.heading}>
          Jeux disponibles
        </h2>
        <div className={styles.gamesGrid}>
          {gameCatalogue.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      <UpcomingGames />
    </div>
  );
}
