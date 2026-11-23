import { describe, expect, it } from "vitest";

import { BRIDGE_START_X, cityLayout } from "./leoCityLayout";
import { START_POSITION } from "./leoGeometry";
import {
  ALL_BUNDLES,
  ALL_TEXTURE_KEYS,
  BUNDLE_BYTES,
  BUNDLE_TEXTURES,
  MAX_AUTO_RETRIES,
  RETRY_DELAYS_MS,
  ZoneAssetManager,
  bundlesForRange,
  type BundleId,
} from "./leoZoneAssets";

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
  it("au départ, la vue n'utilise que le lot commun ; tout le parcours est pourtant téléchargé avant", () => {
    const view = { minX: START_POSITION.x - 900, maxX: START_POSITION.x + 1500 };
    expect(bundlesForRange(view.minX, view.maxX)).toEqual(["common"]);
    expect(ALL_BUNDLES).toEqual(["common", "bridge", "city"]);
    expect(ALL_TEXTURE_KEYS).toEqual([...BUNDLE_TEXTURES.common, ...BUNDLE_TEXTURES.bridge, ...BUNDLE_TEXTURES.city]);
  });

  it("associe le pont à ses zones et la ville à son panneau", () => {
    expect(bundlesForRange(BRIDGE_START_X + 100, BRIDGE_START_X + 200)).toEqual(["common", "bridge"]);
    const city = cityLayout();
    expect(bundlesForRange(city.stopLineEast - 50, city.stopLineEast + 50)).toContain("city");
    expect(bundlesForRange(city.panelEnd + 10_000, city.panelEnd + 11_000)).toEqual(["common"]);
  });

  it("répartit toutes les textures téléchargées entre les lots, sans doublon", () => {
    const all = [...BUNDLE_TEXTURES.common, ...BUNDLE_TEXTURES.bridge, ...BUNDLE_TEXTURES.city];
    expect(new Set(all).size).toBe(all.length);
    // Tout le parcours conditionne maintenant le départ : 2,43 Mo d'images en WebP (dont 673 Ko pour le lot commun).
    // L'attente initiale ne doit pas grossir sans raison.
    expect(BUNDLE_BYTES.common).toBeLessThan(800_000);
    expect(BUNDLE_BYTES.common + BUNDLE_BYTES.bridge + BUNDLE_BYTES.city).toBeLessThan(2_600_000);
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
    // Pendant le délai, des demandes répétées ne relancent rien.
    for (let frame = 0; frame < 60; frame += 1) expect(manager.request("city")).toBeNull();
    expect(calls).toHaveLength(1);
    expect(manager.state("city")).toBe("retrying");
    expect(manager.failed()).toEqual([]);
    // Une fois le délai écoulé, une seule nouvelle tentative.
    scheduler.pending[0].callback();
    expect(calls).toHaveLength(2);
    expect(manager.state("city")).toBe("loading");
  });

});

describe("intégration dans la scène", () => {
  it("télécharge tout le parcours avant le départ et ne libère plus aucun lot pendant la partie", () => {
    const preload = game.slice(game.indexOf("  preload() {"), game.indexOf("  create() {"));
    expect(preload).toContain("for (const key of ALL_TEXTURE_KEYS) this.load.image(key, TEXTURE_URLS[key]);");
    // Le gestionnaire n'a plus de quoi libérer un lot, ni d'anticipation selon la vitesse ou le débit.
    expect("release" in ZoneAssetManager.prototype).toBe(false);
    expect(game).not.toContain("manageBundles");
    expect(game).not.toContain("unloadBundle");
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

  it("par sécurité, met la conduite en attente si une ressource de la vue manquait, au lieu d'afficher une zone vide", () => {
    expect(game).toContain("this.assetsBlocking()");
  });
});
