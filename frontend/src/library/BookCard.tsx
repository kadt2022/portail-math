import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { LibraryBook } from "./library-catalogue";
import styles from "./BookCard.module.css";

interface BookCardProps {
  book: LibraryBook;
  /** Les couvertures sous la ligne de flottaison se chargent à la demande. */
  lazy?: boolean;
}

// Même logique que les cartes de jeux : toute la carte est le lien, l'illustration (la couverture)
// remplit le cadre, le titre et les repères sont posés sur une bande en bas.
// Le cadre garde les proportions d'origine de la couverture (595 × 842) : jamais déformée.
export function BookCard({ book, lazy = false }: BookCardProps) {
  const { t } = useTranslation("library");
  const title = t(book.titleKey);
  const level = t(book.levelKey);

  return (
    <Link className={styles.card} to={book.readerPath} aria-label={t("book.openAria", { title, level })}>
      {book.cover ? (
        <img
          className={styles.cover}
          src={book.cover}
          alt={t("book.coverAlt", { title })}
          width={420}
          height={594}
          loading={lazy ? "lazy" : "eager"}
          decoding="async"
        />
      ) : (
        <span className={styles.noCover} aria-hidden="true">{title}</span>
      )}
      <span className={styles.spine} aria-hidden="true" />
      <span className={styles.level}>{level}</span>
      <span className={styles.bar}>
        <span className={styles.title}>{title}</span>
        <span className={styles.meta}>
          {t(book.subjectKey)} · {t("book.pages", { count: book.pages })}
        </span>
      </span>
    </Link>
  );
}
