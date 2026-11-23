import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Frontières du module, vérifiées sur le code source : chaque couche n'importe que ce qu'elle a le droit de
// connaître, et le module ne dépend que de ce qu'il déclare. C'est ce qui le rend extractible pour de vrai.

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const src = join(root, "src");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

interface ImportRef {
  file: string;
  specifier: string;
  typeOnly: boolean;
  dynamic: boolean;
  /** Chemin dans src/ (sans extension) pour un import relatif ; null pour un paquet. */
  target: string | null;
}

function files(directory: string): string[] {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

function importsOf(file: string): ImportRef[] {
  const code = readFileSync(file, "utf8");
  const refs: ImportRef[] = [];
  const add = (specifier: string, typeOnly: boolean, dynamic: boolean) => {
    const target = specifier.startsWith(".") ? relative(src, resolve(dirname(file), specifier)) : null;
    refs.push({ file: relative(src, file), specifier, typeOnly, dynamic, target });
  };
  for (const match of code.matchAll(/^\s*(import|export)\s+(type\s+)?[^;]*?from\s+["']([^"']+)["']/gm)) add(match[3], Boolean(match[2]), false);
  for (const match of code.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) add(match[1], false, false);
  for (const match of code.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) {
    // `typeof import("…")` n'est qu'un type.
    const before = code.slice(Math.max(0, (match.index ?? 0) - 7), match.index);
    add(match[1], before.includes("typeof"), !before.includes("typeof"));
  }
  return refs;
}

const sources = files(src);
const all = sources.flatMap(importsOf);
const layerOf = (path: string) => path.split(/[\\/]/)[0];
const declared = new Set([...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.peerDependencies ?? {})]);
const packageOf = (specifier: string) => (specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0]);

describe("Frontières du module @mbuyamba/riviere-fractions", () => {
  it("ne dépend que des paquets déclarés dans son manifeste", () => {
    const undeclared = all.filter((ref) => ref.target === null && !declared.has(packageOf(ref.specifier)));
    expect(undeclared).toEqual([]);
  });

  it("ne sort jamais de son propre dossier (aucun fichier du portail ni d'un autre jeu)", () => {
    const outside = all.filter((ref) => ref.target !== null && ref.target.startsWith(".."));
    expect(outside).toEqual([]);
    expect(all.filter((ref) => /games\/|@mbuyamba\/(?!riviere)/.test(ref.specifier))).toEqual([]);
  });

  it("garde le domaine pédagogique indépendant de React, de Babylon.js et du reste du jeu", () => {
    const leaks = all.filter((ref) => layerOf(ref.file) === "domain" && (ref.target === null || layerOf(ref.target) !== "domain"));
    expect(leaks).toEqual([]);
  });

  it("garde la couche application sans React ni Babylon.js, au-dessus du seul domaine", () => {
    const leaks = all.filter((ref) => layerOf(ref.file) === "application" && (ref.target === null || !["domain", "application"].includes(layerOf(ref.target))));
    expect(leaks).toEqual([]);
  });

  it("garde le moteur 3D ignorant des règles, de l'interface et de l'hôte", () => {
    const leaks = all.filter((ref) => layerOf(ref.file) === "engine" && (ref.target === null ? packageOf(ref.specifier) !== "@babylonjs/core" : layerOf(ref.target) !== "engine"));
    expect(leaks).toEqual([]);
  });

  it("calcule la géométrie, la navigation et le son en TypeScript pur, sans Babylon.js", () => {
    const pure = all.filter((ref) => /^engine[\\/](geometry|navigation|audio)/.test(ref.file) && ref.target === null);
    expect(pure).toEqual([]);
  });

  it("ne laisse l'interface ni charger Babylon.js ni faire de calcul mathématique", () => {
    const ui = all.filter((ref) => layerOf(ref.file) === "ui");
    expect(ui.filter((ref) => ref.target === null && packageOf(ref.specifier) !== "react")).toEqual([]);
    expect(ui.filter((ref) => ref.target !== null && layerOf(ref.target) === "engine")).toEqual([]);
    // Du domaine, l'interface ne reçoit que des types : jamais une fraction à calculer.
    expect(ui.filter((ref) => ref.target !== null && layerOf(ref.target) === "domain" && !ref.typeOnly)).toEqual([]);
  });

  it("ne charge la scène Babylon.js que par l'import dynamique du chargeur", () => {
    const toScene = all.filter((ref) => ref.target !== null && /^engine[\\/]scene/.test(ref.target) && !ref.typeOnly && layerOf(ref.file) !== "engine");
    expect(toScene.map((ref) => `${ref.file} → ${ref.specifier}${ref.dynamic ? " (dynamique)" : ""}`)).toEqual(["adapters/engineLoader.ts → ../engine/scene/riverEngine (dynamique)"]);
  });

  it("expose un contrat public explicite", () => {
    const index = readFileSync(join(src, "index.ts"), "utf8");
    for (const name of ["useRiverFractions", "preloadRiverFractionsEngine", "RIVER_FRACTIONS_MANIFEST", "toRiverLocale", "RiverGameEvent", "StandardPlayerBinding"]) {
      expect(index).toContain(name);
    }
    expect((manifest as { exports?: Record<string, string> }).exports).toEqual({ ".": "./src/index.ts" });
  });
});
