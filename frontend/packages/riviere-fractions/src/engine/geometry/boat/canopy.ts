import { lathe, sphere } from "../kit";
import { ROOF, halfBeam, sheer, tAt, type Vec3 } from "./dimensions";
import { BOAT_COLORS as C } from "./palette";
import { FINISH, disc, pipe, surface, torus, tube, withFinish, type BoatMesh } from "./shapes";

// Toit et éclairage : toit rigide bombé (orange, bandeau bleu à l'avant, sous-face crème), cerclé de LED bleues,
// porté par quatre montants chromés ; barre de quatre projecteurs, gyrophare, radôme et antenne.

const EXPONENT = 2 / ROOF.exponent;
const signedPow = (value: number, exponent: number) => Math.sign(value) * Math.abs(value) ** exponent;
const linspace = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

/** Demi-largeur du toit à la position v (de -1 à l'arrière à 1 à l'avant), un peu affinée vers l'avant. */
const roofWidth = (v: number) => ROOF.halfWidth * (1 - 0.08 * Math.max(0, v));

/** Contour du toit vu de dessus, à l'angle θ (0 vers tribord, π/2 vers l'avant). */
function outline(theta: number, grow = 0): [number, number] {
  const v = signedPow(Math.sin(theta), EXPONENT);
  return [signedPow(Math.cos(theta), EXPONENT) * (roofWidth(v) + grow), ROOF.centerZ + v * (ROOF.halfLength + grow)];
}

/** Hauteur du dessus du toit au point (x, z). */
export function roofTop(x: number, z: number): number {
  const v = Math.max(-1, Math.min(1, (z - ROOF.centerZ) / ROOF.halfLength));
  const half = roofWidth(v) * Math.max(0, 1 - Math.abs(v) ** ROOF.exponent) ** (1 / ROOF.exponent);
  const u = half > 1e-3 ? Math.max(-1, Math.min(1, x / half)) : 0;
  return ROOF.edge + ROOF.dome * (1 - u * u) * (1 - v * v);
}

function roof(target: BoatMesh): void {
  // Dessus : rangées de l'arrière vers l'avant ; la rangée de la limite orange / bleu est doublée pour un trait net.
  const boundary = Math.asin(0.55 ** (1 / EXPONENT));
  const angles = [...linspace(-Math.PI / 2, Math.PI / 2, 15).filter((a) => a < boundary), boundary, boundary, ...linspace(-Math.PI / 2, Math.PI / 2, 15).filter((a) => a > boundary)];
  const colors: (readonly [number, number, number])[] = angles.map((a, i) => (a < boundary || (a === boundary && angles[i + 1] === boundary) ? C.orange : C.royal));
  const rows = angles.map((phi) => {
    const v = signedPow(Math.sin(phi), EXPONENT);
    const half = signedPow(Math.cos(phi), EXPONENT) * roofWidth(v);
    const z = ROOF.centerZ + v * ROOF.halfLength;
    return linspace(-1, 1, 9).map((u): Vec3 => [u * half, ROOF.edge + ROOF.dome * (1 - u * u) * (1 - v * v), z]);
  });
  withFinish(target, FINISH.vinyl, () => surface(target, rows, (row) => colors[row]));

  // Bord arrondi bleu nuit, et sous-face crème avec son plafonnier.
  const around = linspace(0, Math.PI * 2, 41);
  const rim = around.map((theta): Vec3[] => {
    const [x0, z0] = outline(theta);
    const [x1, z1] = outline(theta, 0.022);
    return [[x0, ROOF.edge, z0], [x1, ROOF.edge - 0.045, z1], [x0, ROOF.under, z0]];
  });
  withFinish(target, FINISH.gloss, () => surface(target, rim, C.navy));
  const under = around.map((theta): Vec3[] => {
    const [x, z] = outline(theta);
    return [[x, ROOF.under, z], [x * 0.6, ROOF.under + 0.02, ROOF.centerZ + (z - ROOF.centerZ) * 0.6], [0, ROOF.under + 0.03, ROOF.centerZ]];
  });
  withFinish(target, FINISH.satin, () => surface(target, under, C.cream));
  withFinish(target, FINISH.glowSoft, () => disc(target, 0.09, C.lampWarm, { y: ROOF.under + 0.028, z: ROOF.centerZ - 0.25, pitch: Math.PI / 2 }, 10));

  // Points de LED bleues tout autour du bord.
  const dashes = 28;
  withFinish(target, FINISH.glow, () => {
    for (let i = 0; i < dashes; i += 1) {
      const a = ((i + 0.2) / dashes) * Math.PI * 2;
      const b = ((i + 0.75) / dashes) * Math.PI * 2;
      const [xa, za] = outline(a, 0.026);
      const [xb, zb] = outline(b, 0.026);
      pipe(target, [[xa, ROOF.edge - 0.045, za], [xb, ROOF.edge - 0.045, zb]], 0.012, C.ledBlue, 3);
    }
  });
}

/** Quatre montants chromés, posés sur le liston, qui portent le toit. */
function posts(target: BoatMesh): void {
  const onCap = (z: number) => halfBeam(tAt(z)) - 0.065;
  withFinish(target, FINISH.chrome, () => {
    for (const side of [-1, 1]) {
      const front = 0.78;
      pipe(target, [[side * onCap(front), sheer(tAt(front)), front], [side * 0.74, 1.45, 0.75], [side * 0.64, ROOF.under + 0.01, 0.7]], 0.034, C.chrome, 8);
      const rear = -0.95;
      pipe(target, [[side * onCap(rear), sheer(tAt(rear)), rear], [side * 0.88, 1.25, -0.9], [side * 0.74, 1.85, -0.78], [side * 0.66, ROOF.under + 0.01, -0.72]], 0.036, C.chrome, 8);
    }
  });
}

/** Barre de quatre projecteurs sur le toit, tournés vers l'arrière et le pont ; gyrophare, radôme et antenne. */
function lights(target: BoatMesh): void {
  const barZ = 0.6;
  const barY = 2.34;
  withFinish(target, FINISH.chrome, () => {
    tube(target, [-0.64, barY, barZ], [0.64, barY, barZ], 0.018, C.chrome, 6);
    for (const x of [-0.6, 0.6]) tube(target, [x, roofTop(x, barZ) - 0.01, barZ], [x, barY, barZ], 0.016, C.chrome, 6);
  });
  const tiltUp = 0.25;
  const axis: Vec3 = [0, Math.sin(tiltUp), -Math.cos(tiltUp)];
  const lathePitch = Math.atan2(axis[2], axis[1]);
  const discPitch = Math.atan2(-axis[1], axis[2]);
  for (const x of [-0.45, -0.15, 0.15, 0.45]) {
    const base: Vec3 = [x, barY, barZ + 0.02];
    const lens: Vec3 = [base[0] + axis[0] * 0.112, base[1] + axis[1] * 0.112, base[2] + axis[2] * 0.112];
    withFinish(target, FINISH.chrome, () => {
      lathe(target, [[0.03, -0.01], [0.07, 0.025], [0.088, 0.07], [0.09, 0.112]], 8, C.darkChrome, { x: base[0], y: base[1], z: base[2], pitch: lathePitch });
      torus(target, 0.088, 0.012, C.chrome, { x: lens[0], y: lens[1], z: lens[2], pitch: lathePitch }, 10, 3);
    });
    withFinish(target, FINISH.glow, () => disc(target, 0.08, (r) => (r < 0.4 ? C.lampCore : r < 0.75 ? C.lampWarm : C.lampAmber), { x: lens[0], y: lens[1], z: lens[2], pitch: discPitch }, 10, 3));
  }

  // Gyrophare orange à l'arrière du toit.
  const beaconZ = -0.55;
  const beaconY = roofTop(0, beaconZ);
  withFinish(target, FINISH.chrome, () => lathe(target, [[0.075, 0], [0.075, 0.035], [0.062, 0.04]], 12, C.darkChrome, { y: beaconY - 0.01, z: beaconZ }));
  withFinish(target, FINISH.pulse, () => lathe(target, [[0.062, 0], [0.06, 0.04], [0.048, 0.08], [0.024, 0.104], [0, 0.11]], 12, C.lampAmber, { y: beaconY + 0.03, z: beaconZ }));

  // Radôme blanc et antenne fouet.
  const domeX = -0.4;
  const domeZ = -0.6;
  withFinish(target, FINISH.satin, () => {
    lathe(target, [[0.05, 0], [0.05, 0.05]], 8, C.grey, { x: domeX, y: roofTop(domeX, domeZ) - 0.01, z: domeZ });
    lathe(target, [[0.115, 0], [0.11, 0.03], [0.085, 0.06], [0.045, 0.078], [0, 0.083]], 12, C.white, { x: domeX, y: roofTop(domeX, domeZ) + 0.04, z: domeZ });
  });
  const antennaX = 0.42;
  const antennaZ = -0.68;
  withFinish(target, FINISH.chrome, () => {
    const foot = roofTop(antennaX, antennaZ);
    tube(target, [antennaX, foot - 0.01, antennaZ], [antennaX, foot + 0.36, antennaZ - 0.03], 0.009, C.chrome, 5, 0.004);
    sphere(target, 0.014, C.chrome, { x: antennaX, y: foot + 0.365, z: antennaZ - 0.03 }, 3);
  });
}

export function canopyParts(target: BoatMesh): void {
  roof(target);
  posts(target);
  lights(target);
}
