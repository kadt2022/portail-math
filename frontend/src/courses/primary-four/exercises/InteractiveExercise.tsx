import { useTranslation } from "react-i18next";

import { NumberComparator } from "../../components/exercise-kit/NumberComparator";
import { NumberInRange } from "../../components/exercise-kit/NumberInRange";
import { NumberOrderer } from "../../components/exercise-kit/NumberOrderer";
import { NumberWordsMatcher } from "../../components/exercise-kit/NumberWordsMatcher";
import { NumericQuestion } from "../../components/exercise-kit/NumericQuestion";
import { SequenceFiller } from "../../components/exercise-kit/SequenceFiller";
import { formatNumber, numberToWordsEn, numberToWordsFr } from "../number-words";
import type { Exercise, ExerciseWidgetProps } from "./exercise-types";
import { PlaceValueBuilder } from "./PlaceValueBuilder";
import { RoundToTarget } from "./RoundToTarget";

export type InteractiveExerciseProps = ExerciseWidgetProps<Exercise>;

// Répartiteur générique : une leçon ne fait jamais référence à un widget
// concret, seulement à un Exercise (voir exercise-types.ts) que ce
// composant sait interpréter. Les formes propres à la 4e primaire
// (valeur de position à 5 rangs, arrondi à rang variable) sont rendues par
// des widgets locaux ; les formes communes viennent du kit d'exercices
// partagé (voir ../../components/exercise-kit/), auquel on fournit le
// formatage des nombres et l'écriture en toutes lettres propres à ce cours.
export function InteractiveExercise(props: InteractiveExerciseProps) {
  const { exercise } = props;
  const { i18n } = useTranslation("primaryFour");
  const format = (value: number) => formatNumber(value, i18n.language);
  const wordsOf = (i18n.resolvedLanguage ?? i18n.language).startsWith("en") ? numberToWordsEn : numberToWordsFr;

  switch (exercise.kind) {
    case "place-value-build":
      return <PlaceValueBuilder {...props} exercise={exercise} />;
    case "round-to-target":
      return <RoundToTarget {...props} exercise={exercise} />;
    case "number-words-match":
      return <NumberWordsMatcher {...props} exercise={exercise} namespace="primaryFour" formatNumber={format} wordsOf={wordsOf} />;
    case "compare-numbers":
      return <NumberComparator {...props} exercise={exercise} namespace="primaryFour" formatNumber={format} />;
    case "sequence-fill":
      return <SequenceFiller {...props} exercise={exercise} namespace="primaryFour" formatNumber={format} />;
    case "number-order":
      return <NumberOrderer {...props} exercise={exercise} namespace="primaryFour" formatNumber={format} />;
    case "numeric-question":
      return <NumericQuestion {...props} exercise={exercise} namespace="primaryFour" formatNumber={format} />;
    case "number-in-range":
      return <NumberInRange {...props} exercise={exercise} namespace="primaryFour" formatNumber={format} />;
    default:
      return null;
  }
}
