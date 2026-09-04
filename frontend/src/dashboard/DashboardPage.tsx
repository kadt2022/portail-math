import { useTranslation } from "react-i18next";

import { gameCatalogue } from "../games/game-catalogue";
import { GameCard } from "../games/GameCard";
import { AboutMbuyamba } from "./AboutMbuyamba";
import { ContinuePlaying } from "./ContinuePlaying";
import styles from "./DashboardPage.module.css";
import { ProgressSummary } from "./ProgressSummary";
import { UpcomingGames } from "./UpcomingGames";
import { WelcomeHero } from "./WelcomeHero";

export function DashboardPage() {
  const { t } = useTranslation("dashboard");

  return (
    <div className={styles.page}>
      <WelcomeHero />
      <AboutMbuyamba />
      <ProgressSummary />
      <ContinuePlaying />

      <section className={styles.gamesSection} id="jeux-disponibles" aria-labelledby="jeux-titre">
        <h2 id="jeux-titre" className={styles.heading}>
          {t("availableGames.heading")}
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
