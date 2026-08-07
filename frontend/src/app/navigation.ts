// Déclaration centrale de la navigation React : un seul endroit à modifier
// pour ajouter un lien, dans l'en-tête ou dans le menu mobile.

export interface NavigationLink {
  to: string;
  label: string;
}

// Chemins RELATIFS au basename "/app" du routeur (voir AppRouter.tsx) : sans
// cela, un lien vers "/app" à l'intérieur d'un routeur déjà basé sur "/app"
// pointerait vers "/app/app".
export const navigationLinks: NavigationLink[] = [
  { to: "/", label: "Tableau de bord" },
  { to: "/jeux", label: "Jeux" },
  { to: "/progression", label: "Progression" },
];

// Pendant la migration, certaines pages n'existent encore que sous Thymeleaf.
// Ce lien reste une vraie URL serveur, jamais une route cliente.
export const legacyPortalUrl = "/";
