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
import primaryFourEn from "./locales/en/primaryFour.json";
import primaryOneEn from "./locales/en/primaryOne.json";
import primaryThreeEn from "./locales/en/primaryThree.json";
import primaryTwoEn from "./locales/en/primaryTwo.json";
import primaryTwoLessonsEn from "./locales/en/primaryTwoLessons.json";
import commonFr from "./locales/fr/common.json";
import dashboardFr from "./locales/fr/dashboard.json";
import exetatFr from "./locales/fr/exetat.json";
import gamesFr from "./locales/fr/games.json";
import libraryFr from "./locales/fr/library.json";
import learningWorldFr from "./locales/fr/learningWorld.json";
import progressFr from "./locales/fr/progress.json";
import primaryFourFr from "./locales/fr/primaryFour.json";
import primaryOneFr from "./locales/fr/primaryOne.json";
import primaryThreeFr from "./locales/fr/primaryThree.json";
import primaryTwoFr from "./locales/fr/primaryTwo.json";
import primaryTwoLessonsFr from "./locales/fr/primaryTwoLessons.json";
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
        primaryOne: primaryOneFr,
        primaryTwo: primaryTwoFr,
        primaryTwoLessons: primaryTwoLessonsFr,
        primaryThree: primaryThreeFr,
        primaryFour: primaryFourFr,
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
        primaryOne: primaryOneEn,
        primaryTwo: primaryTwoEn,
        // Les activités interactives sont publiées en français seulement.
        primaryTwoLessons: primaryTwoLessonsEn,
        primaryThree: primaryThreeEn,
        primaryFour: primaryFourEn,
      },
    },
  });

export { i18next };
