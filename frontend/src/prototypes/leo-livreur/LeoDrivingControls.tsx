import { useState, type PointerEvent } from "react";

import type { LeoLivreurControl, LeoLivreurController, LeoLivreurSnapshot } from "./LeoLivreurGame";
import { isControlEnabled } from "./leoControls";
import { START_POSITION } from "./leoGeometry";
import { MISSION_ADDRESSES } from "./leoMission";
import { pxToMeters } from "./leoUnits";
import { BUNDLE_TEXTURES } from "./leoZoneAssets";
import styles from "./LeoLivreurPrototypePage.module.css";

// Commandes et textes de conduite partagés par la page prototype et le lecteur des jeux. Aucun import du moteur (Phaser) :
// le lecteur peut ainsi afficher son écran de chargement avant que le moteur n'arrive (types seulement).

export const INITIAL_SNAPSHOT: LeoLivreurSnapshot = {
  phase: "INTRO",
  speedKmh: 0,
  heading: 0,
  steering: 0,
  targetLabel: MISSION_ADDRESSES[0].label,
  // Jusqu'à l'entrée de la zone de livraison de la première maison.
  remainingMeters: Math.round(pxToMeters(MISSION_ADDRESSES[0].destination.stop.x - MISSION_ADDRESSES[0].destination.radius - START_POSITION.x)),
  destinationStatus: "ahead",
  signalState: null,
  signalMessage: null,
  signalDistance: null,
  signalPrepare: false,
  travelledMeters: 0,
  assets: "loading",
  assetsLoaded: 0,
  assetsTotal: BUNDLE_TEXTURES.common.length,
};

export const ALL_CONTROLS: readonly LeoLivreurControl[] = ["left", "right", "forward", "brake", "reverse"];

/**
 * Bouton à maintenir. Chaque bouton suit son propre doigt (capture du pointeur) : plusieurs boutons peuvent être
 * tenus en même temps (Avancer + Gauche). Aucun geste n'est laissé au navigateur (défilement, zoom, menu).
 */
export function HoldButton({
  control,
  label,
  icon,
  controller,
  variant = "panel",
}: {
  control: LeoLivreurControl;
  label: string;
  icon: string;
  controller: LeoLivreurController | null;
  variant?: "panel" | "touch";
}) {
  const [pressed, setPressed] = useState(false);
  // Commande désactivée (direction en V1, voir leoControls) : bouton visible mais inerte, nativement désactivé.
  const enabled = isControlEnabled(control);
  const press = () => {
    setPressed(true);
    controller?.setControl(control, true);
  };
  const release = (event?: PointerEvent<HTMLButtonElement>) => {
    if (event && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPressed(false);
    controller?.setControl(control, false);
  };
  const nudge = () => {
    if (control === "left" || control === "right") controller?.turn(control);
  };
  const handlePress = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!enabled) return;
    // La commande s'active d'abord ; la capture (garder le doigt même s'il glisse hors du bouton) est un plus,
    // jamais une condition : certains navigateurs la refusent pour un pointeur déjà relâché.
    press();
    nudge();
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Sans capture, le relâchement reste détecté par pointerup / pointercancel sur le bouton.
    }
  };
  const className = variant === "touch" ? `${styles.touchButton} ${styles[`touch_${control}`]}` : `${styles.control} ${styles[control]}`;
  return (
    <button
      type="button"
      className={className}
      data-control={control}
      data-pressed={pressed ? "true" : "false"}
      disabled={!enabled}
      title={enabled ? undefined : "Direction désactivée pour le moment"}
      onPointerDown={handlePress}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={`${label} (maintenir)`}
    >
      <span aria-hidden="true">{icon}</span>
      <strong>{label}</strong>
    </button>
  );
}

/**
 * Klaxon : sonne tant qu'il est tenu, comme les pédales (capture du pointeur, aucun geste laissé au navigateur).
 * Au centre du panneau, comme le klaxon au milieu d'un volant.
 */
export function HornButton({ controller, variant }: { controller: LeoLivreurController | null; variant: "panel" | "touch" }) {
  const [pressed, setPressed] = useState(false);
  const press = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setPressed(true);
    controller?.horn(true);
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Sans capture, le relâchement reste détecté par pointerup / pointercancel sur le bouton.
    }
  };
  const release = (event?: PointerEvent<HTMLButtonElement>) => {
    if (event && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setPressed(false);
    controller?.horn(false);
  };
  const className = variant === "touch" ? `${styles.touchButton} ${styles.touch_horn}` : `${styles.control} ${styles.horn}`;
  return (
    <button
      type="button"
      className={className}
      data-control="horn"
      data-pressed={pressed ? "true" : "false"}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(event) => event.preventDefault()}
      aria-label="Klaxon (maintenir)"
    >
      <span aria-hidden="true">♪</span>
      <strong>Klaxon</strong>
    </button>
  );
}

/** Message de chargement : un nombre réel d'images au démarrage, sinon un état sans pourcentage inventé. */
export function assetsMessage(snapshot: LeoLivreurSnapshot) {
  if (snapshot.assets === "error") return "Une partie du jeu n’a pas pu être téléchargée. Vérifie la connexion, puis réessaie.";
  if (snapshot.assets !== "loading") return null;
  if (snapshot.assetsTotal !== null && snapshot.assetsLoaded !== null) {
    return `Chargement du jeu : ${snapshot.assetsLoaded} / ${snapshot.assetsTotal} images…`;
  }
  return "Chargement de la suite du parcours… Léo attend un instant.";
}

/** Consigne du panneau : chargement, pause et feux d'abord ; sinon celle de la mission (`mission`). */
export function instructionFor(snapshot: LeoLivreurSnapshot, paused: boolean, mission: string) {
  const loading = assetsMessage(snapshot);
  if (loading) return loading;
  if (paused) return "Jeu en pause. Appuie sur Reprendre pour continuer.";
  if (snapshot.signalMessage) return snapshot.signalMessage;
  if (snapshot.signalState === "RED" && snapshot.signalPrepare && snapshot.signalDistance !== null) {
    return `Feu rouge à ${snapshot.signalDistance} m : prépare-toi à freiner.`;
  }
  return mission;
}
