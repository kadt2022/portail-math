import { BrowserRouter, Route, Routes } from "react-router-dom";

import { DashboardPage } from "../dashboard/DashboardPage";
import { GamesCataloguePage } from "../games/GamesCataloguePage";
import { NewGameComingSoonPage } from "../games/new-game/NewGameComingSoonPage";
import { AppLayout } from "./AppLayout";
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
          <Route path="jeux" element={<GamesCataloguePage />} />
          <Route path="jeux/nouveau-jeu-react" element={<NewGameComingSoonPage />} />
          <Route path="progression" element={<ProgressionPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
