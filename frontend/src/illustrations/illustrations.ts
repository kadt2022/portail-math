// Bibliothèque d'illustrations du portail, partagée entre les jeux et les disciplines : un fichier WebP par illustration, nommé par
// son identifiant (« lion.webp »). Un jeu ne connaît que l'identifiant ; le fichier n'est téléchargé que lorsqu'il est affiché.
const modules = import.meta.glob<string>("./images/*.webp", { eager: true, query: "?url", import: "default" });

const urls = new Map<string, string>(
  Object.entries(modules).map(([path, url]) => [path.replace(/^.*\/(.+)\.webp$/, "$1"), url]),
);

/** Adresse de l'illustration, ou undefined si la bibliothèque ne la contient pas (le jeu affiche alors un cadre de remplacement). */
export function illustrationUrl(id: string): string | undefined {
  return urls.get(id);
}

/** Identifiants disponibles dans la bibliothèque. */
export function illustrationIds(): string[] {
  return [...urls.keys()].sort();
}
