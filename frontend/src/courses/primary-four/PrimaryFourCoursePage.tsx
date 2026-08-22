import { GenericCoursePage } from "../components/GenericCoursePage";
import { lessonPath, modulePath, PRIMARY_FOUR_COURSE, PRIMARY_FOUR_MODULES } from "./course-catalogue";
import styles from "./PrimaryFourCourse.module.css";

export function PrimaryFourCoursePage() {
  return (
    <GenericCoursePage
      namespace="primaryFour"
      course={PRIMARY_FOUR_COURSE}
      modules={PRIMARY_FOUR_MODULES}
      comingSoonClassName={styles.comingSoonStatus}
      lessonPath={lessonPath}
      modulePath={modulePath}
    />
  );
}
