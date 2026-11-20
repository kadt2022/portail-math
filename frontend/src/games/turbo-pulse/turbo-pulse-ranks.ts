import type { FruitColor } from "./turbo-pulse-engine";

// Les sept rangs de Turbo Pulse : un par niveau, de l'Acier à l'Or royal. Le rang suit toujours le niveau
// réel du jeu (indice 0 à 6) ; il ne change que l'habillage, jamais les règles ni les calculs.
export type TurboPulseRankId = "steel" | "bronze" | "silver" | "emerald" | "sapphire" | "ruby" | "gold";

export interface TurboPulseRank {
  id: TurboPulseRankId;
  /** Couleur d'énergie (ligne de défense, tir, étincelles, particules), au format Phaser. */
  accent: number;
  /** Mêmes teintes pour l'interface (contours lumineux, boutons, progression). */
  accentCss: string;
  lightCss: string;
  darkCss: string;
  /** Teinte appliquée aux illustrations dorées de référence (canon) : teinte, saturation, décalage de clarté. */
  tint: { hue: number; saturation: number; lightness: number } | null;
  /**
   * Couleur de chaque famille de boules. Les six couleurs restent assez différentes entre elles pour
   * que « toutes les boules de la même couleur explosent » reste lisible, tout en gardant l'identité du rang.
   */
  palette: Readonly<Record<FruitColor, number>>;
}

export const TURBO_RANKS: readonly TurboPulseRank[] = [
  {
    id: "steel", accent: 0xa9b8c8, accentCss: "#a9b8c8", lightCss: "#e3ecf5", darkCss: "#566474",
    tint: { hue: 212, saturation: 0.14, lightness: -0.04 },
    palette: { red: 0x9fb0c2, green: 0x3f4c5c, purple: 0x6f98c4, orange: 0x948b82, yellow: 0xc8d6e4, pink: 0x4f9a9f },
  },
  {
    id: "bronze", accent: 0xd88a45, accentCss: "#d88a45", lightCss: "#f3bd80", darkCss: "#7a4521",
    tint: { hue: 27, saturation: 0.62, lightness: -0.08 },
    palette: { red: 0xc9763a, green: 0x7d4a25, purple: 0xe3a463, orange: 0x9e5a2c, yellow: 0xf2c58a, pink: 0xb8514a },
  },
  {
    id: "silver", accent: 0xe8eef7, accentCss: "#e8eef7", lightCss: "#ffffff", darkCss: "#8995ab",
    tint: { hue: 214, saturation: 0.07, lightness: 0.16 },
    palette: { red: 0xe6ebf2, green: 0xa4afc0, purple: 0xf9fbfe, orange: 0x8793a8, yellow: 0xcdd6e5, pink: 0xb9aad8 },
  },
  {
    id: "emerald", accent: 0x2fd37f, accentCss: "#2fd37f", lightCss: "#93f0c1", darkCss: "#0d6b44",
    tint: { hue: 148, saturation: 0.95, lightness: -0.04 },
    palette: { red: 0x1fbf6e, green: 0x0e7a4a, purple: 0x7be8a8, orange: 0x2dd4c0, yellow: 0xb8f2c8, pink: 0x6fae3c },
  },
  {
    id: "sapphire", accent: 0x3f74f2, accentCss: "#3f74f2", lightCss: "#9bbcff", darkCss: "#1a2f8a",
    tint: { hue: 222, saturation: 1, lightness: -0.05 },
    palette: { red: 0x2a56d6, green: 0x16337f, purple: 0x6a93f2, orange: 0x9cc0ff, yellow: 0x3ab4e4, pink: 0x5a45c4 },
  },
  {
    id: "ruby", accent: 0xe0245e, accentCss: "#e0245e", lightCss: "#ff93b3", darkCss: "#8c0f35",
    tint: { hue: 346, saturation: 1, lightness: -0.05 },
    palette: { red: 0xd1142f, green: 0x8c0b2c, purple: 0xe0279b, orange: 0xff5c7a, yellow: 0xa3157a, pink: 0xff94ab },
  },
  {
    id: "gold", accent: 0xffc83d, accentCss: "#ffc83d", lightCss: "#fff0a8", darkCss: "#b9740f",
    tint: null,
    palette: { red: 0xffc936, green: 0xb8860b, purple: 0xffe27a, orange: 0xd99a1e, yellow: 0xfff0a8, pink: 0xc77d12 },
  },
];

/** Rang d'un niveau (indice 0 à 6) ; hors limites, le plus proche. */
export function rankForLevel(levelIndex: number): TurboPulseRank {
  const index = Math.min(Math.max(Math.trunc(levelIndex) || 0, 0), TURBO_RANKS.length - 1);
  return TURBO_RANKS[index];
}

// --- Teinte des illustrations de référence (or) vers la couleur d'un rang -----------------

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const red = r / 255, green = g / 255, blue = b / 255;
  const max = Math.max(red, green, blue), min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return [0, 0, lightness];
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue: number;
  if (max === red) hue = ((green - blue) / delta) % 6;
  else if (max === green) hue = (blue - red) / delta + 2;
  else hue = (red - green) / delta + 4;
  return [(hue * 60 + 360) % 360, saturation, lightness];
}

function hslToRgb(hue: number, saturation: number, lightness: number): [number, number, number] {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const section = (hue % 360) / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  const [r1, g1, b1] = section < 1 ? [chroma, x, 0] : section < 2 ? [x, chroma, 0] : section < 3 ? [0, chroma, x] : section < 4 ? [0, x, chroma] : section < 5 ? [x, 0, chroma] : [chroma, 0, x];
  const m = lightness - chroma / 2;
  return [Math.round((r1 + m) * 255), Math.round((g1 + m) * 255), Math.round((b1 + m) * 255)];
}

function tintRgb(r: number, g: number, b: number, tint: NonNullable<TurboPulseRank["tint"]>): [number, number, number] {
  const [, saturation, lightness] = rgbToHsl(r, g, b);
  return hslToRgb(tint.hue, Math.min(1, saturation * tint.saturation), Math.min(1, Math.max(0, lightness + tint.lightness)));
}

/** Recolore une couleur CSS (#rrggbb ou rgba(...)) d'une illustration dorée vers le rang ; l'Or royal la laisse intacte. */
export function tintCssColor(value: string, rank: TurboPulseRank): string {
  const tint = rank.tint;
  if (!tint) return value;
  return value
    .replace(/#([0-9a-f]{6})\b/gi, (_, hex: string) => {
      const n = Number.parseInt(hex, 16);
      const [r, g, b] = tintRgb((n >> 16) & 255, (n >> 8) & 255, n & 255, tint);
      return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
    })
    .replace(/rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)/g, (_, r: string, g: string, b: string, a: string) => {
      const [nr, ng, nb] = tintRgb(Number(r), Number(g), Number(b), tint);
      return `rgba(${nr}, ${ng}, ${nb}, ${a})`;
    });
}
