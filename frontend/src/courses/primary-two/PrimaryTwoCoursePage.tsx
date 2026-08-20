import { GenericCoursePage } from "../components/GenericCoursePage";
import { lessonPath, modulePath, PRIMARY_TWO_COURSE, PRIMARY_TWO_MODULES } from "./course-catalogue";
import styles from "./PrimaryTwoCourse.module.css";

export function PrimaryTwoCoursePage() {
  return (
    <GenericCoursePage
      namespace="primaryTwo"
      course={PRIMARY_TWO_COURSE}
      modules={PRIMARY_TWO_MODULES}
      comingSoonClassName={styles.comingSoonStatus}
      lessonPath={lessonPath}
      modulePath={modulePath}
    />
  );
}
