import { VEHICLES } from "../../domain/consist";
import { addShape, box, cylinderZ, emptyMesh, merge, mixColor, scaleColor, sphere, sweep, type Color, type MeshData, type Vec3 } from "./kit";
import { valueNoise } from "./noise";
import { PALETTE as C } from "./palette";
import { arcBand, bar, disc, ring, rod, turned } from "./shapes";

// Le matériel roulant, en géométrie procédurale : locomotive à vapeur, tender, wagon tombereau en bois, roues à rayons,
// bielles, attelages et caisses de mangues. Chaque modèle est construit dans le repère de son véhicule : z vers l'avant,
// x vers la droite, y vers le haut ; l'origine est sur le plan des rails, au milieu des deux points d'appui (là où la
// physique pose le véhicule). Les pièces qui bougent (roues, bielles, crosses de piston) sont des maillages à part,
// animés par la scène.
//
// Écrit pour Yamba, d'après les maquettes du Capitaine Pi (locomotive rouge et noire filetée d'or, wagons de bois
// chargés de caisses de fruits).

/** Écartement des rails (m) : voie normale. */
export const GAUGE = 1.435;
/** Demi-écartement des plans des roues (le bandage roule sur le champignon du rail). */
export const WHEEL_TRACK = GAUGE / 2 + 0.03;

/** Repère des véhicules : position de l'avant et de l'arrière par rapport à l'origine (milieu des appuis). */
export function vehicleExtent(kind: keyof typeof VEHICLES): { front: number; rear: number; axles: { z: number; radius: number }[] } {
  const spec = VEHICLES[kind];
  const origin = (spec.pivots[0] + spec.pivots[1]) / 2;
  return { front: origin, rear: origin - spec.length, axles: spec.axles.map((a) => ({ z: origin - a.at, radius: a.radius })) };
}

const LOCO = vehicleExtent("locomotive");
const TENDER = vehicleExtent("tender");
const WAGON = vehicleExtent("wagon");

/** Rayon de manivelle des roues motrices (demi-course du piston). */
export const CRANK = 0.3;
/** Hauteur de l'axe des cylindres, longueur de la bielle motrice, essieu moteur (indice dans les essieux). */
export const CYLINDER_Y = 0.98;
export const CONNECTING_ROD = 3.05;
export const MAIN_AXLE = 2;

/**
 * Roue à rayons d'axe x, centrée sur l'origine, mentonnet (boudin) du côté +x. `crank` ajoute le bossage de
 * manivelle et le contrepoids des roues motrices.
 */
export function spokedWheel(radius: number, spokes: number, color: Color, crank = false): MeshData {
  const mesh = emptyMesh();
  const tyre = 0.1;
  const segments = 22;
  // Bandage d'acier avec son boudin (un seul profil), jante peinte, moyeu.
  ring(mesh, radius - 0.035, radius, 0.13, segments, C.steel);
  ring(mesh, radius - 0.02, radius + 0.035, 0.03, segments, C.steelDark, [0.055, 0, 0]);
  ring(mesh, radius - tyre, radius - 0.035, 0.1, segments, color);
  disc(mesh, radius * 0.2, 0.16, 10, color);
  disc(mesh, radius * 0.09, 0.2, 6, C.steelDark);
  // Rayons, légèrement effilés vers la jante (sans bouts : ils sont cachés par le moyeu et la jante).
  for (let i = 0; i < spokes; i += 1) {
    const a = (i / spokes) * Math.PI * 2;
    const inner: Vec3 = [0, Math.sin(a) * radius * 0.18, Math.cos(a) * radius * 0.18];
    const outer: Vec3 = [0, Math.sin(a) * (radius - tyre + 0.01), Math.cos(a) * (radius - tyre + 0.01)];
    spoke(mesh, inner, outer, 0.06, radius * 0.085, color);
  }
  if (crank) {
    // Contrepoids en croissant, à l'opposé de la manivelle, et bossage de manivelle.
    const frames = [];
    for (let i = 0; i <= 6; i += 1) {
      const a = Math.PI + (i / 6 - 0.5) * 1.6;
      frames.push({ p: [0, 0, 0] as Vec3, right: [1, 0, 0] as Vec3, up: [0, Math.sin(a), Math.cos(a)] as Vec3 });
    }
    sweep(mesh, [[-0.04, radius * 0.3], [0.04, radius * 0.3], [0.04, radius - tyre], [-0.04, radius - tyre]], frames, scaleColor(color, 0.85), true);
    disc(mesh, 0.13, 0.12, 8, color, [-0.05, 0, CRANK]);
  }
  return mesh;
}

/** Rayon de roue : barre à quatre faces, sans bouts. */
function spoke(mesh: MeshData, a: Vec3, b: Vec3, width: number, height: number, color: Color): void {
  const w = width / 2;
  const h = height / 2;
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const n = Math.hypot(d[0], d[1], d[2]) || 1;
  // Repère : x (axe de la roue) et la perpendiculaire au rayon dans le plan de la roue.
  const side: Vec3 = [0, -d[2] / n, d[1] / n];
  sweep(mesh, [[-w, -h], [w, -h], [w, h], [-w, h]], [a, b].map((p) => ({ p, right: [1, 0, 0] as Vec3, up: side })), color, true);
}

/**
 * Roue lointaine (au-delà de 35 m) : un disque plein à la couleur de la jante, cerclé d'acier, avec moyeu et
 * contrepoids. À cette distance, on ne distingue plus les rayons ; elle coûte dix fois moins.
 */
export function wheelFar(radius: number, color: Color, crank = false): MeshData {
  const mesh = emptyMesh();
  ring(mesh, radius - 0.04, radius + 0.02, 0.13, 14, C.steel);
  disc(mesh, radius - 0.04, 0.08, 14, scaleColor(color, 0.8));
  disc(mesh, radius * 0.2, 0.16, 8, color);
  if (crank) disc(mesh, 0.13, 0.12, 6, color, [-0.05, 0, CRANK]);
  return mesh;
}

/** Essieu : l'axe d'acier entre les deux roues, et les boîtes d'essieu. */
export function axle(radius: number): MeshData {
  const mesh = emptyMesh();
  rod(mesh, [-WHEEL_TRACK, 0, 0], [WHEEL_TRACK, 0, 0], radius * 0.09, C.steelDark, 8);
  return mesh;
}

// ————————————————————————————————————————————————————————————————— Locomotive

/** Panneau rectangulaire filet d'or : un rectangle de couleur, bordé d'un mince liseré doré en relief. */
function linedPanel(mesh: MeshData, x: number, y0: number, y1: number, z0: number, z1: number, base: Color, outward: number): void {
  const t = 0.012;
  const xs = x + outward * 0.008;
  box(mesh, t, y1 - y0, z1 - z0, base, { x: xs - outward * 0.004, y: y0, z: (z0 + z1) / 2 });
  const inset = 0.07;
  const line = 0.022;
  const gx = xs + outward * 0.006;
  bar(mesh, [gx, y0 + inset, z0 + inset], [gx, y0 + inset, z1 - inset], 0.01, line, C.gold, [1, 0, 0]);
  bar(mesh, [gx, y1 - inset, z0 + inset], [gx, y1 - inset, z1 - inset], 0.01, line, C.gold, [1, 0, 0]);
  bar(mesh, [gx, y0 + inset, z0 + inset], [gx, y1 - inset, z0 + inset], 0.01, line, C.gold, [1, 0, 0]);
  bar(mesh, [gx, y0 + inset, z1 - inset], [gx, y1 - inset, z1 - inset], 0.01, line, C.gold, [1, 0, 0]);
}

/** Tampon : fût, plateau d'acier, posé à l'extrémité z d'un véhicule (sens +1 à l'avant, -1 à l'arrière). */
function buffers(mesh: MeshData, z: number, dir: number, y: number, beamColor: Color): void {
  for (const x of [-0.86, 0.86]) {
    cylinderZ(mesh, 0.12, 0.2, 10, C.black, { x, y, z: z - dir * 0.24 }, 0.1);
    cylinderZ(mesh, 0.065, 0.16, 8, C.steelDark, { x, y, z: z - dir * 0.08 });
    cylinderZ(mesh, 0.2, 0.04, 14, C.steel, { x, y, z: z - dir * 0.02 });
  }
  // Crochet et tendeur au milieu.
  box(mesh, 0.12, 0.16, 0.2, C.iron, { y: y - 0.08, z: z - dir * 0.1 });
  box(mesh, 0.26, 0.05, 0.05, beamColor, { y: y + 0.12, z: z - dir * 0.2 });
}

/** La locomotive, caisse sans ses roues ni ses bielles (posées à part pour être animées). Environ 15 000 triangles. */
export function locomotiveBody(): MeshData {
  const mesh = emptyMesh();
  const F = LOCO.front;
  const B = LOCO.rear;
  // Châssis : longerons, tablier, jupe rouge filetée d'or.
  for (const x of [-0.56, 0.56]) box(mesh, 0.08, 0.9, F - 0.4 - (B + 0.2), C.black, { x, y: 0.45, z: (F - 0.4 + B + 0.2) / 2 });
  box(mesh, 2.7, 0.08, F - 0.25 - B, C.black, { y: 1.42, z: (F - 0.25 + B) / 2 });
  for (const side of [-1, 1]) {
    box(mesh, 0.05, 0.22, F - 0.25 - B, C.red, { x: side * 1.34, y: 1.21, z: (F - 0.25 + B) / 2 });
    bar(mesh, [side * 1.37, 1.36, F - 0.3], [side * 1.37, 1.36, B + 0.05], 0.012, 0.025, C.gold, [1, 0, 0]);
  }
  // Traverse avant et tampons.
  box(mesh, 2.5, 0.62, 0.18, C.red, { y: 0.9, z: F - 0.33 });
  bar(mesh, [-1.2, 1.4, F - 0.235], [1.2, 1.4, F - 0.235], 0.025, 0.012, C.gold);
  buffers(mesh, F, 1, 1.18, C.red);
  // Chasse-pierres en chevron : barreaux rouges inclinés vers l'avant.
  for (let i = -5; i <= 5; i += 1) {
    const x = i * 0.21;
    const tip = F + 0.55 - Math.abs(x) * 0.38;
    bar(mesh, [x, 0.92, F - 0.25], [x * 1.04, 0.14, tip], 0.06, 0.05, i % 2 === 0 ? C.red : C.redDark, [1, 0, 0]);
  }
  bar(mesh, [-1.15, 0.15, F + 0.12], [0, 0.13, F + 0.56], 0.06, 0.06, C.black);
  bar(mesh, [0, 0.13, F + 0.56], [1.15, 0.15, F + 0.12], 0.06, 0.06, C.black);
  bar(mesh, [-1.15, 0.9, F - 0.24], [1.15, 0.9, F - 0.24], 0.06, 0.06, C.black);
  // Cylindres, boîtes à vapeur, glissières.
  const cylZ = F - 1.5;
  for (const side of [-1, 1]) {
    const x = side * 1.02;
    cylinderZ(mesh, 0.32, 1.0, 18, C.black, { x, y: CYLINDER_Y, z: cylZ });
    cylinderZ(mesh, 0.345, 0.06, 18, C.gold, { x, y: CYLINDER_Y, z: cylZ + 0.52 });
    cylinderZ(mesh, 0.345, 0.06, 18, C.gold, { x, y: CYLINDER_Y, z: cylZ - 0.52 });
    box(mesh, 0.42, 0.34, 0.86, C.blackSoft, { x, y: CYLINDER_Y + 0.22, z: cylZ });
    bar(mesh, [x, CYLINDER_Y + 0.56, cylZ - 0.4], [x, CYLINDER_Y + 0.56, cylZ + 0.4], 0.44, 0.02, C.gold);
    for (const dy of [-0.11, 0.11]) bar(mesh, [x, CYLINDER_Y + dy, cylZ - 0.5], [x, CYLINDER_Y + dy, LOCO.axles[MAIN_AXLE].z + CONNECTING_ROD - 0.55], 0.07, 0.05, C.steelBright, [1, 0, 0]);
    // Tuyau d'échappement vers la boîte à fumée.
    rod(mesh, [x * 0.9, CYLINDER_Y + 0.35, cylZ + 0.2], [side * 0.55, 1.75, F - 0.6], 0.09, C.black, 8);
  }
  // Selle sous la boîte à fumée, chaudière noire cerclée d'or, boîte à fumée graphite.
  const boilerY = 2.38;
  const boilerFront = F - 1.0;
  const boilerBack = B + 2.55;
  box(mesh, 1.3, 0.7, 0.9, C.graphite, { y: 1.46, z: F - 0.95 });
  cylinderZ(mesh, 0.8, boilerFront - boilerBack, 28, C.black, { y: boilerY, z: (boilerFront + boilerBack) / 2 });
  for (let i = 0; i <= 4; i += 1) {
    const z = boilerBack + 0.25 + ((boilerFront - boilerBack - 0.4) * i) / 4;
    ring(mesh, 0.79, 0.815, 0.06, 28, C.gold, [0, boilerY, z], "z");
  }
  cylinderZ(mesh, 0.85, 0.8, 28, C.graphite, { y: boilerY, z: boilerFront + 0.4 });
  ring(mesh, 0.82, 0.88, 0.05, 28, C.steelDark, [0, boilerY, boilerFront + 0.8], "z");
  // Porte de boîte à fumée : disque bombé, charnières, poignée en croix, plaque dorée.
  disc(mesh, 0.72, 0.06, 26, C.blackSoft, [0, boilerY, boilerFront + 0.83], "z");
  disc(mesh, 0.5, 0.05, 22, C.graphite, [0, boilerY, boilerFront + 0.87], "z");
  disc(mesh, 0.07, 0.12, 10, C.steelBright, [0, boilerY, boilerFront + 0.9], "z");
  bar(mesh, [-0.2, boilerY, boilerFront + 0.93], [0.2, boilerY, boilerFront + 0.93], 0.04, 0.04, C.steelBright);
  bar(mesh, [0, boilerY - 0.2, boilerFront + 0.93], [0, boilerY + 0.2, boilerFront + 0.93], 0.04, 0.04, C.steelBright);
  for (const dy of [-0.38, 0.38]) bar(mesh, [-0.66, boilerY + dy, boilerFront + 0.88], [0.1, boilerY + dy, boilerFront + 0.88], 0.035, 0.07, C.steelDark);
  box(mesh, 0.5, 0.17, 0.03, C.gold, { y: boilerY + 0.47, z: boilerFront + 0.88 });
  // Cheminée évasée au bord de cuivre.
  turned(mesh, [[0.44, -0.06], [0.3, 0.06], [0.24, 0.2], [0.23, 0.5], [0.27, 0.72], [0.36, 0.92], [0.39, 0.98]], 20, C.black, [0, boilerY + 0.7, boilerFront + 0.42]);
  turned(mesh, [[0.39, 0.97], [0.41, 1.0], [0.4, 1.07], [0.32, 1.08], [0.3, 0.95]], 20, C.copper, [0, boilerY + 0.7, boilerFront + 0.42]);
  // Dôme de vapeur en laiton, sablière rouge coiffée de laiton, cloche sur son étrier.
  turned(mesh, [[0.46, -0.08], [0.42, 0.06], [0.42, 0.26], [0.37, 0.44], [0.25, 0.56], [0.08, 0.62], [0, 0.63]], 22, (h) => (h < 0.06 ? C.goldDark : C.brass), [0, boilerY + 0.72, (boilerFront + boilerBack) / 2 + 0.35]);
  turned(mesh, [[0.36, -0.06], [0.33, 0.06], [0.33, 0.24], [0.29, 0.34], [0.18, 0.42], [0, 0.44]], 18, (h) => (h > 0.3 ? C.brass : C.red), [0, boilerY + 0.72, boilerBack + 0.95]);
  box(mesh, 0.06, 0.32, 0.06, C.black, { x: -0.18, y: boilerY + 0.74, z: boilerFront - 0.55 });
  box(mesh, 0.06, 0.32, 0.06, C.black, { x: 0.18, y: boilerY + 0.74, z: boilerFront - 0.55 });
  box(mesh, 0.42, 0.04, 0.06, C.black, { y: boilerY + 1.04, z: boilerFront - 0.55 });
  turned(mesh, [[0.02, 0.3], [0.08, 0.28], [0.11, 0.18], [0.14, 0.06], [0.19, 0], [0.17, -0.02]], 16, C.brass, [0, boilerY + 0.74, boilerFront - 0.55]);
  // Lanterne avant : caisson noir, cerclage de laiton, verre clair (la lumière réelle est un projecteur de la scène).
  box(mesh, 0.46, 0.44, 0.42, C.black, { y: boilerY + 0.82, z: boilerFront + 0.62 });
  box(mesh, 0.5, 0.05, 0.46, C.brass, { y: boilerY + 1.25, z: boilerFront + 0.62 });
  ring(mesh, 0.13, 0.17, 0.05, 18, C.brass, [0, boilerY + 1.03, boilerFront + 0.85], "z");
  disc(mesh, 0.14, 0.02, 18, C.lamp, [0, boilerY + 1.03, boilerFront + 0.86], "z");
  // Mains courantes dorées le long de la chaudière.
  for (const side of [-1, 1]) {
    rod(mesh, [side * 0.92, boilerY + 0.36, boilerBack + 0.15], [side * 0.92, boilerY + 0.36, boilerFront + 0.5], 0.022, C.gold);
    for (let i = 0; i < 5; i += 1) {
      const z = boilerBack + 0.4 + i * ((boilerFront - boilerBack) / 4.2);
      rod(mesh, [side * 0.78, boilerY + 0.3, z], [side * 0.92, boilerY + 0.36, z], 0.015, C.gold, 5);
    }
  }
  // Garde-roues au-dessus des roues motrices.
  for (const a of LOCO.axles.slice(1)) {
    for (const side of [-1, 1]) arcBand(mesh, a.radius + 0.06, 0.2, 0.05, 0.25, Math.PI - 0.25, 14, C.red, [side * WHEEL_TRACK, a.radius, a.z]);
  }
  // Foyer et cendrier entre les longerons, sous la cabine.
  box(mesh, 1.0, 0.9, 1.6, C.blackSoft, { y: 0.52, z: B + 2.0 });
  // Cabine rouge, panneaux filetés d'or, toit noir cintré.
  const cabFront = B + 2.45;
  const cabBack = B + 0.55;
  const floor = 1.46;
  const eaves = 3.86;
  box(mesh, 2.5, 0.06, cabFront - cabBack, C.woodDark, { y: floor, z: (cabFront + cabBack) / 2 });
  // Façade avant (plaque à lunettes) : deux hublots ronds cerclés de laiton.
  const plate = 0.06;
  const win = { y0: 2.96, y1: 3.58 };
  box(mesh, 2.5, win.y0 - floor, plate, C.red, { y: floor, z: cabFront });
  box(mesh, 2.5, eaves - win.y1, plate, C.red, { y: win.y1, z: cabFront });
  for (const [x0, x1] of [[-1.25, -1.07], [-0.25, 0.25], [1.07, 1.25]] as const) box(mesh, x1 - x0, win.y1 - win.y0, plate, C.red, { x: (x0 + x1) / 2, y: win.y0, z: cabFront });
  // Fenêtres avant à cadre de laiton, sans vitre opaque : le conducteur regarde la voie au travers.
  for (const x of [-0.66, 0.66]) {
    const [x0, x1, y0, y1, z] = [x - 0.4, x + 0.4, win.y0, win.y1, cabFront + 0.04];
    bar(mesh, [x0, y0, z], [x1, y0, z], 0.05, 0.05, C.brass);
    bar(mesh, [x0, y1, z], [x1, y1, z], 0.05, 0.05, C.brass);
    bar(mesh, [x0, y0, z], [x0, y1, z], 0.05, 0.05, C.brass);
    bar(mesh, [x1, y0, z], [x1, y1, z], 0.05, 0.05, C.brass);
  }
  // Côtés : panneau bas filet d'or, grande fenêtre, montant avant, bandeau haut.
  for (const side of [-1, 1]) {
    const x = side * 1.24;
    linedPanel(mesh, x, floor, 2.72, cabBack, cabFront, C.red, side);
    box(mesh, plate, 0.22, cabFront - cabBack, C.black, { x, y: floor, z: (cabFront + cabBack) / 2 });
    box(mesh, plate, eaves - 2.72, 0.28, C.red, { x, y: 2.72, z: cabFront - 0.14 });
    box(mesh, plate, eaves - 2.72, 0.2, C.red, { x, y: 2.72, z: cabBack + 0.1 });
    box(mesh, plate, eaves - 3.52, cabFront - cabBack, C.red, { x, y: 3.52, z: (cabFront + cabBack) / 2 });
    bar(mesh, [x + side * 0.01, 2.74, cabBack + 0.2], [x + side * 0.01, 2.74, cabFront - 0.28], 0.02, 0.04, C.gold, [1, 0, 0]);
    // Plaque du nom, en laiton.
    box(mesh, 0.02, 0.2, 0.7, C.brass, { x: x + side * 0.02, y: 2.08, z: (cabFront + cabBack) / 2 });
    box(mesh, 0.025, 0.13, 0.62, C.redDark, { x: x + side * 0.03, y: 2.115, z: (cabFront + cabBack) / 2 });
    // Main courante verticale à l'arrière de la cabine.
    rod(mesh, [x + side * 0.05, 1.7, cabBack + 0.05], [x + side * 0.05, 3.3, cabBack + 0.05], 0.022, C.gold);
  }
  const roof: [number, number][] = [];
  for (let i = 0; i <= 12; i += 1) {
    const x = -1.42 + (2.84 * i) / 12;
    roof.push([x, eaves + 0.28 * (1 - (x / 1.42) ** 2)]);
  }
  for (let i = 12; i >= 0; i -= 1) roof.push([roof[i][0], roof[i][1] + 0.05]);
  sweep(mesh, roof, [cabBack - 0.2, cabFront + 0.1].map((z) => ({ p: [0, 0, z] as Vec3, right: [1, 0, 0] as Vec3, up: [0, 1, 0] as Vec3 })), C.black, true);
  // Intérieur : façade du foyer (manomètres, porte rougeoyante), régulateur, sièges.
  disc(mesh, 0.8, 0.05, 26, C.graphite, [0, boilerY, cabFront - 0.04], "z");
  for (const x of [-0.24, 0.24]) {
    disc(mesh, 0.11, 0.04, 16, C.brass, [x, boilerY + 0.46, cabFront - 0.08], "z");
    disc(mesh, 0.085, 0.02, 16, C.cream, [x, boilerY + 0.46, cabFront - 0.11], "z");
    bar(mesh, [x, boilerY + 0.46, cabFront - 0.125], [x + 0.05, boilerY + 0.52, cabFront - 0.125], 0.012, 0.012, C.black);
  }
  box(mesh, 0.5, 0.36, 0.05, C.black, { y: 1.96, z: cabFront - 0.07 });
  box(mesh, 0.38, 0.24, 0.02, C.fire, { y: 2.02, z: cabFront - 0.1 });
  rod(mesh, [0.25, boilerY + 0.22, cabFront - 0.1], [0.55, boilerY + 0.05, cabFront - 0.45], 0.025, C.steelBright);
  disc(mesh, 0.045, 0.06, 8, C.red, [0.55, boilerY + 0.05, cabFront - 0.45], "z");
  for (const x of [-0.82, 0.82]) {
    box(mesh, 0.42, 0.08, 0.42, C.woodLight, { x, y: 2.12, z: cabBack + 0.6 });
    box(mesh, 0.08, 0.6, 0.08, C.black, { x, y: floor, z: cabBack + 0.6 });
  }
  // Sifflet sur le toit de la façade.
  turned(mesh, [[0.03, 0], [0.03, 0.12], [0.06, 0.14], [0.06, 0.3], [0.04, 0.32]], 10, C.brass, [0.35, eaves + 0.24, cabFront + 0.15]);
  // Arrière : traverse et barre d'attelage vers le tender.
  box(mesh, 2.3, 0.4, 0.15, C.black, { y: 0.98, z: B + 0.1 });
  box(mesh, 0.2, 0.12, 0.4, C.iron, { y: 1.05, z: B - 0.05 });
  return mesh;
}

/** Bielle d'accouplement d'un côté : relie les trois manivelles, modelée au repos (manivelles vers l'avant). */
export function couplingRod(): MeshData {
  const mesh = emptyMesh();
  const zs = LOCO.axles.slice(1).map((a) => a.z);
  const y = LOCO.axles[1].radius;
  bar(mesh, [0, y, zs[0] + CRANK], [0, y, zs[2] + CRANK], 0.045, 0.11, C.steelBright, [1, 0, 0]);
  for (const z of zs) {
    disc(mesh, 0.1, 0.08, 12, C.steelBright, [0, y, z + CRANK]);
    disc(mesh, 0.05, 0.1, 8, C.brass, [0.01, y, z + CRANK]);
  }
  return mesh;
}

/** Bielle motrice : de la tête de bielle (origine, sur la manivelle) à la crosse, le long de +z. */
export function connectingRod(): MeshData {
  const mesh = emptyMesh();
  bar(mesh, [0, 0, 0], [0, 0, CONNECTING_ROD], 0.05, 0.1, C.steelBright, [1, 0, 0]);
  disc(mesh, 0.13, 0.09, 12, C.steelBright);
  disc(mesh, 0.06, 0.11, 8, C.brass);
  disc(mesh, 0.09, 0.08, 10, C.steelBright, [0, 0, CONNECTING_ROD]);
  return mesh;
}

/** Crosse et tige de piston : la crosse (origine) coulisse entre les glissières ; la tige rentre dans le cylindre. */
export function crosshead(): MeshData {
  const mesh = emptyMesh();
  box(mesh, 0.12, 0.18, 0.32, C.steel, { y: -0.09 });
  rod(mesh, [0, 0, 0.1], [0, 0, 1.0], 0.04, C.steelBright, 8);
  return mesh;
}

// ————————————————————————————————————————————————————————————————— Tender

export function tenderBody(): MeshData {
  const mesh = emptyMesh();
  const F = TENDER.front;
  const B = TENDER.rear;
  for (const x of [-0.92, 0.92]) box(mesh, 0.12, 0.42, F - B - 0.3, C.black, { x, y: 0.72, z: (F + B) / 2 });
  box(mesh, 2.5, 0.08, F - B - 0.2, C.black, { y: 1.12, z: (F + B) / 2 });
  // Boîtes d'essieu et ressorts à lames.
  for (const a of TENDER.axles) for (const side of [-1, 1]) axleBox(mesh, side * 1.0, a.z, a.radius);
  // Caisse à eau rouge, soubassement noir, panneaux filetés d'or.
  const top = 2.62;
  box(mesh, 2.46, top - 1.2, F - B - 0.5, C.red, { y: 1.2, z: (F + B) / 2 - 0.05 });
  for (const side of [-1, 1]) {
    linedPanel(mesh, side * 1.23, 1.4, top - 0.1, B + 0.4, F - 0.5, C.red, side);
    box(mesh, 0.03, 0.2, F - B - 0.5, C.black, { x: side * 1.24, y: 1.2, z: (F + B) / 2 - 0.05 });
    box(mesh, 0.03, 0.06, F - B - 0.5, C.gold, { x: side * 1.25, y: top - 0.04, z: (F + B) / 2 - 0.05 });
  }
  box(mesh, 2.56, 0.08, F - B - 0.44, C.black, { y: top, z: (F + B) / 2 - 0.05 });
  // Soute à charbon à l'avant : un tas bosselé de gros morceaux.
  const heap = emptyMesh();
  for (let i = 0; i < 70; i += 1) {
    const u = (i % 10) / 9 - 0.5;
    const v = Math.floor(i / 10) / 6;
    const h = 0.42 * (1 - (u * 2) ** 2 * 0.6) * (1 - v * 0.5) + valueNoise(i * 1.7, 3, 5) * 0.12;
    sphere(heap, 0.17 + valueNoise(i, 1, 2) * 0.1, i % 3 === 0 ? C.blackSoft : C.coal, { x: u * 2.1, y: top + h * 0.8, z: F - 0.6 - v * 2.4, scale: [1.2, 0.7, 1] }, 3);
  }
  merge(mesh, heap);
  // Plaque de soute, trou d'homme à eau, coffre à outils.
  box(mesh, 2.4, 0.45, 0.06, C.black, { y: top, z: F - 0.25 });
  cylinderZ(mesh, 0.28, 0.2, 16, C.black, { y: top + 0.14, z: B + 0.9 });
  disc(mesh, 0.3, 0.05, 16, C.brass, [0, top + 0.24, B + 0.9], "z");
  box(mesh, 1.5, 0.3, 0.45, C.redDark, { y: top, z: B + 0.35 });
  // Traverses, tampons arrière, marchepieds et mains courantes.
  box(mesh, 2.5, 0.5, 0.16, C.red, { y: 0.82, z: B + 0.22 });
  buffers(mesh, B, -1, 1.06, C.red);
  box(mesh, 2.2, 0.4, 0.14, C.black, { y: 0.9, z: F - 0.1 });
  for (const side of [-1, 1]) {
    for (const z of [F - 0.3, B + 0.35]) {
      box(mesh, 0.36, 0.04, 0.22, C.black, { x: side * 1.18, y: 0.48, z });
      rod(mesh, [side * 1.3, 1.5, z], [side * 1.3, 2.5, z], 0.02, C.gold);
    }
  }
  return mesh;
}

/** Boîte d'essieu, plaque de garde et ressort à lames, à l'extérieur de la roue. */
function axleBox(mesh: MeshData, x: number, z: number, radius: number): void {
  box(mesh, 0.16, 0.3, 0.3, C.iron, { x, y: radius - 0.15, z });
  box(mesh, 0.18, 0.08, 0.36, C.blackSoft, { x, y: radius + 0.15, z });
  for (let i = 0; i < 4; i += 1) {
    const half = 0.62 - i * 0.12;
    bar(mesh, [x, radius + 0.27 - i * 0.035, z - half], [x, radius + 0.27 - i * 0.035, z + half], 0.12, 0.03, i % 2 === 0 ? C.iron : C.blackSoft, [1, 0, 0]);
  }
  for (const dz of [-0.62, 0.62]) bar(mesh, [x, radius + 0.27, z + dz], [x, radius + 0.55, z + dz * 1.05], 0.06, 0.05, C.iron, [1, 0, 0]);
  for (const dz of [-0.17, 0.17]) bar(mesh, [x, radius - 0.25, z + dz], [x, radius + 0.56, z + dz * 1.4], 0.04, 0.07, C.black, [1, 0, 0]);
}

// ————————————————————————————————————————————————————————————————— Wagon

/**
 * Wagon tombereau en bois : châssis noir, traverses rouges, ridelles de planches de deux tons, ferrures et
 * renforts, portes centrales. `tone` décale un peu la teinte du bois d'un wagon à l'autre.
 */
export function wagonBody(tone = 0): MeshData {
  const mesh = emptyMesh();
  const F = WAGON.front;
  const B = WAGON.rear;
  const wood = mixColor(C.wood, tone >= 0 ? C.woodLight : C.woodDark, Math.abs(tone));
  const woodAlt = scaleColor(wood, 0.86);
  // Longerons, traverses de tête rouges, tampons, boîtes d'essieu et ressorts.
  for (const x of [-0.95, 0.95]) box(mesh, 0.14, 0.32, F - B - 0.3, C.black, { x, y: 0.74, z: (F + B) / 2 });
  for (const [z, dir] of [[F, 1], [B, -1]] as const) {
    box(mesh, 2.5, 0.36, 0.14, C.red, { y: 0.76, z: z - dir * 0.3 });
    buffers(mesh, z, dir, 0.98, C.red);
  }
  for (const a of WAGON.axles) for (const side of [-1, 1]) axleBox(mesh, side * 1.02, a.z, a.radius);
  // Croisillons du châssis et sabots de frein.
  bar(mesh, [-0.9, 0.62, F - 0.6], [0.9, 0.62, B + 0.6], 0.08, 0.06, C.blackSoft);
  bar(mesh, [0.9, 0.62, F - 0.6], [-0.9, 0.62, B + 0.6], 0.08, 0.06, C.blackSoft);
  for (const a of WAGON.axles) for (const side of [-1, 1]) box(mesh, 0.1, 0.24, 0.1, C.iron, { x: side * WHEEL_TRACK, y: a.radius - 0.1, z: a.z + (a.z > 0 ? -1 : 1) * (a.radius + 0.06) });
  // Plancher.
  const floor = 1.06;
  box(mesh, 2.5, 0.1, F - B - 0.36, C.woodDark, { y: floor - 0.1, z: (F + B) / 2 });
  // Ridelles : cinq planches par côté, alternées, séparées par un joint sombre.
  const top = 2.06;
  const planks = 5;
  const plank = (top - floor) / planks;
  const length = F - B - 0.5;
  for (let i = 0; i < planks; i += 1) {
    const y = floor + i * plank;
    const color = i % 2 === 0 ? wood : woodAlt;
    const shade = (k: number) => scaleColor(color, 0.94 + valueNoise(i * 3.1 + k, tone * 10, 9) * 0.12);
    for (const side of [-1, 1]) box(mesh, 0.07, plank - 0.018, length, shade(side), { x: side * 1.2, y: y + 0.009, z: (F + B) / 2 });
    for (const [z, k] of [[F - 0.28, 3], [B + 0.28, 5]] as const) box(mesh, 2.34, plank - 0.018, 0.07, shade(k), { y: y + 0.009, z });
  }
  // Joints sombres derrière les planches (on voit une fine ligne entre deux planches).
  for (const side of [-1, 1]) box(mesh, 0.02, top - floor, length, C.woodDark, { x: side * 1.2, y: floor, z: (F + B) / 2 });
  for (const z of [F - 0.28, B + 0.28]) box(mesh, 2.3, top - floor, 0.02, C.woodDark, { y: floor, z });
  // Ferrures : montants, cornières d'angle, lisse haute, portes centrales et leurs pentures, renforts en V.
  for (const side of [-1, 1]) {
    const x = side * 1.25;
    for (const z of [F - 0.3, F - 1.55, -0.62, 0.62, B + 1.55, B + 0.3]) box(mesh, 0.05, top - floor + 0.08, 0.1, C.iron, { x, y: floor - 0.04, z });
    bar(mesh, [x, top + 0.02, F - 0.26], [x, top + 0.02, B + 0.26], 0.07, 0.06, C.iron, [1, 0, 0]);
    for (const dy of [0.25, 0.7]) bar(mesh, [x + side * 0.01, floor + dy, -0.6], [x + side * 0.01, floor + dy, 0.6], 0.02, 0.07, C.iron, [1, 0, 0]);
    bar(mesh, [x, floor + 0.05, F - 1.55], [x, top - 0.05, F - 0.42], 0.03, 0.07, C.iron, [1, 0, 0]);
    bar(mesh, [x, floor + 0.05, B + 1.55], [x, top - 0.05, B + 0.42], 0.03, 0.07, C.iron, [1, 0, 0]);
    // Marchepied et poignée.
    box(mesh, 0.3, 0.04, 0.2, C.black, { x: side * 1.15, y: 0.48, z: F - 0.6 });
  }
  for (const z of [F - 0.27, B + 0.27]) bar(mesh, [-1.25, top + 0.02, z], [1.25, top + 0.02, z], 0.07, 0.06, C.iron);
  // Écusson de la ligne, peint sur une plaque : une mangue et sa feuille sur fond crème, cerclés de rouge.
  for (const side of [-1, 1]) {
    const x = side * 1.27;
    const at = (dz: number, dy: number, dx = 0): Vec3 => [x + side * dx, floor + 0.55 + dy, (B + 1.55 - 0.62) / 2 + dz];
    disc(mesh, 0.3, 0.02, 20, C.red, at(0, 0));
    disc(mesh, 0.25, 0.02, 20, C.cream, at(0, 0, 0.012));
    disc(mesh, 0.13, 0.02, 14, C.mangoOrange, at(0.02, -0.03, 0.024));
    disc(mesh, 0.08, 0.02, 12, C.mangoRed, at(0.06, -0.07, 0.034));
    bar(mesh, at(-0.05, 0.08, 0.03), at(-0.16, 0.16, 0.03), 0.02, 0.07, C.mangoGreen, [1, 0, 0]);
  }
  return mesh;
}

// ————————————————————————————————————————————————————————————————— Marchandises

export const CRATE = { width: 1.0, length: 1.5, height: 0.6 } as const;

/**
 * Caisse de mangues : caisse à claire-voie (lattes, montants d'angle), garnie d'un lit de mangues mûres, du vert au
 * rouge. Origine au centre du fond.
 */
export function mangoCrate(seed = 1): MeshData {
  const mesh = emptyMesh();
  const { width: w, length: l, height: h } = CRATE;
  box(mesh, w, 0.05, l, C.crateDark, {});
  // Lattes horizontales, avec un jour entre elles.
  const slats = 3;
  for (let i = 0; i < slats; i += 1) {
    const y = 0.05 + i * ((h - 0.05) / slats);
    const t = (h - 0.05) / slats - 0.035;
    const color = i % 2 === 0 ? C.crate : mixColor(C.crate, C.crateDark, 0.35);
    for (const side of [-1, 1]) box(mesh, 0.03, t, l, color, { x: side * (w / 2 - 0.015), y, z: 0 });
    for (const side of [-1, 1]) box(mesh, w - 0.06, t, 0.03, color, { y, z: side * (l / 2 - 0.015) });
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(mesh, 0.07, h + 0.02, 0.07, C.crateDark, { x: sx * (w / 2 - 0.035), y: 0, z: sz * (l / 2 - 0.035) });
  box(mesh, w - 0.08, 0.02, l - 0.08, C.crateDark, { y: h - 0.17 });
  // Mangues : une couche serrée, légèrement bombée au centre.
  const cols = 4;
  const rows = 6;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const n = valueNoise(c * 1.7 + seed * 3.3, r * 2.1, 77);
      const ripe = valueNoise(c * 0.9 + seed, r * 0.8 + seed * 2, 91);
      const color = ripe < 0.33 ? mixColor(C.mangoGreen, C.mangoYellow, ripe * 3) : ripe < 0.66 ? mixColor(C.mangoYellow, C.mangoOrange, (ripe - 0.33) * 3) : mixColor(C.mangoOrange, C.mangoRed, (ripe - 0.66) * 3);
      const x = (c / (cols - 1) - 0.5) * (w - 0.24) + (n - 0.5) * 0.05;
      const z = (r / (rows - 1) - 0.5) * (l - 0.24) + (n - 0.5) * 0.05;
      const dome = 0.06 * (1 - (x / (w / 2)) ** 2) * (1 - (z / (l / 2)) ** 2);
      sphere(mesh, 0.1, (height) => (height > 0.03 ? mixColor(color, C.mangoYellow, 0.18) : color), { x, y: h - 0.12 + dome + n * 0.03, z, yaw: n * 6, roll: (n - 0.5) * 0.6, scale: [1.0, 0.82, 1.25] }, 3);
    }
  }
  return mesh;
}

/**
 * Caisse lointaine (au-delà de 30 m) : la caisse pleine, et un lit de mangues en relief (une bosse par mangue, aux
 * mêmes couleurs). Environ 120 triangles au lieu de 1 100.
 */
export function mangoCrateFar(seed = 1): MeshData {
  const mesh = emptyMesh();
  const { width: w, length: l, height: h } = CRATE;
  box(mesh, w, h - 0.14, l, C.crate, {});
  for (const side of [-1, 1]) box(mesh, w + 0.01, 0.03, l + 0.01, C.crateDark, { y: (h - 0.14) * (side > 0 ? 0.66 : 0.33) });
  const cols = 4;
  const rows = 6;
  const vertices: Vec3[] = [];
  const colors: Color[] = [];
  const tris: number[] = [];
  for (let r = 0; r <= rows * 2; r += 1) {
    for (let c = 0; c <= cols * 2; c += 1) {
      const x = (c / (cols * 2) - 0.5) * (w - 0.08);
      const z = (r / (rows * 2) - 0.5) * (l - 0.08);
      const bump = c % 2 === 1 && r % 2 === 1 ? 0.09 : 0;
      vertices.push([x, h - 0.14 + bump + 0.06 * (1 - (2 * x / w) ** 2) * (1 - (2 * z / l) ** 2), z]);
      const ripe = valueNoise(Math.floor(c / 2) * 0.9 + seed, Math.floor(r / 2) * 0.8 + seed * 2, 91);
      colors.push(ripe < 0.5 ? mixColor(C.mangoYellow, C.mangoOrange, ripe * 2) : mixColor(C.mangoOrange, C.mangoRed, (ripe - 0.5) * 2));
    }
  }
  const row = cols * 2 + 1;
  for (let r = 0; r < rows * 2; r += 1) for (let c = 0; c < cols * 2; c += 1) {
    const a = r * row + c;
    tris.push(a, a + 1, a + row, a + 1, a + row + 1, a + row);
  }
  addShape(mesh, vertices, tris, colors);
  return mesh;
}

/** Attelage à vis entre deux véhicules : deux crochets et le tendeur, posés le long de +z, centrés sur l'origine. */
export function coupler(): MeshData {
  const mesh = emptyMesh();
  bar(mesh, [0, 0, -0.32], [0, 0, 0.32], 0.05, 0.05, C.iron);
  rod(mesh, [-0.07, 0, -0.18], [-0.07, 0, 0.18], 0.025, C.steelDark);
  rod(mesh, [0.07, 0, -0.18], [0.07, 0, 0.18], 0.025, C.steelDark);
  disc(mesh, 0.05, 0.12, 8, C.steelBright, [0, 0, 0]);
  return mesh;
}

/** Positions des caisses dans un wagon (centre du fond, repère du wagon) : 3 rangées de 2. */
export function cratePlaces(count: number): Vec3[] {
  const places: Vec3[] = [];
  for (let i = 0; i < count; i += 1) {
    const row = Math.floor(i / 2);
    const side = i % 2 === 0 ? -1 : 1;
    places.push([side * 0.54, 1.07, (1 - row) * 1.62]);
  }
  return places;
}

/** Points remarquables de la locomotive (repère du véhicule) : vapeur des cylindres, sifflet, lanterne, regard du conducteur. */
export const LOCO_ANCHORS = {
  cylinders: [[-1.02, CYLINDER_Y, LOCO.front - 2.05], [1.02, CYLINDER_Y, LOCO.front - 2.05]] as Vec3[],
  whistle: [0.35, 4.42, LOCO.rear + 2.6] as Vec3,
  headlamp: [0, 3.41, LOCO.front - 0.12] as Vec3,
  /** Œil du conducteur, debout à droite dans la cabine, et le point qu'il regarde par le hublot. */
  cabEye: [0.66, 3.3, LOCO.rear + 1.5] as Vec3,
  cabLook: [0.66, 2.9, LOCO.front + 40] as Vec3,
} as const;
