import type { DragEvent } from "react";

import { getLearningObjectDefinition } from "../../../assets/learning-world/catalog";
import type { LearningObjectInstance } from "./learning-world.types";
import styles from "./LearningWorld.module.css";

interface LearningObjectProps {
  instance: LearningObjectInstance;
  label: string;
  selected: boolean;
  onSelect: () => void;
  onDragStart?: (event: DragEvent<HTMLButtonElement>) => void;
}

export function LearningObject({ instance, label, selected, onSelect, onDragStart }: LearningObjectProps) {
  const definition = getLearningObjectDefinition(instance.objectId);

  return (
    <button
      type="button"
      className={selected ? styles.objectSelected : styles.objectButton}
      aria-label={label}
      aria-pressed={selected}
      draggable={Boolean(onDragStart)}
      onClick={onSelect}
      onDragStart={onDragStart}
    >
      <img src={definition.assetUrl} alt="" draggable="false" />
    </button>
  );
}
