import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { MultiMaterial } from "@babylonjs/core/Materials/multiMaterial";
import type { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Scene } from "@babylonjs/core/scene";
import { afterEach, describe, expect, it } from "vitest";

import { createConsist, poseVehicle, vehicleFronts, VEHICLES } from "../../src/domain/consist";
import { createNetwork } from "../../src/domain/network";
import { emptyMesh, vertexCount } from "../../src/engine/geometry/kit";
import { MATERIAL } from "../../src/engine/geometry/palette";
import { locomotiveBody, mangoCrate, spokedWheel, tenderBody, wagonBody } from "../../src/engine/geometry/rollingStock";
import { islandPlatform, stationMesh } from "../../src/engine/geometry/stations";
import { GALLERY, stoneViaduct, trussBridge, TUNNEL, TUNNEL_CROWN, TUNNEL_ENVELOPE, tunnelCeiling, tunnelLining, tunnelPortal } from "../../src/engine/geometry/structures";
import { createRelief } from "../../src/engine/geometry/terrain";
import { FORMATION_DEPTH, trackMesh } from "../../src/engine/geometry/trackGeometry";
import { createCameraRig, depthInside, desiredPose, type RigInput } from "../../src/engine/scene/cameraRig";
import { createObstacles, resolveEye } from "../../src/engine/scene/clearance";
import { decorAnchors, inRailwayClearance } from "../../src/world/anchors";
import { createMaterialSet } from "../../src/engine/scene/materials";
import { groupByFamily } from "../../src/engine/scene/meshes";
import { createSteam } from "../../src/engine/scene/steam";
import { createTrainView } from "../../src/engine/scene/trainView";

const network = createNetwork();
const main = network.routes.main;
const triangles = (m: { indices: number[] }) => m.indices.length / 3;

describe("modèles ferroviaires", () => {
  it("restent dans leur budget de triangles", () => {
    expect(triangles(locomotiveBody())).toBeLessThan(9000);
    expect(triangles(tenderBody())).toBeLessThan(6000);
    expect(triangles(wagonBody())).toBeLessThan(2500);
    expect(triangles(spokedWheel(0.78, 14, [1, 0, 0], true))).toBeLessThan(1200);
    expect(triangles(mangoCrate())).toBeLessThan(2000);
  });

  it("construit la voie, le viaduc, le tunnel et les gares", () => {
    expect(vertexCount(trackMesh(main, 100, 160))).toBeGreaterThan(1000);
    const relief = createRelief(network);
    const viaduct = network.structures.find((s) => s.kind === "stone-viaduct")!;
    expect(triangles(stoneViaduct(main, { from: viaduct.from, to: viaduct.to, ground: relief.height }))).toBeGreaterThan(5000);
    const gorge = network.structures.find((s) => s.kind === "truss-bridge")!;
    expect(triangles(trussBridge(main, { from: gorge.from, to: gorge.to, ground: relief.height }))).toBeGreaterThan(3000);
    const tunnel = network.structures.find((s) => s.kind === "rock-tunnel")!;
    expect(triangles(tunnelLining(main, tunnel.from, tunnel.to, { kind: "rock", lamps: [tunnel.from + 20] }))).toBeGreaterThan(1000);
    expect(triangles(tunnelPortal(main, tunnel.from, -1, 12))).toBeGreaterThan(100);
    for (const station of network.stations.filter((s) => s.building !== "none")) expect(triangles(stationMesh(main, station, 5))).toBeGreaterThan(200);
    expect(triangles(islandPlatform(main, network.stations[2], network.trackSpacing))).toBeGreaterThan(200);
    expect(emptyMesh().positions).toEqual([]);
  });
});

describe("relief", () => {
  const relief = createRelief(network);
  it("porte la voie sur sa plateforme, la laisse libre au-dessus des vallées et sous les montagnes", () => {
    for (const s of [60, 250, 1000, 2200, 2700]) {
      const p = main.pointAt(s);
      expect(relief.height(p.x, p.z)).toBeCloseTo(p.y - FORMATION_DEPTH - 0.04, 0);
    }
    for (const st of network.structures) {
      const p = main.pointAt((st.from + st.to) / 2);
      const h = relief.height(p.x, p.z);
      // Sous les ponts : la vallée, loin sous le tablier ; au-dessus des tunnels et de la galerie : bien au-dessus de la voûte.
      if (st.kind === "stone-viaduct" || st.kind === "truss-bridge") expect(h).toBeLessThan(p.y - 20);
      else expect(h).toBeGreaterThan(p.y + 6);
    }
  });

  it("prévoit la place du futur décor, toujours hors du gabarit ferroviaire", () => {
    const anchors = decorAnchors(network, relief);
    for (const kind of ["river-bed", "waterfall", "mountain-top", "station-forecourt", "trackside"]) expect(anchors.some((a) => a.kind === kind)).toBe(true);
    for (const a of anchors.filter((a) => a.kind !== "river-bed")) expect(inRailwayClearance(relief, a.x, a.z, undefined, a.y)).toBe(false);
  });
});

let engine: NullEngine | null = null;
afterEach(() => {
  engine?.dispose();
  engine = null;
});

describe("train à l'écran", () => {
  it("fait rouler les roues sans glisser et passe chaque véhicule sous terre à son tour", () => {
    engine = new NullEngine();
    const scene = new Scene(engine);
    const consist = createConsist(4, 6);
    const view = createTrainView(scene, createMaterialSet(scene, "m"), consist);
    const tunnel = network.structures.find((s) => s.kind === "rock-tunnel")!;
    const head = tunnel.from + 8;
    const poses = vehicleFronts(consist, head).map((front, i) => poseVehicle(main, consist.vehicles[i].spec, front));
    const light = poses.map((p) => (p.s > tunnel.from + 3 ? 0.2 : 1));
    view.update(poses, 1.2, light);
    expect(light[0]).toBe(0.2);
    expect(light[light.length - 1]).toBe(1);
    // Chaque véhicule a sa propre teinte : la locomotive sous la voûte s'assombrit, la queue reste au jour.
    const tint = (name: string) => ((view.meshes().find((m) => m.parent?.name === name)!.material as MultiMaterial).subMaterials[0] as PBRMaterial).albedoColor.r;
    expect(tint("vehicle-0")).toBeLessThan(tint(`vehicle-${consist.vehicles.length - 1}`) * 0.5);
    // Le haut d'une roue avance de la distance parcourue : angle = distance / rayon, sens de la marche.
    const wheels = view.meshes().find((m) => m.name === "loco-drivers")!;
    const matrix = Matrix.FromArray(wheels.thinInstanceGetWorldMatrices()[0].asArray());
    const top = Vector3.TransformCoordinates(new Vector3(0, 0.78, 0), matrix);
    const center = Vector3.TransformCoordinates(Vector3.Zero(), matrix);
    expect(top.z - center.z).toBeCloseTo(0.78 * Math.sin(1.2 / 0.78), 3);
    view.dispose();
  });
});

describe("caméras", () => {
  const consist = createConsist(4, 6);
  const input = (head: number): RigInput => ({
    track: main,
    network,
    head,
    poses: vehicleFronts(consist, head).map((front, i) => poseVehicle(main, consist.vehicles[i].spec, front)),
    cab: { eye: new Vector3(0, 3, 0), target: new Vector3(0, 3, 10) },
    ground: createRelief(network).height,
    station: null,
    portrait: false,
  });

  it("descend dans le tube quand le train est sous terre", () => {
    const tunnel = network.structures.find((s) => s.kind === "rock-tunnel")!;
    const mid = (tunnel.from + tunnel.to) / 2;
    expect(depthInside(network, mid)).toBeGreaterThan(100);
    expect(depthInside(network, 500)).toBeLessThan(0);
    const inside = desiredPose("behind", input(mid), 1);
    const p = main.pointAt(mid - 28);
    expect(inside.eye.y - p.y).toBeLessThan(TUNNEL_CROWN - 1.5);
    const outside = desiredPose("behind", input(300), 1);
    expect(outside.eye.y - main.pointAt(272).y).toBeGreaterThan(6);
  });

  it("passe d'une vue à l'autre en fondu, sans saut", () => {
    const rig = createCameraRig("behind");
    const a = rig.update(input(300), 0, 1 / 60).eye.clone();
    rig.setMode("side", 0);
    const b = rig.update(input(300), 1 / 60, 1 / 60).eye.clone();
    const end = rig.update(input(300), 2, 1 / 60).eye.clone();
    expect(Vector3.Distance(a, b)).toBeLessThan(Vector3.Distance(a, end) * 0.05);
    expect(rig.mode).toBe("side");
  });
});

describe("bras à ressort", () => {
  const relief = createRelief(network);
  const obstacles = createObstacles(network, relief);
  it("ne laisse jamais l'œil dans la roche, ni dans le contreventement du pont métallique", () => {
    const tunnel = network.structures.find((s) => s.kind === "rock-tunnel")!;
    const p = main.pointAt((tunnel.from + tunnel.to) / 2);
    const target = new Vector3(p.x, p.y + 2, p.z);
    // Un œil voulu à 20 m au-dessus de la voûte, dans la montagne : il redescend dans le tube.
    const eye = resolveEye(new Vector3(p.x, p.y + 20, p.z), target, obstacles);
    expect(obstacles.opaque(eye)).toBe(false);
    expect(eye.y - p.y).toBeLessThan(TUNNEL_CROWN - 0.3);
    const gorge = network.structures.find((s) => s.kind === "truss-bridge")!;
    const g = main.pointAt(gorge.from + 20);
    const wanted = new Vector3(g.x, g.y + 7.0, g.z);
    expect(obstacles.thin(wanted)).toBe(true);
    expect(obstacles.thin(resolveEye(wanted, new Vector3(g.x, g.y + 2, g.z + 0.01), obstacles))).toBe(false);
  });
});

describe("matériaux physiques", () => {
  it("range chaque triangle dans sa famille : acier, peinture, laiton, bois, béton…", () => {
    const { ranges } = groupByFamily(locomotiveBody());
    const families = ranges.map(([k]) => k);
    // La locomotive a de la peinture, de l'acier, du laiton et du verre.
    for (const k of [MATERIAL.paint, MATERIAL.metal, MATERIAL.brass, MATERIAL.glass]) expect(families).toContain(k);
    const wagon = groupByFamily(wagonBody()).ranges.map(([k]) => k);
    expect(wagon).toContain(MATERIAL.wood);
    expect(wagon).toContain(MATERIAL.metal);
    // Les triangles sont tous gardés.
    expect(ranges.reduce((n, [, , c]) => n + c, 0)).toBe(locomotiveBody().indices.length);
  });
});

describe("gabarit des tunnels", () => {
  it("laisse au train, avec ses débords en courbe et son dévers, une marge de 0,5 m jusqu'aux passages et à la voûte", () => {
    const extent = (d: { positions: number[] }) => {
      let x = 0;
      let y = 0;
      for (let i = 0; i < d.positions.length; i += 3) {
        x = Math.max(x, Math.abs(d.positions[i]));
        y = Math.max(y, d.positions[i + 1]);
      }
      return { x, y };
    };
    const stock = [
      { spec: VEHICLES.locomotive, ...extent(locomotiveBody()) },
      { spec: VEHICLES.tender, ...extent(tenderBody()) },
      { spec: VEHICLES.wagon, ...extent(wagonBody()) },
    ];
    for (const st of network.structures.filter((s) => s.kind === "rock-tunnel" || s.kind === "gallery")) {
      let curvature = 0;
      let cant = 0;
      for (let s = st.from; s <= st.to; s += 1) {
        const p = main.pointAt(s);
        curvature = Math.max(curvature, Math.abs(p.curvature));
        cant = Math.max(cant, Math.abs(p.cant));
      }
      for (const v of stock) {
        const pivots = v.spec.pivots[1] - v.spec.pivots[0];
        // Débord en courbe (milieu ou bouts, le plus grand), inclinaison du dévers en haut du véhicule, ballant.
        const throwOut = Math.max(pivots ** 2, v.spec.length ** 2 - pivots ** 2) * curvature / 8;
        const half = v.x + throwOut + Math.sin(cant) * v.y + 0.15;
        expect(half).toBeLessThanOrEqual(TUNNEL_ENVELOPE.halfWidth);
        expect(v.y + 0.1).toBeLessThanOrEqual(TUNNEL_ENVELOPE.height);
        const kind = st.kind === "gallery" ? "gallery" : "rock";
        const walls = (kind === "rock" ? TUNNEL.halfWidth : GALLERY.halfWidth) - TUNNEL.walkway;
        expect(walls - half).toBeGreaterThanOrEqual(TUNNEL_ENVELOPE.margin);
        expect(tunnelCeiling(half, kind) - TUNNEL_ENVELOPE.height).toBeGreaterThanOrEqual(TUNNEL_ENVELOPE.margin);
      }
    }
  });
});

describe("vapeur : le train ne pollue pas", () => {
  it("n'a aucune fumée de cheminée : il ne reste que la vapeur blanche des purgeurs et du sifflet", () => {
    engine = new NullEngine();
    const scene = new Scene(engine);
    const steam = createSteam(scene, "low", false);
    // Seuls deux systèmes de particules existent : les purgeurs des cylindres et le sifflet ; aucun nommé fumée.
    expect(scene.particleSystems.map((system) => system.name).sort()).toEqual(["cylinder-steam", "whistle-steam"]);
    // La fumée n'est plus pilotée : ni à la cheminée, ni par les coups d'échappement, ni sous la voûte.
    expect("puff" in steam).toBe(false);
    expect("setEnclosure" in steam).toBe(false);
    // Plein régulateur en roulant : aucune particule n'apparaît (les purgeurs ne s'ouvrent qu'au démarrage, le sifflet à l'appel).
    const origin = new Vector3();
    for (let frame = 0; frame < 120; frame += 1) steam.update([origin, origin], origin, new Vector3(0, 0, 1), 1, 12);
    expect(scene.particleSystems.every((system) => system.emitRate === 0)).toBe(true);
    // Le sifflet souffle toujours son jet de vapeur.
    steam.whistle();
    steam.update([origin, origin], origin, new Vector3(0, 0, 1), 0, 0);
    expect(scene.particleSystems.find((system) => system.name === "whistle-steam")!.emitRate).toBeGreaterThan(0);
    steam.dispose();
    expect(scene.particleSystems).toHaveLength(0);
  });
});
