import { useTranslation } from "react-i18next";

import { gameCatalogue } from "../games/game-catalogue";
import { GameCard } from "../games/GameCard";
import { ContinuePlaying } from "./ContinuePlaying";
import { DailyChallenge } from "./DailyChallenge";
import styles from "./DashboardPage.module.css";
import { ProgressSummary } from "./ProgressSummary";
import { UpcomingGames } from "./UpcomingGames";
import { WelcomeHero } from "./WelcomeHero";

export function DashboardPage() {
  const { t } = useTranslation("dashboard");

  return (
    <div className={styles.page}>
      <div className={styles.aurora} aria-hidden="true" />

      <WelcomeHero />

      {/* Reprendre une partie et le défi du jour sont les deux façons d'entrer
          tout de suite dans le jeu : ils se partagent une même rangée sur
          grand écran, et s'empilent dès que la largeur ne suffit plus. */}
      <div className={styles.duo}>
        <ContinuePlaying />
        <DailyChallenge />
      </div>

      <ProgressSummary />

      <section className={styles.gamesSection} id="jeux-disponibles" aria-labelledby="jeux-titre">
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>{t("availableGames.kicker")}</p>
          <h2 id="jeux-titre" className={styles.heading}>
            {t("availableGames.heading")}
          </h2>
        </div>
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
