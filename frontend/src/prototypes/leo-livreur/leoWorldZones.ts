/** Monde déterministe à zones : identifiant stable même après retour en arrière. */
export const WORLD_ZONE_WIDTH = 2400;
export const WORLD_ZONE_WINDOW = 3;

export type WorldZoneKind = "village" | "bridge" | "city-entry" | "residential" | "market" | "school";

const ZONE_SEQUENCE: readonly WorldZoneKind[] = [
  "village", "village", "village", "bridge", "bridge", "city-entry", "residential", "market", "school",
];
const REPEATING_ZONE_START = 5;

export interface WorldZone {
  id: number;
  kind: WorldZoneKind;
  seed: number;
  startX: number;
  endX: number;
}

export function zoneForWorldX(x: number): WorldZone {
  const id = Math.max(0, Math.floor(x / WORLD_ZONE_WIDTH));
  const kind = id < ZONE_SEQUENCE.length
    ? ZONE_SEQUENCE[id]
    : ZONE_SEQUENCE[REPEATING_ZONE_START + ((id - ZONE_SEQUENCE.length) % (ZONE_SEQUENCE.length - REPEATING_ZONE_START))];
  return { id, kind, seed: stableZoneSeed(id), startX: id * WORLD_ZONE_WIDTH, endX: (id + 1) * WORLD_ZONE_WIDTH };
}

export function stableZoneSeed(id: number) {
  let value = (id + 0x9e3779b9) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

export function visibleZoneIds(x: number, windowSize = WORLD_ZONE_WINDOW): number[] {
  const center = zoneForWorldX(x).id;
  const before = Math.floor((windowSize - 1) / 2);
  const first = Math.max(0, center - before);
  return Array.from({ length: windowSize }, (_, index) => first + index);
}

/** Identifiants des zones qui recoupent [minX, maxX] (marge comprise). */
export function zoneIdsForRange(minX: number, maxX: number, margin = 0): number[] {
  const first = zoneForWorldX(Math.max(0, minX - margin)).id;
  const last = zoneForWorldX(Math.max(0, maxX + margin)).id;
  return Array.from({ length: last - first + 1 }, (_, index) => first + index);
}

/**
 * Zones à garder chargées : la fenêtre habituelle autour de Léo, plus toute zone que la vue (avec son cadrage
 * d'anticipation) peut montrer. Les décors sont donc prêts avant d'entrer dans le champ, jamais retirés trop tôt.
 */
export function zonesToKeep(leoX: number, minX: number, maxX: number, margin = 300): number[] {
  const ids = new Set([...visibleZoneIds(leoX), ...zoneIdsForRange(minX, maxX, margin)]);
  return [...ids].sort((a, b) => a - b);
}

export function zoneVariant(id: number, seed: number, variantCount: number) {
  if (variantCount <= 0) return 0;
  return stableZoneSeed(id ^ seed) % variantCount;
}
