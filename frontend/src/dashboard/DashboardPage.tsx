import { useTranslation } from "react-i18next";

import { gameCatalogue } from "../games/game-catalogue";
import { GameCard } from "../games/GameCard";
import { ContinuePlaying } from "./ContinuePlaying";
import styles from "./DashboardPage.module.css";
import { ProgressSummary } from "./ProgressSummary";
import { UpcomingGames } from "./UpcomingGames";
import { WelcomeHero } from "./WelcomeHero";

export function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const featuredGames = gameCatalogue.slice(0, 3);

  return (
    <div className={styles.page}>
      <WelcomeHero />
      <ProgressSummary />
      <ContinuePlaying />

      <section className={styles.gamesSection} id="jeux-disponibles" aria-labelledby="jeux-titre">
        <div className={styles.sectionHeader}>
          <div>
            <p className={styles.kicker}>{t("availableGames.kicker")}</p>
            <h2 id="jeux-titre" className={styles.heading}>
              {t("availableGames.heading")}
            </h2>
          </div>
          <a className={styles.sectionLink} href="/app/jeux">
            {t("availableGames.viewAll")} <span aria-hidden="true">→</span>
          </a>
        </div>
        <div className={styles.gamesGrid}>
          {featuredGames.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </section>

      <UpcomingGames />
    </div>
  );
}
