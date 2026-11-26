import { useEffect, useRef } from "react";

import { illustrationUrl } from "../../illustrations/illustrations";
import styles from "./YambaWritingGame.module.css";
import { spinProgress } from "./writing-engine";

interface ReelProps {
  /** Bande d'illustrations ; la gagnante est la dernière. */
  ids: string[];
  running: boolean;
  paused: boolean;
  durationMs: number;
  /** Où la bande se pose quand elle ne tourne pas : sur la première image, ou sur la dernière (la gagnante). */
  settled: "start" | "end";
  /** La gagnante est sortie du rouleau (elle tombe) : sa case reste vide. */
  winnerOut: boolean;
  onTick: () => void;
  onDone: () => void;
}

/** Décalage de la bande, en pourcentage de sa hauteur, pour que l'image `position` soit dans la ligne centrale des trois visibles. */
export function reelOffset(position: number, count: number): number {
  return -((position - 1) / count) * 100;
}

// Rouleau vertical : trois cases visibles, la bande défile vite puis ralentit jusqu'à poser l'image gagnante au centre.
// L'animation est pilotée image par image sur un seul élément (pas de rendu React par image) ; elle se fige quand le jeu est en pause.
export function Reel({ ids, running, paused, durationMs, settled, winnerOut, onTick, onDone }: ReelProps) {
  const stripRef = useRef<HTMLDivElement | null>(null);
  const pausedRef = useRef(paused);
  const callbacks = useRef({ onTick, onDone });
  useEffect(() => {
    pausedRef.current = paused;
    callbacks.current = { onTick, onDone };
  });

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const count = ids.length;
    if (!running) {
      strip.style.transform = `translateY(${reelOffset(settled === "end" ? count - 1 : 0, count)}%)`;
      return;
    }
    let elapsed = 0;
    let last = performance.now();
    let lastIndex = -1;
    let frameId = 0;
    const frame = (now: number) => {
      if (!pausedRef.current) elapsed += now - last;
      last = now;
      const position = spinProgress(elapsed, durationMs) * (count - 1);
      strip.style.transform = `translateY(${reelOffset(position, count)}%)`;
      const index = Math.round(position);
      if (index !== lastIndex) {
        lastIndex = index;
        callbacks.current.onTick();
      }
      if (elapsed < durationMs) frameId = requestAnimationFrame(frame);
      else callbacks.current.onDone();
    };
    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [ids, running, settled, durationMs]);

  return (
    <div className={styles.reelWindow} data-testid="reel-window">
      <div ref={stripRef} className={styles.reelStrip} data-running={running || undefined}>
        {ids.map((id, index) => (
          <div key={`${index}-${id}`} className={styles.reelCell} data-out={(winnerOut && index === ids.length - 1) || undefined}>
            <Picture id={id} className={styles.reelPicture} />
          </div>
        ))}
      </div>
      <span className={styles.reelShade} aria-hidden="true" />
    </div>
  );
}

/** Illustration de la bibliothèque ; absente, un cadre neutre prend sa place (le jeu reste jouable). */
export function Picture({ id, className, alt = "", imgRef }: { id: string; className?: string; alt?: string; imgRef?: React.Ref<HTMLImageElement> }) {
  const url = illustrationUrl(id);
  if (!url) return <span className={`${className ?? ""} ${styles.picturePlaceholder}`} role={alt ? "img" : undefined} aria-label={alt || undefined} />;
  return <img ref={imgRef} className={className} src={url} alt={alt} width={320} height={320} draggable={false} decoding="async" />;
}
