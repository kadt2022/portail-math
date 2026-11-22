import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchWithProgress } from "./fetchWithProgress";
import { createLoadingProgress } from "./loadingProgress";

describe("progression du chargement", () => {
  it("pondère chaque ressource par son poids, remplacé par sa taille réelle dès qu'elle est connue", () => {
    const seen: number[] = [];
    const progress = createLoadingProgress({ engine: 300, decor: 100, music: 100 }, (fraction) => seen.push(fraction));
    progress.complete("engine");
    expect(progress.fraction()).toBeCloseTo(300 / 500);
    // Le décor annonce 300 octets (et non 100) : il pèse désormais autant que le moteur.
    progress.report("decor", 150, 300);
    expect(progress.fraction()).toBeCloseTo((300 + 150) / 700);
    expect(progress.done()).toBe(false);
  });

  it("ne recule jamais, et vaut 100 % seulement quand tout est prêt (même une ressource abandonnée)", () => {
    const seen: number[] = [];
    const progress = createLoadingProgress({ engine: 100, decor: 100 }, (fraction) => seen.push(fraction));
    progress.report("decor", 90, 100);
    // Taille réelle bien plus grande : la part reçue baisse, mais le pourcentage affiché ne recule pas.
    progress.report("decor", 90, 1000);
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    progress.complete("decor");
    expect(progress.fraction()).toBeLessThan(1);
    progress.complete("engine");
    expect(progress.done()).toBe(true);
    expect(progress.fraction()).toBe(1);
  });
});

describe("téléchargement avec progression", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("annonce les octets reçus morceau par morceau, puis rend le fichier entier", async () => {
    const parts = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])];
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        parts.forEach((part) => controller.enqueue(part));
        controller.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(new Response(body, { headers: { "content-length": "5" } }));
    vi.stubGlobal("fetch", fetchMock);
    const reports: Array<[number, number | null]> = [];
    const data = await fetchWithProgress("/decor.webp", (loaded, total) => reports.push([loaded, total]), "high");
    expect(Array.from(new Uint8Array(data))).toEqual([1, 2, 3, 4, 5]);
    expect(reports).toEqual([[3, 5], [5, 5], [5, 5]]);
    expect(fetchMock).toHaveBeenCalledWith("/decor.webp", { priority: "high" });
  });

  it("fichier introuvable : une erreur claire (le chargement la traite sans rester bloqué)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    await expect(fetchWithProgress("/absent.mp3")).rejects.toThrow("404");
  });
});

describe("ressource sans progression (le moteur)", () => {
  it("avance au rythme de la ressource voisine la plus avancée, sans atteindre son poids avant d'être arrivée", () => {
    const progress = createLoadingProgress({ engine: 300, music: 300 }, () => undefined, "engine");
    progress.report("music", 150, 300);
    // Moteur estimé à 150 octets reçus, comme la musique qui partage la connexion : (150 + 150) / 600.
    expect(progress.fraction()).toBeCloseTo(0.5);
    progress.complete("music");
    // Musique arrivée : le moteur reste plafonné à 97 % de son poids tant qu'il n'est pas là.
    expect(progress.fraction()).toBeCloseTo((300 + 291) / 600);
    expect(progress.fraction()).toBeLessThan(1);
    progress.complete("engine");
    expect(progress.fraction()).toBe(1);
  });
});
