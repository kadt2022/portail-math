import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { YambaGuide } from "../courses/components/YambaGuide";
import { distributeRows } from "../games/gallery-layout";
import { BookCard } from "./BookCard";
import { filterBooks, filterOptions, noLibraryFilters, type FilterOption, type LibraryFilters } from "./library-filters";
import { chunkRows, sharedColumns } from "./library-rows";
import { useLibraryCatalogue } from "./library-catalogue";
import styles from "./LibraryPage.module.css";

// Les couvertures au-delà de cette position se chargent à la demande.
const EAGER_COVERS = 8;

// Couvertures de taille raisonnable : au moins ~200 px de large, de 2 (téléphone) à 6 par rangée.
// Toutes les rangées partagent la même largeur de couverture ; une rangée plus courte est centrée.
const MIN_CARD = 200;
// Largeur maximale d'une couverture : au-delà, l'espace restant est réparti entre les livres et sur les côtés.
const MAX_CARD = 240;
// Écart entre couvertures : large sur ordinateur, resserré sur téléphone (sinon il mange la largeur).
const gapFor = (width: number) => (width < 640 ? 16 : width < 900 ? 24 : 40);
const maxBooksPerRow = (width: number) => Math.min(6, Math.max(2, Math.floor((width + gapFor(width)) / (MIN_CARD + gapFor(width)))));

export function LibraryPage() {
  const { t } = useTranslation("library");
  const { books, loading, error } = useLibraryCatalogue();
  const [filters, setFilters] = useState<LibraryFilters>(noLibraryFilters);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [maxPerRow, setMaxPerRow] = useState(4);
  const [gap, setGap] = useState(40);

  // Les filtres viennent des livres réellement disponibles : jamais de catégorie fictive.
  // Les filtres mémorisent des clés (indépendantes de la langue) : changer de langue ne les vide pas.
  const subjects = useMemo(() => filterOptions(books, (book) => book.subjectKey, (key) => t(key)), [books, t]);
  const levels = useMemo(() => filterOptions(books, (book) => book.levelKey, (key) => t(key)), [books, t]);
  const collections = useMemo(() => filterOptions(books, (book) => book.collectionKey, (key) => t(key)), [books, t]);

  const visibleBooks = useMemo(() => filterBooks(books, filters, (key) => t(key)), [books, filters, t]);
  const filtering = filters.subject !== null || filters.level !== null || filters.collection !== null;

  // Même composition que la galerie des jeux : rangées équilibrées qui remplissent toute la largeur,
  // calculées d'après la largeur réelle de la galerie. Sans ResizeObserver, la valeur par défaut convient.
  const hasGallery = visibleBooks.length > 0;
  useLayoutEffect(() => {
    const gallery = galleryRef.current;
    if (!gallery) return;
    const update = () => {
      const width = gallery.getBoundingClientRect().width || window.innerWidth;
      setMaxPerRow(maxBooksPerRow(width));
      setGap(gapFor(width));
    };
    update();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(update);
    observer.observe(gallery);
    return () => observer.disconnect();
  }, [hasGallery]);

  // Toutes les rangées utilisent la même largeur de couverture, calculée sur la rangée la plus longue : un livre isolé
  // en tête ne fait pas déborder la rangée suivante, et un ou deux livres ne sont jamais agrandis pour remplir la ligne.
  const rows = useMemo(() => chunkRows(visibleBooks, distributeRows(visibleBooks.length, maxPerRow)), [visibleBooks, maxPerRow]);
  const columns = sharedColumns(rows);

  function toggle(field: "subject" | "level" | "collection", value: string) {
    setFilters((current) => ({ ...current, [field]: current[field] !== null && t(current[field]) === t(value) ? null : value }));
  }

  // Un filtre est actif quand son texte traduit correspond à celui de l'option (plusieurs clés peuvent porter le même texte).
  function optionChip(field: "subject" | "level" | "collection", option: FilterOption) {
    const selected = filters[field];
    return chip(option.label, selected !== null && t(selected) === option.label, () => toggle(field, option.key));
  }

  function chip(label: string, pressed: boolean, onClick: () => void) {
    return (
      <button key={label} type="button" className={styles.chip} aria-pressed={pressed} onClick={onClick}>
        {label}
      </button>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div className={styles.titleBlock}>
          <h1>{t("page.title")}</h1>
          <p className={styles.subtitle}>{t("page.subtitle")}</p>
        </div>
        <div className={styles.guide}>
          <YambaGuide name="Yamba" message={t("page.description")} compact />
        </div>
        <div className={styles.search} role="search">
          <input
            type="search"
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder={t("search.placeholder")}
            aria-label={t("search.label")}
          />
        </div>
      </header>

      {books.length > 0 && (
        <div className={styles.filters} role="group" aria-label={t("filters.label")}>
          {chip(t("filters.all"), !filtering, () =>
            setFilters((current) => ({ ...current, subject: null, level: null, collection: null })),
          )}
          {subjects.map((option) => optionChip("subject", option))}
          {levels.length > 1 && (
            <span className={styles.group} role="group" aria-label={t("filters.level")}>
              <span className={styles.groupLabel} aria-hidden="true">{t("filters.level")}</span>
              {levels.map((option) => optionChip("level", option))}
            </span>
          )}
          {collections.length > 1 && (
            <span className={styles.group} role="group" aria-label={t("filters.collection")}>
              <span className={styles.groupLabel} aria-hidden="true">{t("filters.collection")}</span>
              {collections.map((option) => optionChip("collection", option))}
            </span>
          )}
        </div>
      )}

      <section className={styles.catalogue} aria-label={t("selection.title")}>
        {loading && <p className={styles.status}>{t("selection.loading")}</p>}
        {error && (
          <p className={styles.status} role="alert">
            {t("selection.error")}
          </p>
        )}
        {!loading && !error && (
          <p className={styles.count} role="status">{t("selection.count", { count: visibleBooks.length })}</p>
        )}

        {visibleBooks.length > 0 ? (
          <div ref={galleryRef} className={styles.gallery} style={{ gap }}>
            {rows.map((row, rowIndex) => (
              <div
                key={row[0].id}
                className={styles.row}
                style={{ gap, gridTemplateColumns: `repeat(${row.length}, min(${MAX_CARD}px, calc((100% - ${(columns - 1) * gap}px) / ${columns})))` }}
              >
                {row.map((book, index) => (
                  <BookCard key={book.id} book={book} lazy={rows.slice(0, rowIndex).reduce((n, r) => n + r.length, 0) + index >= EAGER_COVERS} />
                ))}
              </div>
            ))}
          </div>
        ) : (
          !loading && !error && <p className={styles.empty}>{t("selection.noResult")}</p>
        )}
      </section>
    </div>
  );
}
