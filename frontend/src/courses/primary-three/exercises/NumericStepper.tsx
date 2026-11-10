import styles from "../PrimaryThreeLesson.module.css";

interface NumericStepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  decreaseLabel: string;
  increaseLabel: string;
  onChange: (value: number) => void;
  step?: number;
}

export function NumericStepper({
  label,
  value,
  min,
  max,
  decreaseLabel,
  increaseLabel,
  onChange,
  step = 1,
}: NumericStepperProps) {
  return (
    <div className={styles.numericControl}>
      <span>{label}</span>
      <div>
        <button
          type="button"
          aria-label={decreaseLabel}
          disabled={value <= min}
          onClick={() => onChange(value - step)}
        >
          −
        </button>
        <output aria-label={label}>{value}</output>
        <button
          type="button"
          aria-label={increaseLabel}
          disabled={value >= max}
          onClick={() => onChange(value + step)}
        >
          +
        </button>
      </div>
    </div>
  );
}
