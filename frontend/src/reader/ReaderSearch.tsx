import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { ReaderCourse } from "./reader-model";
import styles from "./CourseReader.module.css";

interface SearchEntry {
  path: string;
  title: string;
  context: string;
  haystack: string;
}

interface ReaderSearchProps {
  course: ReaderCourse;
  onDismiss: () => void;
  onSelect: () => void;
}

// Sans accents ni majuscules : « Équations » doit se trouver en tapant « equation ».
function normalize(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("fr").trim();
}

const FOCUSABLE = "input, button, a[href]";

// Recherche dans le parcours affiché. Elle porte sur les titres des modules et des leçons et sur
// la présentation du cours : le contenu détaillé des leçons est chargé à la demande, il n'est pas indexé.
export function ReaderSearch({ course, onDismiss, onSelect }: ReaderSearchProps) {
  const { t } = useTranslation("reader");
  const { t: tc } = useTranslation(course.namespace);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const entries = useMemo<SearchEntry[]>(() => {
    const introTitle = tc("course.title");
    const list: SearchEntry[] = [
      {
        path: course.basePath,
        title: introTitle,
        context: t("search.intro"),
        haystack: `${introTitle} ${tc("course.lead")}`,
      },
    ];
    for (const module of course.modules) {
      const moduleTitle = tc(module.titleKey);
      const moduleContext = t("search.module", { number: module.number });
      list.push({ path: module.path, title: moduleTitle, context: moduleContext, haystack: moduleTitle });
      for (const item of module.items.filter((candidate) => candidate.published)) {
        const itemTitle = tc(item.titleKey, item.titleValues);
        list.push({ path: item.path, title: itemTitle, context: `${moduleContext} · ${moduleTitle}`, haystack: itemTitle });
      }
    }
    return list;
  }, [course, t, tc]);

  const needle = normalize(query);
  const results = needle ? entries.filter((entry) => normalize(entry.haystack).includes(needle)).slice(0, 15) : [];

  // Échap ferme ; Tab reste dans la fenêtre tant qu'elle est ouverte.
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onDismiss();
      return;
    }
    if (event.key !== "Tab" || !dialogRef.current) {
      return;
    }
    const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  return (
    <div
      className={styles.searchOverlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onDismiss();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={styles.searchDialog}
        role="dialog"
        aria-modal="true"
        aria-label={t("search.title")}
        onKeyDown={onKeyDown}
      >
        <div className={styles.searchHead}>
          <input
            ref={inputRef}
            className={styles.searchInput}
            type="search"
            value={query}
            placeholder={t("search.placeholder")}
            aria-label={t("search.aria")}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="button" className={styles.searchClose} aria-label={t("search.close")} onClick={onDismiss}>
            ×
          </button>
        </div>

        {needle === "" ? (
          <p className={styles.searchEmpty}>{t("search.hint")}</p>
        ) : results.length === 0 ? (
          <p className={styles.searchEmpty} role="status">{t("search.none")}</p>
        ) : (
          <ul className={styles.searchResults} aria-label={t("search.title")}>
            {results.map((entry) => (
              <li key={entry.path}>
                <Link to={entry.path} onClick={onSelect}>
                  <strong>{entry.title}</strong>
                  <span>{entry.context}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
