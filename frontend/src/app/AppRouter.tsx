import { BrowserRouter, Route, Routes } from "react-router-dom";

import { PrimaryCoursePage } from "../courses/PrimaryCoursePage";
import { PrimaryOneCoursePage } from "../courses/primary-one/PrimaryOneCoursePage";
import { PrimaryOneLessonPage } from "../courses/primary-one/PrimaryOneLessonPage";
import { PrimaryOneModulePage } from "../courses/primary-one/PrimaryOneModulePage";
import { PrimaryTwoCoursePage } from "../courses/primary-two/PrimaryTwoCoursePage";
import { PrimaryTwoLessonPage } from "../courses/primary-two/PrimaryTwoLessonPage";
import { PrimaryTwoModulePage } from "../courses/primary-two/PrimaryTwoModulePage";
import { DashboardPage } from "../dashboard/DashboardPage";
import {
  ExetatCataloguePage,
  ExetatQuizPage,
  ExetatResultsPage,
  ExetatSubjectPage,
  ExetatTrainingPage,
} from "../exetat/ExetatPages";
import { GamesCataloguePage } from "../games/GamesCataloguePage";
import { GrilleMagiquePage } from "../games/grille-magique/GrilleMagiquePage";
import { NewGameComingSoonPage } from "../games/new-game/NewGameComingSoonPage";
import { AboutPage } from "./AboutPage";
import { AppLayout } from "./AppLayout";
import { PRIMARY_COURSES } from "./course-navigation";
import { NotFoundPage } from "./NotFoundPage";
import { ProgressionPage } from "./ProgressionPage";

// Le basename est fixé à /app : react-router-dom compose alors des chemins
// absolus (/app/jeux, ...) sans qu'aucune route ne répète le préfixe.
// Spring Boot sert déjà index.html pour toute URL sous /app/** qui ne
// correspond à aucun fichier réel (voir ReactPortalWebConfig côté Java) :
// c'est ce qui permet à une actualisation directe de fonctionner.
export function AppRouter() {
  return (
    <BrowserRouter basename="/app">
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="exetat" element={<ExetatCataloguePage />} />
          <Route path="exetat/matieres/:subjectId" element={<ExetatSubjectPage />} />
          <Route
            path="exetat/matieres/:subjectId/entrainement"
            element={<ExetatTrainingPage />}
          />
          <Route path="exetat/matieres/:subjectId/quiz" element={<ExetatQuizPage />} />
          <Route path="exetat/quizzes/:quizId/resultats" element={<ExetatResultsPage />} />
          <Route path="jeux" element={<GamesCataloguePage />} />
          <Route path="jeux/grille-magique" element={<GrilleMagiquePage />} />
          <Route path="jeux/nouveau-jeu-react" element={<NewGameComingSoonPage />} />
          <Route path="progression" element={<ProgressionPage />} />
          <Route path="a-propos" element={<AboutPage />} />
          <Route
            path="apprentissages/primaire/1/mathematiques"
            element={<PrimaryOneCoursePage />}
          />
          <Route
            path="apprentissages/primaire/1/mathematiques/modules/:moduleId"
            element={<PrimaryOneModulePage />}
          />
          <Route
            path="apprentissages/primaire/1/mathematiques/modules/:moduleId/lecons/:lessonId"
            element={<PrimaryOneLessonPage />}
          />
          <Route
            path="apprentissages/primaire/2/mathematiques"
            element={<PrimaryTwoCoursePage />}
          />
          <Route
            path="apprentissages/primaire/2/mathematiques/modules/:moduleId"
            element={<PrimaryTwoModulePage />}
          />
          <Route
            path="apprentissages/primaire/2/mathematiques/modules/:moduleId/lecons/:lessonId"
            element={<PrimaryTwoLessonPage />}
          />
          {PRIMARY_COURSES.filter((course) => course.availability === "coming-soon").map((course) => (
            <Route
              key={course.id}
              path={course.route.replace(/^\//, "")}
              element={<PrimaryCoursePage course={course} />}
            />
          ))}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
