import { cp, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const frontendDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const staticDirectory = path.resolve(
  frontendDirectory,
  "..",
  "src",
  "main",
  "resources",
  "static",
);
const distDirectory = path.join(frontendDirectory, "dist");

for (const entry of await readdir(staticDirectory, { withFileTypes: true })) {
  await cp(path.join(staticDirectory, entry.name), path.join(distDirectory, entry.name), {
    recursive: true,
    force: true,
  });
}

// Les coquilles historiques sont servies sous /app sur le site Spring. Dans
// la WebView Capacitor, le routeur React vit à la racine.
for (const fileName of ["multiplication-train.html", "fraction-river.html"]) {
  const gamePath = path.join(distDirectory, "games", fileName);
  const html = await readFile(gamePath, "utf8");
  const androidHtml = html
    .replaceAll('href="/app/jeux"', 'href="/jeux"')
    .replaceAll('href="/app/"', 'href="/"');
  await writeFile(gamePath, androidHtml, "utf8");
}
