import { box } from "../kit";
import { HULL, crown, deckY, halfBeam, innerX, section, sheer, sideX, tAt, zAt, type Vec3 } from "./dimensions";
import { BOAT_COLORS as C } from "./palette";
import { FINISH, disc, pipe, roundedBox, surface, torus, withFinish, type BoatMesh } from "./shapes";

// Coque : carène en V, flancs peints (la décoration est dessinée par le matériau à partir des coordonnées de
// peinture), tableau arrière et ses feux, liston et pont, cockpit (parois, cloisons, plancher en teck), plateformes
// de bain, liston chromé et bande de lumière bleue.

const SECTIONS = 18;
/** Stations de la coque, plus serrées vers l'étrave où la forme change vite. */
const STATIONS = Array.from({ length: SECTIONS + 1 }, (_, i) => 1 - (1 - i / SECTIONS) ** 1.35);
const linspace = (a: number, b: number, n: number) => Array.from({ length: n }, (_, i) => a + ((b - a) * i) / (n - 1));
const mirror = (p: Vec3, side: number): Vec3 => [p[0] * side, p[1], p[2]];

function shell(target: BoatMesh): void {
  const sections = STATIONS.map(section);
  for (const side of [1, -1]) {
    withFinish(target, FINISH.vinyl, () => surface(target, sections.map((s) => s.bottom.map((p) => mirror(p, side))), C.navyDeep, side < 0));
    withFinish(target, FINISH.gloss, () =>
      surface(target, sections.map((s) => s.side.map((p) => mirror(p, side))), C.white, side < 0, (point, row) => {
        const t = STATIONS[row];
        const foot = sections[row].side[0][1];
        return [point[2] - HULL.stern, sheer(t) - point[1], point[1] - foot, sheer(t) - foot];
      }),
    );
  }
}

/** Tableau arrière : bleu nuit en bas, filet crème, panneau orange où brillent les deux feux de poupe. */
function transom(target: BoatMesh): void {
  const stern = section(0);
  const outline = [...stern.bottom, ...stern.side.slice(1)];
  const xAt = (y: number) => {
    for (let i = 1; i < outline.length; i += 1) {
      const [x0, y0] = outline[i - 1];
      const [x1, y1] = outline[i];
      if (y <= y1) return x0 + ((x1 - x0) * (y - y0)) / Math.max(y1 - y0, 1e-6);
    }
    return outline[outline.length - 1][0];
  };
  const band = (y0: number, y1: number, color: readonly [number, number, number]) => {
    const levels = [y0, ...outline.map((p) => p[1]).filter((y) => y > y0 + 1e-3 && y < y1 - 1e-3), y1];
    const rows = levels.map((y) => linspace(-1, 1, 7).map((u): Vec3 => [u * xAt(y), y, HULL.stern]));
    withFinish(target, FINISH.gloss, () => surface(target, rows, color));
  };
  band(outline[0][1], 0.36, C.navy);
  band(0.36, 0.395, C.cream);
  band(0.395, 0.62, C.navy);
  band(0.62, sheer(0), C.orangeDeep);
  withFinish(target, FINISH.chrome, () => pipe(target, [[-0.92, 0.62, HULL.stern - 0.01], [0.92, 0.62, HULL.stern - 0.01]], 0.011, C.chrome, 4));
}

/** Blocs de poupe arrondis, rouge orangé, aux deux coins du pont arrière, avec leurs feux ronds tournés vers l'arrière. */
function sternPods(target: BoatMesh): void {
  const y = sheer(0) + 0.15;
  const z = HULL.stern + 0.17;
  for (const side of [-1, 1]) {
    withFinish(target, FINISH.gloss, () => {
      roundedBox(target, 0.34, 0.3, 0.44, C.orangeDeep, { x: side * 0.8, y, z }, 0.3);
      roundedBox(target, 0.3, 0.05, 0.4, C.orange, { x: side * 0.8, y: y + 0.15, z }, 0.35, 2);
    });
    const at = { x: side * 0.8, y: y - 0.01, z: z - 0.225 };
    withFinish(target, FINISH.glowBright, () => disc(target, 0.085, (r) => (r < 0.6 ? C.lampCore : C.lampAmber), at, 12, 2));
    withFinish(target, FINISH.chrome, () => torus(target, 0.09, 0.014, C.chrome, { ...at, z: at.z - 0.004, pitch: Math.PI / 2 }, 10, 3));
  }
}

/** Liston (le dessus du plat-bord autour du cockpit), pont arrière et pont avant bombé. */
function decks(target: BoatMesh): void {
  const cap = linspace(tAt(HULL.aftDeck), tAt(HULL.foredeck), 11);
  for (const side of [1, -1]) {
    const rows = cap.map((t) => {
      const w = halfBeam(t);
      const s = sheer(t);
      return [mirror([w, s, zAt(t)], side), mirror([w - HULL.cap / 2, s + 0.01, zAt(t)], side), mirror([w - HULL.cap, s - 0.008, zAt(t)], side)];
    });
    withFinish(target, FINISH.gloss, () => surface(target, rows, C.white, side < 0));
  }
  const aft = linspace(0, tAt(HULL.aftDeck), 3).map((t) => linspace(-1, 1, 7).map((u): Vec3 => [u * halfBeam(t), sheer(t) + 0.004, zAt(t)]));
  withFinish(target, FINISH.gloss, () => surface(target, aft, C.white));
  const fore = linspace(tAt(HULL.foredeck), 1, 9).map((t) =>
    linspace(-1, 1, 9).map((u): Vec3 => {
      const w = halfBeam(t);
      return [u * w, sheer(t) + crown(t) * (1 - u * u), zAt(t)];
    }),
  );
  withFinish(target, FINISH.gloss, () => surface(target, fore, C.white));
}

/** Cloison du cockpit en z, du plancher au pont, fermée jusqu'à la coque. */
function bulkhead(target: BoatMesh, z: number, color: readonly [number, number, number]): void {
  const t = tAt(z);
  const top = z >= HULL.foredeck ? (x: number) => deckY(x, z) : () => sheer(t);
  const bottom = linspace(-1, 1, 9).map((u): Vec3 => [u * (sideX(t, HULL.floor) - 0.01), HULL.floor - 0.01, z]);
  const upper = linspace(-1, 1, 9).map((u): Vec3 => {
    const x = u * (halfBeam(t) - 0.004);
    return [x, top(x) - 0.004, z];
  });
  withFinish(target, FINISH.satin, () => surface(target, [bottom, upper], color));
}

/** Parois intérieures (crème, bourrelet orange en haut) et plancher en lattes de teck. */
function cockpit(target: BoatMesh): void {
  const stations = linspace(tAt(HULL.aftDeck), tAt(HULL.foredeck), 11);
  for (const side of [1, -1]) {
    const lower = stations.map((t) => {
      const x = innerX(t);
      const s = sheer(t);
      return [mirror([x - 0.02, HULL.floor - 0.01, zAt(t)], side), mirror([x - 0.008, (HULL.floor + s) / 2, zAt(t)], side), mirror([x, s - 0.13, zAt(t)], side)];
    });
    withFinish(target, FINISH.satin, () => surface(target, lower, C.cream, side < 0));
    const pad = stations.map((t) => {
      const x = innerX(t);
      const s = sheer(t);
      return [mirror([x, s - 0.13, zAt(t)], side), mirror([x - 0.022, s - 0.07, zAt(t)], side), mirror([x, s - 0.008, zAt(t)], side)];
    });
    withFinish(target, FINISH.vinyl, () => surface(target, pad, C.seatOrange, side < 0));
  }
  bulkhead(target, HULL.foredeck, C.cream);
  bulkhead(target, HULL.aftDeck, C.cream);

  const rowsZ = [HULL.aftDeck, -1.2, -0.47, 0.25, HULL.foredeck];
  const edge = (z: number) => innerX(tAt(z)) - 0.02;
  const under = rowsZ.map((z): Vec3[] => [[-edge(z), HULL.floor - 0.006, z], [edge(z), HULL.floor - 0.006, z]]);
  withFinish(target, FINISH.matte, () => surface(target, under, C.teakGap));
  const planks = 6;
  for (let p = 0; p < planks; p += 1) {
    const rows = rowsZ.map((z): Vec3[] => {
      const w = edge(z);
      const left = -w + (2 * w * p) / planks + 0.008;
      const right = -w + (2 * w * (p + 1)) / planks - 0.008;
      return [[left, HULL.floor, z], [right, HULL.floor, z]];
    });
    withFinish(target, FINISH.wood, () => surface(target, rows, p % 2 === 0 ? C.teak : C.teakDark));
  }
}

/** Plateformes de bain de part et d'autre du moteur, liston chromé et bande de lumière bleue. */
function trims(target: BoatMesh): void {
  for (const side of [-1, 1]) {
    withFinish(target, FINISH.satin, () => box(target, 0.56, 0.06, 0.34, C.grey, { x: side * 0.62, y: 0.1, z: HULL.stern - 0.17 }));
    withFinish(target, FINISH.wood, () => {
      for (let p = 0; p < 4; p += 1) {
        const x0 = side * (0.36 + p * 0.135);
        const x1 = side * (0.36 + p * 0.135 + 0.12);
        surface(target, [[[x0, 0.162, HULL.stern - 0.02], [x1, 0.162, HULL.stern - 0.02]], [[x0, 0.162, HULL.stern - 0.32], [x1, 0.162, HULL.stern - 0.32]]], p % 2 === 0 ? C.teak : C.teakDark);
      }
    });
    withFinish(target, FINISH.chrome, () => pipe(target, [[side * 0.34, 0.163, HULL.stern - 0.34], [side * 0.9, 0.163, HULL.stern - 0.34]], 0.012, C.chrome, 5));
  }
  const rail: Vec3[] = [];
  const along = STATIONS.slice(0, -1);
  for (const t of along) rail.push([halfBeam(t) + 0.014, sheer(t) - 0.022, zAt(t)]);
  rail.push([0, sheer(1) - 0.022, zAt(1) + 0.012]);
  for (const t of [...along].reverse()) rail.push([-(halfBeam(t) + 0.014), sheer(t) - 0.022, zAt(t)]);
  rail.push([-0.4, sheer(0) - 0.022, HULL.stern - 0.014], [0.4, sheer(0) - 0.022, HULL.stern - 0.014]);
  withFinish(target, FINISH.chrome, () => pipe(target, rail, 0.022, C.chrome, 4, true));

  for (const side of [-1, 1]) {
    const strip = linspace(0.012, 0.42, 7).map((t): Vec3 => {
      const y = sheer(t) - 0.075;
      return [side * (sideX(t, y) + 0.006), y, zAt(t)];
    });
    withFinish(target, FINISH.glow, () => pipe(target, strip, 0.009, C.ledBlue, 4));
  }
  const ledY = sheer(0) - 0.065;
  withFinish(target, FINISH.glow, () => pipe(target, [[-0.88, ledY, HULL.stern - 0.008], [0.88, ledY, HULL.stern - 0.008]], 0.009, C.ledBlue, 4));
}

/** La coque complète, avec son pont et son cockpit. */
export function hullParts(target: BoatMesh): void {
  shell(target);
  transom(target);
  sternPods(target);
  decks(target);
  cockpit(target);
  trims(target);
}
