import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { YambaGuide } from "../courses/components/YambaGuide";
import { libraryCatalogue } from "./library-catalogue";
import styles from "./LibraryPage.module.css";

export function LibraryPage() {
  const { t } = useTranslation("library");

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div className={styles.titleBlock}>
          <p className={styles.eyebrow}>{t("page.eyebrow")}</p>
          <h1>{t("page.title")}</h1>
        </div>
        <YambaGuide name="Yamba" message={t("page.description")} />
      </header>

      <section className={styles.catalogue} aria-labelledby="library-selection-title">
        <div className={styles.sectionHeading}>
          <div>
            <p>{t("selection.eyebrow")}</p>
            <h2 id="library-selection-title">{t("selection.title")}</h2>
          </div>
        </div>

        <div className={styles.bookGrid}>
          {libraryCatalogue.map((book) => (
            <article className={styles.book} key={book.id}>
              <div className={styles.coverWrap}>
                <img
                  className={styles.cover}
                  src={book.cover}
                  alt={t("book.coverAlt", { title: t(book.titleKey) })}
                />
              </div>

              <div className={styles.bookDetails}>
                <p className={styles.collection}>{t("book.collection")}</p>
                <p className={styles.description}>{t(book.descriptionKey)}</p>

                <dl className={styles.metadata}>
                  <div>
                    <dt>{t("book.level")}</dt>
                    <dd>{t(book.levelKey)}</dd>
                  </div>
                  <div>
                    <dt>{t("book.subject")}</dt>
                    <dd>{t(book.subjectKey)}</dd>
                  </div>
                  <div>
                    <dt>{t("book.length")}</dt>
                    <dd>{t("book.pages", { count: book.pages })}</dd>
                  </div>
                  <div>
                    <dt>{t("book.format")}</dt>
                    <dd>{t(book.formatKey)}</dd>
                  </div>
                </dl>

                <div className={styles.actions}>
                  <Link className={styles.readButton} to={book.readerPath}>
                    {t("book.read")}
                    <span aria-hidden="true">→</span>
                  </Link>
                </div>
                <p className={styles.readerNote}>{t("book.readerNote")}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
