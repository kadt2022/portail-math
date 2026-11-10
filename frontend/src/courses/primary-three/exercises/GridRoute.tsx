import { useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { ExerciseWidgetProps, GridRouteExercise } from "./exercise-types";

type GridRouteProps = ExerciseWidgetProps<GridRouteExercise>;

type Direction = "up" | "down" | "left" | "right";

const MOVES: Record<Direction, readonly [number, number]> = {
  up: [0, 1],
  down: [0, -1],
  left: [-1, 0],
  right: [1, 0],
};

// Plan quadrillé : le point (0, 0) est en bas à gauche, « haut » augmente la
// ligne. L'enfant dessine son itinéraire case par case avec des flèches.
export function GridRoute({ exercise, titleKey, instructionKey, hintKey, strongHintKey, completed, onValidated }: GridRouteProps) {
  const { t } = useTranslation("primaryThree");
  const [position, setPosition] = useState<readonly [number, number]>(completed ? exercise.target : exercise.start);
  const [moves, setMoves] = useState(0);
  const { attempts, registerWrong, reset } = useAttempts();
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);

  const move = (direction: Direction) => {
    const [dx, dy] = MOVES[direction];
    const column = position[0] + dx;
    const row = position[1] + dy;
    if (column < 0 || column >= exercise.columns || row < 0 || row >= exercise.rows) {
      return;
    }
    setPosition([column, row]);
    setMoves((current) => current + 1);
    reset();
  };

  const validate = () => {
    if (position[0] === exercise.target[0] && position[1] === exercise.target[1]) {
      onValidated();
      return;
    }
    registerWrong();
  };

  const directions: readonly Direction[] = ["up", "left", "right", "down"];

  return (
    <ActivityShell titleKey={titleKey} instructionKey={instructionKey} completed={completed} feedback={feedback} onValidate={validate}>
      <p className={styles.targetNumber}>
        {t("exercise.grid.target", { column: exercise.target[0], row: exercise.target[1] })}
      </p>
      <div
        className={styles.routeGrid}
        style={{ gridTemplateColumns: `repeat(${exercise.columns}, minmax(0, 1fr))` }}
        role="img"
        aria-label={t("exercise.grid.position", { column: position[0], row: position[1] })}
      >
        {Array.from({ length: exercise.rows }, (_, reversedRow) => exercise.rows - 1 - reversedRow).flatMap((row) =>
          Array.from({ length: exercise.columns }, (_, column) => {
            const isPawn = position[0] === column && position[1] === row;
            const isTarget = exercise.target[0] === column && exercise.target[1] === row;
            const isStart = exercise.start[0] === column && exercise.start[1] === row;
            return (
              <span
                key={`${column}-${row}`}
                className={isPawn ? styles.routePawn : isTarget ? styles.routeTarget : isStart ? styles.routeStart : undefined}
              />
            );
          }),
        )}
      </div>
      <div className={styles.routeControls}>
        {directions.map((direction) => (
          <button key={direction} type="button" onClick={() => move(direction)}>
            {t(`exercise.grid.${direction}`)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            setPosition(exercise.start);
            setMoves(0);
            reset();
          }}
        >
          {t("exercise.grid.restart")}
        </button>
      </div>
      <strong className={styles.placeValueRepresentation} aria-live="polite">
        {t("exercise.grid.moves", { count: moves })}
      </strong>
    </ActivityShell>
  );
}
