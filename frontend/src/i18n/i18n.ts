import i18next from "i18next";
import { initReactI18next } from "react-i18next";

import freePathEn from "./locales/en/freePath.json";
import readerEn from "./locales/en/reader.json";
import freePathFr from "./locales/fr/freePath.json";
import readerFr from "./locales/fr/reader.json";
import commonEn from "./locales/en/common.json";
import dashboardEn from "./locales/en/dashboard.json";
import exetatEn from "./locales/en/exetat.json";
import gamesEn from "./locales/en/games.json";
import libraryEn from "./locales/en/library.json";
import learningWorldEn from "./locales/en/learningWorld.json";
import progressEn from "./locales/en/progress.json";
import commonFr from "./locales/fr/common.json";
import dashboardFr from "./locales/fr/dashboard.json";
import exetatFr from "./locales/fr/exetat.json";
import gamesFr from "./locales/fr/games.json";
import libraryFr from "./locales/fr/library.json";
import learningWorldFr from "./locales/fr/learningWorld.json";
import progressFr from "./locales/fr/progress.json";
import { resolveInitialLanguage } from "./language-storage";
import { FALLBACK_LANGUAGE, SUPPORTED_LANGUAGES } from "./supported-languages";

// Les traductions communes sont importées statiquement : la langue est prête dès le premier rendu. Celles des cours
// (texte des leçons, ≈ 750 Ko) sont chargées avec leurs pages : voir course-namespaces.ts (LEO-PERF-02).
void i18next
  .use(initReactI18next)
  .init({
    lng: resolveInitialLanguage(),
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    ns: [
      "freePath",
      "reader",
      "common",
      "dashboard",
      "exetat",
      "games",
      "library",
      "learningWorld",
      "progress",
      "primaryOne",
      "primaryTwo",
      "primaryTwoLessons",
      "primaryThree",
      "primaryFour",
    ],
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
    resources: {
      fr: {
        freePath: freePathFr,
        reader: readerFr,
        common: commonFr,
        dashboard: dashboardFr,
        exetat: exetatFr,
        games: gamesFr,
        library: libraryFr,
        learningWorld: learningWorldFr,
        progress: progressFr,
      },
      en: {
        freePath: freePathEn,
        reader: readerEn,
        common: commonEn,
        dashboard: dashboardEn,
        exetat: exetatEn,
        games: gamesEn,
        library: libraryEn,
        learningWorld: learningWorldEn,
        progress: progressEn,
      },
    },
  });

export { i18next };
