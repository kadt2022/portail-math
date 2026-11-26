import styles from "./FlightGame.module.css";

// Rappel des commandes au clavier, en touches dessinées plutôt qu'en texte : flèches pour se déplacer, grande touche pour accélérer,
// touche Maj pour ralentir. Les noms complets restent disponibles pour les lecteurs d'écran.
//
// Écrit pour Yamba.

export function KeyHint({ label, accelerate, brake }: Readonly<{ label: string; accelerate: string; brake: string }>) {
  return (
    <div className={styles.keys} role="img" aria-label={label}>
      <div className={styles.arrows} aria-hidden="true">
        <kbd className={styles.keyUp}>↑</kbd>
        <kbd className={styles.keyLeft}>←</kbd>
        <kbd className={styles.keyDown}>↓</kbd>
        <kbd className={styles.keyRight}>→</kbd>
      </div>
      <div className={styles.keyPair} aria-hidden="true" title={accelerate}>
        <kbd className={styles.keyWide}>»</kbd>
      </div>
      <div className={styles.keyPair} aria-hidden="true" title={brake}>
        <kbd className={styles.keyShift}>⇧ «</kbd>
      </div>
    </div>
  );
}
