// Déclaration centrale de la navigation React : un seul endroit à modifier
// pour ajouter un lien, dans l'en-tête ou dans le menu mobile.
// `labelKey` pointe vers le namespace "common" (nav.*) : le libellé affiché
// suit la langue active, jamais figé dans cette liste.

export interface NavigationLink {
  to: string;
  labelKey: string;
}

// Chemins RELATIFS au basename "/app" du routeur (voir AppRouter.tsx) : sans
// cela, un lien vers "/app" à l'intérieur d'un routeur déjà basé sur "/app"
// pointerait vers "/app/app".
export const navigationLinks: NavigationLink[] = [
  { to: "/", labelKey: "nav.dashboard" },
  { to: "/exetat", labelKey: "nav.exetat" },
  { to: "/jeux", labelKey: "nav.games" },
  { to: "/progression", labelKey: "nav.progress" },
  { to: "/a-propos", labelKey: "nav.about" },
];
