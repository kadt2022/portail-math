import { box, cylinder, sphere } from "../kit";
import { HELM, HULL, deckY, halfBeam, sheer, tAt, zAt, type Vec3 } from "./dimensions";
import { BOAT_COLORS as C } from "./palette";
import { FINISH, pipe, roundedBox, torus, tube, withFinish, type BoatMesh } from "./shapes";

// Accessoires nautiques : balcon chromé à la proue, mains courantes, poignées de poupe, deux lanternes, la bouée
// accrochée au dossier du siège passager, la glacière, un rouleau de cordage et les feux de navigation.

const linspace = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
const capX = (z: number) => halfBeam(tAt(z)) - HULL.cap / 2;

/** Balcon de proue : main courante chromée sur des chandeliers, qui fait le tour de l'étrave. */
function bowRail(target: BoatMesh): void {
  const height = 0.24;
  const start = 1.3;
  const tip = HULL.bow - 0.2;
  const along = linspace(start, tip, 7);
  const sideAt = (z: number) => Math.max(halfBeam(tAt(z)) - 0.07, 0.05);
  const path: Vec3[] = [
    ...along.map((z): Vec3 => [sideAt(z), sheer(tAt(z)) + height, z]),
    [0, sheer(tAt(tip)) + height + 0.02, tip + 0.1],
    ...[...along].reverse().map((z): Vec3 => [-sideAt(z), sheer(tAt(z)) + height, z]),
  ];
  withFinish(target, FINISH.chrome, () => {
    pipe(target, path, 0.016, C.chrome, 6);
    for (const side of [-1, 1]) {
      for (const z of [start, 1.85, tip - 0.05]) {
        const x = side * sideAt(z);
        tube(target, [x, deckY(x, z) - 0.01, z], [x, sheer(tAt(z)) + height, z], 0.013, C.chrome, 5);
      }
    }
  });
}

/** Mains courantes sur le liston, de part et d'autre de l'arrière du cockpit, et poignées en arceau sur le pont arrière. */
function grabRails(target: BoatMesh): void {
  withFinish(target, FINISH.chrome, () => {
    for (const side of [-1, 1]) {
      const z0 = -1.85;
      const z1 = -1.15;
      const lift = 0.13;
      const x = (z: number) => side * capX(z);
      const y = (z: number) => sheer(tAt(z));
      pipe(target, [[x(z0), y(z0), z0], [x(z0), y(z0) + lift * 0.75, z0 + 0.01], [x(z0 + 0.06), y(z0) + lift, z0 + 0.06], [x(z1 - 0.06), y(z1) + lift, z1 - 0.06], [x(z1), y(z1) + lift * 0.75, z1 - 0.01], [x(z1), y(z1), z1]], 0.016, C.chrome, 6);
      const xs = side * 0.84;
      const ys = sheer(0);
      const yp = ys + 0.3;
      pipe(target, [[xs, yp, HULL.stern + 0.03], [xs, yp + 0.12, HULL.stern + 0.05], [xs, yp + 0.16, HULL.stern + 0.17], [xs, yp + 0.12, HULL.stern + 0.29], [xs, yp, HULL.stern + 0.31]], 0.018, C.chrome, 6);
    }
  });
}

/** Lanterne de pont : socle et chapeau de bronze, verre chaud lumineux, montants et anse. */
export function deckLantern(target: BoatMesh, x: number, y: number, z: number): void {
  withFinish(target, FINISH.satin, () => {
    cylinder(target, 0.066, 0.06, 0.035, 8, C.bronze, { x, y, z });
    cylinder(target, 0.072, 0.02, 0.065, 8, C.bronze, { x, y: y + 0.165, z });
    for (let i = 0; i < 4; i += 1) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      tube(target, [x + Math.cos(a) * 0.056, y + 0.03, z + Math.sin(a) * 0.056], [x + Math.cos(a) * 0.056, y + 0.17, z + Math.sin(a) * 0.056], 0.007, C.bronze, 4);
    }
    torus(target, 0.034, 0.006, C.bronze, { x, y: y + 0.255, z, roll: Math.PI / 2 }, 8, 3);
  });
  withFinish(target, FINISH.glow, () => cylinder(target, 0.05, 0.05, 0.135, 8, C.lampWarm, { x, y: y + 0.033, z }));
  withFinish(target, FINISH.glowBright, () => cylinder(target, 0.022, 0.022, 0.09, 6, C.lampCore, { x, y: y + 0.055, z }));
}

/** Bouée de sauvetage rouge et blanche, avec son filin, accrochée au dossier du siège passager. */
function lifebuoy(target: BoatMesh): void {
  const lean = -0.16;
  const at = { x: -HELM.x, y: 0.82, z: HELM.seatZ - 0.37, pitch: Math.PI / 2 + lean };
  withFinish(target, FINISH.vinyl, () => torus(target, 0.19, 0.052, (u) => (Math.floor(u * 8) % 2 === 0 ? C.red : C.white), at, 16, 7, 8));
  withFinish(target, FINISH.fabric, () => torus(target, 0.245, 0.008, C.rope, at, 18, 3));
}

/** Glacière blanche au couvercle bleu sur le pont arrière, rouleau de cordage, feux de navigation rouge et vert. */
function deckItems(target: BoatMesh): void {
  const cooler = { x: -0.27, z: HULL.stern + 0.18, y: sheer(0) };
  withFinish(target, FINISH.satin, () => {
    roundedBox(target, 0.46, 0.3, 0.3, C.white, { x: cooler.x, y: cooler.y + 0.15, z: cooler.z }, 0.22, 2);
    for (const side of [-1, 1]) roundedBox(target, 0.04, 0.05, 0.14, C.grey, { x: cooler.x + side * 0.235, y: cooler.y + 0.22, z: cooler.z }, 0.5, 2);
  });
  withFinish(target, FINISH.gloss, () => roundedBox(target, 0.48, 0.07, 0.32, C.royal, { x: cooler.x, y: cooler.y + 0.32, z: cooler.z }, 0.3, 2));
  withFinish(target, FINISH.chrome, () => roundedBox(target, 0.06, 0.05, 0.02, C.chrome, { x: cooler.x, y: cooler.y + 0.27, z: cooler.z - 0.155 }, 0.5, 2));

  withFinish(target, FINISH.fabric, () => {
    torus(target, 0.13, 0.026, C.rope, { x: 0.45, y: HULL.floor + 0.026, z: -1.7 }, 12, 4);
    torus(target, 0.1, 0.024, C.rope, { x: 0.47, y: HULL.floor + 0.07, z: -1.69 }, 10, 4);
  });

  const navZ = 2.0;
  for (const side of [-1, 1]) {
    const x = side * (halfBeam(tAt(navZ)) - 0.06);
    withFinish(target, FINISH.glowBright, () => sphere(target, 0.03, side < 0 ? C.navRed : C.navGreen, { x, y: deckY(x, navZ) + 0.01, z: navZ, scale: [1, 0.8, 1.3] }, 3));
  }
  withFinish(target, FINISH.chrome, () => {
    for (const side of [-1, 1]) box(target, 0.03, 0.025, 0.14, C.chrome, { x: side * 0.25, y: deckY(side * 0.25, zAt(0.86)) - 0.005, z: zAt(0.86) });
  });
}

export function accessoryParts(target: BoatMesh): void {
  bowRail(target);
  grabRails(target);
  deckLantern(target, -0.72, sheer(0) + 0.3, HULL.stern + 0.2);
  deckLantern(target, capX(-0.62), sheer(tAt(-0.62)) + 0.01, -0.62);
  lifebuoy(target);
  deckItems(target);
}
