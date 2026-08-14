import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { LessonStepKind } from "../course-engine/course-model";
import styles from "./PrimaryTwoLesson.module.css";

interface ActivityProps {
  completed: boolean;
  onValidated: () => void;
}

interface ActivityFrameProps extends ActivityProps {
  title: string;
  instruction: string;
  feedback: string;
  onValidate: () => void;
  children: ReactNode;
}

function ActivityFrame({
  completed,
  title,
  instruction,
  feedback,
  onValidate,
  children,
}: ActivityFrameProps) {
  const { t } = useTranslation("primaryTwo");
  return (
    <section className={styles.activityPanel} aria-labelledby="activity-title">
      <div className={styles.activityHeading}>
        <div>
          <p className={styles.activityEyebrow}>{t("lesson.objectiveLabel")}</p>
          <h2 id="activity-title">{title}</h2>
        </div>
        {completed ? <span className={styles.successBadge}>✓ {t("status.completed")}</span> : null}
      </div>
      <p className={styles.instruction}>{instruction}</p>
      <div className={styles.interactiveZone}>{children}</div>
      <div className={styles.validationRow}>
        <p className={completed ? styles.successMessage : styles.feedback} aria-live="polite">
          {completed ? t("activity.success") : feedback}
        </p>
        {!completed ? (
          <button className={styles.validateButton} type="button" onClick={onValidate}>
            {t("activity.validate")}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function DiscoverActivity({ completed, onValidated }: ActivityProps) {
  const { t } = useTranslation("primaryTwo");
  const [counted, setCounted] = useState<Set<number>>(
    () => new Set(completed ? Array.from({ length: 18 }, (_, index) => index + 1) : []),
  );
  const [feedback, setFeedback] = useState("");

  const countSeed = (number: number) => {
    setCounted((current) => new Set([...current, number]));
    setFeedback("");
  };

  const validate = () => {
    if (counted.size === 18) {
      onValidated();
    } else {
      setFeedback(t("activity.discover.counter", { count: counted.size }));
    }
  };

  return (
    <ActivityFrame
      completed={completed}
      onValidated={onValidated}
      title={t("activity.discover.title")}
      instruction={t("activity.discover.instruction")}
      feedback={feedback}
      onValidate={validate}
    >
      <div className={styles.seedCounter} aria-live="polite">
        {t("activity.discover.counter", { count: counted.size })}
      </div>
      <div className={styles.seedZones}>
        <div className={styles.seedZone}>
          <h3>{t("activity.discover.toCount")}</h3>
          <div className={styles.seedGrid}>
            {Array.from({ length: 18 }, (_, index) => index + 1)
              .filter((number) => !counted.has(number))
              .map((number) => (
                <button
                  key={number}
                  type="button"
                  className={styles.seedButton}
                  aria-label={t("activity.discover.seedLabel", { number })}
                  onClick={() => countSeed(number)}
                >
                  <span aria-hidden="true" />
                </button>
              ))}
          </div>
        </div>
        <div className={`${styles.seedZone} ${styles.countedZone}`}>
          <h3>{t("activity.discover.counted")}</h3>
          <div className={styles.seedGrid}>
            {[...counted].map((number) => (
              <span key={number} className={styles.countedSeed} aria-label={`${number}`} role="img">
                <span aria-hidden="true" />
              </span>
            ))}
          </div>
        </div>
      </div>
    </ActivityFrame>
  );
}

interface NumericControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

function NumericControl({ label, value, min, max, onChange }: NumericControlProps) {
  const { t } = useTranslation("primaryTwo");
  return (
    <div className={styles.numericControl}>
      <span>{label}</span>
      <div>
        <button
          type="button"
          aria-label={t("activity.manipulate.decrease", { label })}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
        >
          −
        </button>
        <output aria-label={label}>{value}</output>
        <button
          type="button"
          aria-label={t("activity.manipulate.increase", { label })}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

function ManipulateActivity({ completed, onValidated }: ActivityProps) {
  const { t } = useTranslation("primaryTwo");
  const [bundles, setBundles] = useState(completed ? 1 : 0);
  const [units, setUnits] = useState(completed ? 7 : 0);
  const [feedback, setFeedback] = useState("");

  const update = (setter: (value: number) => void) => (value: number) => {
    setter(value);
    setFeedback("");
  };

  const validate = () => {
    if (bundles === 1 && units === 7) {
      onValidated();
    } else {
      setFeedback(t("activity.manipulate.hint"));
    }
  };

  return (
    <ActivityFrame
      completed={completed}
      onValidated={onValidated}
      title={t("activity.manipulate.title")}
      instruction={t("activity.manipulate.instruction")}
      feedback={feedback}
      onValidate={validate}
    >
      <div className={styles.stickControls}>
        <NumericControl
          label={t("activity.manipulate.bundles")}
          value={bundles}
          min={0}
          max={2}
          onChange={update(setBundles)}
        />
        <NumericControl
          label={t("activity.manipulate.units")}
          value={units}
          min={0}
          max={9}
          onChange={update(setUnits)}
        />
      </div>
      <div className={styles.stickPreview} aria-live="polite">
        <div className={styles.bundles}>
          {Array.from({ length: bundles }, (_, bundle) => (
            <span key={bundle} className={styles.bundle} aria-hidden="true">
              {Array.from({ length: 10 }, (_, stick) => <i key={stick} />)}
            </span>
          ))}
        </div>
        <div className={styles.units} aria-hidden="true">
          {Array.from({ length: units }, (_, unit) => <i key={unit} />)}
        </div>
        <strong>{t("activity.manipulate.representation", { bundles, units })}</strong>
      </div>
    </ActivityFrame>
  );
}

function UnderstandActivity({ completed, onValidated }: ActivityProps) {
  const { t } = useTranslation("primaryTwo");
  const [answer, setAnswer] = useState(completed ? "move" : "");
  const [feedback, setFeedback] = useState("");
  const options = ["move", "guess", "restart"] as const;

  return (
    <ActivityFrame
      completed={completed}
      onValidated={onValidated}
      title={t("activity.understand.title")}
      instruction={t("activity.understand.instruction")}
      feedback={feedback}
      onValidate={() => {
        if (answer === "move") onValidated();
        else setFeedback(t("activity.understand.hint"));
      }}
    >
      <div className={styles.strategyCards} aria-hidden="true">
        <span>① {t("activity.understand.strategyMove")}</span>
        <span>② {t("activity.understand.strategyTen")}</span>
      </div>
      <fieldset className={styles.choiceList}>
        <legend className={styles.srOnly}>{t("activity.understand.instruction")}</legend>
        {options.map((option) => (
          <label key={option}>
            <input
              type="radio"
              name="understand-strategy"
              value={option}
              checked={answer === option}
              onChange={() => {
                setAnswer(option);
                setFeedback("");
              }}
            />
            <span>{t(`activity.understand.${option}`)}</span>
          </label>
        ))}
      </fieldset>
    </ActivityFrame>
  );
}

function PracticeActivity({ completed, onValidated }: ActivityProps) {
  const { t } = useTranslation("primaryTwo");
  const [dots, setDots] = useState(completed ? "12" : "");
  const [groups, setGroups] = useState(completed ? "3" : "");
  const [found, setFound] = useState(completed ? "16" : "");
  const [feedback, setFeedback] = useState("");
  const groupCount = Math.max(0, Math.min(5, Number(groups) || 0));

  const answerField = (label: string, value: string, setValue: (value: string) => void) => (
    <label className={styles.practiceQuestion}>
      <span>{label}</span>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        aria-label={`${label} ${t("activity.practice.answer")}`}
        onChange={(event) => {
          setValue(event.target.value);
          setFeedback("");
        }}
      />
    </label>
  );

  return (
    <ActivityFrame
      completed={completed}
      onValidated={onValidated}
      title={t("activity.practice.title")}
      instruction={t("activity.practice.instruction")}
      feedback={feedback}
      onValidate={() => {
        if (dots === "12" && groups === "3" && found === "16") onValidated();
        else setFeedback(t("activity.practice.hint"));
      }}
    >
      <div className={styles.practiceGrid}>
        <div className={styles.practiceCard}>
          <div className={styles.dotRows} aria-hidden="true">
            {Array.from({ length: 12 }, (_, dot) => <i key={dot} />)}
          </div>
          {answerField(t("activity.practice.dots"), dots, setDots)}
        </div>
        <div className={styles.practiceCard}>
          <div className={styles.groupPreview} aria-hidden="true">
            {Array.from({ length: groupCount }, (_, group) => (
              <span key={group}>{Array.from({ length: 5 }, (_, dot) => <i key={dot} />)}</span>
            ))}
          </div>
          {answerField(t("activity.practice.groups"), groups, setGroups)}
        </div>
        <div className={styles.practiceCard}>
          <div className={styles.foundPreview} aria-hidden="true">14 + 2</div>
          {answerField(t("activity.practice.found"), found, setFound)}
        </div>
      </div>
    </ActivityFrame>
  );
}

const PATH_SLOTS = [
  { target: 4, before: 3, after: 5 },
  { target: 8, before: 7, after: 9 },
  { target: 13, before: 12, after: 14 },
  { target: 19, before: 18, after: 20 },
] as const;
const CARDS = [13, 4, 19, 8] as const;

function PlayActivity({ completed, onValidated }: ActivityProps) {
  const { t } = useTranslation("primaryTwo");
  const [selected, setSelected] = useState<number | null>(null);
  const [placements, setPlacements] = useState<Record<number, number>>(
    () => completed ? Object.fromEntries(PATH_SLOTS.map((slot) => [slot.target, slot.target])) : {},
  );
  const [feedback, setFeedback] = useState("");
  const placedCards = new Set(Object.values(placements));

  const chooseSlot = (target: number) => {
    if (selected !== null) {
      setPlacements((current) => ({ ...current, [target]: selected }));
      setSelected(null);
      setFeedback("");
      return;
    }
    if (placements[target] !== undefined) {
      setSelected(placements[target]);
      setPlacements((current) => {
        const next = { ...current };
        delete next[target];
        return next;
      });
    }
  };

  return (
    <ActivityFrame
      completed={completed}
      onValidated={onValidated}
      title={t("activity.play.title")}
      instruction={t("activity.play.instruction")}
      feedback={feedback || (selected !== null ? t("activity.play.selected", { number: selected }) : "")}
      onValidate={() => {
        if (PATH_SLOTS.every((slot) => placements[slot.target] === slot.target)) onValidated();
        else setFeedback(t("activity.play.hint"));
      }}
    >
      <div className={styles.numberCards} aria-label={t("activity.play.cards")}>
        {CARDS.filter((card) => !placedCards.has(card)).map((card) => (
          <button
            type="button"
            key={card}
            className={selected === card ? styles.selectedCard : undefined}
            aria-pressed={selected === card}
            aria-label={t("activity.play.selectCard", { number: card })}
            onClick={() => {
              setSelected(card);
              setFeedback("");
            }}
          >
            {card}
          </button>
        ))}
      </div>
      <div className={styles.numberPath} aria-label={t("activity.play.path")}>
        {PATH_SLOTS.map((slot) => {
          const placed = placements[slot.target];
          return (
            <div className={styles.pathSegment} key={slot.target}>
              <span>{slot.before}</span>
              <button
                type="button"
                onClick={() => chooseSlot(slot.target)}
                aria-label={
                  placed === undefined
                    ? t("activity.play.slot", slot)
                    : t("activity.play.placed", { ...slot, number: placed })
                }
              >
                {placed ?? "?"}
              </button>
              <span>{slot.after}</span>
            </div>
          );
        })}
      </div>
    </ActivityFrame>
  );
}

function RememberActivity({ completed, onValidated }: ActivityProps) {
  const { t } = useTranslation("primaryTwo");
  const [answer, setAnswer] = useState(completed ? "move" : "");
  const [feedback, setFeedback] = useState("");
  const options = ["move", "leave", "double"] as const;

  return (
    <ActivityFrame
      completed={completed}
      onValidated={onValidated}
      title={t("activity.remember.title")}
      instruction={t("activity.remember.question")}
      feedback={feedback}
      onValidate={() => {
        if (answer === "move") onValidated();
        else setFeedback(t("activity.remember.hint"));
      }}
    >
      <blockquote className={styles.rule}>{t("activity.remember.rule")}</blockquote>
      <fieldset className={styles.choiceList}>
        <legend className={styles.srOnly}>{t("activity.remember.question")}</legend>
        {options.map((option) => (
          <label key={option}>
            <input
              type="radio"
              name="remember-check"
              value={option}
              checked={answer === option}
              onChange={() => {
                setAnswer(option);
                setFeedback("");
              }}
            />
            <span>{t(`activity.remember.${option}`)}</span>
          </label>
        ))}
      </fieldset>
    </ActivityFrame>
  );
}

export function PrimaryTwoLessonActivity({
  kind,
  completed,
  onValidated,
}: ActivityProps & { kind: LessonStepKind }) {
  const props = { completed, onValidated };
  switch (kind) {
    case "discover": return <DiscoverActivity {...props} />;
    case "manipulate": return <ManipulateActivity {...props} />;
    case "understand": return <UnderstandActivity {...props} />;
    case "practice": return <PracticeActivity {...props} />;
    case "play": return <PlayActivity {...props} />;
    case "remember": return <RememberActivity {...props} />;
  }
}
