import styles from "./ProgressSummary.module.css";

const PLACEHOLDER_STATS = [
  { label: "Jeux commencés" },
  { label: "Défis terminés" },
  { label: "Réussites au premier essai" },
  { label: "Erreurs corrigées" },
];

// Emplacement réservé : aucune donnée réelle n'est lue dans cette PR. Le
// tiret évite d'afficher un faux zéro que l'enfant pourrait lire comme un
// échec.
export function ProgressSummary() {
  return (
    <section className={styles.section} aria-labelledby="progression-titre">
      <h2 id="progression-titre" className={styles.heading}>
        Ta progression
      </h2>
      <div className={styles.grid}>
        {PLACEHOLDER_STATS.map((stat) => (
          <div className={styles.tile} key={stat.label}>
            <p className={styles.value} aria-hidden="true">
              —
            </p>
            <p className={styles.label}>{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
