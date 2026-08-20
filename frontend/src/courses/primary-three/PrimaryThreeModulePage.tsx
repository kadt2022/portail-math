import { GenericModulePage } from "../components/GenericModulePage";
import { getPrimaryThreeModule, lessonPath, PRIMARY_THREE_BASE_PATH, PRIMARY_THREE_COURSE } from "./course-catalogue";
import styles from "./PrimaryThreeCourse.module.css";

export function PrimaryThreeModulePage() {
  return (
    <GenericModulePage
      namespace="primaryThree"
      courseId={PRIMARY_THREE_COURSE.id}
      basePath={PRIMARY_THREE_BASE_PATH}
      getModuleById={getPrimaryThreeModule}
      lessonPath={lessonPath}
      comingSoonClassName={styles.comingSoonStatus}
      unavailableLabelClassName={styles.unavailableLabel}
    />
  );
}
