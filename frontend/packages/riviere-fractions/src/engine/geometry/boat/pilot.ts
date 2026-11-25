import { box, cylinder, lathe, sphere } from "../kit";
import { valueNoise } from "../noise";
import { HELM, wheelPoint, type Vec3 } from "./dimensions";
import { BOAT_COLORS as C } from "./palette";
import { FINISH, roundedBox, star, torus, tube, withFinish, type BoatMesh } from "./shapes";

// Le jeune pilote : assis au poste de barre, gilet de sauvetage rouge étoilé, tee-shirt blanc, cheveux noirs bouclés,
// les deux mains sur le volant (à dix heures dix). Proportions d'enfant : tête un peu grande, bras fins.

const SKIN = [0.42, 0.26, 0.17] as const;
const HAIR = [0.085, 0.064, 0.055] as const;
const SHORTS = [0.13, 0.2, 0.45] as const;

export function pilotParts(target: BoatMesh): void {
  const x = HELM.x;
  const z = HELM.seatZ - 0.04;
  const hip = HELM.seatTop + 0.05;

  // Jambes : short bleu, mollets, baskets blanches posées sur le plancher.
  withFinish(target, FINISH.fabric, () => {
    roundedBox(target, 0.3, 0.13, 0.26, SHORTS, { x, y: hip, z }, 0.5, 2);
    for (const side of [-1, 1]) tube(target, [x + side * 0.085, hip, z + 0.02], [x + side * 0.09, hip + 0.02, z + 0.26], 0.066, SHORTS, 7, 0.06);
  });
  withFinish(target, FINISH.satin, () => {
    for (const side of [-1, 1]) tube(target, [x + side * 0.09, hip + 0.01, z + 0.27], [x + side * 0.09, 0.3, z + 0.28], 0.046, SKIN, 6, 0.038);
  });
  withFinish(target, FINISH.satin, () => {
    for (const side of [-1, 1]) roundedBox(target, 0.095, 0.075, 0.19, C.white, { x: x + side * 0.09, y: 0.245, z: z + 0.27 }, 0.45, 2);
  });

  // Gilet de sauvetage : rouge, col orange, sangle sombre, étoile dans le dos.
  const vestY = hip + 0.18;
  withFinish(target, FINISH.vinyl, () => {
    roundedBox(target, 0.36, 0.38, 0.24, C.red, { x, y: vestY, z }, 0.42, 3);
    torus(target, 0.085, 0.036, C.orangeDeep, { x, y: vestY + 0.19, z, scale: [1, 0.7, 1] }, 10, 5);
  });
  withFinish(target, FINISH.satin, () => {
    roundedBox(target, 0.372, 0.04, 0.252, C.black, { x, y: vestY - 0.1, z }, 0.42, 2);
    box(target, 0.05, 0.05, 0.02, C.lampWarm, { x, y: vestY - 0.125, z: z + 0.128 });
  });
  withFinish(target, FINISH.fabric, () => star(target, 0.075, 0.032, [1, 0.9, 0.5], { x, y: vestY + 0.07, z: z - 0.123 }));

  // Bras tendus vers le volant : manches blanches, avant-bras, mains sur la jante.
  const shoulderY = vestY + 0.14;
  const hands: [number, Vec3][] = [[-1, wheelPoint((5 * Math.PI) / 6)], [1, wheelPoint(Math.PI / 6)]];
  for (const [side, hand] of hands) {
    const shoulder: Vec3 = [x + side * 0.17, shoulderY, z + 0.01];
    const sleeve: Vec3 = [x + side * 0.2, shoulderY - 0.05, z + 0.1];
    const elbow: Vec3 = [x + side * 0.21, shoulderY - 0.08, z + 0.2];
    withFinish(target, FINISH.fabric, () => tube(target, shoulder, sleeve, 0.052, C.white, 7, 0.046));
    withFinish(target, FINISH.satin, () => {
      tube(target, sleeve, elbow, 0.037, SKIN, 6, 0.035);
      tube(target, elbow, hand, 0.034, SKIN, 6, 0.03);
      sphere(target, 0.042, SKIN, { x: hand[0], y: hand[1], z: hand[2], scale: [1, 0.85, 1.1] }, 4);
      sphere(target, 0.036, SKIN, { x: elbow[0], y: elbow[1], z: elbow[2] }, 3);
    });
  }

  // Tête : cou, visage, oreilles, yeux ; cheveux bouclés en calotte et en boucles.
  const head: Vec3 = [x, vestY + 0.38, z + 0.02];
  const radius = 0.145;
  withFinish(target, FINISH.satin, () => {
    cylinder(target, 0.046, 0.044, 0.1, 8, SKIN, { x, y: vestY + 0.18, z: z + 0.01 }, false);
    sphere(target, radius, SKIN, { x: head[0], y: head[1], z: head[2], scale: [0.96, 1, 0.98] }, 7);
    for (const side of [-1, 1]) sphere(target, 0.032, SKIN, { x: head[0] + side * 0.138, y: head[1] - 0.01, z: head[2] - 0.005, scale: [0.6, 1, 0.9] }, 3);
  });
  withFinish(target, FINISH.gloss, () => {
    for (const side of [-1, 1]) sphere(target, 0.019, [0.05, 0.035, 0.03], { x: head[0] + side * 0.05, y: head[1] + 0.015, z: head[2] + 0.128, scale: [1, 1.15, 0.6] }, 3);
  });
  withFinish(target, FINISH.satin, () => {
    // Calotte orientée vers le haut et l'arrière : le visage reste dégagé. Boucles serrées tout autour.
    const tilt = -1.0;
    lathe(target, Array.from({ length: 10 }, (_, i): [number, number] => {
      const a = (i / 9) * 1.95;
      return [Math.sin(a) * (radius + 0.026), Math.cos(a) * (radius + 0.026)];
    }), 14, HAIR, { x: head[0], y: head[1] + 0.012, z: head[2] - 0.01, pitch: tilt }, (ring, angle) => 0.93 + 0.14 * valueNoise(ring * 2.7, angle * 2.1, 9));
    const curls = 15;
    for (let i = 0; i < curls; i += 1) {
      const polar = Math.acos(1 - (1 - Math.cos(1.8)) * ((i + 0.5) / curls));
      const around = i * 2.39996;
      const local: Vec3 = [Math.sin(polar) * Math.cos(around), Math.cos(polar), Math.sin(polar) * Math.sin(around)];
      const cy = local[1] * Math.cos(tilt) - local[2] * Math.sin(tilt);
      const cz = local[1] * Math.sin(tilt) + local[2] * Math.cos(tilt);
      const r = radius + 0.004;
      sphere(target, 0.052 + 0.012 * valueNoise(i, 3, 5), HAIR, { x: head[0] + local[0] * r, y: head[1] + 0.012 + cy * r, z: head[2] - 0.01 + cz * r }, 3);
    }
  });
}
