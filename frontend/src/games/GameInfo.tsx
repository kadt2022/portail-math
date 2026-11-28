import { useId, useState } from "react";
import { useTranslation } from "react-i18next";

import type { GameCatalogueEntry } from "./game-catalogue";
import styles from "./GameInfo.module.css";

const TECHNICAL_ROWS = ["devices", "controls", "install", "internet", "languages", "mode"] as const;

// Sous le lecteur : la signature du studio, le nom du jeu, ses repères (âge, matière, niveau) et sa description.
// Un jeu qui a une fiche détaillée (detailsKey) la déploie avec « Voir plus », comme sur YouTube : objectifs, règles, progression,
// prérequis, informations techniques et présentation de Yamba Academy ; elle est ouverte par défaut, « Voir moins » la replie. Rien d'inventé : seules les informations connues sont affichées.
export function GameInfo({ game }: { game: GameCatalogueEntry }) {
  const { t } = useTranslation("games");
  const [expanded, setExpanded] = useState(true);
  const panelId = useId();
  const name = t(game.nameKey);
  const root = game.detailsKey;
  const steps = root ? (t(`${root}.steps`, { returnObjects: true }) as unknown) : null;
  const stepList = Array.isArray(steps) ? (steps as string[]) : [];
  const tags = [root ? t(`${root}.age`) : null, game.subjectKey ? t(game.subjectKey) : null, game.levelKey ? t(game.levelKey) : null, t(`categories.${game.categoryId}`), root ? t(`${root}.levels`) : null, root ? t(`${root}.mode`) : null].filter(Boolean) as string[];

  return (
    <section className={styles.info} aria-label={t("cataloguePage.aboutGame", { name })}>
      <h2 className={styles.name}>{name}</h2>
      <div className={styles.studio}>
        <span className={styles.avatar} aria-hidden="true">
          Y
        </span>
        <span className={styles.studioText}>
          <strong>{t("gameInfo.studio")}</strong>
          <span>{t("gameInfo.studioLine")}</span>
        </span>
      </div>
      <div className={styles.card}>
        <ul className={styles.tags}>
          {tags.map((tag) => (
            <li key={tag} className={styles.tag}>
              {tag}
            </li>
          ))}
        </ul>
        <p className={styles.description}>{root ? t(`${root}.summary`) : t(game.descriptionKey)}</p>
        {root ? (
          <>
            <div id={panelId} className={styles.more} hidden={!expanded}>
              <h3 className={styles.heading}>{t("gameInfo.objectives")}</h3>
              <p className={styles.text}>{t(`${root}.objectives`)}</p>
              <h3 className={styles.heading}>{t("gameInfo.howToPlay")}</h3>
              <ol className={styles.steps}>
                {stepList.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <h3 className={styles.heading}>{t("gameInfo.progression")}</h3>
              <p className={styles.text}>{t(`${root}.progression`)}</p>
              <h3 className={styles.heading}>{t("gameInfo.prerequisites")}</h3>
              <p className={styles.text}>{t(`${root}.prerequisites`)}</p>
              <h3 className={styles.heading}>{t("gameInfo.technical")}</h3>
              <dl className={styles.table}>
                {TECHNICAL_ROWS.map((row) => (
                  <div key={row} className={styles.row}>
                    <dt>{t(`gameInfo.labels.${row}`)}</dt>
                    <dd>{t(`gameInfo.values.${row}`)}</dd>
                  </div>
                ))}
              </dl>
              <aside className={styles.academy}>
                <strong>{t("gameInfo.academyTitle")}</strong>
                <p>{t("gameInfo.academyText")}</p>
                <p className={styles.createdBy}>{t("gameInfo.createdBy")}</p>
              </aside>
            </div>
            <button type="button" className={styles.toggle} aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded((value) => !value)}>
              {expanded ? t("gameInfo.seeLess") : t("gameInfo.seeMore")}
              <span aria-hidden="true" className={styles.chevron} data-open={expanded || undefined} />
            </button>
          </>
        ) : null}
      </div>
    </section>
  );
}
