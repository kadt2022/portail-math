import { useEffect, useRef, useState } from "react";

import { createWorkshop, type Workshop, type WorkshopStats } from "../scene/workshopEngine";
import {
  DEFAULT_SHIP,
  ENGINE_VARIANTS,
  PALETTES,
  PALETTE_IDS,
  WING_VARIANTS,
  type ShipSpec,
  type WorkshopPart,
  WORKSHOP_PARTS,
} from "../ship/shipSpec";
import styles from "./ShipWorkshop.module.css";

// L'atelier de construction, première étape : le vaisseau au centre, cinq pièces à choisir en bas (cockpit, ailes, moteurs, bouclier,
// style). Toucher une pièce cadre la caméra dessus et propose ses choix. Pas de score, pas de calcul : on regarde et on compose.
//
// Écrit pour Yamba.

const TEXTS = {
  fr: {
    label: "Atelier du vaisseau Turbo Pulse 3D",
    cockpit: "Cockpit",
    wings: "Ailes",
    engines: "Moteurs",
    shield: "Bouclier",
    style: "Couleurs",
    "wings.delta": "Delta",
    "wings.large": "Grandes",
    "engines.twin": "Jumeaux",
    "engines.compact": "Trio",
    "shield.off": "Sans",
    "shield.on": "Avec",
    "palette.rocket-red": "Fusée rouge",
    "palette.comet-blue": "Comète bleue",
    "palette.mint-green": "Menthe",
    "palette.galaxy-purple": "Galaxie",
    cockpitInfo: "Le cockpit est la bulle de verre du pilote. Il ne change pas encore.",
    stats: "triangles",
  },
  en: {
    label: "Turbo Pulse 3D ship workshop",
    cockpit: "Cockpit",
    wings: "Wings",
    engines: "Engines",
    shield: "Shield",
    style: "Colors",
    "wings.delta": "Delta",
    "wings.large": "Large",
    "engines.twin": "Twin",
    "engines.compact": "Trio",
    "shield.off": "Off",
    "shield.on": "On",
    "palette.rocket-red": "Rocket red",
    "palette.comet-blue": "Comet blue",
    "palette.mint-green": "Mint",
    "palette.galaxy-purple": "Galaxy",
    cockpitInfo: "The cockpit is the pilot's glass bubble. It cannot change yet.",
    stats: "triangles",
  },
} as const;

export interface ShipWorkshopProps {
  language?: string;
  /** Affiche les mesures (triangles, appels de dessin, images par seconde) : outil de mise au point. */
  debug?: boolean;
  light?: boolean;
}

export function ShipWorkshop({ language, debug = false, light = false }: Readonly<ShipWorkshopProps>) {
  const t = TEXTS[language?.toLowerCase().startsWith("en") ? "en" : "fr"];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workshopRef = useRef<Workshop | null>(null);
  const [spec, setSpec] = useState<ShipSpec>(DEFAULT_SHIP);
  const [part, setPart] = useState<WorkshopPart>("style");
  const [stats, setStats] = useState<WorkshopStats | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let workshop: Workshop;
    try {
      workshop = createWorkshop(canvas, DEFAULT_SHIP, { light });
    } catch {
      queueMicrotask(() => setFailed(true));
      return undefined;
    }
    workshopRef.current = workshop;
    const timer = debug ? window.setInterval(() => setStats(workshop.stats()), 1000) : 0;
    return () => {
      window.clearInterval(timer);
      workshop.dispose();
      workshopRef.current = null;
    };
  }, [debug, light]);

  const choose = (next: ShipSpec) => {
    setSpec(next);
    workshopRef.current?.apply(next);
  };
  const pick = (next: WorkshopPart) => {
    setPart(next);
    workshopRef.current?.focus(next);
  };

  const options: ReadonlyArray<{ id: string; label: string; active: boolean; patch: Partial<ShipSpec>; swatch?: string }> = (() => {
    if (part === "wings") return WING_VARIANTS.map((id) => ({ id, label: t[`wings.${id}`], active: spec.wings === id, patch: { wings: id } }));
    if (part === "engines") return ENGINE_VARIANTS.map((id) => ({ id, label: t[`engines.${id}`], active: spec.engines === id, patch: { engines: id } }));
    if (part === "shield") return [false, true].map((on) => ({ id: String(on), label: on ? t["shield.on"] : t["shield.off"], active: spec.shield === on, patch: { shield: on } }));
    if (part === "style") return PALETTE_IDS.map((id) => ({ id, label: t[`palette.${id}`], active: spec.palette === id, swatch: PALETTES[id].accent, patch: { palette: id } }));
    return [];
  })();

  return (
    <section className={styles.root} aria-label={t.label}>
      {failed ? <p role="alert">WebGL indisponible.</p> : <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />}
      {debug && stats ? (
        <p className={styles.debug}>
          {stats.triangles} {t.stats} · {stats.meshes} meshes · {stats.drawCalls} draw calls · {stats.fps} fps
        </p>
      ) : null}
      <div className={styles.panel}>
        <div className={styles.choices} role="group" aria-label={t[part]}>
          {options.length === 0 ? <p className={styles.info}>{t.cockpitInfo}</p> : null}
          {options.map((o) => (
            <button key={o.id} type="button" className={styles.choice} aria-pressed={o.active} onClick={() => choose({ ...spec, ...o.patch })}>
              {o.swatch ? <span className={styles.swatch} style={{ background: o.swatch }} aria-hidden="true" /> : null}
              {o.label}
            </button>
          ))}
        </div>
        <div className={styles.parts} role="group" aria-label={t.label}>
          {WORKSHOP_PARTS.map((id) => (
            <button key={id} type="button" className={styles.part} aria-pressed={part === id} onClick={() => pick(id)}>
              {t[id]}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
