import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";

import { GenericLessonPage } from "../components/GenericLessonPage";
import { ExplanationBlock } from "../components/exercise-kit/ExplanationBlock";
import { GuidedExample } from "../components/exercise-kit/GuidedExample";
import { LessonSummary } from "../components/exercise-kit/LessonSummary";
import { SelfAssessment } from "../components/exercise-kit/SelfAssessment";
import { SituationBlock } from "../components/exercise-kit/SituationBlock";
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
import { usePrimaryFourContent } from "./content-api";
import { InteractiveExercise } from "./exercises/InteractiveExercise";
import type { EvaluationContent, LessonContent } from "./lesson-content";
import styles from "./PrimaryFourLesson.module.css";

const NAMESPACE = "primaryFour";

export function PrimaryFourLessonPage() {
  const { moduleId, lessonId } = useParams();
  const { t } = useTranslation(NAMESPACE);
  const module = getPrimaryFourModule(moduleId);
  const item = module ? getPrimaryFourItem(module, lessonId) : undefined;
  const { content, loading, error } = usePrimaryFourContent(item?.id);

  if (!item || !lessonId) {
    return <h1 className={styles.remoteStatus}>{t("errors.lessonNotFound")}</h1>;
  }

  if (loading) {
    return <p className={styles.remoteStatus}>{t("lesson.loading")}</p>;
  }

  if (error || !content) {
    return <p className={styles.remoteStatus}>{t("errors.contentUnavailable")}</p>;
  }

  const lessonContentById = content.lesson ? { [lessonId]: content.lesson } : {};
  const evaluationContentById = content.evaluation ? { [lessonId]: content.evaluation } : {};

  return (
    <GenericLessonPage<LessonContent, EvaluationContent>
      namespace={NAMESPACE}
      course={PRIMARY_FOUR_COURSE}
      modules={PRIMARY_FOUR_MODULES}
      basePath={PRIMARY_FOUR_BASE_PATH}
      getModuleById={getPrimaryFourModule}
      getItemById={getPrimaryFourItem}
      modulePath={modulePath}
      lessonPath={lessonPath}
      lessonContentById={lessonContentById}
      evaluationContentById={evaluationContentById}
      getObjectiveKey={(lessonContent, evaluationContent) => lessonContent?.objectiveKey ?? evaluationContent?.introKey}
      pageStyles={{
        duration: styles.duration,
        lessonContext: styles.lessonContext,
        lessonActions: styles.lessonActions,
      }}
      renderStep={({ step, stepIndex, stepCompleted, lessonContent, evaluationContent, onValidated, onInfoConfirmed }) => {
        if (evaluationContent) {
          if (step.kind === "assess") {
            return <SelfAssessment namespace={NAMESPACE} completed={stepCompleted} onValidated={onInfoConfirmed} />;
          }
          const question = evaluationContent.items[stepIndex];
          return <InteractiveExercise {...question} completed={stepCompleted} onValidated={onValidated} />;
        }

        if (!lessonContent) {
          return null;
        }

        switch (step.kind) {
          case "situation":
            return (
              <SituationBlock
                namespace={NAMESPACE}
                textKey={lessonContent.situationKey}
                completed={stepCompleted}
                onValidated={onInfoConfirmed}
              />
            );
          case "discover":
            return (
              <ExplanationBlock
                namespace={NAMESPACE}
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
                namespace={NAMESPACE}
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
                namespace={NAMESPACE}
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
      }}
    />
  );
}
