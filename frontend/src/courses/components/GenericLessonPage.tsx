import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import type { CourseDefinition, CourseItem, CourseModule, CourseStep } from "../course-engine/course-model";
import { getModuleItems, isPublished } from "../course-engine/course-model";
import { useCourseProgress } from "../course-engine/useCourseProgress";
import baseStyles from "../primary-one/PrimaryOneCourse.module.css";
import { CourseActionIcon } from "./CourseActionIcon";
import { YambaGuide } from "./YambaGuide";

export interface RenderStepArgs<TLessonContent, TEvaluationContent> {
  step: CourseStep;
  stepIndex: number;
  stepCompleted: boolean;
  lessonContent: TLessonContent | undefined;
  evaluationContent: TEvaluationContent | undefined;
  onValidated: () => void;
  onInfoConfirmed: () => void;
}

interface GenericLessonPageProps<TLessonContent, TEvaluationContent> {
  namespace: string;
  course: CourseDefinition;
  modules: readonly CourseModule[];
  basePath: string;
  getModuleById: (moduleId: string | undefined) => CourseModule | undefined;
  getItemById: (module: CourseModule, itemId: string | undefined) => CourseItem | undefined;
  modulePath: (moduleId: string) => string;
  lessonPath: (moduleId: string, lessonId: string) => string;
  lessonContentById: Record<string, TLessonContent>;
  evaluationContentById: Record<string, TEvaluationContent>;
  getObjectiveKey: (lessonContent: TLessonContent | undefined, evaluationContent: TEvaluationContent | undefined) => string | undefined;
  // Classes propres au cours (durée de la leçon, contexte de l'objectif,
  // actions de bas de page) : le reste de la mise en page vient de
  // `baseStyles`, déjà partagé entre tous les cours.
  pageStyles: { duration: string; lessonContext: string; lessonActions: string };
  // Chaque cours garde la main sur le contenu réel de chaque étape (quel
  // bloc, quel exercice, avec quelles props spécifiques) : cette page ne
  // connaît que la mécanique commune (progression, navigation, écran de fin).
  renderStep: (args: RenderStepArgs<TLessonContent, TEvaluationContent>) => ReactNode;
}

// Page de leçon générique : pilote la progression, la reprise au bon
// endroit, l'écran de fin et la navigation — commun à tout cours utilisant
// le moteur de leçon partagé (voir ../course-engine). Chaque cours ne
// fournit que son catalogue, son contenu et sa fonction `renderStep`.
export function GenericLessonPage<TLessonContent, TEvaluationContent>({
  namespace,
  course,
  modules,
  basePath,
  getModuleById,
  getItemById,
  modulePath,
  lessonPath,
  lessonContentById,
  evaluationContentById,
  getObjectiveKey,
  pageStyles,
  renderStep,
}: GenericLessonPageProps<TLessonContent, TEvaluationContent>) {
  const { moduleId, lessonId } = useParams();
  const { t } = useTranslation(namespace);
  const { progress, startItem, completeStep } = useCourseProgress(course.id);
  const module = getModuleById(moduleId);
  const item = module ? getItemById(module, lessonId) : undefined;
  const [viewByItem, setViewByItem] = useState<Record<string, string | "done">>({});

  const lessonContent = item?.kind === "lesson" ? lessonContentById[item.id] : undefined;
  const evaluationContent = item?.kind === "evaluation" ? evaluationContentById[item.id] : undefined;
  const hasContent = Boolean(lessonContent ?? evaluationContent);

  const storedItem = item ? progress.items[item.id] : undefined;
  const defaultView = item
    ? storedItem?.completed
      ? item.steps[0]?.id
      : (storedItem?.currentStepId ?? item.steps[0]?.id)
    : undefined;
  const view = item ? (viewByItem[item.id] ?? defaultView) : undefined;

  useEffect(() => {
    if (item && isPublished(item) && hasContent && !progress.items[item.id]) {
      startItem(item);
    }
  }, [item, hasContent, progress.items, startItem]);

  if (!module || !item || !isPublished(item) || !hasContent || !view) {
    return (
      <div className={baseStyles.missingPage}>
        <h1>{t("errors.lessonNotFound")}</h1>
        <Link className={baseStyles.secondaryAction} to={basePath}>
          <CourseActionIcon className={baseStyles.actionIcon} name="return-to-modules" />
          {t("actions.backToCourse")}
        </Link>
      </div>
    );
  }

  const setView = (next: string | "done") => {
    setViewByItem((current) => ({ ...current, [item.id]: next }));
  };

  if (view === "done") {
    const items = getModuleItems(module);
    const itemIndex = items.findIndex((candidate) => candidate.id === item.id);
    const nextItem = items[itemIndex + 1];
    const nextModule = modules[module.number];
    const nextModulePublished = nextModule ? isPublished(nextModule.lessons[0]) : false;
    const primaryHref = nextItem
      ? lessonPath(module.id, nextItem.id)
      : nextModulePublished && nextModule
        ? modulePath(nextModule.id)
        : basePath;
    const primaryLabelKey = nextItem
      ? nextItem.kind === "evaluation"
        ? "lessonComplete.nextEvaluation"
        : "lessonComplete.nextLesson"
      : nextModulePublished
        ? "lessonComplete.nextModule"
        : "lessonComplete.backToCourse";

    return (
      <div className={baseStyles.lessonPage}>
        <section className={baseStyles.completionCard} aria-live="polite">
          <span className={baseStyles.completionMark} aria-hidden="true">✓</span>
          <p className={baseStyles.eyebrow}>{t("lessonComplete.eyebrow")}</p>
          <h1>
            {item.kind === "evaluation" ? t("lessonComplete.evaluationTitle") : t("lessonComplete.title")}
          </h1>
          <p>{t("lessonComplete.message")}</p>
          <YambaGuide compact name={t("yamba.name")} message={t("yamba.lessonComplete")} />
          <div className={baseStyles.completionActions}>
            <Link className={baseStyles.secondaryAction} to={modulePath(module.id)}>
              <CourseActionIcon className={baseStyles.actionIcon} name="back" />
              {t("lessonComplete.backToModule")}
            </Link>
            <Link className={baseStyles.primaryAction} to={primaryHref}>
              <CourseActionIcon className={baseStyles.actionIcon} name="continue" />
              {t(primaryLabelKey)}
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const stepIndex = item.steps.findIndex((candidate) => candidate.id === view);
  const safeStepIndex = stepIndex >= 0 ? stepIndex : 0;
  const step = item.steps[safeStepIndex];
  const nextStep = item.steps[safeStepIndex + 1];
  const stepCompleted = Boolean(storedItem?.completedStepIds.includes(step.id));

  // Étapes avec correction (exercices) : on marque l'étape réussie et on
  // laisse le message « Bravo ! » à l'écran, l'enfant avance ensuite via le
  // bouton « Continuer » du bas — utile pour relire un retour après erreur.
  const onValidated = () => {
    setView(step.id);
    completeStep(item, step.id, true);
  };

  // Étapes sans correction (situation, explication, exemple, résumé,
  // auto-évaluation) : rien à relire après le clic, donc « je continue »
  // avance directement plutôt que d'exiger un second clic redondant.
  const onInfoConfirmed = () => {
    completeStep(item, step.id, true);
    setView(nextStep?.id ?? "done");
  };

  const objectiveKey = getObjectiveKey(lessonContent, evaluationContent);

  return (
    <div className={baseStyles.lessonPage}>
      <header className={baseStyles.lessonHeader}>
        <nav className={baseStyles.breadcrumbs} aria-label={t("breadcrumbs.label")}>
          <Link to={basePath}>{t("breadcrumbs.course")}</Link>
          <span aria-hidden="true">/</span>
          <Link to={modulePath(module.id)}>{t("modules.number", { number: module.number })}</Link>
        </nav>
        <div className={baseStyles.lessonTitleRow}>
          <div>
            <p className={baseStyles.eyebrow}>
              {item.kind === "evaluation" ? t("evaluation.label") : t("lesson.label")}
            </p>
            <h1>{t(item.titleKey)}</h1>
          </div>
          {item.kind === "lesson" ? <span className={pageStyles.duration}>{t("lesson.duration")}</span> : null}
        </div>
        {objectiveKey ? (
          <div className={pageStyles.lessonContext}>
            <p>
              <strong>{t("lesson.objectiveLabel")} :</strong> {t(objectiveKey)}
            </p>
          </div>
        ) : null}
        {safeStepIndex === 0 ? <YambaGuide compact name={t("yamba.name")} message={t("yamba.lessonTip")} /> : null}
        <div className={baseStyles.stepProgressLine}>
          <strong>
            {t("lesson.stepProgress", {
              current: safeStepIndex + 1,
              total: item.steps.length,
              label: t(step.labelKey),
            })}
          </strong>
          <div
            className={baseStyles.progressTrack}
            role="progressbar"
            aria-label={t("lesson.progressLabel")}
            aria-valuemin={1}
            aria-valuemax={item.steps.length}
            aria-valuenow={safeStepIndex + 1}
          >
            <span style={{ width: `${((safeStepIndex + 1) / item.steps.length) * 100}%` }} />
          </div>
        </div>
      </header>

      {renderStep({ step, stepIndex: safeStepIndex, stepCompleted, lessonContent, evaluationContent, onValidated, onInfoConfirmed })}

      <div className={`${baseStyles.lessonActions} ${pageStyles.lessonActions}`}>
        <Link className={baseStyles.secondaryAction} to={modulePath(module.id)}>
          <CourseActionIcon className={baseStyles.actionIcon} name="back" />
          {t("lesson.back")}
        </Link>
        {stepCompleted ? (
          <button className={baseStyles.primaryAction} type="button" onClick={() => setView(nextStep?.id ?? "done")}>
            <CourseActionIcon className={baseStyles.actionIcon} name="continue" />
            {nextStep
              ? t("lesson.continue")
              : item.kind === "evaluation"
                ? t("lesson.finishEvaluation")
                : t("lesson.finish")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
