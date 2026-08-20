import { GenericModulePage } from "../components/GenericModulePage";
import { getPrimaryTwoModule, lessonPath, PRIMARY_TWO_BASE_PATH, PRIMARY_TWO_COURSE } from "./course-catalogue";
import styles from "./PrimaryTwoCourse.module.css";

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
    />
  );
}
