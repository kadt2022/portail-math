import { afterEach, describe, expect, it, vi } from "vitest";

import { DOWNLOAD_CONCURRENCY, fetchAllWithProgress, fetchWithProgress } from "./fetchWithProgress";
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

  it("téléchargement bloqué (ni octet, ni erreur) : abandonné après le délai d'inactivité", async () => {
    vi.useFakeTimers();
    try {
      // Le serveur ne répond jamais ; seule l'annulation met fin à la requête.
      const fetchMock = vi.fn(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
          }),
      );
      vi.stubGlobal("fetch", fetchMock);
      const result = fetchWithProgress("/bloque.webp", undefined, "high", 60_000);
      const settled = vi.fn();
      result.then(settled, settled);
      await vi.advanceTimersByTimeAsync(59_999);
      expect(settled).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await expect(result).rejects.toThrow("bloqué");
      expect(fetchMock).toHaveBeenCalledWith("/bloque.webp", expect.objectContaining({ priority: "high", signal: expect.any(AbortSignal) }));
    } finally {
      vi.useRealTimers();
    }
  });

  it("fichier lent mais vivant : jamais coupé, le délai repart à chaque morceau reçu", async () => {
    vi.useFakeTimers();
    try {
      let push: (part: Uint8Array) => void = () => {};
      let close = () => {};
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          push = (part) => controller.enqueue(part);
          close = () => controller.close();
        },
      });
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(body, { headers: { "content-length": "3" } })));
      const result = fetchWithProgress("/lent.webp", undefined, undefined, 60_000);
      // Un octet toutes les 50 s : 150 s au total, bien plus que le délai, sans jamais 60 s de silence.
      for (let part = 0; part < 3; part += 1) {
        await vi.advanceTimersByTimeAsync(50_000);
        push(new Uint8Array([part]));
      }
      close();
      expect(Array.from(new Uint8Array(await result))).toEqual([0, 1, 2]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("plusieurs fichiers dont un bloqué : l'ensemble se termine quand même après le délai, sans rejeter", async () => {
    vi.useFakeTimers();
    try {
      vi.stubGlobal(
        "fetch",
        vi.fn((url: string, init?: RequestInit) =>
          url === "/bloque.webp"
            ? new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(init.signal?.reason)))
            : Promise.resolve(new Response(new Uint8Array(4), { headers: { "content-length": "4" } })),
        ),
      );
      const done = vi.fn();
      void fetchAllWithProgress(["/ok.webp", "/bloque.webp"], undefined, { priority: "high", stallTimeoutMs: 60_000 }).then(done);
      await vi.advanceTimersByTimeAsync(30_000);
      expect(done).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(30_000);
      expect(done).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("plusieurs fichiers en parallèle : une seule progression d'ensemble, total connu quand chacun a annoncé sa taille", async () => {
    const sizes: Record<string, number> = { "/a.webp": 3, "/b.webp": 5 };
    const fetchMock = vi.fn(async (url: string) => new Response(new Uint8Array(sizes[url]), { headers: { "content-length": String(sizes[url]) } }));
    vi.stubGlobal("fetch", fetchMock);
    const reports: Array<[number, number | null]> = [];
    const received = await fetchAllWithProgress(["/a.webp", "/b.webp"], (loaded, total) => reports.push([loaded, total]), { priority: "high" });
    expect([...received.keys()]).toEqual(["/a.webp", "/b.webp"]);
    expect(received.get("/b.webp")?.byteLength).toBe(5);
    // Les deux téléchargements partent ensemble (moins que la limite), en priorité haute.
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/a.webp", "/b.webp"]);
    expect(fetchMock).toHaveBeenCalledWith("/a.webp", { priority: "high" });
    expect(reports.at(-1)).toEqual([8, 8]);
    // Tant qu'un fichier n'a pas annoncé sa taille, le total reste inconnu.
    expect(reports[0][1]).toBeNull();
    expect(reports.map(([loaded]) => loaded)).toEqual([...reports.map(([loaded]) => loaded)].sort((x, y) => x - y));
  });

  it("un fichier en échec ne bloque pas l'ensemble : il compte pour terminé (son utilisateur le redemandera)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => (url === "/absent.webp" ? new Response(null, { status: 404 }) : new Response(new Uint8Array(4), { headers: { "content-length": "4" } }))),
    );
    const reports: Array<[number, number | null]> = [];
    const received = await fetchAllWithProgress(["/absent.webp", "/ok.webp"], (loaded, total) => reports.push([loaded, total]));
    expect([...received.keys()]).toEqual(["/ok.webp"]);
    expect(reports.at(-1)).toEqual([4, 4]);
  });

  it(`au plus ${DOWNLOAD_CONCURRENCY} téléchargements à la fois, dans l'ordre demandé`, async () => {
    const pending: Array<() => void> = [];
    let active = 0;
    let peak = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<Response>((resolve) => {
            active += 1;
            peak = Math.max(peak, active);
            pending.push(() => {
              active -= 1;
              resolve(new Response(new Uint8Array(1), { headers: { "content-length": "1" } }));
            });
          }),
      ),
    );
    const urls = Array.from({ length: 10 }, (_, index) => `/f${index}.webp`);
    const all = fetchAllWithProgress(urls);
    for (let round = 0; round < 20 && pending.length > 0; round += 1) {
      await Promise.resolve();
      pending.shift()?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    const received = await all;
    expect(received.size).toBe(10);
    expect(peak).toBe(DOWNLOAD_CONCURRENCY);
    expect(vi.mocked(fetch).mock.calls.map(([url]) => url)).toEqual(urls);
  });

  it("un fichier en attente de son tour n'est jamais pris pour bloqué, même après plusieurs minutes d'attente", async () => {
    vi.useFakeTimers();
    try {
      // Connexion à 250 kbit/s partagée : chaque fichier actif reçoit un octet toutes les 30 s (jamais 60 s de silence),
      // et attend son tour bien plus de 60 s.
      const streams: Array<{ push: (part: Uint8Array) => void; close: () => void; left: number }> = [];
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => {
          let push: (part: Uint8Array) => void = () => {};
          let close = () => {};
          const body = new ReadableStream<Uint8Array>({
            start(controller) {
              push = (part) => controller.enqueue(part);
              close = () => controller.close();
            },
          });
          streams.push({ push, close, left: 4 });
          return new Response(body, { headers: { "content-length": "4" } });
        }),
      );
      const urls = Array.from({ length: 8 }, (_, index) => `/lent${index}.webp`);
      const done = vi.fn();
      const all = fetchAllWithProgress(urls, undefined, { stallTimeoutMs: 60_000, concurrency: 2 }).then((received) => {
        done();
        return received;
      });
      // 8 fichiers de 4 octets, 2 à la fois, un octet par fichier actif toutes les 30 s : environ 8 minutes en tout.
      for (let tick = 0; tick < 40 && !done.mock.calls.length; tick += 1) {
        await vi.advanceTimersByTimeAsync(30_000);
        for (const stream of streams.filter((each) => each.left > 0)) {
          stream.push(new Uint8Array([1]));
          stream.left -= 1;
          if (stream.left === 0) stream.close();
        }
        await vi.advanceTimersByTimeAsync(0);
      }
      const received = await all;
      expect(received.size).toBe(8);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(8);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("rendus de l'écran de chargement", () => {
  it("signalé seulement quand le pourcentage entier change, jamais à chaque morceau reçu", () => {
    const seen: number[] = [];
    const progress = createLoadingProgress({ images: 100_000 }, (fraction) => seen.push(fraction));
    // 1 000 morceaux de 100 octets : 100 % en tout, au plus un signal par pourcentage.
    for (let loaded = 100; loaded <= 100_000; loaded += 100) progress.report("images", loaded, 100_000);
    expect(seen.length).toBeLessThanOrEqual(101);
    expect(seen.at(-1)).toBe(1);
    expect(new Set(seen.map((fraction) => Math.floor(fraction * 100))).size).toBe(seen.length);
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
