import { describe, expect, it } from "vitest";

import { BRIDGE_START_X, cityLayout } from "./leoCityLayout";
import { START_POSITION } from "./leoGeometry";
import { kmhToPx } from "./leoUnits";
import {
  BUNDLE_BYTES,
  BUNDLE_TEXTURES,
  FALLBACK_BANDWIDTH_BPS,
  MAX_AUTO_RETRIES,
  RETRY_DELAYS_MS,
  ZoneAssetManager,
  bundlesForRange,
  keepRange,
  prefetchRange,
  type BundleId,
} from "./leoZoneAssets";
import { WORLD_ZONE_WIDTH } from "./leoWorldZones";

const sources = import.meta.glob("./LeoLivreurGame.ts", { query: "?raw", import: "default", eager: true }) as Record<string, string>;
const game = Object.values(sources)[0];

/** Téléchargeur simulé : chaque appel reste en attente jusqu'à ce que le test le résolve ou le rejette. */
function fakeFetcher() {
  const calls: Array<{ bundle: BundleId; resolve: () => void; reject: () => void }> = [];
  const fetcher = (bundle: BundleId) => new Promise<void>((resolve, reject) => {
    calls.push({ bundle, resolve, reject: () => reject(new Error("réseau")) });
  });
  return { calls, fetcher };
}

function manualScheduler() {
  const pending: Array<{ callback: () => void; delay: number }> = [];
  return { pending, schedule: (callback: () => void, delay: number) => { pending.push({ callback, delay }); } };
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe("lots de ressources par zone", () => {
  it("ne demande au départ que le lot commun : ni le pont, ni la ville", () => {
    const view = { minX: START_POSITION.x - 900, maxX: START_POSITION.x + 1500 };
    expect(bundlesForRange(view.minX, view.maxX)).toEqual(["common"]);
    const prefetch = prefetchRange(view, 0, 1, 0);
    expect(bundlesForRange(prefetch.minX, prefetch.maxX)).toEqual(["common"]);
  });

  it("associe le pont à ses zones et la ville à son panneau", () => {
    expect(bundlesForRange(BRIDGE_START_X + 100, BRIDGE_START_X + 200)).toEqual(["common", "bridge"]);
    const city = cityLayout();
    expect(bundlesForRange(city.stopLineEast - 50, city.stopLineEast + 50)).toContain("city");
    expect(bundlesForRange(city.panelEnd + 10_000, city.panelEnd + 11_000)).toEqual(["common"]);
  });

  it("anticipe davantage quand Léo roule vite ou quand le réseau est lent, dans son sens de marche", () => {
    const view = { minX: 1000, maxX: 2500 };
    const slow = prefetchRange(view, kmhToPx(30), 1, 2_000_000);
    const fast = prefetchRange(view, kmhToPx(120), 1, 2_000_000);
    const badNetwork = prefetchRange(view, kmhToPx(120), 1, 300_000);
    expect(fast.maxX).toBeGreaterThan(slow.maxX);
    expect(badNetwork.maxX).toBeGreaterThan(fast.maxX);
    // Toujours au moins une zone devant, une zone derrière (marche arrière).
    expect(slow.maxX - view.maxX).toBeGreaterThanOrEqual(WORLD_ZONE_WIDTH);
    expect(view.minX - slow.minX).toBe(WORLD_ZONE_WIDTH);
    const backwards = prefetchRange(view, kmhToPx(30), -1, 2_000_000);
    expect(view.minX - backwards.minX).toBeGreaterThanOrEqual(WORLD_ZONE_WIDTH);
  });

  it("laisse le temps de télécharger le pont avant d'y arriver, même à 120 km/h sur un réseau faible", () => {
    const speed = kmhToPx(120);
    const bandwidth = FALLBACK_BANDWIDTH_BPS;
    const view = { minX: BRIDGE_START_X - 3000, maxX: BRIDGE_START_X - 1500 };
    const prefetch = prefetchRange(view, speed, 1, bandwidth);
    // Si le lot est demandé dès que le pont entre dans l'anticipation, il arrive avant que la vue l'atteigne.
    const triggerDistance = prefetch.maxX - view.maxX;
    const download = (BUNDLE_BYTES.bridge * 8) / bandwidth;
    expect(triggerDistance / speed).toBeGreaterThan(download);
  });

  it("garde une marge avant de libérer un lot (pas de va-et-vient en marche arrière)", () => {
    const prefetch = { minX: 1000, maxX: 5000 };
    const keep = keepRange(prefetch);
    expect(prefetch.minX - keep.minX).toBe(WORLD_ZONE_WIDTH);
    expect(keep.maxX - prefetch.maxX).toBe(WORLD_ZONE_WIDTH);
  });

  it("répartit toutes les textures téléchargées entre les lots, sans doublon", () => {
    const all = [...BUNDLE_TEXTURES.common, ...BUNDLE_TEXTURES.bridge, ...BUNDLE_TEXTURES.city];
    expect(new Set(all).size).toBe(all.length);
    // Le lot commun conditionne le départ : il comprend maintenant le décor du village de la zone 1 (fond, jardins,
    // maisons, arbres). Plafond relevé de 400 Ko à 800 Ko pour ce décor, en WebP ; il ne doit plus grossir sans raison.
    expect(BUNDLE_BYTES.common).toBeLessThan(800_000);
  });
});

describe("gestionnaire de chargement des lots", () => {
  it("ne télécharge jamais deux fois le même lot en même temps", async () => {
    const { calls, fetcher } = fakeFetcher();
    const manager = new ZoneAssetManager(fetcher);
    void manager.request("bridge");
    void manager.request("bridge");
    void manager.request("bridge");
    expect(calls).toHaveLength(1);
    expect(manager.state("bridge")).toBe("loading");
    calls[0].resolve();
    await flush();
    expect(manager.state("bridge")).toBe("ready");
    expect(manager.request("bridge")).toBeNull();
    expect(calls).toHaveLength(1);
  });

  it("reprend automatiquement un nombre limité de fois, avec délais croissants, puis attend Réessayer", async () => {
    const { calls, fetcher } = fakeFetcher();
    const scheduler = manualScheduler();
    const manager = new ZoneAssetManager(fetcher, scheduler.schedule);
    void manager.request("city");
    for (let attempt = 0; attempt <= MAX_AUTO_RETRIES; attempt += 1) {
      calls[attempt].reject();
      await flush();
      if (attempt < MAX_AUTO_RETRIES) {
        expect(manager.state("city")).toBe("retrying");
        expect(scheduler.pending[attempt].delay).toBe(RETRY_DELAYS_MS[attempt]);
        scheduler.pending[attempt].callback();
      }
    }
    expect(calls).toHaveLength(MAX_AUTO_RETRIES + 1);
    expect(manager.state("city")).toBe("error");
    expect(manager.failed()).toEqual(["city"]);
    // Plus aucune tentative automatique : pas de boucle infinie.
    expect(manager.request("city")).toBeNull();
    expect(scheduler.pending).toHaveLength(MAX_AUTO_RETRIES);
    // Réessayer relance, puis le lot devient prêt.
    manager.retryFailed();
    expect(calls).toHaveLength(MAX_AUTO_RETRIES + 2);
    calls[calls.length - 1].resolve();
    await flush();
    expect(manager.state("city")).toBe("ready");
  });

  it("ne court-circuite jamais le délai de reprise, même si la scène redemande le lot à chaque image", async () => {
    const { calls, fetcher } = fakeFetcher();
    const scheduler = manualScheduler();
    const manager = new ZoneAssetManager(fetcher, scheduler.schedule);
    void manager.request("city");
    calls[0].reject();
    await flush();
    // Pendant le délai, les demandes de manageBundles() (une par image) ne relancent rien.
    for (let frame = 0; frame < 60; frame += 1) expect(manager.request("city")).toBeNull();
    expect(calls).toHaveLength(1);
    expect(manager.state("city")).toBe("retrying");
    expect(manager.failed()).toEqual([]);
    // Une fois le délai écoulé, une seule nouvelle tentative.
    scheduler.pending[0].callback();
    expect(calls).toHaveLength(2);
    expect(manager.state("city")).toBe("loading");
  });

  it("mesure le débit réel pour les anticipations suivantes", async () => {
    const { calls, fetcher } = fakeFetcher();
    let clock = 0;
    const manager = new ZoneAssetManager(fetcher, undefined, () => clock);
    void manager.request("common");
    clock = 2000;
    calls[0].resolve();
    await flush();
    expect(manager.bandwidthBps).toBeCloseTo((BUNDLE_BYTES.common * 8) / 2, 6);
  });

  it("libère un lot inutile mais jamais le lot commun, et le recharge si Léo revient", async () => {
    const { calls, fetcher } = fakeFetcher();
    const manager = new ZoneAssetManager(fetcher);
    void manager.request("common");
    void manager.request("bridge");
    calls.forEach((call) => call.resolve());
    await flush();
    expect(manager.release("common")).toBe(false);
    expect(manager.release("bridge")).toBe(true);
    expect(manager.state("bridge")).toBe("absent");
    void manager.request("bridge");
    expect(calls).toHaveLength(3);
  });
});

describe("intégration dans la scène", () => {
  it("ne précharge au démarrage que le lot commun (plus le pont ni la ville)", () => {
    const preload = game.slice(game.indexOf("  preload() {"), game.indexOf("  create() {"));
    expect(preload).not.toContain("leo-world-suspension-bridge-layer");
    expect(preload).not.toContain("leo-world-city-top");
    expect(preload).not.toContain("TURN_SHEET.key");
  });

  it("rend leurs vraies images à Léo et au trafic quand le lot commun arrive après une reprise", () => {
    const start = game.indexOf("  private prepareBundle(");
    const common = game.slice(start, game.indexOf("    if (bundle === \"bridge\")", start));
    expect(common).toContain("this.restoreCommonVisuals()");
    const restore = game.slice(game.indexOf("  private restoreCommonVisuals() {"), game.indexOf("  private createLeoSprites() {"));
    // Léo est recréé (taille recalculée sur la vraie image), le trafic reconfiguré à sa prochaine mise à jour.
    expect(restore).toContain("this.body.removeAll(true)");
    expect(restore).toContain("this.createLeoSprites()");
    expect(restore).toContain("view.spec = null");
    expect(game).toContain("if (view2.spec !== vehicle.spec");
  });

  it("met la conduite en attente tant que les ressources de la vue manquent, au lieu d'afficher une zone vide", () => {
    expect(game).toContain("this.assetsBlocking()");
  });
});
