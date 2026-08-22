import type { Exercise, ExerciseWidgetProps } from "./exercise-types";
import { NumberComparator } from "./NumberComparator";
import { NumberInRange } from "./NumberInRange";
import { NumberOrderer } from "./NumberOrderer";
import { NumberWordsMatcher } from "./NumberWordsMatcher";
import { NumericQuestion } from "./NumericQuestion";
import { PlaceValueBuilder } from "./PlaceValueBuilder";
import { RoundToTarget } from "./RoundToTarget";
import { SequenceFiller } from "./SequenceFiller";

export type InteractiveExerciseProps = ExerciseWidgetProps<Exercise>;

// Répartiteur générique : une leçon ne fait jamais référence à un widget
// concret, seulement à un Exercise (voir exercise-types.ts) que ce
// composant sait interpréter. Ajouter un nouveau type d'activité ne
// nécessite qu'une nouvelle branche ici, jamais une nouvelle page de leçon.
export function InteractiveExercise(props: InteractiveExerciseProps) {
  const { exercise } = props;
  switch (exercise.kind) {
    case "place-value-build":
      return <PlaceValueBuilder {...props} exercise={exercise} />;
    case "number-words-match":
      return <NumberWordsMatcher {...props} exercise={exercise} />;
    case "compare-numbers":
      return <NumberComparator {...props} exercise={exercise} />;
    case "sequence-fill":
      return <SequenceFiller {...props} exercise={exercise} />;
    case "number-order":
      return <NumberOrderer {...props} exercise={exercise} />;
    case "round-to-target":
      return <RoundToTarget {...props} exercise={exercise} />;
    case "numeric-question":
      return <NumericQuestion {...props} exercise={exercise} />;
    case "number-in-range":
      return <NumberInRange {...props} exercise={exercise} />;
    default:
      return null;
  }
}
