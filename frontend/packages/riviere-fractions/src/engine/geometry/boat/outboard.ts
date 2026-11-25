import { box, lathe } from "../kit";
import { OUTBOARD, type Vec3 } from "./dimensions";
import { BOAT_COLORS as C } from "./palette";
import { FINISH, pipe, prism, roundedBox, surface, tube, withFinish, type BoatMesh } from "./shapes";

// Moteur hors-bord et hélice, dans le repère du moteur : origine sur l'axe de direction, au tableau arrière ;
// z vers l'avant du bateau. Le moteur entier pivote quand on tourne ; l'hélice tourne autour de son moyeu.

const linspace = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

/** Capot graphite arrondi, liseré chromé et chevrons de LED bleues ; jambe profilée, plaque anti-ventilation, embase. */
/** Support fixé au tableau arrière (il ne pivote pas) : dans le repère du bateau. */
export function outboardMount(target: BoatMesh): void {
  const [x, y, z] = OUTBOARD.pivot;
  withFinish(target, FINISH.satin, () => {
    box(target, 0.2, 0.36, 0.13, C.graphite, { x, y: y - 0.32, z: z + 0.045 });
    for (const side of [-1, 1]) box(target, 0.03, 0.12, 0.2, C.darkChrome, { x: x + side * 0.085, y: y - 0.06, z: z + 0.03 });
  });
}

export function outboardParts(target: BoatMesh): void {
  withFinish(target, FINISH.satin, () => {
    box(target, 0.15, 0.14, 0.12, C.black, { y: -0.1, z: -0.05 });
    roundedBox(target, 0.46, 0.22, 0.6, [0.19, 0.2, 0.23], { y: 0.17, z: -0.37 }, 0.35);
  });
  withFinish(target, FINISH.chrome, () => tube(target, [-0.14, 0.0, -0.07], [0.14, 0.0, -0.07], 0.028, C.chrome, 8));

  // Capot : large et sculpté, plus étroit vers l'avant, le dessus fuyant vers l'arrière.
  withFinish(target, FINISH.gloss, () =>
    roundedBox(target, 0.54, 0.5, 0.72, C.graphite, { y: 0.5, z: -0.39 }, 0.36, 4, ([x, y, z]) => {
      const front = Math.max(0, z / 0.36);
      const back = Math.max(0, -z / 0.36);
      return [x * (1 - 0.16 * front) * (1 - 0.06 * Math.max(0, y / 0.25)), y - (y > 0 ? 0.06 * back * (y / 0.25) : 0), z];
    }),
  );
  const parting = linspace(0, Math.PI * 2, 25).map((a): Vec3 => {
    const c = Math.cos(a);
    const s = Math.sin(a);
    return [Math.sign(c) * Math.abs(c) ** 0.35 * 0.236, 0.262, -0.37 + Math.sign(s) * Math.abs(s) ** 0.35 * 0.306];
  });
  withFinish(target, FINISH.chrome, () => pipe(target, parting, 0.012, C.chrome, 4, true));

  // Chevrons lumineux à l'arrière du capot et filets sur les flancs.
  withFinish(target, FINISH.glow, () => {
    for (const side of [-1, 1]) {
      pipe(target, [[side * 0.205, 0.63, -0.743], [side * 0.13, 0.575, -0.759], [side * 0.05, 0.52, -0.763]], 0.012, C.ledBlue, 4);
      pipe(target, [[side * 0.277, 0.54, -0.63], [side * 0.282, 0.5, -0.42], [side * 0.262, 0.45, -0.2]], 0.01, C.ledBlue, 4);
    }
    pipe(target, [[-0.15, 0.42, -0.757], [0, 0.415, -0.759], [0.15, 0.42, -0.757]], 0.009, C.ledBlue, 4);
  });

  // Jambe : sections en goutte d'eau, de sous le capot jusqu'à l'embase.
  const levels: [number, number, number][] = [[0.1, 0.078, 0.2], [-0.2, 0.07, 0.19], [-0.5, 0.06, 0.17], [-0.72, 0.054, 0.15]];
  const rows = levels.map(([y, half, chord]) =>
    linspace(0, Math.PI * 2, 13).map((a): Vec3 => {
      const z = Math.cos(a);
      const tail = z < 0 ? 1 - 0.45 * -z : 1;
      return [Math.sin(a) * half * tail, y, -0.38 + z * chord];
    }),
  );
  withFinish(target, FINISH.gloss, () => surface(target, rows, C.graphite));
  withFinish(target, FINISH.satin, () => {
    box(target, 0.24, 0.016, 0.38, C.grey, { y: -0.58, z: -0.43 });
    prism(target, [[-0.52, -0.8], [-0.28, -0.8], [-0.33, -0.9], [-0.5, -0.92]], -0.009, 0.009, C.graphite);
  });
  withFinish(target, FINISH.gloss, () =>
    lathe(target, [[0.015, 0], [0.042, 0.02], [0.058, 0.08], [0.06, 0.2], [0.052, 0.3], [0.026, 0.355], [0, 0.37]], 10, C.graphite, { pitch: Math.PI / 2, y: OUTBOARD.hub[1], z: OUTBOARD.hub[2] + 0.04 }),
  );
}

/**
 * Hélice à trois pales vrillées, centrée sur son moyeu, axe z : elle tourne autour de cet axe.
 * Les pales sont fines et brillantes ; le cône du moyeu pointe vers l'arrière.
 */
export function propellerParts(target: BoatMesh): void {
  withFinish(target, FINISH.chrome, () => lathe(target, [[0.034, 0], [0.04, 0.03], [0.038, 0.075], [0.016, 0.105], [0, 0.112]], 10, C.darkChrome, { pitch: -Math.PI / 2, z: 0.03 }));
  const radii = [0.036, 0.075, 0.115, 0.15, OUTBOARD.bladeRadius];
  const chords = [0.034, 0.05, 0.054, 0.042, 0.012];
  const pitchLength = 0.32;
  for (let blade = 0; blade < 3; blade += 1) {
    const base = (blade / 3) * Math.PI * 2;
    const rows = radii.map((r, i) => {
      const twist = Math.atan(pitchLength / (2 * Math.PI * r));
      const skew = base + (r - radii[0]) * 0.9;
      const radial: Vec3 = [Math.cos(skew), Math.sin(skew), 0];
      const tangent: Vec3 = [-Math.sin(skew), Math.cos(skew), 0];
      return [-1, -0.35, 0.35, 1].map((c): Vec3 => {
        const half = chords[i] * c;
        return [radial[0] * r + tangent[0] * half * Math.cos(twist), radial[1] * r + tangent[1] * half * Math.cos(twist), -0.01 + half * Math.sin(twist)];
      });
    });
    withFinish(target, FINISH.chrome, () => surface(target, rows, [0.78, 0.8, 0.84]));
  }
}
