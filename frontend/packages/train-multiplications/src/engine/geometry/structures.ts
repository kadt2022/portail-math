import { trackFrame, type Track } from "../../domain/track";
import { addShape, emptyMesh, mixColor, scaleColor, sweep, type Color, type Frame, type MeshData, type Vec3 } from "./kit";
import { valueNoise } from "./noise";
import { PALETTE as C } from "./palette";
import { bar } from "./shapes";
import { FORMATION_DEPTH } from "./trackGeometry";

// Les ouvrages d'art : grand viaduc de pierre à arches (deux étages là où la vallée est profonde), pont métallique en
// treillis sur hautes piles, tunnel maçonné en courbe (voûte, portails, éclairage), galerie couverte en béton. Tous suivent le tracé ; ils sont construits
// dans le repère de la voie sans dévers (les maçonneries restent d'aplomb).
//
// Écrit pour Yamba.

type V = Vec3;

/** Repère d'aplomb (sans dévers) à l'abscisse s : la voie monte ou descend, mais les murs restent verticaux. */
export function plumbFrame(track: Track, s: number): Frame & { forward: V } {
  const p = track.pointAt(s);
  const { forward, right, up } = trackFrame({ ...p, cant: 0 });
  return { p: [p.x, p.y, p.z], right, up, forward };
}

function at(f: Frame & { forward: V }, along: number, x: number, y: number): V {
  return [f.p[0] + f.forward[0] * along + f.right[0] * x + f.up[0] * y, f.p[1] + f.forward[1] * along + f.right[1] * x + y, f.p[2] + f.forward[2] * along + f.right[2] * x + f.up[2] * y];
}

/** Boîte orientée selon le repère de la voie : [along0, along1] × [x0, x1] × [y0, y1] (y absolu si `absolute`). */
export function frameBox(mesh: MeshData, f: Frame & { forward: V }, a0: number, a1: number, x0: number, x1: number, y0: number, y1: number, color: Color | Color[]): void {
  const p = (a: number, x: number, y: number): V => [f.p[0] + f.forward[0] * a + f.right[0] * x, y, f.p[2] + f.forward[2] * a + f.right[2] * x];
  const v = [p(a0, x0, y0), p(a0, x1, y0), p(a1, x1, y0), p(a1, x0, y0), p(a0, x0, y1), p(a0, x1, y1), p(a1, x1, y1), p(a1, x0, y1)];
  const faces = [4, 5, 6, 4, 6, 7, 0, 3, 2, 0, 2, 1, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];
  addShape(mesh, v, faces, Array.isArray(color[0]) ? (color as Color[]) : (color as Color));
}

/** Teinte d'un panneau de béton ou d'une pierre de taille : variations discrètes, jamais de bariolage. */
const stoneTone = (seed: number, base: Color = C.stone) => scaleColor(mixColor(C.stoneDark, base, 0.86 + valueNoise(seed * 1.37, seed * 0.71, 13) * 0.14), 0.97 + valueNoise(seed, 3, 7) * 0.05);

/** Mur à sommet incliné (mur en aile, mur de soutènement) : une boîte dont le dessus descend de `top0` à `top1`. */
function slopedWall(mesh: MeshData, f: Frame & { forward: V }, a0: number, a1: number, x0: number, x1: number, base: number, top0: number, top1: number, color: Color): void {
  const p = (a: number, x: number, y: number): V => [f.p[0] + f.forward[0] * a + f.right[0] * x, y, f.p[2] + f.forward[2] * a + f.right[2] * x];
  const v = [p(a0, x0, base), p(a0, x1, base), p(a1, x1, base), p(a1, x0, base), p(a0, x0, top0), p(a0, x1, top0), p(a1, x1, top1), p(a1, x0, top1)];
  const faces = [4, 5, 6, 4, 6, 7, 0, 3, 2, 0, 2, 1, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7];
  addShape(mesh, v, faces, color);
  // Couvertine claire sur le sommet incliné.
  const c = [p(a0, x0 - 0.06, top0), p(a0, x1 + 0.06, top0), p(a1, x1 + 0.06, top1), p(a1, x0 - 0.06, top1), p(a0, x0 - 0.06, top0 + 0.12), p(a0, x1 + 0.06, top0 + 0.12), p(a1, x1 + 0.06, top1 + 0.12), p(a1, x0 - 0.06, top1 + 0.12)];
  addShape(mesh, c, faces, C.stoneLight);
}

/**
 * Garde-corps galvanisé le long d'une rive, de `from` à `to`, à l'écart latéral `x` et à l'altitude de pied `foot(s)` :
 * poteaux tous les 2 m, main courante, lisse intermédiaire et plinthe.
 */
function railing(mesh: MeshData, track: Track, from: number, to: number, x: number, foot: (s: number) => number): void {
  const n = Math.max(1, Math.round((to - from) / 2));
  const point = (s: number, h: number): V => {
    const f = plumbFrame(track, s);
    return [f.p[0] + f.right[0] * x, foot(s) + h, f.p[2] + f.right[2] * x];
  };
  for (let i = 0; i <= n; i += 1) {
    const s = from + ((to - from) * i) / n;
    bar(mesh, point(s, 0), point(s, 1.12), 0.06, 0.06, C.galvanized);
  }
  for (let i = 0; i < n; i += 1) {
    const s0 = from + ((to - from) * i) / n;
    const s1 = from + ((to - from) * (i + 1)) / n;
    bar(mesh, point(s0, 1.12), point(s1, 1.12), 0.07, 0.05, C.galvanized);
    bar(mesh, point(s0, 0.6), point(s1, 0.6), 0.035, 0.035, C.galvanized);
    bar(mesh, point(s0, 0.08), point(s1, 0.08), 0.02, 0.14, C.galvanized);
  }
}

// ————————————————————————————————————————————————————————————————— Ponts

export interface BridgePlan {
  from: number;
  to: number;
  /** Hauteur du sol sous un point (pour fonder les piles). */
  ground: (x: number, z: number) => number;
}

/** Demi-largeur du tablier de pierre (entre les faces extérieures des tympans). */
const DECK_HALF = 3.3;

/**
 * Une rangée d'arches en plein cintre entre deux piles : douelle, tympans jusqu'à `top`, voussoirs alternés en légère
 * saillie, clé plus haute. `center` est l'abscisse du milieu de l'arche, `crown` l'altitude de l'intrados à la clé.
 */
function archBay(mesh: MeshData, track: Track, center: number, bay: number, opening: number, crown: number, top: number, half: number, seed: number): void {
  const f = plumbFrame(track, center);
  const radius = opening / 2;
  const spring = crown - radius;
  const steps = 16;
  const arcPoint = (j: number, r: number): [number, number] => {
    const t = Math.PI - (Math.PI * j) / steps;
    return [Math.cos(t) * r, spring + Math.sin(t) * r];
  };
  const intrados: V[] = [];
  const tri: number[] = [];
  for (let j = 0; j <= steps; j += 1) {
    const [u, y] = arcPoint(j, radius);
    const a = lat(f, u, -half);
    const b = lat(f, u, half);
    a[1] = y;
    b[1] = y;
    intrados.push(a, b);
    if (j < steps) {
      const k = j * 2;
      tri.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  addShape(mesh, intrados, tri, intrados.map((_, k) => stoneTone(seed + Math.floor(k / 2) * 0.7, C.stoneGrey)));
  for (const side of [-1, 1]) {
    const x = side * half;
    // Tympan : de l'extrados jusqu'à `top`.
    for (let j = 0; j < steps; j += 1) {
      const [u0, y0] = arcPoint(j, radius + 0.75);
      const [u1, y1] = arcPoint(j + 1, radius + 0.75);
      const quad = [lat(f, u0, x), lat(f, u1, x), lat(f, u1, x), lat(f, u0, x)];
      quad[0][1] = y0;
      quad[1][1] = y1;
      quad[2][1] = top;
      quad[3][1] = top;
      addShape(mesh, side > 0 ? quad : [quad[1], quad[0], quad[3], quad[2]], [0, 1, 2, 0, 2, 3], stoneTone(seed + j * 1.9));
    }
    // Remplissage entre la retombée de l'arche et la pile.
    for (const [u0, u1] of [[-bay / 2, -radius - 0.75], [radius + 0.75, bay / 2]]) {
      const quad = [lat(f, u0, x), lat(f, u1, x), lat(f, u1, x), lat(f, u0, x)];
      quad[0][1] = spring - 0.3;
      quad[1][1] = spring - 0.3;
      quad[2][1] = top;
      quad[3][1] = top;
      addShape(mesh, side > 0 ? quad : [quad[1], quad[0], quad[3], quad[2]], [0, 1, 2, 0, 2, 3], stoneTone(seed + u0));
    }
    // Voussoirs.
    for (let j = 0; j < steps; j += 1) {
      const key = false;
      const [u0, y0] = arcPoint(j, radius);
      const [u1, y1] = arcPoint(j + 1, radius);
      const [o0, p0] = arcPoint(j, radius + (key ? 1.0 : 0.75));
      const [o1, p1] = arcPoint(j + 1, radius + (key ? 1.0 : 0.75));
      const xo = x + side * 0.1;
      const ring = [lat(f, u0, xo), lat(f, u1, xo), lat(f, o1, xo), lat(f, o0, xo)];
      ring[0][1] = y0;
      ring[1][1] = y1;
      ring[2][1] = p1;
      ring[3][1] = p0;
      addShape(mesh, side > 0 ? ring : [ring[1], ring[0], ring[3], ring[2]], [0, 1, 2, 0, 2, 3], C.stoneLight);
    }
  }
}

/** Pile de pierre montée par assises, du sol à `top`, avec fruit transversal, socle et chaperon. */
function masonryPier(mesh: MeshData, f: Frame & { forward: V }, groundY: number, top: number, along: number, across: number, seed: number, batter = 0.03): void {
  const height = top - groundY;
  // Fût continu, à faces légèrement inclinées (fruit), sans gradins.
  const p = (a: number, x: number, y: number): V => [f.p[0] + f.forward[0] * a + f.right[0] * x, y, f.p[2] + f.forward[2] * a + f.right[2] * x];
  const xb = across + height * batter;
  const ab = along + height * batter * 0.35;
  const shaft = [p(-ab, -xb, groundY), p(-ab, xb, groundY), p(ab, xb, groundY), p(ab, -xb, groundY), p(-along, -across, top), p(-along, across, top), p(along, across, top), p(along, -across, top)];
  addShape(mesh, shaft, [4, 5, 6, 4, 6, 7, 0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7], stoneTone(seed));
  // Joints de levée de coffrage, fins et sombres, tous les 3,2 m ; chaperon clair en tête.
  for (let y = groundY + 3.2; y < top - 1; y += 3.2) {
    const k = (top - y) * batter;
    frameBox(mesh, f, -along - k * 0.35 - 0.02, along + k * 0.35 + 0.02, -across - k - 0.02, across + k + 0.02, y - 0.025, y + 0.025, C.concreteDark);
  }
  frameBox(mesh, f, -along - 0.15, along + 0.15, -across - 0.15, across + 0.15, top - 0.5, top, C.stoneLight);
  // Socle et avant-becs (prêts à fendre l'eau d'une future rivière).
  const baseX = across + height * batter;
  const baseA = along + height * batter * 0.35;
  frameBox(mesh, f, -baseA - 0.5, baseA + 0.5, -baseX - 0.5, baseX + 0.5, groundY - 1.5, groundY + 1.2, C.stoneDark);
  for (const side of [-1, 1]) {
    const tip = side * (baseX + 2.2);
    const root = side * baseX;
    const y1 = groundY + Math.min(height * 0.45, 9);
    const p = (a: number, x: number, y: number) => at(f, a, x, y - f.p[1]);
    const nose = [p(-baseA, root, groundY), p(baseA, root, groundY), p(0, tip, groundY), p(-baseA, root, y1), p(baseA, root, y1), p(0, tip, y1 - 1.2)];
    const faces = side > 0 ? [0, 2, 5, 0, 5, 3, 2, 1, 4, 2, 4, 5, 3, 5, 4] : [0, 3, 5, 0, 5, 2, 2, 5, 4, 2, 4, 1, 3, 4, 5];
    addShape(mesh, nose, faces, stoneTone(seed + side * 7));
  }
}

/** Culée : massif de pierre au bout du pont, et murs en aile qui retiennent le remblai, en gradins. */
function abutment(mesh: MeshData, track: Track, s: number, facing: 1 | -1, ground: BridgePlan["ground"], half: number): void {
  const f = plumbFrame(track, s);
  const deck = f.p[1] - FORMATION_DEPTH;
  const low = Math.min(ground(f.p[0], f.p[2]), deck - 2) - 1.5;
  const a0 = facing > 0 ? -1.5 : -9;
  const a1 = facing > 0 ? 9 : 1.5;
  masonryPier(mesh, plumbFrame(track, s + facing * 1.5), low, deck - 0.45, 2.4, half + 0.7, s, 0.05);
  frameBox(mesh, f, a0, a1, -half - 0.6, half + 0.6, deck - 2.4, deck - 0.45, stoneTone(s + 2));
  // Murs en aile : un seul voile incliné de chaque côté, qui s'enfonce dans le remblai.
  for (const side of [-1, 1]) {
    const b0 = facing * 1.5;
    const b1 = facing * 11;
    const x0 = side * (half + 0.2);
    slopedWall(mesh, f, Math.min(b0, b1), Math.max(b0, b1), Math.min(x0, x0 + side * 0.6), Math.max(x0, x0 + side * 0.6), deck - 8, facing > 0 ? deck + 0.2 : deck - 3.5, facing > 0 ? deck - 3.5 : deck + 0.2, stoneTone(s + side));
  }
}

/**
 * Tablier du viaduc : dalle, poutres de rive en béton clair à larmier sombre, corniche nette, trottoirs de service et
 * garde-corps galvanisés ; balcons de refuge au droit de certaines piles.
 */
function stoneDeck(mesh: MeshData, track: Track, from: number, to: number, half: number, refuges: number[]): void {
  const deckTop = -FORMATION_DEPTH;
  const n = Math.max(1, Math.round((to - from) / 4));
  for (let i = 0; i < n; i += 1) {
    const s0 = from + ((to - from) * i) / n;
    const s1 = from + ((to - from) * (i + 1)) / n;
    const f = plumbFrame(track, (s0 + s1) / 2);
    const l = (s1 - s0) / 2;
    const y = f.p[1] + deckTop;
    frameBox(mesh, f, -l, l, -half, half, y - 0.45, y, C.stoneDark);
    for (const side of [-1, 1]) {
      const x0 = side * (half - 0.55);
      const x1 = side * (half + 0.4);
      // Poutre de rive : bandeau clair, larmier sombre en sous-face.
      frameBox(mesh, f, -l, l, Math.min(x0, x1), Math.max(x0, x1), y - 0.85, y + 0.25, C.stoneLight);
      frameBox(mesh, f, -l, l, Math.min(side * half, x1 - side * 0.04), Math.max(side * half, x1 - side * 0.04), y - 0.95, y - 0.85, C.graniteDark);
      // Trottoir de service (dalles grises).
      frameBox(mesh, f, -l + 0.02, l - 0.02, Math.min(x0, side * (half - 1.3)), Math.max(x0, side * (half - 1.3)), y, y + 0.22, mixColor(C.concrete, C.concreteDark, 0.3));
    }
  }
  for (const side of [-1, 1]) railing(mesh, track, from, to, side * (half + 0.2), (s) => plumbFrame(track, s).p[1] + deckTop + 0.25);
  // Refuges : balcons rectangulaires en encorbellement, avec garde-corps.
  for (const s of refuges) {
    const f = plumbFrame(track, s);
    const y = f.p[1] + deckTop;
    for (const side of [-1, 1]) {
      const x = side * (half + 0.4);
      const out = x + side * 1.3;
      frameBox(mesh, f, -1.8, 1.8, Math.min(x, out), Math.max(x, out), y - 0.6, y + 0.25, C.stoneLight);
      frameBox(mesh, f, -1.2, 1.2, Math.min(x, x + side * 0.9), Math.max(x, x + side * 0.9), y - 1.6, y - 0.6, C.stone);
      for (const [a0, a1, x0, x1] of [[-1.8, 1.8, out - side * 0.06, out], [-1.8, -1.74, x, out], [1.74, 1.8, x, out]] as const) {
        frameBox(mesh, f, a0, a1, Math.min(x0, x1), Math.max(x0, x1), y + 1.3, y + 1.37, C.galvanized);
        frameBox(mesh, f, a0, a1, Math.min(x0, x1), Math.max(x0, x1), y + 0.25, y + 0.35, C.galvanized);
      }
    }
  }
}

/**
 * Grand viaduc de pierre : arches en plein cintre de 18 m, piles à fruit transversal fondées au fond de la vallée et
 * munies d'avant-becs ; là où la vallée est profonde, un second étage d'arches plus bas, séparé du premier par un
 * cordon. Tablier à corniche et modillons, parapets à couvertine, balcons de refuge ; culées et murs en aile aux deux
 * bouts, qui s'enfoncent dans les remblais d'approche.
 */
export function stoneViaduct(track: Track, plan: BridgePlan): MeshData {
  const mesh = emptyMesh();
  const deckTop = -FORMATION_DEPTH;
  const half = DECK_HALF;
  const pier = 3.2;
  const count = Math.max(1, Math.round((plan.to - plan.from) / 18));
  const bay = (plan.to - plan.from) / count;
  const opening = bay - pier;
  const radius = opening / 2;
  const piers: number[] = [];
  for (let i = 1; i < count; i += 1) piers.push(plan.from + i * bay);
  const groundAt = (s: number) => {
    const f = plumbFrame(track, s);
    return plan.ground(f.p[0], f.p[2]);
  };
  for (const s of piers) {
    const f = plumbFrame(track, s);
    masonryPier(mesh, f, groundAt(s) - 1.5, f.p[1] + deckTop - 0.45, pier / 2, half + 0.1, s);
  }
  for (let i = 0; i < count; i += 1) {
    const center = plan.from + (i + 0.5) * bay;
    const f = plumbFrame(track, center);
    const crown = f.p[1] + deckTop - 1.4;
    archBay(mesh, track, center, bay, opening, crown, f.p[1] + deckTop - 0.45, half, center);
    // Second étage : là où la vallée est profonde sous les deux piles de l'arche.
    const floor = Math.min(groundAt(center - bay / 2), groundAt(center + bay / 2), groundAt(center));
    const spring = crown - radius;
    const band = spring - 2.6;
    if (i > 0 && i < count - 1 && band - floor > radius + 6) {
      archBay(mesh, track, center, bay, opening, band - 0.8, band, half + 0.55, center + 50);
      // Cordon entre les deux étages.
      for (const side of [-1, 1]) {
        const x0 = side * (half + 0.5);
        const x1 = side * (half + 0.85);
        frameBox(mesh, f, -bay / 2, bay / 2, Math.min(x0, x1), Math.max(x0, x1), band, band + 0.5, C.stoneLight);
      }
      // Remplissage du tympan du second étage jusqu'aux retombées de l'étage du dessus.
      for (const side of [-1, 1]) {
        const x0 = side * (half + 0.55);
        frameBox(mesh, f, -bay / 2, bay / 2, Math.min(x0, side * half), Math.max(x0, side * half), band, spring - 0.3, stoneTone(center + 9));
      }
    }
  }
  stoneDeck(mesh, track, plan.from - 11, plan.to + 11, half, piers.filter((_, i) => i % 5 === 2));
  abutment(mesh, track, plan.from, -1, plan.ground, half);
  abutment(mesh, track, plan.to, 1, plan.ground, half);
  return mesh;
}

/** Gabarit du pont métallique : demi-écartement des poutres, hauteur aux bouts et au milieu d'une travée. */
export const TRUSS = { half: 3.45, endHeight: 6.4, midHeight: 8.8, spans: 3 } as const;

/**
 * Pont métallique à poutres latérales en treillis : trois travées à membrure supérieure courbe (poutres Pratt
 * « à dos de chameau »), montants et diagonales rivetés, contreventement en croix entre les membrures hautes,
 * portiques d'entrée à goussets, pièces de pont et longerons sous les rails, passerelles de service à garde-corps.
 * Les travées reposent sur des appareils d'appui en fonte, au sommet de hautes piles de pierre fondées au fond de la
 * gorge ; les culées s'appuient contre les têtes des tunnels.
 */
export function trussBridge(track: Track, plan: BridgePlan): MeshData {
  const mesh = emptyMesh();
  const deckTop = -FORMATION_DEPTH;
  const half = TRUSS.half;
  const spans = TRUSS.spans;
  const length = (plan.to - plan.from) / spans;
  const panels = 10;
  const steel = C.truss;
  const steelLight = C.trussLight;
  const steelDark = scaleColor(C.truss, 0.72);
  const base = (s: number) => plumbFrame(track, s).p[1] + deckTop - 0.55;
  for (let k = 0; k < spans; k += 1) {
    const s0 = plan.from + k * length + 0.6;
    const s1 = plan.from + (k + 1) * length - 0.6;
    const node = (i: number, side: number, top: boolean): V => {
      const s = s0 + ((s1 - s0) * i) / panels;
      const f = plumbFrame(track, s);
      const t = i / panels;
      const h = TRUSS.endHeight + (TRUSS.midHeight - TRUSS.endHeight) * Math.sin(Math.PI * t);
      const p = at(f, 0, side * half, 0);
      return [p[0], base(s) + (top ? h : 0), p[2]];
    };
    for (const side of [-1, 1]) {
      for (let i = 0; i < panels; i += 1) {
        bar(mesh, node(i, side, false), node(i + 1, side, false), 0.42, 0.7, steel);
        bar(mesh, node(i, side, true), node(i + 1, side, true), 0.5, 0.5, steel);
        // Diagonales Pratt : elles descendent vers le milieu de la travée.
        const toward = i < panels / 2;
        bar(mesh, toward ? node(i, side, true) : node(i + 1, side, true), toward ? node(i + 1, side, false) : node(i, side, false), 0.3, 0.26, steelLight);
        if (i === panels / 2 - 1 || i === panels / 2) bar(mesh, toward ? node(i + 1, side, true) : node(i, side, true), toward ? node(i, side, false) : node(i + 1, side, false), 0.16, 0.16, steelLight);
      }
      // Montants, et goussets rivetés aux nœuds.
      for (let i = 0; i <= panels; i += 1) {
        bar(mesh, node(i, side, false), node(i, side, true), i === 0 || i === panels ? 0.46 : 0.26, i === 0 || i === panels ? 0.5 : 0.3, i === 0 || i === panels ? steel : steelDark);
        for (const top of [false, true]) {
          const p = node(i, side, top);
          const o = side * 0.24;
          const f = plumbFrame(track, s0 + ((s1 - s0) * i) / panels);
          bar(mesh, [p[0] + f.right[0] * o, p[1] - 0.4, p[2] + f.right[2] * o], [p[0] + f.right[0] * o, p[1] + 0.4, p[2] + f.right[2] * o], 0.7, 0.04, steelDark, [f.right[0], 0, f.right[2]]);
        }
      }
    }
    // Contreventement haut (croix de Saint-André) et entretoises ; portiques aux deux bouts.
    for (let i = 1; i < panels; i += 1) {
      bar(mesh, node(i, -1, true), node(i, 1, true), 0.24, 0.34, steel);
      if (i < panels - 1) {
        bar(mesh, node(i, -1, true), node(i + 1, 1, true), 0.12, 0.12, steelDark);
        bar(mesh, node(i, 1, true), node(i + 1, -1, true), 0.12, 0.12, steelDark);
      }
    }
    for (const i of [0, panels]) {
      const a = node(i, -1, true);
      const b = node(i, 1, true);
      bar(mesh, a, b, 0.5, 0.9, steel);
      // Goussets d'angle du portique.
      for (const side of [-1, 1]) {
        const top = node(i, side, true);
        const inner = node(i, side * 0.55, true);
        bar(mesh, [top[0], top[1] - 1.4, top[2]], [inner[0], inner[1] - 0.1, inner[2]], 0.18, 0.22, steelLight);
      }
    }
    // Pièces de pont à chaque nœud, longerons sous les rails, passerelles et garde-corps.
    for (let i = 0; i <= panels; i += 1) bar(mesh, node(i, -1, false), node(i, 1, false), 0.32, 0.62, steelDark);
    for (const x of [-0.8, 0.8]) {
      for (let i = 0; i < panels; i += 1) {
        const a = node(i, x / half, false);
        const b = node(i + 1, x / half, false);
        bar(mesh, [a[0], a[1] + 0.25, a[2]], [b[0], b[1] + 0.25, b[2]], 0.3, 0.45, steelDark);
      }
    }
    for (let i = 0; i < panels; i += 1) {
      const f = plumbFrame(track, s0 + ((s1 - s0) * (i + 0.5)) / panels);
      const l = (s1 - s0) / panels / 2;
      const y = base(s0 + ((s1 - s0) * (i + 0.5)) / panels);
      for (const side of [-1, 1]) {
        const x0 = side * 1.75;
        const x1 = side * (half - 0.35);
        // Passerelle en caillebotis gris et liseré jaune de sécurité côté voie.
        frameBox(mesh, f, -l, l, Math.min(x0, x1), Math.max(x0, x1), y + 0.48, y + 0.55, C.steelDark);
        frameBox(mesh, f, -l, l, Math.min(x0, x0 + side * 0.1), Math.max(x0, x0 + side * 0.1), y + 0.55, y + 0.57, C.safety);
        const r = side * (half - 0.45);
        frameBox(mesh, f, -l, l, r - 0.03, r + 0.03, y + 1.6, y + 1.66, C.galvanized);
        frameBox(mesh, f, -l, l, r - 0.02, r + 0.02, y + 1.08, y + 1.12, C.galvanized);
      }
    }
    // Appareils d'appui en fonte sous les quatre coins.
    for (const i of [0, panels]) for (const side of [-1, 1]) {
      const p = node(i, side, false);
      bar(mesh, [p[0], p[1] - 0.35, p[2]], [p[0], p[1] - 1.0, p[2]], 0.9, 0.9, C.graniteDark);
    }
  }
  // Piles de pierre entre les travées, fondées au fond de la gorge.
  for (let k = 1; k < spans; k += 1) {
    const s = plan.from + k * length;
    const f = plumbFrame(track, s);
    masonryPier(mesh, f, plan.ground(f.p[0], f.p[2]) - 1.5, base(s) - 1.0, 2.6, half + 1.2, s, 0.06);
    frameBox(mesh, f, -2.9, 2.9, -half - 1.6, half + 1.6, base(s) - 1.6, base(s) - 1.0, C.stoneLight);
    frameBox(mesh, f, -2.95, 2.95, -half - 1.65, half + 1.65, base(s) - 1.7, base(s) - 1.6, C.graniteDark);
  }
  abutment(mesh, track, plan.from, -1, plan.ground, half + 0.4);
  abutment(mesh, track, plan.to, 1, plan.ground, half + 0.4);
  return mesh;
}

function lat(f: Frame & { forward: V }, along: number, x: number): V {
  return [f.p[0] + f.forward[0] * along + f.right[0] * x, f.p[1], f.p[2] + f.forward[2] * along + f.right[2] * x];
}

// ————————————————————————————————————————————————————————————————— Tunnels

/**
 * Gabarit intérieur du tunnel, calculé à partir du train et de ses mouvements (voir `TUNNEL_ENVELOPE` et le test
 * « gabarit des tunnels ») :
 *
 * - matériel : ±1,42 m (locomotive), 4,42 m de haut (cheminée) ;
 * - débord en courbe au plus petit rayon souterrain (300 m) : 0,03 m au plus ; inclinaison du dévers (0,047 rad) en
 *   haut de la cheminée : 0,21 m ; ballant : 0,15 m ; d'où une enveloppe cinématique de ±1,81 m sur 4,6 m ;
 * - marge de sécurité : 0,5 m tout autour ; d'où un gabarit libre de ±2,31 m sur 5,1 m ;
 * - de chaque côté, un passage de service de 1,3 m, dalle à 0,3 m au-dessus du rail, bordure jaune, main courante ;
 *   d'où des piédroits à ±4,4 m (8,8 m entre parois, au lieu de 5,9 m) ;
 * - voûte surbaissée : naissances à 3,2 m, flèche de 3,6 m, clé à 6,8 m au-dessus du rail (au lieu de 5,25 m), qui
 *   laisse la caméra circuler au-dessus du train.
 */
export const TUNNEL = { halfWidth: 4.4, springing: 3.2, rise: 3.6, walkway: 1.3, walkwayHeight: 0.3 } as const;
/** Hauteur de la clé de voûte au-dessus du rail. */
export const TUNNEL_CROWN = TUNNEL.springing + TUNNEL.rise;
/** Galerie couverte (béton) : mêmes passages de service, plafond plat à goussets. */
export const GALLERY = { halfWidth: 4.5, ceiling: 6.4, haunch: 0.8 } as const;
/** Enveloppe cinématique du train (demi-largeur, hauteur) et marge de sécurité, qui fondent le gabarit. */
export const TUNNEL_ENVELOPE = { halfWidth: 1.81, height: 4.6, margin: 0.5 } as const;

/** Profil en fer à cheval : piédroits verticaux, voûte elliptique surbaissée (flèche `rise`). */
function horseshoe(halfWidth: number, springing: number, steps = 14, rise: number = TUNNEL.rise): [number, number][] {
  const floor = -FORMATION_DEPTH - 0.02;
  const profile: [number, number][] = [[-halfWidth, floor], [-halfWidth, springing]];
  for (let j = 1; j < steps; j += 1) {
    const t = Math.PI - (Math.PI * j) / steps;
    profile.push([Math.cos(t) * halfWidth, springing + Math.sin(t) * rise]);
  }
  profile.push([halfWidth, springing], [halfWidth, floor]);
  return profile;
}

/** Hauteur libre de la voûte (au-dessus du rail) à l'écart latéral `x`. */
export function tunnelCeiling(x: number, kind: "rock" | "gallery" = "rock"): number {
  if (kind === "gallery") {
    const edge = Math.abs(x) - (GALLERY.halfWidth - GALLERY.haunch);
    return GALLERY.ceiling - Math.max(0, edge);
  }
  const u = Math.min(1, Math.abs(x) / TUNNEL.halfWidth);
  return TUNNEL.springing + TUNNEL.rise * Math.sqrt(1 - u * u);
}

export interface LiningOptions {
  kind: "rock" | "gallery";
  /** Abscisses des luminaires (pour éclaircir la voûte autour de chacun) ; ils alternent à gauche et à droite. */
  lamps: number[];
  /**
   * Force des flaques de lumière peintes sur la voûte (1 par défaut). Quand de vraies lampes éclairent le tunnel
   * (éclairage groupé), on n'en garde qu'un soupçon.
   */
  pools?: number;
}

/** Côté d'un luminaire : alterné, en commençant par la gauche. */
export const lampSide = (index: number) => (index % 2 === 0 ? -1 : 1);

/**
 * Revêtement intérieur d'un tunnel, de `from` à `to` : moellons par anneaux de teintes variées, voûte légèrement
 * noircie au faîte, flaques de lumière chaude autour des luminaires, lumière du jour qui entre près des portails. La
 * galerie couverte est en béton, plafond plat à poutres. Une chemise de roche, à l'extrados, ferme le tube : même si le
 * relief s'écarte (bord d'une tranchée, flanc de falaise), on ne voit jamais le ciel à travers la paroi.
 */
export function tunnelLining(track: Track, from: number, to: number, options: LiningOptions): MeshData {
  const mesh = emptyMesh();
  const rock = options.kind === "rock";
  const shape: [number, number][] = rock
    ? horseshoe(TUNNEL.halfWidth, TUNNEL.springing)
    : [[-GALLERY.halfWidth, -FORMATION_DEPTH - 0.02], [-GALLERY.halfWidth, GALLERY.ceiling - GALLERY.haunch], [-GALLERY.halfWidth + GALLERY.haunch, GALLERY.ceiling], [GALLERY.halfWidth - GALLERY.haunch, GALLERY.ceiling], [GALLERY.halfWidth, GALLERY.ceiling - GALLERY.haunch], [GALLERY.halfWidth, -FORMATION_DEPTH - 0.02]];
  // Sommets supplémentaires sur les piédroits : le soubassement clair et son liseré restent nets.
  const profile: [number, number][] = [];
  shape.forEach((point, i) => {
    profile.push(point);
    const next = shape[i + 1];
    if (!next || point[0] !== next[0]) return;
    const ys = next[1] > point[1] ? [2.24, 2.28, 2.42, 2.46] : [2.46, 2.42, 2.28, 2.24];
    for (const y of ys) if ((y - point[1]) * (y - next[1]) < 0) profile.push([point[0], y]);
  });
  const step = rock ? 1.5 : 1.25;
  const frames: Frame[] = [];
  for (let s = from; s <= to + 0.01; s += step) frames.push(plumbFrame(track, Math.min(s, to)));
  const halfWidth = rock ? TUNNEL.halfWidth : GALLERY.halfWidth;
  sweep(mesh, profile, frames, (v, ring) => {
    const s = from + ring * step;
    const [x, y] = profile[v];
    const course = Math.floor(s / (rock ? 3 : 5)) + v * 0.31;
    // Revêtement moderne : soubassement peint clair (bande réfléchissante qui renvoie la lumière des luminaires),
    // liseré sombre, puis voûte en béton projeté gris chaud, par anneaux de coulage.
    const band = y > 2.27 && y < 2.43 && Math.abs(x) > 1;
    const base = band ? C.graniteDark : y < 2.26 ? C.cream : rock ? stoneTone(course, mixColor(C.concrete, C.rockWarm, 0.35)) : C.concrete;
    const soot = rock ? smoothstep01((y - 5.2) / 1.6) * 0.18 : 0.08 * smoothstep01((y - 5) / 1.5);
    const daylight = Math.max(0, 1 - Math.min(s - from, to - s) / 18);
    // Flaque de lumière : forte sur la paroi du luminaire, plus douce en face et sur la voûte.
    const lamp = options.lamps.reduce((m, l, i) => {
      const near = Math.max(0, 1 - Math.abs(l - s) / 8);
      const facing = rock ? (Math.sign(x) === lampSide(i) ? 1 : 0.55) * (1 - smoothstep01((y - 3.6) / 2) * 0.3) : 1;
      return Math.max(m, near * near * (3 - 2 * near) * facing);
    }, 0);
    const pool = lamp * (options.pools ?? 1);
    const warm = mixColor(mixColor(base, C.soot, soot), C.lamp, pool * 0.35);
    return scaleColor(warm, 0.92 + pool * (rock ? 0.45 : 0.35) + daylight * 0.35);
  });
  // Chemise de roche à l'extrados (côté extérieur, invisible de l'intérieur).
  const jacket: [number, number][] = rock
    ? horseshoe(halfWidth + 1.6, TUNNEL.springing, 10, TUNNEL.rise + 2.4)
    : [[-GALLERY.halfWidth - 1.2, -FORMATION_DEPTH - 1], [-GALLERY.halfWidth - 1.2, GALLERY.ceiling + 1.2], [GALLERY.halfWidth + 1.2, GALLERY.ceiling + 1.2], [GALLERY.halfWidth + 1.2, -FORMATION_DEPTH - 1]];
  sweep(mesh, jacket, frames, (v) => (v % 2 === 0 ? C.rockDark : C.rock));
  if (!rock) {
    // Poutres du plafond de la galerie, tous les 5 m.
    for (let s = Math.ceil(from / 5) * 5; s < to; s += 5) {
      const f = plumbFrame(track, s);
      const w = GALLERY.halfWidth;
      frameBox(mesh, f, -0.25, 0.25, -w, w, f.p[1] + GALLERY.ceiling - 0.6, f.p[1] + GALLERY.ceiling, C.concreteDark);
      frameBox(mesh, f, -0.25, 0.25, -w, -w + 0.3, f.p[1] - FORMATION_DEPTH, f.p[1] + GALLERY.ceiling - 0.5, C.concreteDark);
      frameBox(mesh, f, -0.25, 0.25, w - 0.3, w, f.p[1] - FORMATION_DEPTH, f.p[1] + GALLERY.ceiling - 0.5, C.concreteDark);
    }
  }
  // Radier : la dalle de fond du tube, sous le ballast et jusqu'aux passages de service.
  for (let s = from; s < to - 0.01; s += 6) {
    const l = Math.min(6, to - s) / 2;
    const f = plumbFrame(track, s + l);
    frameBox(mesh, f, -l, l, -halfWidth, halfWidth, f.p[1] - FORMATION_DEPTH - 0.25, f.p[1] - FORMATION_DEPTH + 0.03, C.concreteDark);
  }
  // Passages de service, de chaque côté de la voie : dalle de béton à 0,3 m au-dessus du rail, bordure claire à liseré
  // jaune côté voie, caniveau à câbles sous dalle (couvercles striés), main courante galvanisée scellée au piédroit.
  const walkTop = TUNNEL.walkwayHeight;
  for (const side of [-1, 1]) {
    const inner = side * (halfWidth - TUNNEL.walkway);
    for (let s = from; s < to - 0.01; s += 6) {
      const l = Math.min(6, to - s) / 2;
      const f = plumbFrame(track, s + l);
      const y = f.p[1];
      frameBox(mesh, f, -l, l, Math.min(inner, side * halfWidth), Math.max(inner, side * halfWidth), y - FORMATION_DEPTH, y + walkTop - 0.06, rock ? C.concreteDark : C.concreteDark);
      frameBox(mesh, f, -l + 0.02, l - 0.02, Math.min(inner, inner + side * (TUNNEL.walkway - 0.35)), Math.max(inner, inner + side * (TUNNEL.walkway - 0.35)), y + walkTop - 0.06, y + walkTop, C.concrete);
      // Couvercles du caniveau, contre le piédroit.
      const c0 = side * (halfWidth - 0.33);
      frameBox(mesh, f, -l + 0.03, l - 0.03, Math.min(c0, side * (halfWidth - 0.02)), Math.max(c0, side * (halfWidth - 0.02)), y + walkTop - 0.06, y + walkTop - 0.01, C.steelDark);
      // Bordure et liseré jaune.
      frameBox(mesh, f, -l, l, Math.min(inner, inner + side * 0.18), Math.max(inner, inner + side * 0.18), y + walkTop - 0.06, y + walkTop + 0.02, C.stoneLight);
      frameBox(mesh, f, -l, l, Math.min(inner + side * 0.2, inner + side * 0.3), Math.max(inner + side * 0.2, inner + side * 0.3), y + walkTop, y + walkTop + 0.005, C.safety);
    }
    // Main courante continue, et ses consoles tous les 3 m.
    const rail: Frame[] = [];
    for (let s = from; s <= to; s += 3) {
      const f = plumbFrame(track, Math.min(s, to));
      rail.push({ p: at(f, 0, side * (halfWidth - 0.12), walkTop + 1.0), right: f.right, up: f.up });
      bar(mesh, at(f, 0, side * (halfWidth - 0.01), walkTop + 1.0), at(f, 0, side * (halfWidth - 0.12), walkTop + 1.0), 0.04, 0.04, C.galvanized);
    }
    sweep(mesh, [[-0.03, -0.03], [0.03, -0.03], [0.03, 0.03], [-0.03, 0.03]], rail, C.galvanized, true);
    // Chemin de câbles haut, sous les naissances.
    const cable: Frame[] = [];
    for (let s = from; s <= to; s += 3) {
      const f = plumbFrame(track, Math.min(s, to));
      cable.push({ p: at(f, 0, side * (halfWidth - 0.06), (rock ? TUNNEL.springing : GALLERY.ceiling - GALLERY.haunch) - 0.25), right: f.right, up: f.up });
    }
    sweep(mesh, [[-0.05, -0.06], [0.02, -0.06], [0.02, 0.06], [-0.05, 0.06]], cable, C.blackSoft, true);
  }
  if (rock) {
    for (let s = from + 25; s < to - 20; s += 50) {
      for (const side of [-1, 1]) {
        const f = plumbFrame(track, s + side * 12);
        const x = side * (halfWidth - 0.02);
        // Niche : un encadrement de pierre claire et un fond sombre.
        const w0 = f.p[1] + TUNNEL.walkwayHeight;
        frameBox(mesh, f, -0.9, 0.9, Math.min(x, x - side * 0.05), Math.max(x, x - side * 0.05), w0, w0 + 2.1, C.graniteDark);
        frameBox(mesh, f, -1.05, -0.9, Math.min(x, x - side * 0.08), Math.max(x, x - side * 0.08), w0, w0 + 2.15, C.stoneLight);
        frameBox(mesh, f, 0.9, 1.05, Math.min(x, x - side * 0.08), Math.max(x, x - side * 0.08), w0, w0 + 2.15, C.stoneLight);
        frameBox(mesh, f, -1.05, 1.05, Math.min(x, x - side * 0.08), Math.max(x, x - side * 0.08), w0 + 2.1, w0 + 2.3, C.stoneLight);
      }
    }
  }
  return mesh;
}

function smoothstep01(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

/** Position (monde) de la source de lumière de chaque luminaire : sous la lanterne, un peu vers l'axe du tube. */
export function tunnelLampPoints(track: Track, lamps: readonly number[], kind: "rock" | "gallery"): Vec3[] {
  return lamps.map((s, i) => {
    const f = plumbFrame(track, s);
    return kind === "rock" ? at(f, 0, lampSide(i) * (TUNNEL.halfWidth - 1.6), 4.0) : at(f, 0, 0, GALLERY.ceiling - 0.9);
  });
}

/**
 * Luminaires du tunnel, alternés à gauche et à droite : une console de fer scellée dans le piédroit et une lanterne
 * vitrée. `glow` reçoit le verre (matériau lumineux), `fittings` la console et le chapeau (matériau du décor).
 */
export function tunnelLamps(track: Track, lamps: readonly number[], kind: "rock" | "gallery"): { glow: MeshData; fittings: MeshData } {
  const glow = emptyMesh();
  const fittings = emptyMesh();
  lamps.forEach((s, i) => {
    const f = plumbFrame(track, s);
    if (kind === "rock") {
      const side = lampSide(i);
      // Au-dessus du passage de service, sous les naissances : la lumière tombe sur la voie et sur le passage.
      const wall = side * (TUNNEL.halfWidth - 0.04);
      const lantern = side * (TUNNEL.halfWidth - 0.6);
      const y = f.p[1] + 4.4;
      frameBox(fittings, f, -0.12, 0.12, Math.min(wall, wall - side * 0.06), Math.max(wall, wall - side * 0.06), y - 0.3, y + 0.3, C.iron);
      bar(fittings, at(f, 0, wall, 4.55), at(f, 0, lantern, 4.55), 0.05, 0.05, C.iron);
      frameBox(fittings, f, -0.2, 0.2, lantern - 0.2, lantern + 0.2, y + 0.06, y + 0.16, C.iron);
      frameBox(glow, f, -0.15, 0.15, lantern - 0.15, lantern + 0.15, y - 0.32, y + 0.06, C.lamp);
      frameBox(fittings, f, -0.05, 0.05, lantern - 0.05, lantern + 0.05, y - 0.42, y - 0.32, C.iron);
    } else {
      frameBox(glow, f, -1.2, 1.2, -0.12, 0.12, f.p[1] + GALLERY.ceiling - 0.72, f.p[1] + GALLERY.ceiling - 0.62, C.lamp);
      frameBox(fittings, f, -1.3, 1.3, -0.18, 0.18, f.p[1] + GALLERY.ceiling - 0.62, f.p[1] + GALLERY.ceiling - 0.6, C.steelDark);
    }
  });
  return { glow, fittings };
}

/**
 * Tête de tunnel, à l'abscisse `s`, tournée vers l'extérieur (`facing` = -1 à l'entrée, +1 à la sortie) : mur de tête
 * en béton architectonique clair à panneaux, anneau de pierre de taille grise en saillie autour de l'ouverture, joint
 * creux sombre, bandeau et couvertine, murs en aile en voiles inclinés qui retiennent la tranchée ; derrière, un massif
 * de roche qui referme la montagne.
 */
export function tunnelPortal(track: Track, s: number, facing: 1 | -1, height: number): MeshData {
  const mesh = emptyMesh();
  const f = plumbFrame(track, s);
  const w = TUNNEL.halfWidth + 5.6;
  const t = 1.2;
  const floor = f.p[1] - FORMATION_DEPTH - 1.2;
  const top = f.p[1] + height;
  const face = facing > 0 ? t / 2 : -t / 2;
  const back = facing > 0 ? -t / 2 : t / 2;
  const [aMin, aMax] = [Math.min(face, back), Math.max(face, back)];
  const opening = horseshoe(TUNNEL.halfWidth, TUNNEL.springing, 16);
  // Mur de tête : panneaux de béton (deux teintes très proches), à gauche, à droite, puis au-dessus de la voûte.
  frameBox(mesh, f, aMin, aMax, -w, -TUNNEL.halfWidth, floor, top, stoneTone(s, C.concrete));
  frameBox(mesh, f, aMin, aMax, TUNNEL.halfWidth, w, floor, top, stoneTone(s + 1, C.concrete));
  for (let j = 1; j < opening.length - 2; j += 1) {
    const [x0, y0] = opening[j];
    const [x1, y1] = opening[j + 1];
    for (const a of [face, back]) addShape(mesh, [at(f, a, x0, y0), at(f, a, x1, y1), at(f, a, x1, height), at(f, a, x0, height)], [0, 1, 2, 0, 2, 3], stoneTone(s + 2, C.concrete));
  }
  // Joints verticaux des panneaux, en creux sombre.
  for (const x of [-w + 2.2, -w + 3.8, w - 3.8, w - 2.2]) frameBox(mesh, f, face + facing * 0.005, face + facing * 0.02, x - 0.02, x + 0.02, floor, top - 0.6, C.concreteDark);
  // Anneau d'encadrement : pierre de taille grise, en saillie, avec piédroits jusqu'au sol.
  const ringA = face + facing * 0.18;
  const out = (x: number, y: number, k: number): [number, number] => {
    if (y <= TUNNEL.springing) return [x + Math.sign(x) * k, y];
    const dx = x;
    const dy = y - TUNNEL.springing;
    const r = Math.hypot(dx, dy) || 1;
    return [x + (dx / r) * k, y + (dy / r) * k];
  };
  const granite = mixColor(C.graniteDark, C.stoneGrey, 0.45);
  for (let j = 0; j < opening.length - 1; j += 1) {
    const [x0, y0] = opening[j];
    const [x1, y1] = opening[j + 1];
    const [ox0, oy0] = out(x0, y0, 0.75);
    const [ox1, oy1] = out(x1, y1, 0.75);
    for (const a of [face, ringA]) addShape(mesh, [at(f, a, x0, y0), at(f, a, x1, y1), at(f, a, ox1, oy1), at(f, a, ox0, oy0)], [0, 1, 2, 0, 2, 3], granite);
    // Tranche de l'anneau (épaisseur visible), et joint creux sombre à l'extérieur.
    addShape(mesh, [at(f, face, ox0, oy0), at(f, face, ox1, oy1), at(f, ringA, ox1, oy1), at(f, ringA, ox0, oy0)], [0, 1, 2, 0, 2, 3], scaleColor(granite, 0.85));
    const [gx0, gy0] = out(x0, y0, 0.86);
    const [gx1, gy1] = out(x1, y1, 0.86);
    const g = face + facing * 0.01;
    addShape(mesh, [at(f, g, ox0, oy0), at(f, g, ox1, oy1), at(f, g, gx1, gy1), at(f, g, gx0, gy0)], [0, 1, 2, 0, 2, 3], C.graniteDark);
  }
  // Bandeau sombre (porte la plaque du nom), couvertine claire.
  frameBox(mesh, f, aMin - 0.12, aMax + 0.12, -w, w, f.p[1] + TUNNEL_CROWN + 1.15, f.p[1] + TUNNEL_CROWN + 2.05, C.graniteDark);
  frameBox(mesh, f, aMin - 0.2, aMax + 0.2, -w - 0.2, w + 0.2, top - 0.25, top, C.stoneLight);
  // Murs en aile : voiles de béton inclinés, qui s'abaissent le long de la tranchée.
  for (const side of [-1, 1]) {
    const a0 = facing * (t / 2);
    const a1 = facing * (t / 2 + 12);
    const x0 = side * (w - 0.9);
    slopedWall(mesh, f, Math.min(a0, a1), Math.max(a0, a1), Math.min(x0, x0 + side * 0.7), Math.max(x0, x0 + side * 0.7), floor, facing > 0 ? top - 0.6 : f.p[1] + 1.0, facing > 0 ? f.p[1] + 1.0 : top - 0.6, stoneTone(s + side * 3, C.stoneGrey));
  }
  // Massif de tête : un bloc de roche derrière le mur, au-dessus de la voûte, qui ferme la montagne jusqu'à la
  // couvertine (le relief, en mailles de 6 m, ne vient pas épouser exactement l'arrière du portail).
  const b1 = back - facing * 14;
  frameBox(mesh, f, Math.min(back, b1), Math.max(back, b1), -w, w, f.p[1] + TUNNEL_CROWN + 2.6, top - 0.3, mixColor(C.rock, C.rockDark, 0.4));
  return mesh;
}

/** Tête de galerie en béton : cadre rectangulaire, bandeau et murs de soutènement de la tranchée d'accès. */
export function galleryPortal(track: Track, s: number, facing: 1 | -1, height: number): MeshData {
  const mesh = emptyMesh();
  const f = plumbFrame(track, s);
  const floor = f.p[1] - FORMATION_DEPTH - 1;
  const a0 = facing > 0 ? -0.6 : -0.6;
  const a1 = 0.6;
  const g = GALLERY.halfWidth;
  const w = g + 4.8;
  const c = f.p[1] + GALLERY.ceiling;
  frameBox(mesh, f, a0, a1, -w, -g, floor, f.p[1] + height, C.concrete);
  frameBox(mesh, f, a0, a1, g, w, floor, f.p[1] + height, C.concrete);
  frameBox(mesh, f, a0, a1, -g, g, c, f.p[1] + height, C.concrete);
  // Goussets dans les angles hauts de l'ouverture.
  for (const side of [-1, 1]) {
    for (let k = 0; k < 4; k += 1) {
      const x0 = side * (g - (GALLERY.haunch * (k + 1)) / 4);
      frameBox(mesh, f, a0, a1, Math.min(x0, side * g), Math.max(x0, side * g), c - GALLERY.haunch * (1 - k / 4), c, C.concrete);
    }
  }
  // Bandeau de gabarit jaune et noir.
  frameBox(mesh, f, a0 - 0.1, a1 + 0.1, -g - 0.4, g + 0.4, c, c + 0.85, C.safety);
  for (let k = 0; k < 11; k += 1) {
    const x = -g - 0.2 + k * 0.85;
    frameBox(mesh, f, a0 - 0.12, a1 + 0.12, x, x + 0.42, c, c + 0.85, C.black);
  }
  frameBox(mesh, f, a0 - 0.2, a1 + 0.2, -w - 0.3, w + 0.3, f.p[1] + height - 0.4, f.p[1] + height, C.concreteDark);
  // Massif de tête derrière le cadre (voir le portail du tunnel).
  const g0 = facing > 0 ? -0.6 : 0.6;
  const g1 = g0 - facing * 14;
  frameBox(mesh, f, Math.min(g0, g1), Math.max(g0, g1), -w, w, c + 1.4, f.p[1] + height + 0.4, mixColor(C.rock, C.rockDark, 0.4));
  // Murs de soutènement de la tranchée.
  for (const side of [-1, 1]) {
    for (let k = 0; k < 10; k += 1) {
      const b0 = facing * (0.6 + k * 2.5);
      const b1 = facing * (0.6 + (k + 1) * 2.5);
      const h = Math.max(1.0, height * (1 - (k + 1) / 11));
      frameBox(mesh, f, Math.min(b0, b1), Math.max(b0, b1), side > 0 ? g + 0.1 : -g - 0.6, side > 0 ? g + 0.6 : -g - 0.1, floor, f.p[1] + h, k % 2 === 0 ? C.concrete : scaleColor(C.concrete, 0.95));
    }
  }
  return mesh;
}
