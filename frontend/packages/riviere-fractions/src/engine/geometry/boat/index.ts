import { accessoryParts } from "./accessories";
import { canopyParts } from "./canopy";
import { cockpitParts } from "./cockpit";
import { HULL, OUTBOARD, type Vec3 } from "./dimensions";
import { hullParts } from "./hull";
import { outboardMount, outboardParts, propellerParts } from "./outboard";
import { pilotParts } from "./pilot";
import { emptyBoatMesh, padPaint, type BoatMesh } from "./shapes";

// Le bateau à moteur du joueur, assemblé à partir de ses composants : coque, poste de pilotage, toit et éclairage,
// accessoires, pilote (un seul maillage rigide) ; moteur hors-bord et hélice à part, parce qu'ils bougent.

export type { BoatMesh } from "./shapes";
export { FINISH } from "./shapes";
export { HULL, OUTBOARD, ROOF } from "./dimensions";

export interface MotorBoatModel {
  /** Coque, pont, cockpit, toit, accessoires et pilote : tout ce qui bouge avec le bateau. */
  body: BoatMesh;
  /** Moteur hors-bord, dans son repère : il pivote autour de l'axe vertical passant par son origine. */
  outboard: BoatMesh;
  /** Hélice, centrée sur son moyeu : elle tourne autour de l'axe z. */
  propeller: BoatMesh;
  /** Position de l'axe de direction du moteur dans le repère du bateau. */
  outboardPivot: Vec3;
  /** Position du moyeu de l'hélice dans le repère du moteur. */
  propellerHub: Vec3;
  /** Longueur hors tout (moteur compris) et largeur, pour l'ombre et les mesures. */
  length: number;
  beam: number;
}

export function motorBoat(): MotorBoatModel {
  const body = emptyBoatMesh();
  hullParts(body);
  cockpitParts(body);
  canopyParts(body);
  accessoryParts(body);
  pilotParts(body);
  outboardMount(body);
  const outboard = emptyBoatMesh();
  outboardParts(outboard);
  const propeller = emptyBoatMesh();
  propellerParts(propeller);
  for (const mesh of [body, outboard, propeller]) padPaint(mesh);
  return {
    body,
    outboard,
    propeller,
    outboardPivot: [...OUTBOARD.pivot],
    propellerHub: [...OUTBOARD.hub],
    length: HULL.bow - (OUTBOARD.pivot[2] + OUTBOARD.hub[2] - 0.12),
    beam: HULL.beam,
  };
}
