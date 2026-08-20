import { GenericCoursePage } from "../components/GenericCoursePage";
import { lessonPath, modulePath, PRIMARY_THREE_COURSE, PRIMARY_THREE_MODULES } from "./course-catalogue";
import styles from "./PrimaryThreeCourse.module.css";

export function PrimaryThreeCoursePage() {
  return (
    <GenericCoursePage
      namespace="primaryThree"
      course={PRIMARY_THREE_COURSE}
      modules={PRIMARY_THREE_MODULES}
      comingSoonClassName={styles.comingSoonStatus}
      lessonPath={lessonPath}
      modulePath={modulePath}
    />
  );
}
