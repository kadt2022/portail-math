import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";

import styles from "./GuideHand.module.css";
import { chooseBubblePlace, isCompactArea, type Box, type Placement } from "./guide-placement";

interface GuideHandProps {
  /** Élément du jeu : la main se place dans son repère. */
  readonly rootRef: RefObject<HTMLElement | null>;
  /** Valeur de l'attribut data-guide de l'élément à montrer : le jeu marque lui-même sa cible. */
  readonly target: string;
  /** Change à chaque geste de l'enfant : la cible marquée a pu passer sur un autre élément, la main la suit. */
  readonly stepKey: string;
  /** Consigne courte, seulement quand le geste a besoin d'être expliqué. */
  readonly text?: string;
}

interface Spot {
  /** Bout du doigt (centre de la cible). */
  x: number;
  y: number;
  /** Zone ciblée, surlignée. */
  target: Box;
  area: { width: number; height: number };
}

// Le bout du doigt vise le centre de la cible.
const TIP_X = 0.5;
const TIP_Y = 0.5;
// Tout ce que l'enfant touche : la consigne ne doit jamais le recouvrir.
const TOUCHABLE = "button, a[href], input, select, textarea, [role='button'], [role='grid'], [role='gridcell'], [data-cell], [data-piece], [data-tray], [data-guide]";

// Main de dessin animé : gant blanc qui clignote et « appuie » sur la cible, dont la zone est surlignée. La cible est trouvée dans le jeu
// lui-même (élément marqué data-guide) à chaque étape, à chaque geste et à chaque changement de taille : aucune coordonnée n'est écrite
// en dur. La consigne se place seule, hors des zones où l'enfant touche (voir guide-placement).
export function GuideHand({ rootRef, target, stepKey, text }: GuideHandProps) {
  const [view, setView] = useState<{ spot: Spot; placement: Placement } | null>(null);
  const layerRef = useRef<HTMLDivElement | null>(null);
  const bubbleRef = useRef<HTMLSpanElement | null>(null);

  // La cible est retrouvée à chaque étape, à chaque geste et à chaque changement de taille ; la consigne cherche sa place : à droite, à
  // gauche, au-dessus, en dessous de la cible, hors des zones touchées ; sinon cartouche fixe. La consigne reste cachée tant qu'elle n'a pas sa place.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const place = () => {
      const element = root.querySelector<HTMLElement>(`[data-guide="${target}"]`);
      if (!element) return setView(null);
      const origin = root.getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      const box = { left: rect.left - origin.left, top: rect.top - origin.top, width: rect.width, height: rect.height };
      const spot: Spot = { x: box.left + box.width * TIP_X, y: box.top + box.height * TIP_Y, target: box, area: { width: origin.width, height: origin.height } };
      setView({ spot, placement: placeBubble(root, layerRef.current, bubbleRef.current, spot) });
    };
    place();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    observer?.observe(root);
    window.addEventListener("resize", place);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", place);
    };
  }, [rootRef, target, stepKey, text]);

  const spot = view?.spot;
  const placement = view?.placement;
  return (
    <div ref={layerRef} className={styles.layer} aria-hidden="true">
      {spot ? (
        <>
          <span className={styles.target} style={{ left: spot.target.left, top: spot.target.top, width: spot.target.width, height: spot.target.height }} />
          <div className={styles.guide} style={{ position: "absolute", left: spot.x, top: spot.y }} data-testid="guide-hand" data-target={target} data-placement={placementName(placement)}>
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
          </div>
        </>
      ) : null}
      {text ? (
        <span ref={bubbleRef} className={styles.text} data-kind={placement?.kind} style={bubbleStyle(placement)}>
          {text}
        </span>
      ) : null}
    </div>
  );
}

function placementName(placement: Placement | undefined): string | undefined {
  if (!placement) return undefined;
  return placement.kind === "float" ? placement.side : placement.at;
}

function bubbleStyle(placement: Placement | undefined): CSSProperties {
  return placement ? { left: placement.left, top: placement.top, width: placement.width || undefined } : { visibility: "hidden" };
}

/** Mesure les zones touchées et la consigne, puis choisit sa place (voir guide-placement). */
function placeBubble(root: HTMLElement, layer: HTMLElement | null, bubble: HTMLElement | null, spot: Spot): Placement {
  if (!bubble || spot.area.width === 0 || spot.area.height === 0) return { kind: "dock", at: "top", left: 0, top: 0, width: 0 };
  const origin = root.getBoundingClientRect();
  const forbidden: Box[] = [];
  for (const element of root.querySelectorAll<HTMLElement>(TOUCHABLE)) {
    if (layer?.contains(element)) continue;
    const rect = element.getBoundingClientRect();
    if (rect.width >= 1 && rect.height >= 1) forbidden.push({ left: rect.left - origin.left, top: rect.top - origin.top, width: rect.width, height: rect.height });
  }
  const handSize = Number.parseFloat(getComputedStyle(root).getPropertyValue("--guide-size")) || 60;
  const hand = { left: spot.x - 8, top: spot.y - 8, width: handSize + 14, height: handSize * 1.12 + 14 };
  const size = (width: number) => {
    bubble.style.width = `${width}px`;
    return { width, height: bubble.offsetHeight };
  };
  const natural = () => {
    bubble.dataset.kind = "dock";
    bubble.style.width = "max-content";
    return bubble.offsetWidth;
  };
  const place = chooseBubblePlace({ area: spot.area, target: spot.target, hand, forbidden, size, natural, compact: isCompactArea(spot.area) });
  bubble.dataset.kind = place.kind;
  return place;
}
