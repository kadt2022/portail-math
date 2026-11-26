import { useEffect, useState, type RefObject } from "react";

import styles from "./YambaWritingGame.module.css";
import type { GuideTarget } from "./guide";

interface GuideHandProps {
  /** Élément du jeu : la main se place dans son repère. */
  rootRef: RefObject<HTMLElement | null>;
  target: GuideTarget;
  text: string;
}

// Position du bout du doigt par rapport à la cible : un peu sous son centre, pour que la main ne cache pas le contenu.
const TIP_X = 0.5;
const TIP_Y = 0.62;

// Main de dessin animé : gant blanc qui clignote et « appuie » sur la cible. La cible est trouvée dans le jeu lui-même (élément
// marqué data-guide) à chaque étape et à chaque changement de taille : aucune coordonnée n'est écrite en dur.
export function GuideHand({ rootRef, target, text }: GuideHandProps) {
  const [spot, setSpot] = useState<{ x: number; y: number; width: number; flip: boolean } | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const place = () => {
      const element = root.querySelector<HTMLElement>(`[data-guide="${target}"]`);
      if (!element) return setSpot(null);
      const area = root.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      const x = rect.left - area.left + rect.width * TIP_X;
      setSpot({ x, y: rect.top - area.top + rect.height * TIP_Y, width: rect.width, flip: x > area.width * 0.6 });
    };
    place();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    observer?.observe(root);
    window.addEventListener("resize", place);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [rootRef, target]);

  if (!spot) return null;
  return (
    <div className={styles.guide} style={{ left: spot.x, top: spot.y }} data-testid="guide-hand" data-target={target} data-flip={spot.flip || undefined} aria-hidden="true">
      <span className={styles.guideRing} style={{ width: Math.max(spot.width, 48), height: Math.max(spot.width, 48) }} />
      <svg className={styles.guideHand} viewBox="0 0 64 72" focusable="false">
        <path
          d="M10 6c3-3 7-1 8 3l8 22c1-3 5-4 8-3 2 0 4 1 5 3 3-2 7-1 8 2 3-1 6 1 7 4l2 12c1 9-3 17-12 21H29c-5-3-9-8-12-14L5 32c-1-3 1-5 4-4l5 3L8 11c-1-2 0-4 2-5Z"
          fill="#fff"
          stroke="#3a2a1f"
          strokeWidth="3.4"
          strokeLinejoin="round"
        />
        <path d="M30 38v12M38 38v12M46 42v10" stroke="#9b8f84" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      </svg>
      <span className={styles.guideText}>{text}</span>
    </div>
  );
}
