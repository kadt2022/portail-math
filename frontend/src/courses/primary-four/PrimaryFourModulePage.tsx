import { GenericModulePage } from "../components/GenericModulePage";
import { getPrimaryFourModule, lessonPath, PRIMARY_FOUR_BASE_PATH, PRIMARY_FOUR_COURSE } from "./course-catalogue";
import styles from "./PrimaryFourCourse.module.css";

export function PrimaryFourModulePage() {
  return (
    <GenericModulePage
      namespace="primaryFour"
      courseId={PRIMARY_FOUR_COURSE.id}
      basePath={PRIMARY_FOUR_BASE_PATH}
      getModuleById={getPrimaryFourModule}
      lessonPath={lessonPath}
      comingSoonClassName={styles.comingSoonStatus}
      unavailableLabelClassName={styles.unavailableLabel}
    />
  );
}
