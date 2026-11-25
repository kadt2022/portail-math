import { cylinder } from "../kit";
import { HELM, HULL, WHEEL, deckY, wheelPoint, type Vec3 } from "./dimensions";
import { BOAT_COLORS as C } from "./palette";
import { FINISH, disc, pipe, prism, roundedBox, surface, torus, tube, withFinish, type BoatMesh } from "./shapes";

// Poste de pilotage : pare-brise enveloppant, console de barre à tribord (tableau de bord, écran, cadrans, volant,
// manette des gaz), console passager à bâbord, et deux sièges baquets confortables.

const linspace = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));

/** Pare-brise teinté qui enveloppe l'avant du cockpit, cerclé de chrome. */
function windscreen(target: BoatMesh): void {
  const base = linspace(-0.76, 0.76, 9).map((x): Vec3 => {
    const z = HULL.foredeck + 0.11 * (1 - (x / 0.82) ** 2);
    return [x, deckY(x, z) + 0.004, z];
  });
  const top = base.map(([x, y, z]): Vec3 => [x * 0.95, y + 0.25, z - 0.16]);
  withFinish(target, FINISH.glass, () => surface(target, [base, top], C.glass));
  withFinish(target, FINISH.chrome, () => {
    pipe(target, top, 0.013, C.chrome, 5);
    for (const i of [0, base.length - 1]) tube(target, base[i], top[i], 0.013, C.chrome, 5);
  });
}

/** Point d'une face plane de console (profil z, y), décalé vers l'extérieur. */
function onFace(a: readonly [number, number], b: readonly [number, number], along: number, x: number, lift = 0.004): Vec3 {
  const dz = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dz, dy);
  return [x, a[1] + dy * along + (dz / length) * lift, a[0] + dz * along - (dy / length) * lift];
}

function quadOnFace(target: BoatMesh, a: readonly [number, number], b: readonly [number, number], from: number, to: number, x0: number, x1: number, color: readonly [number, number, number], lift = 0.004): void {
  surface(target, [[onFace(a, b, from, x0, lift), onFace(a, b, from, x1, lift)], [onFace(a, b, to, x0, lift), onFace(a, b, to, x1, lift)]], color);
}

/** Console de barre : tableau de bord incliné vers le pilote, écran bleu, cadrans, volant et manette des gaz. */
function helmConsole(target: BoatMesh): void {
  const profile: [number, number][] = [[0.36, HULL.floor], [0.36, 0.82], [0.55, 0.97], [0.78, 0.98], [0.95, 0.86], [0.95, HULL.floor]];
  const x0 = 0.2;
  const x1 = 0.7;
  withFinish(target, FINISH.gloss, () => prism(target, profile, x0, x1, (edge) => (edge === 1 ? C.graphite : C.white)));
  const dashLow = profile[1];
  const dashHigh = profile[2];
  withFinish(target, FINISH.glass, () => quadOnFace(target, dashLow, dashHigh, 0.12, 0.9, 0.55, 0.69, C.black));
  withFinish(target, FINISH.glow, () => quadOnFace(target, dashLow, dashHigh, 0.18, 0.84, 0.565, 0.675, C.screen, 0.007));
  withFinish(target, FINISH.glowBright, () => quadOnFace(target, dashLow, dashHigh, 0.5, 0.74, 0.58, 0.63, [0.75, 0.97, 1], 0.009));
  for (const [x, along, color] of [[0.26, 0.55, C.screen], [0.53, 0.3, C.navGreen]] as const) {
    const at = onFace(dashLow, dashHigh, along, x, 0.006);
    const pitch = Math.atan2(dashHigh[1] - dashLow[1], dashHigh[0] - dashLow[0]) - Math.PI / 2;
    withFinish(target, FINISH.glowSoft, () => disc(target, 0.035, (r) => (r < 0.6 ? C.black : color), { x: at[0], y: at[1], z: at[2], pitch: -pitch - Math.PI }, 12, 2));
    withFinish(target, FINISH.chrome, () => torus(target, 0.037, 0.006, C.chrome, { x: at[0], y: at[1], z: at[2], pitch: -pitch - Math.PI / 2 }, 12, 4));
  }
  withFinish(target, FINISH.chrome, () => tube(target, [0.66, 0.975, 0.62], [0.66, 1.1, 0.56], 0.012, C.chrome, 5));
  withFinish(target, FINISH.satin, () => roundedBox(target, 0.05, 0.05, 0.05, C.black, { x: 0.66, y: 1.11, z: 0.555 }, 0.6, 2));

  // Volant : jante, trois branches, moyeu chromé, sur une colonne qui sort du tableau de bord.
  const axis: Vec3 = [0, Math.cos(WHEEL.tilt), Math.sin(WHEEL.tilt)];
  const hub: Vec3 = [WHEEL.x, WHEEL.y, WHEEL.z];
  withFinish(target, FINISH.satin, () => {
    torus(target, WHEEL.radius, 0.017, C.black, { x: WHEEL.x, y: WHEEL.y, z: WHEEL.z, pitch: WHEEL.tilt }, 16, 5);
    for (const angle of [-Math.PI / 2, Math.PI / 6, (5 * Math.PI) / 6]) tube(target, hub, wheelPoint(angle, WHEEL.radius - 0.01), 0.011, C.black, 4);
    tube(target, [hub[0] - axis[0] * 0.12, hub[1] - axis[1] * 0.12, hub[2] - axis[2] * 0.12], hub, 0.022, C.graphite, 6);
  });
  withFinish(target, FINISH.chrome, () => tube(target, [hub[0] - axis[0] * 0.01, hub[1] - axis[1] * 0.01, hub[2] - axis[2] * 0.01], [hub[0] + axis[0] * 0.025, hub[1] + axis[1] * 0.025, hub[2] + axis[2] * 0.025], 0.036, C.chrome, 10, 0.026));
}

/** Console passager à bâbord, avec sa boîte à gants. */
function passengerConsole(target: BoatMesh): void {
  const profile: [number, number][] = [[0.45, HULL.floor], [0.45, 0.78], [0.6, 0.88], [0.95, 0.85], [0.95, HULL.floor]];
  withFinish(target, FINISH.gloss, () => prism(target, profile, -0.7, -0.24, (edge) => (edge === 1 ? C.graphite : C.white)));
  withFinish(target, FINISH.satin, () => quadOnFace(target, profile[0], profile[1], 0.45, 0.88, -0.64, -0.3, C.graphite, 0.005));
  withFinish(target, FINISH.chrome, () => pipe(target, [[-0.64, 0.83, 0.52], [-0.62, 0.9, 0.57], [-0.38, 0.9, 0.57], [-0.36, 0.83, 0.52]], 0.011, C.chrome, 5));
}

/** Siège baquet : pied chromé, assise orange, dossier et coussins bleus, joues orange enveloppantes. */
export function bucketSeat(target: BoatMesh, x: number, z: number): void {
  withFinish(target, FINISH.chrome, () => {
    tube(target, [x, HULL.floor, z + 0.02], [x, 0.48, z + 0.02], 0.045, C.chrome, 8);
    cylinder(target, 0.16, 0.15, 0.025, 10, C.darkChrome, { x, y: HULL.floor, z: z + 0.02 });
  });
  const lean = -0.16;
  withFinish(target, FINISH.vinyl, () => {
    roundedBox(target, 0.54, 0.13, 0.5, C.seatOrange, { x, y: 0.53, z }, 0.35, 2);
    roundedBox(target, 0.5, 0.4, 0.12, C.seatBlue, { x, y: 0.8, z: z - 0.25, pitch: lean }, 0.35);
    for (const side of [-1, 1]) roundedBox(target, 0.09, 0.38, 0.2, C.seatOrange, { x: x + side * 0.255, y: 0.8, z: z - 0.21, pitch: lean }, 0.45, 2);
  });
  withFinish(target, FINISH.fabric, () => {
    roundedBox(target, 0.4, 0.09, 0.42, C.seatBlue, { x, y: HELM.seatTop - 0.045, z: z + 0.02 }, 0.35);
    roundedBox(target, 0.4, 0.32, 0.06, C.seatBlue, { x, y: 0.81, z: z - 0.19, pitch: lean }, 0.35, 2);
  });
}

export function cockpitParts(target: BoatMesh): void {
  windscreen(target);
  helmConsole(target);
  passengerConsole(target);
  bucketSeat(target, HELM.x, HELM.seatZ);
  bucketSeat(target, -HELM.x, HELM.seatZ);
}
