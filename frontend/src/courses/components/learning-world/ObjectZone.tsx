import type { DragEvent, ReactNode } from "react";

import styles from "./LearningWorld.module.css";

interface ObjectZoneProps {
  label: string;
  countLabel: string;
  decorationUrl?: string;
  placeLabel: string;
  canPlace: boolean;
  onPlace: () => void;
  onDropObject?: (payload: string) => void;
  children: ReactNode;
  featured?: boolean;
}

const DRAG_FORMAT = "application/x-portail-math-object";

export function setLearningObjectDragData(event: DragEvent<HTMLElement>, payload: string) {
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData(DRAG_FORMAT, payload);
}

export function ObjectZone({
  label,
  countLabel,
  decorationUrl,
  placeLabel,
  canPlace,
  onPlace,
  onDropObject,
  children,
  featured = false,
}: ObjectZoneProps) {
  const acceptDrop = (event: DragEvent<HTMLElement>) => {
    if (!onDropObject) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const drop = (event: DragEvent<HTMLElement>) => {
    if (!onDropObject) return;
    event.preventDefault();
    const payload = event.dataTransfer.getData(DRAG_FORMAT);
    if (payload) onDropObject(payload);
  };

  return (
    <section
      className={`${styles.zone} ${featured ? styles.zoneFeatured : ""}`}
      aria-label={`${label}, ${countLabel}`}
      onDragOver={acceptDrop}
      onDrop={drop}
    >
      <header className={styles.zoneHeader}>
        <h3>{label}</h3>
        <strong>{countLabel}</strong>
      </header>
      {decorationUrl ? <img className={styles.zoneDecoration} src={decorationUrl} alt="" /> : null}
      <div className={styles.zoneObjects}>{children}</div>
      <button type="button" className={styles.placeButton} disabled={!canPlace} onClick={onPlace}>
        {placeLabel}
      </button>
    </section>
  );
}
