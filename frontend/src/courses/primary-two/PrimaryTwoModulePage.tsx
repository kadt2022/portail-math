import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { GenericModulePage } from "../components/GenericModulePage";
import type { CourseModule } from "../course-engine/course-model";
import type { CourseProgress } from "../course-engine/course-progress";
import { getPrimaryTwoModule, lessonPath, PRIMARY_TWO_BASE_PATH, PRIMARY_TWO_COURSE } from "./course-catalogue";
import { moduleContinue } from "./journey";
import { JourneyTrail } from "./JourneyNavigation";
import journeyStyles from "./JourneyNavigation.module.css";
import styles from "./PrimaryTwoCourse.module.css";

// Sur la page d'un module, l'enfant voit son petit chemin et un seul gros
// bouton qui mène à ce qu'il doit faire maintenant (ou au module suivant).
function ModuleContinue({ module, progress }: { module: CourseModule; progress: CourseProgress }) {
  const { t } = useTranslation("primaryTwo");
  const action = moduleContinue(progress, module);
  return (
    <div className={journeyStyles.moduleContinue}>
      <JourneyTrail module={module} currentItemId="" progress={progress} />
      {action.type === "finished" ? (
        <Link className={journeyStyles.continue} to={PRIMARY_TWO_BASE_PATH}>
          {t("journey.backToCourse")} <span aria-hidden="true">▶</span>
        </Link>
      ) : (
        <>
          <Link className={journeyStyles.continue} to={lessonPath(action.stop.module.id, action.stop.item.id)}>
            {t(`journey.module.${action.type}`)} <span aria-hidden="true">▶</span>
          </Link>
          <span className={journeyStyles.nextName}>
            {action.type === "next-module"
              ? t("journey.nextModuleName", { number: action.stop.module.number, title: t(action.stop.module.titleKey) })
              : t(action.stop.item.titleKey)}
          </span>
        </>
      )}
    </div>
  );
}

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
      renderHeroAction={(module, progress) => <ModuleContinue module={module} progress={progress} />}
    />
  );
}
