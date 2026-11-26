// Description du vaisseau : de grandes parties, chacune avec quelques variantes, et un style de couleurs. C'est cette fiche, et elle seule,
// que l'atelier de construction modifie ; le gameplay la lira plus tard pour construire le même vaisseau.

export type PartId = "hull" | "cockpit" | "wings" | "engines" | "tail" | "gear" | "shield";

/** Les parties que l'atelier propose de personnaliser (dans l'ordre d'affichage). */
export const WORKSHOP_PARTS = ["cockpit", "wings", "engines", "shield", "style"] as const;
export type WorkshopPart = (typeof WORKSHOP_PARTS)[number];

export const WING_VARIANTS = ["delta", "large"] as const;
export type WingVariant = (typeof WING_VARIANTS)[number];

export const ENGINE_VARIANTS = ["twin", "compact"] as const;
export type EngineVariant = (typeof ENGINE_VARIANTS)[number];

export const PALETTE_IDS = ["rocket-red", "comet-blue", "mint-green", "galaxy-purple"] as const;
export type PaletteId = (typeof PALETTE_IDS)[number];

export interface ShipSpec {
  readonly palette: PaletteId;
  readonly wings: WingVariant;
  readonly engines: EngineVariant;
  readonly shield: boolean;
}

export const DEFAULT_SHIP: ShipSpec = { palette: "rocket-red", wings: "delta", engines: "twin", shield: false };

export interface Palette {
  readonly id: PaletteId;
  /** Coque : blanc légèrement lavande. */
  readonly hull: string;
  /** Éléments dynamiques : nez, bord des ailes, dérives, bagues. */
  readonly accent: string;
  /** Verrière du cockpit. */
  readonly glass: string;
  /** Lueur des moteurs. */
  readonly glow: string;
  /** Étoiles et voyants. */
  readonly star: string;
}

export const PALETTES: Readonly<Record<PaletteId, Palette>> = {
  "rocket-red": { id: "rocket-red", hull: "#ece9f8", accent: "#e8232f", glass: "#1f4fe8", glow: "#2ab4ff", star: "#ffd22e" },
  "comet-blue": { id: "comet-blue", hull: "#ecf1fa", accent: "#1f7bff", glass: "#10a7c9", glow: "#5af0ff", star: "#ffe14d" },
  "mint-green": { id: "mint-green", hull: "#eef6f1", accent: "#17b26a", glass: "#1d8fd6", glow: "#3de6b4", star: "#ffd22e" },
  "galaxy-purple": { id: "galaxy-purple", hull: "#f0eafb", accent: "#8b46f5", glass: "#4a38e0", glow: "#d070ff", star: "#ffe14d" },
};

/** Les parties, dans l'ordre où l'atelier les montre au regard de la caméra : où regarder pour chacune (point visé et recul). */
export const PART_FOCUS: Readonly<Record<WorkshopPart, { target: readonly [number, number, number]; radius: number }>> = {
  cockpit: { target: [0, 0.5, 0.8], radius: 5 },
  wings: { target: [1.9, -0.1, -1], radius: 7.5 },
  engines: { target: [1.1, -0.05, -1.8], radius: 6 },
  shield: { target: [0, 0.1, 0], radius: 13 },
  style: { target: [0, 0.1, 0], radius: 11 },
};
