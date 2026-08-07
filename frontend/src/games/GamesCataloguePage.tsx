import { gameCatalogue } from "./game-catalogue";
import { GameCard } from "./GameCard";
import styles from "./GamesCataloguePage.module.css";

export function GamesCataloguePage() {
  return (
    <div className={styles.page}>
      <p className={styles.eyebrow}>Catalogue</p>
      <h1 className={styles.title}>Les jeux</h1>
      <div className={styles.grid}>
        {gameCatalogue.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
    </div>
  );
}
