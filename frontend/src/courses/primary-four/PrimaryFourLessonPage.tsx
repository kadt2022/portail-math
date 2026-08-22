import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { CourseActionIcon } from "../components/CourseActionIcon";
import { ExplanationBlock } from "../components/exercise-kit/ExplanationBlock";
import { GuidedExample } from "../components/exercise-kit/GuidedExample";
import { LessonSummary } from "../components/exercise-kit/LessonSummary";
import { SelfAssessment } from "../components/exercise-kit/SelfAssessment";
import { SituationBlock } from "../components/exercise-kit/SituationBlock";
import { YambaGuide } from "../components/YambaGuide";
import { getModuleItems, isPublished } from "../course-engine/course-model";
import { useCourseProgress } from "../course-engine/useCourseProgress";
import baseStyles from "../primary-one/PrimaryOneCourse.module.css";
import { PlaceValueRevealBoard } from "./blocks/PlaceValueRevealBoard";
import {
  getPrimaryFourItem,
  getPrimaryFourModule,
  lessonPath,
  modulePath,
  PRIMARY_FOUR_BASE_PATH,
  PRIMARY_FOUR_COURSE,
  PRIMARY_FOUR_MODULES,
} from "./course-catalogue";
import { PRIMARY_FOUR_EVALUATION_CONTENT, PRIMARY_FOUR_LESSON_CONTENT } from "./content";
import { InteractiveExercise } from "./exercises/InteractiveExercise";
import styles from "./PrimaryFourLesson.module.css";

export function PrimaryFourLessonPage() {
  const { moduleId, lessonId } = useParams();
  const { t } = useTranslation("primaryFour");
  const { progress, startItem, completeStep } = useCourseProgress(PRIMARY_FOUR_COURSE.id);
  const module = getPrimaryFourModule(moduleId);
  const item = module ? getPrimaryFourItem(module, lessonId) : undefined;
  const [viewByItem, setViewByItem] = useState<Record<string, string | "done">>({});

  const lessonContent = item?.kind === "lesson" ? PRIMARY_FOUR_LESSON_CONTENT[item.id] : undefined;
  const evaluationContent = item?.kind === "evaluation" ? PRIMARY_FOUR_EVALUATION_CONTENT[item.id] : undefined;
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
        <Link className={baseStyles.secondaryAction} to={PRIMARY_FOUR_BASE_PATH}>
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
    const nextModule = PRIMARY_FOUR_MODULES[module.number];
    const nextModulePublished = nextModule ? isPublished(nextModule.lessons[0]) : false;
    const primaryHref = nextItem
      ? lessonPath(module.id, nextItem.id)
      : nextModulePublished && nextModule
        ? modulePath(nextModule.id)
        : PRIMARY_FOUR_BASE_PATH;
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

  function renderStep() {
    if (evaluationContent) {
      if (step.kind === "assess") {
        return <SelfAssessment namespace="primaryFour" completed={stepCompleted} onValidated={onInfoConfirmed} />;
      }
      const question = evaluationContent.items[safeStepIndex];
      return <InteractiveExercise {...question} completed={stepCompleted} onValidated={onValidated} />;
    }

    if (!lessonContent) {
      return null;
    }

    switch (step.kind) {
      case "situation":
        return (
          <SituationBlock
            namespace="primaryFour"
            textKey={lessonContent.situationKey}
            completed={stepCompleted}
            onValidated={onInfoConfirmed}
          />
        );
      case "discover":
        return (
          <ExplanationBlock
            namespace="primaryFour"
            textKey={lessonContent.discoverKey}
            completed={stepCompleted}
            onValidated={onInfoConfirmed}
            figure={
              lessonContent.discoverFigureValue !== undefined ? (
                <PlaceValueRevealBoard value={lessonContent.discoverFigureValue} />
              ) : undefined
            }
          />
        );
      case "manipulate":
        return <InteractiveExercise {...lessonContent.manipulate} completed={stepCompleted} onValidated={onValidated} />;
      case "example":
        return (
          <GuidedExample
            namespace="primaryFour"
            methodKey={lessonContent.exampleMethodKey}
            promptKeys={lessonContent.examplePromptKeys}
            completed={stepCompleted}
            onValidated={onInfoConfirmed}
          />
        );
      case "practice":
        return <InteractiveExercise {...lessonContent.practice} completed={stepCompleted} onValidated={onValidated} />;
      case "reflect":
        return <InteractiveExercise {...lessonContent.reflect} completed={stepCompleted} onValidated={onValidated} />;
      case "play":
        return <InteractiveExercise {...lessonContent.play} completed={stepCompleted} onValidated={onValidated} />;
      case "remember":
        return (
          <LessonSummary
            namespace="primaryFour"
            textKey={lessonContent.rememberKey}
            completed={stepCompleted}
            onValidated={onInfoConfirmed}
          />
        );
      case "check":
        return <InteractiveExercise {...lessonContent.check} completed={stepCompleted} onValidated={onValidated} />;
      default:
        return null;
    }
  }

  const objectiveKey = lessonContent?.objectiveKey ?? evaluationContent?.introKey;

  return (
    <div className={baseStyles.lessonPage}>
      <header className={baseStyles.lessonHeader}>
        <nav className={baseStyles.breadcrumbs} aria-label={t("breadcrumbs.label")}>
          <Link to={PRIMARY_FOUR_BASE_PATH}>{t("breadcrumbs.course")}</Link>
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
          {item.kind === "lesson" ? <span className={styles.duration}>{t("lesson.duration")}</span> : null}
        </div>
        {objectiveKey ? (
          <div className={styles.lessonContext}>
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

      {renderStep()}

      <div className={`${baseStyles.lessonActions} ${styles.lessonActions}`}>
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
