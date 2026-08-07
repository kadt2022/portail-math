import styles from "./WelcomeHero.module.css";

// h1 unique de la page : le tableau de bord n'en porte pas d'autre.
// La photo (images/enfants-revision.webp) existe déjà dans le portail —
// aucun doublon créé. Un voile dégradé assure la lisibilité du texte sans
// couvrir les enfants à droite.
export function WelcomeHero() {
  return (
    <section className={styles.hero}>
      <img className={styles.photo} src="/images/enfants-revision.webp" alt="" />
      <div className={styles.scrim} aria-hidden="true" />
      <div className={styles.content}>
        <p className={styles.eyebrow}>Portail-Math</p>
        <h1 className={styles.title}>
          Bonjour, <span>explorateur !</span>
        </h1>
        <p className={styles.lead}>Choisis une aventure ou continue celle que tu as déjà commencée.</p>
        <a className={styles.cta} href="#jeux-disponibles">
          Voir les jeux <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
