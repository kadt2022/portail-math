// Un monde par niveau, tous dans la galaxie Kimbo. Le décor (niv00N.webp) est
// chargé par TurboPulsePage ; ce fichier porte ce qui s'en déduit : l'identité
// du monde (nom affiché via i18n) et sa couleur d'énergie, reprise par le tir,
// la ligne de défense et l'interface pour que tout soit assorti au décor.

export type TurboPulseWorldId = "zion" | "verdalia" | "aqualis" | "solara" | "glacia" | "pyra" | "ultima";

export interface TurboPulseWorld {
  id: TurboPulseWorldId;
  /** Couleur d'énergie du monde (0xRRGGBB) : tir, ligne de défense. */
  accent: number;
  /** Même couleur au format CSS, pour l'interface (--turbo-world). */
  accentCss: string;
}

export const TURBO_WORLDS: readonly TurboPulseWorld[] = [
  { id: "zion", accent: 0x7fe9ff, accentCss: "#7fe9ff" },
  { id: "verdalia", accent: 0x9dff7a, accentCss: "#9dff7a" },
  { id: "aqualis", accent: 0x5cf2ff, accentCss: "#5cf2ff" },
  { id: "solara", accent: 0xffc94d, accentCss: "#ffc94d" },
  { id: "glacia", accent: 0xcdf3ff, accentCss: "#cdf3ff" },
  { id: "pyra", accent: 0xff8a4d, accentCss: "#ff8a4d" },
  { id: "ultima", accent: 0xd99bff, accentCss: "#d99bff" },
];

/** Monde d'un niveau (index 0 à 6) ; un index hors plage reste borné au premier ou au dernier monde. */
export function worldForLevel(levelIndex: number): TurboPulseWorld {
  const index = Math.min(Math.max(Math.trunc(levelIndex) || 0, 0), TURBO_WORLDS.length - 1);
  return TURBO_WORLDS[index];
}
