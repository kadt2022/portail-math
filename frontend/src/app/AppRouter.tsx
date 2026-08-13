import { Capacitor } from "@capacitor/core";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { PrimaryCoursePage } from "../courses/PrimaryCoursePage";
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

// Spring Boot sert le portail web sous /app. Capacitor sert le même bundle à
// la racine de sa WebView : le basename doit donc être retiré uniquement sur
// Android, sans modifier les routes du déploiement web existant.
export function AppRouter() {
  const basename = Capacitor.isNativePlatform() ? undefined : "/app";

  return (
    <BrowserRouter basename={basename}>
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
          {PRIMARY_COURSES.map((course) => (
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
