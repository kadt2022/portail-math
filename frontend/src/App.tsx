import styles from "./App.module.css";

// Page technique de MIG-REACT-00. Elle ne porte aucune fonctionnalité : elle
// sert uniquement à prouver que le portail React est bien construit par Gradle,
// empaqueté dans le JAR et servi par Spring Boot sous /app.
export function App() {
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Socle technique</p>
      <h1 className={styles.title}>Le portail React est en place</h1>
      <p className={styles.lead}>
        Cette page ne remplace encore aucune page du portail. Elle atteste
        seulement que React, TypeScript et Vite sont construits par Gradle et
        servis depuis le JAR.
      </p>

      <dl className={styles.facts}>
        <div>
          <dt>Route</dt>
          <dd>/app</dd>
        </div>
        <div>
          <dt>Pages existantes</dt>
          <dd>inchangées, servies par Thymeleaf</dd>
        </div>
        <div>
          <dt>Jeux</dt>
          <dd>inchangés, moteur Phaser conservé</dd>
        </div>
      </dl>

      <p className={styles.note}>
        La progression déjà enregistrée sur l’appareil des élèves n’est pas
        touchée : aucune clé de stockage local n’a été lue, écrite ni renommée.
      </p>

      <p>
        <a className={styles.back} href="/">
          ← Retour au portail
        </a>
      </p>
    </main>
  );
}
