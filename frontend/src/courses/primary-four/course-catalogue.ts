import type { CourseDefinition, CourseModule } from "../course-engine/course-model";
import { courseLessonPath, courseModulePath } from "../course-engine/course-model";
import { evaluation, findItem, findModule, lesson, plannedModule } from "../course-engine/course-scaffold";

export const PRIMARY_FOUR_COURSE_ID = "MATH-4P";
export const PRIMARY_FOUR_BASE_PATH = "/apprentissages/primaire/4/mathematiques";
const MODULE_ID_PREFIX = "MATH-4P-U";

// Identifiant réservé pour le grand bilan final (§4/§30 du récit) : hors
// modules, il n'a pas encore de carte ni de contenu dans cette itération
// (seule l'unité 1 est jouable), mais l'identifiant est fixé dès maintenant
// pour ne jamais créer une seconde nomenclature plus tard.
export const PRIMARY_FOUR_FINAL_ASSESSMENT_ID = "MATH-4P-BILAN";

const MODULE_ONE_ID = `${MODULE_ID_PREFIX}01`;

export const PRIMARY_FOUR_MODULES: readonly CourseModule[] = [
  {
    id: MODULE_ONE_ID,
    number: 1,
    titleKey: "modules.m1.title",
    illustration: "0 · 100 000",
    publication: "available",
    plannedLessonCount: 4,
    lessons: [
      lesson(MODULE_ONE_ID, 1, "lessons.l1.title"),
      lesson(MODULE_ONE_ID, 2, "lessons.l2.title"),
      lesson(MODULE_ONE_ID, 3, "lessons.l3.title"),
      lesson(MODULE_ONE_ID, 4, "lessons.l4.title"),
    ],
    evaluation: evaluation(MODULE_ONE_ID),
  },
  plannedModule(MODULE_ID_PREFIX, 2, "modules.m2.title", "+ −"),
  plannedModule(MODULE_ID_PREFIX, 3, "modules.m3.title", "×"),
  plannedModule(MODULE_ID_PREFIX, 4, "modules.m4.title", "÷"),
  plannedModule(MODULE_ID_PREFIX, 5, "modules.m5.title", "½ 0,1"),
  plannedModule(MODULE_ID_PREFIX, 6, "modules.m6.title", "cm · kg · L"),
  plannedModule(MODULE_ID_PREFIX, 7, "modules.m7.title", "▭"),
  plannedModule(MODULE_ID_PREFIX, 8, "modules.m8.title", "△ ○"),
  plannedModule(MODULE_ID_PREFIX, 9, "modules.m9.title", "◷ FC"),
  plannedModule(MODULE_ID_PREFIX, 10, "modules.m10.title", "▤"),
] as const;

export const PRIMARY_FOUR_COURSE: CourseDefinition = {
  id: PRIMARY_FOUR_COURSE_ID,
  basePath: PRIMARY_FOUR_BASE_PATH,
  plannedLessonCount: 40,
  modules: PRIMARY_FOUR_MODULES,
};

export function getPrimaryFourModule(moduleId: string | undefined) {
  return findModule(PRIMARY_FOUR_MODULES, moduleId);
}

export function getPrimaryFourItem(module: CourseModule, itemId: string | undefined) {
  return findItem(module, itemId);
}

export function modulePath(moduleId: string) {
  return courseModulePath(PRIMARY_FOUR_COURSE, moduleId);
}

export function lessonPath(moduleId: string, lessonId: string) {
  return courseLessonPath(PRIMARY_FOUR_COURSE, moduleId, lessonId);
}
