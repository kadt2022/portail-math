import { beforeEach, describe, expect, it } from "vitest";

import { i18next } from "../../i18n/i18n";
import { createEmptyCourseProgress } from "../course-engine/course-progress";
import {
  courseProgressKey,
  createLocalCourseProgressStorage,
} from "../course-engine/progress-storage";
import { PRIMARY_ONE_COURSE_ID } from "../primary-one/course-catalogue";
import { PRIMARY_TWO_COURSE_ID } from "./course-catalogue";

describe("Isolation du stockage des parcours", () => {
  beforeEach(() => localStorage.clear());

  it("utilise des clés distinctes pour MATH-1P et MATH-2P", () => {
    const primaryOne = createLocalCourseProgressStorage(localStorage, PRIMARY_ONE_COURSE_ID);
    const primaryTwo = createLocalCourseProgressStorage(localStorage, PRIMARY_TWO_COURSE_ID);
    primaryOne.save(createEmptyCourseProgress(PRIMARY_ONE_COURSE_ID));
    primaryTwo.save(createEmptyCourseProgress(PRIMARY_TWO_COURSE_ID));

    expect(courseProgressKey(PRIMARY_ONE_COURSE_ID)).not.toBe(courseProgressKey(PRIMARY_TWO_COURSE_ID));
    expect(JSON.parse(localStorage.getItem(courseProgressKey(PRIMARY_ONE_COURSE_ID)) ?? "{}").courseId)
      .toBe(PRIMARY_ONE_COURSE_ID);
    expect(JSON.parse(localStorage.getItem(courseProgressKey(PRIMARY_TWO_COURSE_ID)) ?? "{}").courseId)
      .toBe(PRIMARY_TWO_COURSE_ID);
  });

  it("conserve la même progression lors du changement de langue", async () => {
    const storage = createLocalCourseProgressStorage(localStorage, PRIMARY_TWO_COURSE_ID);
    const progress = createEmptyCourseProgress(PRIMARY_TWO_COURSE_ID);
    storage.save(progress);
    const before = localStorage.getItem(courseProgressKey(PRIMARY_TWO_COURSE_ID));

    await i18next.changeLanguage("en");
    expect(storage.load()).toEqual(progress);
    expect(localStorage.getItem(courseProgressKey(PRIMARY_TWO_COURSE_ID))).toBe(before);
    await i18next.changeLanguage("fr");
  });

  it("rejette une sauvegarde appartenant à une autre année", () => {
    localStorage.setItem(
      courseProgressKey(PRIMARY_TWO_COURSE_ID),
      JSON.stringify(createEmptyCourseProgress(PRIMARY_ONE_COURSE_ID)),
    );

    expect(createLocalCourseProgressStorage(localStorage, PRIMARY_TWO_COURSE_ID).load()).toEqual(
      createEmptyCourseProgress(PRIMARY_TWO_COURSE_ID),
    );
  });
});
