import { GenericModulePage } from "../components/GenericModulePage";
import { getPrimaryTwoModule, lessonPath, PRIMARY_TWO_BASE_PATH, PRIMARY_TWO_COURSE } from "./course-catalogue";
import { PrimaryTwoModuleContinue } from "./JourneyNavigation";
import styles from "./PrimaryTwoCourse.module.css";

// Sur la page d'un module, l'enfant voit son petit chemin et un seul gros
// bouton qui mène à ce qu'il doit faire maintenant (ou au module suivant).
export function PrimaryTwoModulePage() {
  return (
    <GenericModulePage
      namespace="primaryTwo"
      courseId={PRIMARY_TWO_COURSE.id}
      basePath={PRIMARY_TWO_BASE_PATH}
      getModuleById={getPrimaryTwoModule}
      lessonPath={lessonPath}
      comingSoonClassName={styles.comingSoonStatus}
      unavailableLabelClassName={styles.unavailableLabel}
      renderHeroAction={(module, progress) => <PrimaryTwoModuleContinue module={module} progress={progress} />}
    />
  );
}
