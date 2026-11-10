import { ClockSetter } from "./ClockSetter";
import { ColumnCalc } from "./ColumnCalc";
import { EqualGroupsBuilder } from "./EqualGroupsBuilder";
import type { Exercise, ExerciseWidgetProps } from "./exercise-types";
import { FractionShade } from "./FractionShade";
import { GridRoute } from "./GridRoute";
import { MoneyBuilder } from "./MoneyBuilder";
import { NumberComparator } from "./NumberComparator";
import { NumberInRange } from "./NumberInRange";
import { NumberOrderer } from "./NumberOrderer";
import { NumberWordsMatcher } from "./NumberWordsMatcher";
import { NumericQuestion } from "./NumericQuestion";
import { PlaceValueBuilder } from "./PlaceValueBuilder";
import { RoundToTen } from "./RoundToTen";
import { SequenceFiller } from "./SequenceFiller";
import { ShareTokens } from "./ShareTokens";
import { StepOrder } from "./StepOrder";
import { TextChoice } from "./TextChoice";

export type InteractiveExerciseProps = ExerciseWidgetProps<Exercise>;

// Répartiteur générique : une leçon ne fait jamais référence à un widget
// concret, seulement à un Exercise (voir exercise-types.ts) que ce
// composant sait interpréter. Ajouter un nouveau type d'activité ne
// nécessite qu'une nouvelle branche ici, jamais une nouvelle page de leçon.
export function InteractiveExercise(props: InteractiveExerciseProps) {
  // La clé remet à zéro l'état du widget d'un exercice à l'autre : sans elle,
  // deux exercices du même type qui se suivent (deux questions numériques)
  // conserveraient la réponse saisie pour le précédent.
  return <ExerciseWidget key={props.exercise.id} {...props} />;
}

function ExerciseWidget(props: InteractiveExerciseProps) {
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
    case "round-to-ten":
      return <RoundToTen {...props} exercise={exercise} />;
    case "numeric-question":
      return <NumericQuestion {...props} exercise={exercise} />;
    case "number-in-range":
      return <NumberInRange {...props} exercise={exercise} />;
    case "text-choice":
      return <TextChoice {...props} exercise={exercise} />;
    case "equal-groups":
      return <EqualGroupsBuilder {...props} exercise={exercise} />;
    case "share-tokens":
      return <ShareTokens {...props} exercise={exercise} />;
    case "money-build":
      return <MoneyBuilder {...props} exercise={exercise} />;
    case "fraction-shade":
      return <FractionShade {...props} exercise={exercise} />;
    case "clock-set":
      return <ClockSetter {...props} exercise={exercise} />;
    case "grid-route":
      return <GridRoute {...props} exercise={exercise} />;
    case "step-order":
      return <StepOrder {...props} exercise={exercise} />;
    case "column-calc":
      return <ColumnCalc {...props} exercise={exercise} />;
    default:
      return null;
  }
}
