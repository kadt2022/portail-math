import { useTranslation } from "react-i18next";

import type { GameCatalogueEntry } from "./game-catalogue";
import styles from "./GameInfo.module.css";

// Sous le lecteur : le nom du jeu, une courte description, sa matière et son niveau scolaire.
// Rien d'inventé : seules les informations connues du catalogue sont affichées (pas de compteurs ni d'interactions fictives).
export function GameInfo({ game }: { game: GameCatalogueEntry }) {
  const { t } = useTranslation("games");
  const name = t(game.nameKey);
  return (
    <section className={styles.info} aria-label={t("cataloguePage.aboutGame", { name })}>
      <h2 className={styles.name}>{name}</h2>
      <p className={styles.description}>{t(game.descriptionKey)}</p>
      <ul className={styles.tags}>
        {game.subjectKey ? <li className={styles.tag}>{t(game.subjectKey)}</li> : null}
        {game.levelKey ? <li className={styles.tag}>{t(game.levelKey)}</li> : null}
        <li className={styles.tag}>{t(`categories.${game.categoryId}`)}</li>
      </ul>
    </section>
  );
}
