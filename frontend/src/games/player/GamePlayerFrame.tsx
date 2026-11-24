import styles from "./GamePlayer.module.css";

// Cadre vide du lecteur standard, pendant le téléchargement du code d'un jeu : mêmes éléments et mêmes styles que GamePlayer
// (bande du haut avec un compteur, corps en 16/9 plafonné), sans contenu ni logique. Il a donc exactement la géométrie du
// lecteur qui le remplacera, et le chargeur commun posé dessus ne change pas de taille à l'arrivée du jeu. Fichier à part,
// sans dépendance : le catalogue l'affiche sans télécharger le lecteur.
export function GamePlayerFrame() {
  return (
    <div className={styles.root} aria-hidden="true" data-player-frame="">
      <header className={styles.bar}>
        <dl className={styles.stats}>
          <div className={styles.statItem}>
            <dt>&nbsp;</dt>
            <dd>&nbsp;</dd>
          </div>
        </dl>
      </header>
      <div className={styles.body} />
    </div>
  );
}
