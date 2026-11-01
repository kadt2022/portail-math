import { Outlet, useLocation } from "react-router-dom";

import { READER_COURSES } from "./reader-courses";
import { findReaderCourse } from "./reader-model";
import { ReaderShell } from "./ReaderShell";

// Route-mère des parcours de cours : elle retrouve le parcours à partir de l'adresse et l'enveloppe
// dans le lecteur. Hors d'un parcours connu, elle laisse simplement passer la page.
export function CourseReaderLayout() {
  const { pathname } = useLocation();
  const course = findReaderCourse(READER_COURSES, pathname);

  return course ? <ReaderShell course={course} /> : <Outlet />;
}
