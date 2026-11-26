import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

import styles from "./GuideHand.module.css";

interface GuideHandProps {
  /** Élément du jeu : la main se place dans son repère. */
  rootRef: RefObject<HTMLElement | null>;
  /** Valeur de l'attribut data-guide de l'élément à montrer : le jeu marque lui-même sa cible. */
  target: string;
  /** Change à chaque geste de l'enfant : la cible marquée a pu passer sur un autre élément, la main la suit. */
  stepKey: string;
  /** Bulle explicative, seulement quand le geste a besoin d'être expliqué. */
  text?: string;
}

interface Spot {
  x: number;
  y: number;
  /** Place de la bulle à côté de la main, et côté où elle se range. */
  bubbleWidth: number;
  left: boolean;
  areaHeight: number;
}

// Le bout du doigt vise le centre de la cible.
const TIP_X = 0.5;
const TIP_Y = 0.5;
const BUBBLE_MAX = 190;
const BUBBLE_MIN = 96;
const HAND_GAP = 36;

// Main de dessin animé : gant blanc qui clignote et « appuie » sur la cible. La cible est trouvée dans le jeu lui-même (élément
// marqué data-guide) à chaque étape, à chaque geste et à chaque changement de taille : aucune coordonnée n'est écrite en dur.
export function GuideHand({ rootRef, target, stepKey, text }: GuideHandProps) {
  const [spot, setSpot] = useState<Spot | null>(null);
  const bubbleRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const place = () => {
      const element = root.querySelector<HTMLElement>(`[data-guide="${target}"]`);
      if (!element) return setSpot(null);
      const area = root.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      const x = rect.left - area.left + rect.width * TIP_X;
      const y = rect.top - area.top + rect.height * TIP_Y;
      // La bulle se range du côté où il y a le plus de place, et s'adapte à cette place.
      const left = x > area.width - x;
      const room = (left ? x : area.width - x) - HAND_GAP - 8;
      setSpot({ x, y, left, bubbleWidth: Math.max(BUBBLE_MIN, Math.min(BUBBLE_MAX, room)), areaHeight: area.height });
    };
    place();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    observer?.observe(root);
    window.addEventListener("resize", place);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [rootRef, target, stepKey]);

  // La bulle ne sort jamais du cadre par le bas : si elle est trop haute pour la place restante, elle remonte.
  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    if (!bubble || !spot) return;
    bubble.style.top = `${4 - Math.max(0, spot.y + 4 + bubble.offsetHeight - spot.areaHeight + 6)}px`;
  }, [spot, text]);

  if (!spot) return null;
  return (
    <div className={styles.guide} style={{ position: "absolute", left: spot.x, top: spot.y }} data-testid="guide-hand" data-target={target} data-flip={spot.left || undefined} aria-hidden="true">
      <span className={styles.ring} />
      <svg className={styles.hand} viewBox="0 0 64 72" focusable="false">
        <path
          d="M10 6c3-3 7-1 8 3l8 22c1-3 5-4 8-3 2 0 4 1 5 3 3-2 7-1 8 2 3-1 6 1 7 4l2 12c1 9-3 17-12 21H29c-5-3-9-8-12-14L5 32c-1-3 1-5 4-4l5 3L8 11c-1-2 0-4 2-5Z"
          fill="#fff"
          stroke="#3a2a1f"
          strokeWidth="3.4"
          strokeLinejoin="round"
        />
        <path d="M30 38v12M38 38v12M46 42v10" stroke="#9b8f84" strokeWidth="2.6" strokeLinecap="round" fill="none" />
      </svg>
      {text ? (
        <span ref={bubbleRef} className={styles.text} style={{ width: spot.bubbleWidth, ...(spot.left ? { right: HAND_GAP } : { left: HAND_GAP }) }}>
          {text}
        </span>
      ) : null}
    </div>
  );
}
