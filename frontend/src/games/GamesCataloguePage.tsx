import { useTranslation } from "react-i18next";

import { gameCatalogue } from "./game-catalogue";
import { GameCard } from "./GameCard";
import styles from "./GamesCataloguePage.module.css";

export function GamesCataloguePage() {
  const { t } = useTranslation("games");

  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>{t("cataloguePage.eyebrow")}</p>
      <h1 className={styles.title}>{t("cataloguePage.title")}</h1>
      <div className={styles.grid}>
        {gameCatalogue.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}
