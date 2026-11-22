import { useSyncExternalStore } from "react";

// Sens dans lequel l'appareil est tenu (écran plus haut que large : portrait). Suit les rotations en direct.
const QUERY = "(orientation: portrait)";

export type DeviceOrientation = "landscape" | "portrait";

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

const snapshot = (): DeviceOrientation =>
  typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches ? "portrait" : "landscape";

export function useDeviceOrientation(): DeviceOrientation {
  return useSyncExternalStore(subscribe, snapshot, () => "landscape");
}
