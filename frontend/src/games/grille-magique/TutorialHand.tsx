import { useEffect, useState, type RefObject } from "react";

import styles from "./GrilleMagiqueGame.module.css";

interface TutorialHandProps {
  /** Élément du jeu qui contient le plateau : la main se place dans son repère. */
  rootRef: RefObject<HTMLElement | null>;
  /** Change à chaque nouvelle indication : la main glisse vers la nouvelle cible. */
  stepKey: string;
  /** Faux : la main s'efface doucement (victoire, tutoriel terminé). */
  active: boolean;
}

// Position du bout du doigt par rapport à la cible : dans le coin bas droit, pour que le corps de la main reste à l'extérieur
// de la tuile et ne cache jamais son nombre.
const TIP_X = 0.8;
const TIP_Y = 0.84;
// Les petites cibles (pastilles de résultat) : le bout du doigt vise leur bord bas, pour laisser le nombre lisible.
const SMALL_TIP_X = 0.82;
const SMALL_TIP_Y = 1.1;

// Main de dessin animé : gant blanc à gros contours. La cible est trouvée dans le jeu lui-même (élément marqué
// data-tutorial-target) à chaque indication et à chaque changement de taille : aucune coordonnée n'est écrite en dur.
export function TutorialHand({ rootRef, stepKey, active }: TutorialHandProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [readyKey, setReadyKey] = useState("");

  // Effet classique (et non de mise en page) : le jeu parent attache son élément après ses enfants, il n’existe pas encore plus tôt.
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !active) {
      return;
    }
    function place() {
      const container = rootRef.current;
      const target = container?.querySelector<HTMLElement>("[data-tutorial-target]");
      if (!container || !target) {
        return;
      }
      const rootRect = container.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      // Tuiles et carte : boutons ; pastilles de résultat : petits éléments en ligne.
      const small = target.tagName !== "BUTTON";
      setPosition({
        x: rect.left - rootRect.left + rect.width * (small ? SMALL_TIP_X : TIP_X),
        y: rect.top - rootRect.top + rect.height * (small ? SMALL_TIP_Y : TIP_Y),
      });
    }
    place();
    window.addEventListener("resize", place);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(place);
    observer?.observe(root);
    return () => {
      window.removeEventListener("resize", place);
      observer?.disconnect();
    };
  }, [rootRef, stepKey, active]);

  // Disparition douce entre deux étapes : la main est effacée tant que l’indication courante n’est pas « installée » (220 ms),
  // le temps de glisser vers la nouvelle cible ; elle réapparaît ensuite.
  useEffect(() => {
    if (!active) {
      return;
    }
    const timeoutId = window.setTimeout(() => setReadyKey(stepKey), 220);
    return () => window.clearTimeout(timeoutId);
  }, [stepKey, active]);
  const shown = active && readyKey === stepKey;

  if (!position) {
    return null;
  }

  return (
    <div
      className={`${styles.hand}${shown ? ` ${styles.handShown}` : ""}`}
      style={{ transform: `translate3d(${position.x}px, ${position.y}px, 0)` }}
      aria-hidden="true"
      data-testid="tutorial-hand"
    >
      <span className={styles.handRing} key={`ring-${stepKey}`} />
      <svg className={styles.handBody} key={`body-${stepKey}`} viewBox="0 0 120 150" focusable="false">
        <defs>
          <linearGradient id="gm-glove" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="0.7" stopColor="#fff3df" />
            <stop offset="1" stopColor="#f2d9b3" />
          </linearGradient>
        </defs>
        <g stroke="#2d1060" strokeWidth="5" strokeLinejoin="round" strokeLinecap="round" fill="url(#gm-glove)">
          {/* Pouce, paume, trois doigts repliés, puis l'index tendu au premier plan. */}
          <ellipse cx="25" cy="92" rx="14" ry="25" transform="rotate(-35 25 92)" />
          <rect x="26" y="58" width="76" height="72" rx="30" />
          <rect x="76" y="62" width="28" height="23" rx="11.5" />
          <rect x="76" y="82" width="28" height="23" rx="11.5" />
          <rect x="74" y="102" width="26" height="22" rx="11" />
          <rect x="44" y="4" width="30" height="88" rx="15" />
          {/* Manchette. */}
          <rect x="32" y="126" width="64" height="18" rx="7" fill="#ffcf3d" />
        </g>
        <path d="M53 22v40" stroke="#e6cfa6" strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <path d="M36 84c5-5 12-6 17-3" stroke="#e6cfa6" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}
