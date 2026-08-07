import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import commonEn from "./locales/en/common.json";
import dashboardEn from "./locales/en/dashboard.json";
import gamesEn from "./locales/en/games.json";
import progressEn from "./locales/en/progress.json";
import commonFr from "./locales/fr/common.json";
import dashboardFr from "./locales/fr/dashboard.json";
import gamesFr from "./locales/fr/games.json";
import progressFr from "./locales/fr/progress.json";
import { resolveInitialLanguage } from "./language-storage";
import { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES } from "./supported-languages";

// Toutes les traductions sont importées statiquement (pas de chargement HTTP
// à l'exécution) : deux petits jeux de fichiers JSON, aucun risque de flash
// de clés non traduites, et la langue est prête dès le premier rendu.
void i18next
  .use(initReactI18next)
  .init({
    lng: resolveInitialLanguage(),
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: ["common", "dashboard", "games", "progress"],
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
    resources: {
      fr: { common: commonFr, dashboard: dashboardFr, games: gamesFr, progress: progressFr },
      en: { common: commonEn, dashboard: dashboardEn, games: gamesEn, progress: progressEn },
    },
  });

export { i18next };
