import {
  getLearningItems,
  lessonPath as primaryOneLessonPath,
  modulePath as primaryOneModulePath,
  PRIMARY_ONE_BASE_PATH,
  PRIMARY_ONE_COURSE_ID,
  PRIMARY_ONE_MODULES,
} from "../courses/primary-one/course-catalogue";
import { getCourseProgress as getPrimaryOneCourseProgress } from "../courses/primary-one/course-progress";
import { normalizePrimaryOneProgress } from "../courses/primary-one/normalize-progress";
import { PRIMARY_FOUR_COURSE } from "../courses/primary-four/course-catalogue";
import { PRIMARY_THREE_COURSE } from "../courses/primary-three/course-catalogue";
import { PRIMARY_TWO_COURSE } from "../courses/primary-two/course-catalogue";
import { readerCourseFromDefinition, type ReaderCourse } from "./reader-model";

// La 1re primaire garde son propre modèle de données : cet adaptateur le traduit
// dans le modèle neutre du lecteur, sans rien changer à son catalogue.
const primaryOne: ReaderCourse = {
  id: PRIMARY_ONE_COURSE_ID,
  namespace: "primaryOne",
  basePath: PRIMARY_ONE_BASE_PATH,
  modules: PRIMARY_ONE_MODULES.map((module) => ({
    id: module.id,
    number: module.number,
    titleKey: module.titleKey,
    path: primaryOneModulePath(module.id),
    published: module.lessons.length > 0,
    items: getLearningItems(module).map((item) => ({
      id: item.id,
      kind: item.kind,
      titleKey: item.titleKey,
      path: primaryOneLessonPath(module.id, item.id),
      published: item.steps.length > 0,
    })),
  })),
  prepareProgress: normalizePrimaryOneProgress,
  summarizeProgress: (progress) => getPrimaryOneCourseProgress(progress),
};

// Ajouter un parcours au lecteur = ajouter une ligne ici (et ses routes). Le secondaire
// s'ajoutera de la même façon dès que son catalogue existera.
export const READER_COURSES: readonly ReaderCourse[] = [
  primaryOne,
  readerCourseFromDefinition(PRIMARY_TWO_COURSE, "primaryTwo"),
  readerCourseFromDefinition(PRIMARY_THREE_COURSE, "primaryThree"),
  readerCourseFromDefinition(PRIMARY_FOUR_COURSE, "primaryFour"),
];
