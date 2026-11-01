import { describe, expect, it } from "vitest";

import type { CourseDefinition } from "../courses/course-engine/course-model";
import { evaluation, lesson, plannedModule } from "../courses/course-engine/course-scaffold";
import { READER_COURSES } from "./reader-courses";
import {
  findReaderCourse,
  getActiveStopIndex,
  getReaderNeighbors,
  getReaderStats,
  readerCourseFromDefinition,
} from "./reader-model";

const PREFIX = "TEST-R-U";
const FIRST = `${PREFIX}01`;

function fixtureDefinition(extraPlanned: number): CourseDefinition {
  const modules = [
    {
      id: FIRST,
      number: 1,
      titleKey: "modules.m1.title",
      illustration: "1",
      publication: "available" as const,
      plannedLessonCount: 2,
      lessons: [lesson(FIRST, 1, "lessons.l1.title"), lesson(FIRST, 2, "lessons.l2.title")],
      evaluation: evaluation(FIRST),
    },
    ...Array.from({ length: extraPlanned }, (_, index) =>
      plannedModule(PREFIX, index + 2, `modules.m${index + 2}.title`, "·"),
    ),
  ];
  return { id: "TEST-R", basePath: "/apprentissages/test/mathematiques", plannedLessonCount: 2, modules };
}

describe("Modèle neutre du lecteur", () => {
  it("construit autant de modules que le parcours en contient, sans nombre figé", () => {
    for (const extra of [2, 6]) {
      const course = readerCourseFromDefinition(fixtureDefinition(extra), "primaryFour");
      expect(course.modules).toHaveLength(extra + 1);
      expect(course.modules.map((module) => module.number)).toEqual(
        Array.from({ length: extra + 1 }, (_, index) => index + 1),
      );
    }
  });

  it("garde les chemins du parcours et distingue ce qui est publié de ce qui est à venir", () => {
    const course = readerCourseFromDefinition(fixtureDefinition(2), "primaryFour");
    const [first, second] = course.modules;
    expect(first.path).toBe(`${course.basePath}/modules/${FIRST}`);
    expect(first.published).toBe(true);
    expect(first.items.map((item) => item.kind)).toEqual(["lesson", "lesson", "evaluation"]);
    expect(first.items[0].path).toBe(`${first.path}/lecons/${first.items[0].id}`);
    expect(second.published).toBe(false);
    expect(second.items.every((item) => !item.published)).toBe(true);
  });

  it("compte uniquement les contenus publiés dans les statistiques", () => {
    const course = readerCourseFromDefinition(fixtureDefinition(3), "primaryFour");
    expect(getReaderStats(course)).toEqual({ modules: 4, publishedModules: 1, lessons: 2, evaluations: 1 });
  });

  it("repère l'étape active et les voisins : Bien démarrer, puis chaque module", () => {
    const course = readerCourseFromDefinition(fixtureDefinition(2), "primaryFour");
    const lessonPath = course.modules[0].items[0].path;

    expect(getActiveStopIndex(course, course.basePath)).toBe(0);
    expect(getActiveStopIndex(course, course.modules[1].path)).toBe(2);
    expect(getActiveStopIndex(course, lessonPath)).toBe(1);
    expect(getActiveStopIndex(course, "/ailleurs")).toBe(-1);

    expect(getReaderNeighbors(course, course.basePath).previous).toBeUndefined();
    expect(getReaderNeighbors(course, course.basePath).next?.path).toBe(course.modules[0].path);
    expect(getReaderNeighbors(course, lessonPath).previous?.path).toBe(course.basePath);
    expect(getReaderNeighbors(course, lessonPath).next?.path).toBe(course.modules[1].path);
    expect(getReaderNeighbors(course, course.modules[2].path).next).toBeUndefined();
  });

  it("retrouve le parcours à partir de l'adresse, sans confondre deux niveaux", () => {
    expect(findReaderCourse(READER_COURSES, "/apprentissages/primaire/1/mathematiques")?.id).toBe("MATH-1P");
    expect(findReaderCourse(READER_COURSES, "/apprentissages/primaire/4/mathematiques/modules/MATH-4P-U01")?.id).toBe(
      "MATH-4P",
    );
    expect(findReaderCourse(READER_COURSES, "/apprentissages/primaire/41/mathematiques")).toBeUndefined();
    expect(findReaderCourse(READER_COURSES, "/exetat")).toBeUndefined();
  });
});

describe("Registre des parcours du lecteur", () => {
  it("expose les quatre parcours disponibles, dont la 1re primaire adaptée depuis son propre modèle", () => {
    expect(READER_COURSES.map((course) => course.id)).toEqual(["MATH-1P", "MATH-2P", "MATH-3P", "MATH-4P"]);
    for (const course of READER_COURSES) {
      expect(course.modules.length).toBeGreaterThan(0);
      expect(new Set(course.modules.map((module) => module.path)).size).toBe(course.modules.length);
    }
  });
});
