// Assemblage isolé du module : on le copie hors du portail, avec ses seules dépendances déclarées, puis on le
// compile (tsc) et on exécute ses tests. Un import vers le portail, un autre jeu ou un paquet non déclaré échoue ici.
//
//   npm run verify:isolation   (depuis frontend/packages/math-flow)

import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const moduleRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(moduleRoot, "package.json"), "utf8"));
const require = createRequire(join(moduleRoot, "package.json"));
const declared = [...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {}), ...Object.keys(manifest.devDependencies ?? {})];

/** Dossier d'un paquet installé, tel que l'hôte (ou un futur dépôt du module) l'a installé. */
function packageDir(name) {
  let dir = dirname(require.resolve(`${name}/package.json`));
  while (!existsSync(join(dir, "package.json"))) dir = dirname(dir);
  return dir;
}

const workdir = mkdtempSync(join(tmpdir(), "math-flow-"));
let failed = false;
try {
  for (const entry of ["package.json", "tsconfig.json", "vitest.config.ts", "src", "tests"]) {
    cpSync(join(moduleRoot, entry), join(workdir, entry), { recursive: true });
  }
  const modules = join(workdir, "node_modules");
  for (const name of declared) {
    const target = join(modules, name);
    mkdirSync(dirname(target), { recursive: true });
    symlinkSync(packageDir(name), target, "dir");
  }
  console.log(`Module copié dans ${workdir} avec ${declared.length} dépendances déclarées : ${declared.join(", ")}`);
  const tsc = join(packageDir("typescript"), "bin", "tsc");
  const vitest = join(packageDir("vitest"), "vitest.mjs");
  console.log("→ Compilation (tsc)");
  execFileSync(process.execPath, [tsc, "-p", "tsconfig.json"], { cwd: workdir, stdio: "inherit" });
  console.log("→ Tests du module, hors du portail");
  execFileSync(process.execPath, [vitest, "run", "--config", "vitest.config.ts"], { cwd: workdir, stdio: "inherit" });
  console.log("Assemblage isolé réussi : le module se compile et se teste seul.");
} catch (error) {
  failed = true;
  console.error("Assemblage isolé en échec :", error instanceof Error ? error.message : error);
} finally {
  rmSync(workdir, { recursive: true, force: true });
}
process.exit(failed ? 1 : 0);
