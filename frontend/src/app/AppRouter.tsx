import { BrowserRouter, Route, Routes } from "react-router-dom";

import { loadCourseNamespaces } from "../i18n/course-namespaces";
import { DashboardPage } from "../dashboard/DashboardPage";
import { AppLayout } from "./AppLayout";
import { PRIMARY_COURSES } from "./course-navigation";
import { lazyRoute } from "./LazyRoute";
import { NotFoundPage } from "./NotFoundPage";
import { loadLeoEngine } from "../games/leo-driving/leoEngine";

// LEO-PERF-02 : chaque page est téléchargée seulement quand on l'ouvre. Le tableau de bord, la mise en page et la
// page introuvable restent dans le fichier principal (premier affichage). Ouvrir un jeu ne télécharge plus le
// contenu de toutes les classes ; une page de cours apporte ses propres traductions (loadCourseNamespaces).
const withCourseTexts = <T,>(load: Promise<T>) => Promise.all([load, loadCourseNamespaces()]).then(([module]) => module);

const CourseReaderLayout = lazyRoute(() => withCourseTexts(import("../reader/CourseReaderLayout")).then((m) => m.CourseReaderLayout));
const PrimaryCoursePage = lazyRoute(() => withCourseTexts(import("../courses/PrimaryCoursePage")).then((m) => m.PrimaryCoursePage));
const PrimaryOneCoursePage = lazyRoute(() => withCourseTexts(import("../courses/primary-one/PrimaryOneCoursePage")).then((m) => m.PrimaryOneCoursePage));
const PrimaryOneModulePage = lazyRoute(() => withCourseTexts(import("../courses/primary-one/PrimaryOneModulePage")).then((m) => m.PrimaryOneModulePage));
const PrimaryOneLessonPage = lazyRoute(() => withCourseTexts(import("../courses/primary-one/PrimaryOneLessonPage")).then((m) => m.PrimaryOneLessonPage));
const PrimaryTwoCoursePage = lazyRoute(() => withCourseTexts(import("../courses/primary-two/PrimaryTwoCoursePage")).then((m) => m.PrimaryTwoCoursePage));
const PrimaryTwoModulePage = lazyRoute(() => withCourseTexts(import("../courses/primary-two/PrimaryTwoModulePage")).then((m) => m.PrimaryTwoModulePage));
const PrimaryTwoLessonPage = lazyRoute(() => withCourseTexts(import("../courses/primary-two/PrimaryTwoLessonPage")).then((m) => m.PrimaryTwoLessonPage));
const PrimaryThreeCoursePage = lazyRoute(() => withCourseTexts(import("../courses/primary-three/PrimaryThreeCoursePage")).then((m) => m.PrimaryThreeCoursePage));
const PrimaryThreeModulePage = lazyRoute(() => withCourseTexts(import("../courses/primary-three/PrimaryThreeModulePage")).then((m) => m.PrimaryThreeModulePage));
const PrimaryThreeLessonPage = lazyRoute(() => withCourseTexts(import("../courses/primary-three/PrimaryThreeLessonPage")).then((m) => m.PrimaryThreeLessonPage));
const PrimaryFourCoursePage = lazyRoute(() => withCourseTexts(import("../courses/primary-four/PrimaryFourCoursePage")).then((m) => m.PrimaryFourCoursePage));
const PrimaryFourModulePage = lazyRoute(() => withCourseTexts(import("../courses/primary-four/PrimaryFourModulePage")).then((m) => m.PrimaryFourModulePage));
const PrimaryFourLessonPage = lazyRoute(() => withCourseTexts(import("../courses/primary-four/PrimaryFourLessonPage")).then((m) => m.PrimaryFourLessonPage));

const FreePathPage = lazyRoute(() => import("../free-path/FreePathPages").then((m) => m.FreePathPage));
const FreePathTestsPage = lazyRoute(() => import("../free-path/FreePathPages").then((m) => m.FreePathTestsPage));
const FreePathExamsPage = lazyRoute(() => import("../free-path/FreePathPages").then((m) => m.FreePathExamsPage));
const ExetatCataloguePage = lazyRoute(() => import("../exetat/ExetatPages").then((m) => m.ExetatCataloguePage));
const ExetatSubjectPage = lazyRoute(() => import("../exetat/ExetatPages").then((m) => m.ExetatSubjectPage));
const ExetatTrainingPage = lazyRoute(() => import("../exetat/ExetatPages").then((m) => m.ExetatTrainingPage));
const ExetatQuizPage = lazyRoute(() => import("../exetat/ExetatPages").then((m) => m.ExetatQuizPage));
const ExetatResultsPage = lazyRoute(() => import("../exetat/ExetatPages").then((m) => m.ExetatResultsPage));
const LibraryPage = lazyRoute(() => import("../library/LibraryPage").then((m) => m.LibraryPage));
const LibraryReaderPage = lazyRoute(() => import("../library/LibraryReaderPage").then((m) => m.LibraryReaderPage));
const GamesCataloguePage = lazyRoute(() => import("../games/GamesCataloguePage").then((m) => m.GamesCataloguePage));
const GrilleMagiquePage = lazyRoute(() => import("../games/grille-magique/GrilleMagiquePage").then((m) => m.GrilleMagiquePage));
const NewGameComingSoonPage = lazyRoute(() => import("../games/new-game/NewGameComingSoonPage").then((m) => m.NewGameComingSoonPage));
// Turbo Pulse et Léo embarquent Phaser (moteur de jeu lourd, avec effets de bord au chargement du module).
const TurboPulsePage = lazyRoute(() => import("../games/turbo-pulse/TurboPulsePage").then((m) => m.TurboPulsePage), { heavy: true });
// Le moteur de Léo est demandé en même temps que la page (et non une fois le lecteur affiché) : les visites suivantes ne
// l'attendent pas.
const LeoDrivingGamePage = lazyRoute(
  () => {
    void loadLeoEngine().catch(() => undefined);
    return import("../games/leo-driving/LeoDrivingGamePage").then((m) => m.LeoDrivingGamePage);
  },
  { heavy: true },
);
const LeoLivreurPrototypePage = lazyRoute(() => import("../prototypes/leo-livreur/LeoLivreurPrototypePage").then((m) => m.LeoLivreurPrototypePage), { heavy: true });
const MangoBasketPrototypePage = lazyRoute(() => import("../prototypes/mango-basket/MangoBasketPrototypePage").then((m) => m.MangoBasketPrototypePage), { heavy: true });
const ProgressionPage = lazyRoute(() => import("./ProgressionPage").then((m) => m.ProgressionPage));
const AboutPage = lazyRoute(() => import("./AboutPage").then((m) => m.AboutPage));

// Le basename est fixé à /app : react-router-dom compose alors des chemins
// absolus (/app/jeux, ...) sans qu'aucune route ne répète le préfixe.
// Spring Boot sert déjà index.html pour toute URL sous /app/** qui ne
// correspond à aucun fichier réel (voir ReactPortalWebConfig côté Java) :
// c'est ce qui permet à une actualisation directe de fonctionner.
export function AppRouter() {
  return (
    <BrowserRouter basename="/app">
      <Routes>
        <Route element={<CourseReaderLayout />}>
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
          <Route
            path="apprentissages/primaire/3/mathematiques"
            element={<PrimaryThreeCoursePage />}
          />
          <Route
            path="apprentissages/primaire/3/mathematiques/modules/:moduleId"
            element={<PrimaryThreeModulePage />}
          />
          <Route
            path="apprentissages/primaire/3/mathematiques/modules/:moduleId/lecons/:lessonId"
            element={<PrimaryThreeLessonPage />}
          />
          <Route
            path="apprentissages/primaire/4/mathematiques"
            element={<PrimaryFourCoursePage />}
          />
          <Route
            path="apprentissages/primaire/4/mathematiques/modules/:moduleId"
            element={<PrimaryFourModulePage />}
          />
          <Route
            path="apprentissages/primaire/4/mathematiques/modules/:moduleId/lecons/:lessonId"
            element={<PrimaryFourLessonPage />}
          />
        </Route>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="parcours-libre" element={<FreePathPage />} />
          <Route path="parcours-libre/tests" element={<FreePathTestsPage />} />
          <Route path="parcours-libre/examens" element={<FreePathExamsPage />} />
          <Route path="exetat" element={<ExetatCataloguePage />} />
          <Route path="exetat/matieres/:subjectId" element={<ExetatSubjectPage />} />
          <Route
            path="exetat/matieres/:subjectId/entrainement"
            element={<ExetatTrainingPage />}
          />
          <Route path="exetat/matieres/:subjectId/quiz" element={<ExetatQuizPage />} />
          <Route path="exetat/quizzes/:quizId/resultats" element={<ExetatResultsPage />} />
          <Route path="bibliotheque" element={<LibraryPage />} />
          <Route path="bibliotheque/:bookId" element={<LibraryReaderPage />} />
          <Route path="jeux" element={<GamesCataloguePage />} />
          <Route path="jeux/grille-magique" element={<GrilleMagiquePage />} />
          <Route
            path="jeux/turbo-pulse"
            element={
              <TurboPulsePage />
            }
          />
          <Route
            path="jeux/conduire-avec-leo"
            element={
              <LeoDrivingGamePage />
            }
          />
          <Route path="jeux/nouveau-jeu-react" element={<NewGameComingSoonPage />} />
          <Route path="progression" element={<ProgressionPage />} />
          <Route path="a-propos" element={<AboutPage />} />
          <Route
            path="prototypes/mangues-yamba"
            element={
              <MangoBasketPrototypePage />
            }
          />
          <Route
            path="prototypes/leo-livreur"
            element={
              <LeoLivreurPrototypePage />
            }
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

