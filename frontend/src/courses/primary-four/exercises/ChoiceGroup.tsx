import styles from "../PrimaryFourLesson.module.css";

interface ChoiceGroupProps<TValue extends string | number> {
  choices: readonly TValue[];
  selected: TValue | null;
  ariaLabel: string;
  onSelect: (value: TValue) => void;
  labelFor?: (value: TValue) => string;
}

// Rangée de boutons à choix unique, réutilisée par tous les exercices à
// choix multiples (mots ↔ chiffres, arrondi, question à choix).
export function ChoiceGroup<TValue extends string | number>({
  choices,
  selected,
  ariaLabel,
  onSelect,
  labelFor,
}: ChoiceGroupProps<TValue>) {
  return (
    <div className={styles.wordsChoices} role="group" aria-label={ariaLabel}>
      {choices.map((value) => (
        <button
          key={value}
          type="button"
          className={selected === value ? styles.selectedChoice : undefined}
          aria-pressed={selected === value}
          onClick={() => onSelect(value)}
        >
          {labelFor ? labelFor(value) : value}
        </button>
      ))}
    </div>
  );
}
