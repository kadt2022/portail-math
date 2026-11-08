import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { moduleContinueIn, moduleStopsIn, nextStopIn, type JourneyItem, type JourneyModule, type JourneyState, type JourneyStop } from "./journey";
import styles from "./JourneyNavigation.module.css";

// Navigation pensée pour un enfant : un petit chemin de ronds pour savoir où
// il est, et un seul gros bouton « Continuer » qui mène toujours au bon
// endroit (leçon suivante, évaluation, module suivant, bilan).
// Les textes viennent de la clé `journey` de l'espace de traduction du cours.

export interface JourneyConfig<S extends JourneyStop = JourneyStop> {
  namespace: string;
  stops: readonly S[];
  stateOf: (item: S["item"]) => JourneyState;
  lessonPath: (moduleId: string, itemId: string) => string;
  isFinal: (item: S["item"]) => boolean;
}

function stopSymbol(config: JourneyConfig, item: JourneyItem) {
  if (config.isFinal(item)) return "🎓";
  if (item.kind === "evaluation") return "🏅";
  return String(Number(item.id.slice(-2)));
}

type Translate = (key: string, options?: Record<string, unknown>) => string;

function itemTitle(t: Translate, config: JourneyConfig, stop: JourneyStop) {
  if (stop.item.kind === "evaluation" && !config.isFinal(stop.item)) {
    return t("journey.evaluationName", { number: stop.module.number });
  }
  return t(stop.item.titleKey);
}

export function JourneyTrail({ config, moduleId, currentItemId = "" }: { config: JourneyConfig; moduleId: string; currentItemId?: string }) {
  const { t } = useTranslation(config.namespace);
  const stops = moduleStopsIn(config.stops, moduleId);
  const number = stops[0]?.module.number;
  return (
    <nav className={styles.trail} aria-label={t("journey.trailLabel", { number })}>
      <ol>
        {stops.map((stop) => {
          const state = config.stateOf(stop.item);
          const current = stop.item.id === currentItemId;
          const label = t("journey.stopLabel", {
            title: itemTitle(t, config, stop),
            state: t(current ? "journey.state.current" : `journey.state.${state ?? "not-started"}`),
          });
          return (
            <li key={stop.item.id}>
              <Link
                to={config.lessonPath(stop.module.id, stop.item.id)}
                aria-label={label}
                aria-current={current ? "step" : undefined}
                className={`${styles.stop} ${state === "completed" ? styles.done : ""} ${current ? styles.current : ""}`}
              >
                <span aria-hidden="true">{state === "completed" && !current ? "★" : stopSymbol(config, stop.item)}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Écran de fin commun aux leçons et évaluations :
 * - leçon : bravo, étoile sur le chemin, « Continuer » vers la suite ;
 * - évaluation : petite fête du module, « Continuer » vers le module suivant ;
 * - bilan final : fin du parcours.
 */
export function JourneyCompletion({
  config,
  module,
  item,
  title,
  completedLessons,
  totalLessons,
  basePath,
  modulePath,
  children,
}: {
  config: JourneyConfig;
  module: JourneyModule;
  item: JourneyItem;
  title: string;
  completedLessons: number;
  totalLessons: number;
  basePath: string;
  modulePath: string;
  children?: ReactNode;
}) {
  const { t } = useTranslation(config.namespace);
  const next = nextStopIn(config.stops, item.id);
  const finished = config.isFinal(item);
  const moduleEnd = item.kind === "evaluation" && !finished;
  const moduleSuccess =
    moduleEnd &&
    moduleStopsIn(config.stops, module.id)
      .filter((stop) => stop.item.kind === "lesson")
      .every((stop) => config.stateOf(stop.item) === "completed");

  let heading = title;
  if (finished) heading = t("journey.courseFinished");
  else if (moduleSuccess) heading = t("journey.moduleSuccess", { number: module.number });

  const nextTitle = next ? itemTitle(t, config, next) : "";
  let yamba = t("journey.yambaNext", { title: nextTitle });
  if (finished) yamba = t("journey.yambaFinished");
  else if (next && next.module.id !== module.id) yamba = t("journey.yambaNextModule", { number: next.module.number, title: t(next.module.titleKey) });

  let badge = "★";
  if (finished) badge = "🎓";
  else if (moduleEnd) badge = "🏅";

  return (
    <section className={styles.completion} aria-live="polite">
      <span className={styles.badge} aria-hidden="true">{badge}</span>
      <h1>{heading}</h1>
      {moduleSuccess ? <p className={styles.subtitle}>{title}</p> : null}
      {children}
      <JourneyTrail config={config} moduleId={module.id} />
      <p className={styles.yamba}>
        <strong>{t("yamba.name")}</strong> {yamba}
      </p>
      <p className={styles.count}>{t("journey.progress", { count: completedLessons, total: totalLessons })}</p>
      <Link className={styles.continue} to={next ? config.lessonPath(next.module.id, next.item.id) : basePath}>
        {t(next ? "journey.continue" : "journey.backToCourse")} <span aria-hidden="true">▶</span>
      </Link>
      {next ? <span className={styles.nextName}>{nextTitle}</span> : null}
      <Link className={styles.quiet} to={modulePath}>
        {t("journey.backToModule")}
      </Link>
    </section>
  );
}

/** Gros bouton de la page d'un module : Commencer, Reprendre, Continuer ou Module suivant. */
export function ModuleContinueAction({ config, moduleId, basePath }: { config: JourneyConfig; moduleId: string; basePath: string }) {
  const { t } = useTranslation(config.namespace);
  const action = moduleContinueIn(config.stops, moduleId, config.stateOf);
  if (action.type === "finished") {
    return (
      <div className={styles.moduleContinue}>
        <JourneyTrail config={config} moduleId={moduleId} />
        <Link className={styles.continue} to={basePath}>
          {t("journey.backToCourse")} <span aria-hidden="true">▶</span>
        </Link>
      </div>
    );
  }
  const { stop } = action;
  return (
    <div className={styles.moduleContinue}>
      <JourneyTrail config={config} moduleId={moduleId} />
      <Link className={styles.continue} to={config.lessonPath(stop.module.id, stop.item.id)}>
        {t(`journey.module.${action.type}`)} <span aria-hidden="true">▶</span>
      </Link>
      <span className={styles.nextName}>
        {action.type === "next-module"
          ? t("journey.nextModuleName", { number: stop.module.number, title: t(stop.module.titleKey) })
          : itemTitle(t, config, stop)}
      </span>
    </div>
  );
}
