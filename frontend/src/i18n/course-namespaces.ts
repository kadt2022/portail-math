// Traductions des cours, chargées à la demande (LEO-PERF-02, étape 2).
//
// Ces cinq espaces de noms contiennent tout le texte des leçons (≈ 750 Ko bruts pour les deux langues). Importés
// statiquement, ils alourdissaient le fichier principal du portail, téléchargé par TOUTES les pages, jeux compris.
// Ils sont maintenant chargés seulement quand une page de cours s'ouvre ; le contenu des fichiers n'est pas modifié.

import { i18next } from "./i18n";

type Bundle = Record<string, unknown>;
type Loader = () => Promise<{ fr: Bundle; en: Bundle }>;

const pair = (fr: Promise<{ default: Bundle }>, en: Promise<{ default: Bundle }>) =>
  Promise.all([fr, en]).then(([frModule, enModule]) => ({ fr: frModule.default, en: enModule.default }));

const LOADERS: Record<CourseNamespace, Loader> = {
  primaryOne: () => pair(import("./locales/fr/primaryOne.json"), import("./locales/en/primaryOne.json")),
  primaryTwo: () => pair(import("./locales/fr/primaryTwo.json"), import("./locales/en/primaryTwo.json")),
  primaryTwoLessons: () => pair(import("./locales/fr/primaryTwoLessons.json"), import("./locales/en/primaryTwoLessons.json")),
  primaryThree: () => pair(import("./locales/fr/primaryThree.json"), import("./locales/en/primaryThree.json")),
  primaryFour: () => pair(import("./locales/fr/primaryFour.json"), import("./locales/en/primaryFour.json")),
};

export type CourseNamespace = "primaryOne" | "primaryTwo" | "primaryTwoLessons" | "primaryThree" | "primaryFour";
export const COURSE_NAMESPACES: readonly CourseNamespace[] = ["primaryOne", "primaryTwo", "primaryTwoLessons", "primaryThree", "primaryFour"];

/** Un seul chargement par espace de noms, même si plusieurs pages le demandent en même temps. */
const pending = new Map<CourseNamespace, Promise<void>>();

export function loadCourseNamespaces(names: readonly CourseNamespace[] = COURSE_NAMESPACES): Promise<void> {
  return Promise.all(
    names.map((name) => {
      const existing = pending.get(name);
      if (existing) return existing;
      const loading = LOADERS[name]()
        .then(({ fr, en }) => {
          i18next.addResourceBundle("fr", name, fr, true, true);
          i18next.addResourceBundle("en", name, en, true, true);
        })
        .catch((error: unknown) => {
          // Échec réseau : on oublie la tentative pour qu'un nouvel essai puisse recharger.
          pending.delete(name);
          throw error;
        });
      pending.set(name, loading);
      return loading;
    }),
  ).then(() => undefined);
}
