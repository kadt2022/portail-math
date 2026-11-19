import { useSyncExternalStore } from "react";

// Téléphones, et tablettes tactiles : le portail laisse alors toute la place au jeu (plein écran immersif).
// Sur ordinateur, le jeu se joue dans la page et le plein écran est un choix du joueur.
const QUERY = "(max-width: 680px), (pointer: coarse) and (max-width: 1100px)";

function subscribe(onChange: () => void) {
  if (typeof window.matchMedia !== "function") return () => {};
  const list = window.matchMedia(QUERY);
  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

const snapshot = () => typeof window.matchMedia === "function" && window.matchMedia(QUERY).matches;

export function useImmersiveDevice(): boolean {
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
