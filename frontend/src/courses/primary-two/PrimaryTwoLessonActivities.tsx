import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import type { LessonStepKind } from "../course-engine/course-model";
import orangesImage from "../../assets/math-2p/u01-l03-oranges.webp";
import bananaImage from "../../assets/math-2p/banana-single.webp";
import emptyBasketImage from "../../assets/math-2p/basket-empty.webp";
import toyBusesImage from "../../assets/math-2p/u01-l04-toy-buses.webp";
import styles from "./PrimaryTwoLesson.module.css";

interface ActivityProps {
  completed: boolean;
  onValidated: () => void;
}

interface LessonActivityProps extends ActivityProps {
  lessonId?: string;
}

interface ActivityFrameProps extends ActivityProps {
  title: string;
  instruction: string;
  feedback: string;
  onValidate: () => void;
  children: ReactNode;
}

export function ActivityFrame({
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

  const placeCard = (target: number, card: number) => {
    if (!CARDS.includes(card as typeof CARDS[number])) return;
    setPlacements((current) => ({ ...current, [target]: card }));
    setSelected(null);
    setFeedback("");
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
            draggable
            className={selected === card ? styles.selectedCard : undefined}
            aria-pressed={selected === card}
            aria-label={t("activity.play.selectCard", { number: card })}
            onClick={() => {
              setSelected(card);
              setFeedback("");
            }}
            onDragStart={(event) => {
              event.dataTransfer.setData("text/plain", String(card));
              event.dataTransfer.effectAllowed = "move";
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
              <div className={styles.streetHouse}>
                <span className={styles.streetHouseNumber}>{slot.before}</span>
              </div>
              <button
                type="button"
                className={styles.streetHouseSlot}
                onClick={() => chooseSlot(slot.target)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  placeCard(slot.target, Number(event.dataTransfer.getData("text/plain")));
                }}
                aria-label={
                  placed === undefined
                    ? t("activity.play.slot", slot)
                    : t("activity.play.placed", { ...slot, number: placed })
                }
              >
                {placed ?? "?"}
              </button>
              <div className={styles.streetHouse}>
                <span className={styles.streetHouseNumber}>{slot.after}</span>
              </div>
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

const LESSON_TWO_ID = "MATH-2P-U01-L02";
const LESSON_THREE_ID = "MATH-2P-U01-L03";
const LESSON_FOUR_ID = "MATH-2P-U01-L04";

function LessonTwoActivity({ kind, completed, onValidated }: LessonActivityProps & { kind: LessonStepKind }) {
  const { t } = useTranslation("primaryTwo");
  const [answer, setAnswer] = useState(
    completed
      ? kind === "practice" ? "14|18|10" : kind === "remember" ? "after" : kind === "understand" ? "between" : "10"
      : "",
  );
  const [sequence, setSequence] = useState<number[]>(completed ? [6, 7, 8, 9, 10, 11, 12] : []);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [placements, setPlacements] = useState<number[]>(completed ? [13, 16, 19] : []);
  const [feedback, setFeedback] = useState("");

  const validate = (valid: boolean) => {
    if (valid) onValidated();
    else setFeedback(t(`activity.lessonTwo.${kind}.hint`));
  };

  if (kind === "discover") {
    return (
      <ActivityFrame
        completed={completed}
        onValidated={onValidated}
        title={t("activity.lessonTwo.discover.title")}
        instruction={t("activity.lessonTwo.discover.instruction")}
        feedback={feedback}
        onValidate={() => validate(answer === "10")}
      >
        <div className={styles.houseRow} aria-label={t("activity.lessonTwo.discover.rowLabel")}>
          {[8, 9, null, 11].map((number, index) => (
            <div className={styles.house} key={index}>
              <span aria-hidden="true">⌂</span>
              <strong>{number ?? (answer || "?")}</strong>
            </div>
          ))}
        </div>
        <div className={styles.numberCards}>
          {[8, 9, 10, 11].map((number) => (
            <button
              type="button"
              key={number}
              className={answer === String(number) ? styles.selectedCard : undefined}
              aria-pressed={answer === String(number)}
              onClick={() => { setAnswer(String(number)); setFeedback(""); }}
            >
              {number}
            </button>
          ))}
        </div>
      </ActivityFrame>
    );
  }

  if (kind === "manipulate") {
    const next = sequence.length + 6;
    return (
      <ActivityFrame
        completed={completed}
        onValidated={onValidated}
        title={t("activity.lessonTwo.manipulate.title")}
        instruction={t("activity.lessonTwo.manipulate.instruction")}
        feedback={feedback}
        onValidate={() => validate(sequence.join(",") === "6,7,8,9,10,11,12")}
      >
        <div className={styles.numberLine} aria-label={t("activity.lessonTwo.manipulate.lineLabel")}>
          {Array.from({ length: 7 }, (_, index) => 6 + index).map((number) => (
            <button
              type="button"
              key={number}
              disabled={sequence.includes(number)}
              className={sequence.includes(number) ? styles.numberLineDone : undefined}
              onClick={() => {
                if (number === next) { setSequence((current) => [...current, number]); setFeedback(""); }
                else setFeedback(t("activity.lessonTwo.manipulate.orderHint", { number: next }));
              }}
            >
              {number}
            </button>
          ))}
        </div>
        <p className={styles.sequenceReadout} aria-live="polite">
          {sequence.length ? sequence.join(" - ") : t("activity.lessonTwo.manipulate.empty")}
        </p>
      </ActivityFrame>
    );
  }

  if (kind === "understand") {
    const options = ["before", "after", "between"] as const;
    return (
      <ActivityFrame
        completed={completed}
        onValidated={onValidated}
        title={t("activity.lessonTwo.understand.title")}
        instruction={t("activity.lessonTwo.understand.instruction")}
        feedback={feedback}
        onValidate={() => validate(answer === "between")}
      >
        <div className={styles.numberPrompt} aria-hidden="true">9 &nbsp; ? &nbsp; 11</div>
        <fieldset className={styles.choiceList}>
          <legend className={styles.srOnly}>{t("activity.lessonTwo.understand.instruction")}</legend>
          {options.map((option) => (
            <label key={option}>
              <input
                type="radio"
                name="lesson-two-relation"
                value={option}
                checked={answer === option}
                onChange={() => { setAnswer(option); setFeedback(""); }}
              />
              <span>{t(`activity.lessonTwo.understand.${option}`)}</span>
            </label>
          ))}
        </fieldset>
      </ActivityFrame>
    );
  }

  if (kind === "practice") {
    const fields = [
      ["after", "14"],
      ["missing", "18"],
      ["between", "10"],
    ] as const;
    return (
      <ActivityFrame
        completed={completed}
        onValidated={onValidated}
        title={t("activity.lessonTwo.practice.title")}
        instruction={t("activity.lessonTwo.practice.instruction")}
        feedback={feedback}
        onValidate={() => validate(answer === "14|18|10")}
      >
        <div className={styles.practiceGrid}>
          {fields.map(([field, expected]) => (
            <label className={styles.practiceCard} key={field}>
              <span>{t(`activity.lessonTwo.practice.${field}`)}</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label={t(`activity.lessonTwo.practice.${field}`)}
                value={answer.split("|")[fields.findIndex(([key]) => key === field)] ?? ""}
                onChange={(event) => {
                  const values = answer ? answer.split("|") : ["", "", ""];
                  values[fields.findIndex(([key]) => key === field)] = event.target.value;
                  setAnswer(values.join("|"));
                  setFeedback("");
                }}
              />
              <span className={styles.srOnly}>{expected}</span>
            </label>
          ))}
        </div>
      </ActivityFrame>
    );
  }

  if (kind === "play") {
    const slots = [
      { before: 12, target: 13, after: 14 },
      { before: 15, target: 16, after: 17 },
      { before: 18, target: 19, after: 20 },
    ] as const;
    const cards = [13, 16, 19] as const;
    return (
      <ActivityFrame
        completed={completed}
        onValidated={onValidated}
        title={t("activity.lessonTwo.play.title")}
        instruction={t("activity.lessonTwo.play.instruction")}
        feedback={feedback}
        onValidate={() => validate(placements.join(",") === "13,16,19")}
      >
        <div className={styles.numberCards} aria-label={t("activity.lessonTwo.play.cards")}>
          {cards.filter((card) => !placements.includes(card)).map((card) => (
            <button type="button" key={card} className={selectedCard === card ? styles.selectedCard : undefined} onClick={() => setSelectedCard(card)}>{card}</button>
          ))}
        </div>
        <div className={styles.numberPath}>
          {slots.map((slot, index) => (
            <div className={styles.pathSegment} key={slot.target}>
              <span>{slot.before}</span>
              <button
                type="button"
                aria-label={t("activity.lessonTwo.play.slot", slot)}
                onClick={() => {
                  if (selectedCard !== null) {
                    setPlacements((current) => {
                      const next = [...current];
                      next[index] = selectedCard;
                      return next;
                    });
                    setSelectedCard(null);
                  } else if (placements[index] !== undefined) {
                    // Sans carte choisie, toucher une case occupée rend sa carte à la banque.
                    setPlacements((current) => current.map((card, position) => (position === index ? undefined : card)) as number[]);
                  }
                  setFeedback("");
                }}
              >{placements[index] ?? "?"}</button>
              <span>{slot.after}</span>
            </div>
          ))}
        </div>
      </ActivityFrame>
    );
  }

  const rememberAnswer = answer === "after";
  return (
    <ActivityFrame
      completed={completed}
      onValidated={onValidated}
      title={t("activity.lessonTwo.remember.title")}
      instruction={t("activity.lessonTwo.remember.instruction")}
      feedback={feedback}
      onValidate={() => validate(rememberAnswer)}
    >
      <div className={styles.numberPrompt} aria-label={t("activity.lessonTwo.remember.promptLabel")}>8 &nbsp;→&nbsp; ?</div>
      <fieldset className={styles.choiceList}>
        <legend className={styles.srOnly}>{t("activity.lessonTwo.remember.instruction")}</legend>
        {(["before", "after", "random"] as const).map((option) => (
          <label key={option}>
            <input type="radio" name="lesson-two-remember" value={option} checked={answer === option} onChange={() => { setAnswer(option); setFeedback(""); }} />
            <span>{t(`activity.lessonTwo.remember.${option}`)}</span>
          </label>
        ))}
      </fieldset>
    </ActivityFrame>
  );
}

function LessonThreeActivity({ kind, completed, onValidated }: LessonActivityProps & { kind: LessonStepKind }) {
  const { t } = useTranslation("primaryTwo");
  const [answer, setAnswer] = useState(
    completed
      ? kind === "discover" || kind === "play"
        ? "left"
        : kind === "manipulate"
          ? "<"
          : kind === "understand" || kind === "remember"
            ? "tens"
            : "done"
      : "",
  );
  const [feedback, setFeedback] = useState("");
  const validate = (valid: boolean) => valid ? onValidated() : setFeedback(t(`activity.lessonThree.${kind}.hint`));
  const chooseBasket = (basket: "left" | "right") => { setAnswer(basket); setFeedback(""); };

  if (kind === "discover" || kind === "play") {
    return (
      <ActivityFrame
        completed={completed}
        onValidated={onValidated}
        title={t(`activity.lessonThree.${kind}.title`)}
        instruction={t(`activity.lessonThree.${kind}.instruction`)}
        feedback={feedback}
        onValidate={() => validate(answer === "left")}
      >
        <div className={styles.realWorldScene}>
          <img className={styles.realWorldImage} src={orangesImage} alt={t("activity.lessonThree.imageAlt")} />
          <div className={styles.imageHotspots} aria-label={t("activity.lessonThree.imageChoices")}>
            <button type="button" className={answer === "left" ? styles.imageHotspotSelected : styles.imageHotspot} aria-label={t("activity.lessonThree.leftBasket")} onClick={() => chooseBasket("left")} />
            <button type="button" className={answer === "right" ? styles.imageHotspotSelected : styles.imageHotspot} aria-label={t("activity.lessonThree.rightBasket")} onClick={() => chooseBasket("right")} />
          </div>
        </div>
        <div className={styles.comparisonChoices}>
          <button type="button" className={answer === "left" ? styles.comparisonChoiceSelected : undefined} aria-pressed={answer === "left"} onClick={() => chooseBasket("left")}>
            <span aria-hidden="true">{answer === "left" ? "✓" : ""}</span>
            {t("activity.lessonThree.leftBasket")}
          </button>
          <button type="button" className={answer === "right" ? styles.comparisonChoiceSelected : undefined} aria-pressed={answer === "right"} onClick={() => chooseBasket("right")}>
            <span aria-hidden="true">{answer === "right" ? "✓" : ""}</span>
            {t("activity.lessonThree.rightBasket")}
          </button>
        </div>
      </ActivityFrame>
    );
  }

  if (kind === "manipulate") {
    return (
      <ActivityFrame
        completed={completed}
        onValidated={onValidated}
        title={t("activity.lessonThree.manipulate.title")}
        instruction={t("activity.lessonThree.manipulate.instruction")}
        feedback={feedback}
        onValidate={() => validate(answer === "<")}
      >
        <div className={styles.numberPrompt}>12 &nbsp; ? &nbsp; 16</div>
        <div className={styles.symbolChoices}>
          {(["=", "<", ">"] as const).map((symbol) => (
            <button
              type="button"
              key={symbol}
              className={answer === symbol ? styles.symbolSelected : undefined}
              aria-pressed={answer === symbol}
              onClick={() => { setAnswer(symbol); setFeedback(""); }}
            >
              {symbol}
            </button>
          ))}
        </div>
      </ActivityFrame>
    );
  }

  if (kind === "understand") {
    return (
      <ActivityFrame
        completed={completed}
        onValidated={onValidated}
        title={t("activity.lessonThree.understand.title")}
        instruction={t("activity.lessonThree.understand.instruction")}
        feedback={feedback}
        onValidate={() => validate(answer === "tens")}
      >
        <div className={styles.numberPrompt}>14 &nbsp; ? &nbsp; 9</div>
        <div className={styles.choiceList}>
          {(["tens", "guess", "shape"] as const).map((option) => (
            <label key={option}>
              <input type="radio" name="lesson-three-strategy" checked={answer === option} onChange={() => { setAnswer(option); setFeedback(""); }} />
              <span>{t(`activity.lessonThree.understand.${option}`)}</span>
            </label>
          ))}
        </div>
      </ActivityFrame>
    );
  }

  if (kind === "practice") {
    const questions = ["18 = 18", "7 < 15", "10 < 12 < 14"];
    return (
      <ActivityFrame
        completed={completed}
        onValidated={onValidated}
        title={t("activity.lessonThree.practice.title")}
        instruction={t("activity.lessonThree.practice.instruction")}
        feedback={feedback}
        onValidate={() => validate(answer === "done")}
      >
        <div className={styles.practiceGrid}>
          {questions.map((question) => <div className={styles.practiceCard} key={question}><strong className={styles.numberPrompt}>{question}</strong><span>{t("activity.lessonThree.practice.check")}</span></div>)}
        </div>
        <button type="button" className={styles.inlineAction} onClick={() => { setAnswer("done"); setFeedback(""); }}>{t("activity.lessonThree.practice.action")}</button>
      </ActivityFrame>
    );
  }

  return (
    <ActivityFrame
      completed={completed}
      onValidated={onValidated}
      title={t("activity.lessonThree.remember.title")}
      instruction={t("activity.lessonThree.remember.instruction")}
      feedback={feedback}
      onValidate={() => validate(answer === "tens")}
    >
      <div className={styles.choiceList}>
        {(["tens", "random", "color"] as const).map((option) => (
          <label key={option}>
            <input type="radio" name="lesson-three-remember" checked={answer === option} onChange={() => { setAnswer(option); setFeedback(""); }} />
            <span>{t(`activity.lessonThree.remember.${option}`)}</span>
          </label>
        ))}
      </div>
    </ActivityFrame>
  );
}

const L04_ORDERS = {
  discover: [5, 9, 12, 17],
  manipulate: [5, 9, 12, 17],
  practice: [2, 7, 8, 10],
  play: [10, 14, 19, 20],
} as const;

function LessonFourScene({
  image,
  alt,
  numbers,
  selected,
  onChoose,
  variant,
}: {
  image: string;
  alt: string;
  numbers: readonly number[];
  selected: readonly number[];
  onChoose: (number: number) => void;
  variant: "buses" | "market";
}) {
  return (
    <div className={styles.numberedRealWorldScene}>
      <img className={styles.realWorldImage} src={image} alt={alt} />
      <div className={variant === "market" ? styles.marketNumberOverlay : styles.busNumberOverlay}>
        {numbers.map((number) => (
          <button
            type="button"
            key={number}
            aria-pressed={selected.includes(number)}
            className={selected.includes(number) ? styles.realWorldNumberSelected : styles.realWorldNumber}
            onClick={() => onChoose(number)}
          >
            {number}
          </button>
        ))}
      </div>
    </div>
  );
}

function BananaBasket({ count }: { count: number }) {
  return (
    <span className={styles.bananaBasketVisual} aria-hidden="true">
      <img className={styles.emptyBasketImage} src={emptyBasketImage} alt="" />
      <span className={styles.bananaLayer}>
        {Array.from({ length: count }, (_, index) => <img src={bananaImage} alt="" key={index} />)}
      </span>
    </span>
  );
}

function LessonFourActivity({ kind, completed, onValidated }: LessonActivityProps & { kind: LessonStepKind }) {
  const { t } = useTranslation("primaryTwo");
  const completedOrder = kind === "discover" ? [5] : kind === "practice" ? [...L04_ORDERS.practice] : kind === "play" ? [...L04_ORDERS.play] : [...L04_ORDERS.manipulate];
  const [order, setOrder] = useState<number[]>(completed ? completedOrder : []);
  const [answer, setAnswer] = useState(completed ? "smallest" : "");
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");

  const validateOrder = (expected: readonly number[]) => {
    if (order.join(",") === expected.join(",")) onValidated();
    else setFeedback(t(`activity.lessonFour.${kind}.hint`));
  };

  const chooseInOrder = (number: number, expected: readonly number[]) => {
    if (order.includes(number)) return;
    const next = expected[order.length];
    if (number === next) {
      setOrder((current) => [...current, number]);
      setFeedback("");
    } else {
      setFeedback(t("activity.lessonFour.orderHint", { number: next }));
    }
  };

  if (kind === "discover") {
    const numbers = [17, 5, 12, 9] as const;
    return (
      <ActivityFrame
        completed={completed}
        onValidated={onValidated}
        title={t("activity.lessonFour.discover.title")}
        instruction={t("activity.lessonFour.discover.instruction")}
        feedback={feedback}
        onValidate={() => validateOrder([5])}
      >
        <LessonFourScene image={toyBusesImage} alt={t("activity.lessonFour.busAlt")} numbers={numbers} selected={order} variant="buses" onChoose={(number) => { setOrder([number]); setFeedback(""); }} />
      </ActivityFrame>
    );
  }

  if (kind === "manipulate") {
    const shuffled = [17, 5, 12, 9] as const;
    const placeNumber = (index: number, number: number) => {
      setOrder((current) => {
        const next = [...current];
        const previousIndex = next.indexOf(number);
        if (previousIndex >= 0) next[previousIndex] = 0;
        next[index] = number;
        return next;
      });
      setSelectedNumber(null);
      setFeedback("");
    };
    return (
      <ActivityFrame
        completed={completed}
        onValidated={onValidated}
        title={t("activity.lessonFour.manipulate.title")}
        instruction={t("activity.lessonFour.manipulate.instruction")}
        feedback={feedback}
        onValidate={() => validateOrder(L04_ORDERS.manipulate)}
      >
        <div className={styles.sortWorkspace}>
          <div className={styles.sortCards} aria-label={t("activity.lessonFour.manipulate.cardsLabel")}>
            {shuffled.filter((number) => !order.includes(number)).map((number) => (
              <button
                type="button"
                key={number}
                draggable
                aria-pressed={selectedNumber === number}
                className={selectedNumber === number ? styles.dragCardSelected : styles.dragCard}
                onDragStart={(event) => event.dataTransfer.setData("text/plain", String(number))}
                onClick={() => setSelectedNumber(number)}
              >
                {number}
              </button>
            ))}
          </div>
          <div className={styles.dropSlots} aria-label={t("activity.lessonFour.manipulate.slotsLabel")}>
            {L04_ORDERS.manipulate.map((_, index) => {
              const placed = order[index];
              return (
                <button
                  type="button"
                  key={index}
                  className={placed ? styles.dropSlotFilled : styles.dropSlot}
                  aria-label={t(placed ? "activity.lessonFour.manipulate.filledSlot" : "activity.lessonFour.manipulate.emptySlot", { position: index + 1, number: placed })}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const number = Number(event.dataTransfer.getData("text/plain"));
                    if (shuffled.some((value) => value === number)) placeNumber(index, number);
                  }}
                  onClick={() => {
                    if (selectedNumber !== null) placeNumber(index, selectedNumber);
                    else if (placed) {
                      setOrder((current) => current.map((value, slot) => slot === index ? 0 : value));
                      setSelectedNumber(placed);
                    }
                  }}
                >
                  <small>{index + 1}</small>
                  <strong>{placed || "?"}</strong>
                </button>
              );
            })}
          </div>
        </div>
      </ActivityFrame>
    );
  }

  if (kind === "understand" || kind === "remember") {
    const options = kind === "understand" ? ["smallest", "largest", "random"] as const : ["smallest", "color", "random"] as const;
    return (
      <ActivityFrame
        completed={completed}
        onValidated={onValidated}
        title={t(`activity.lessonFour.${kind}.title`)}
        instruction={t(`activity.lessonFour.${kind}.instruction`)}
        feedback={feedback}
        onValidate={() => answer === "smallest" ? onValidated() : setFeedback(t(`activity.lessonFour.${kind}.hint`))}
      >
        <fieldset className={styles.choiceList}>
          <legend className={styles.srOnly}>{t(`activity.lessonFour.${kind}.instruction`)}</legend>
          {options.map((option) => (
            <label key={option}>
              <input type="radio" name={`lesson-four-${kind}`} checked={answer === option} onChange={() => { setAnswer(option); setFeedback(""); }} />
              <span>{t(`activity.lessonFour.${kind}.${option}`)}</span>
            </label>
          ))}
        </fieldset>
      </ActivityFrame>
    );
  }

  if (kind === "practice") {
    const basketCounts = [2, 8, 10, 7] as const;
    const destinations = L04_ORDERS.practice;
    const placeBasket = (index: number, count: number) => {
      setOrder((current) => {
        const next = [...current];
        const previousIndex = next.indexOf(count);
        if (previousIndex >= 0) next[previousIndex] = 0;
        next[index] = count;
        return next;
      });
      setSelectedNumber(null);
      setFeedback("");
    };
    return (
      <ActivityFrame
        completed={completed}
        onValidated={onValidated}
        title={t("activity.lessonFour.practice.title")}
        instruction={t("activity.lessonFour.practice.instruction")}
        feedback={feedback}
        onValidate={() => validateOrder(destinations)}
      >
        <div className={styles.bananaBasketGrid} aria-label={t("activity.lessonFour.practice.basketsLabel")}>
          {basketCounts.filter((count) => !order.includes(count)).map((count) => (
            <button
              type="button"
              key={count}
              draggable
              aria-label={t("activity.lessonFour.practice.basketLabel", { count })}
              aria-pressed={selectedNumber === count}
              className={selectedNumber === count ? styles.bananaBasketSelected : styles.bananaBasketCard}
              onDragStart={(event) => event.dataTransfer.setData("text/plain", String(count))}
              onClick={() => setSelectedNumber(count)}
            >
              <BananaBasket count={count} />
            </button>
          ))}
        </div>
        <div className={styles.bananaDropSlots} aria-label={t("activity.lessonFour.practice.destinationsLabel")}>
          {destinations.map((destination, index) => {
            const placed = order[index];
            return (
              <button
                type="button"
                key={destination}
                className={placed ? styles.bananaDropFilled : styles.bananaDropSlot}
                aria-label={t(placed ? "activity.lessonFour.practice.filledDestination" : "activity.lessonFour.practice.emptyDestination", { destination, count: placed })}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const count = Number(event.dataTransfer.getData("text/plain"));
                  if (basketCounts.some((value) => value === count)) placeBasket(index, count);
                }}
                onClick={() => {
                  if (selectedNumber !== null) placeBasket(index, selectedNumber);
                  else if (placed) {
                    setOrder((current) => current.map((value, slot) => slot === index ? 0 : value));
                    setSelectedNumber(placed);
                  }
                }}
              >
                <strong>{destination}</strong>
                {placed ? <BananaBasket count={placed} /> : <span>?</span>}
              </button>
            );
          })}
        </div>
      </ActivityFrame>
    );
  }

  const expected = L04_ORDERS.play;
  const numbers = [20, 14, 19, 10] as const;
  return (
    <ActivityFrame
      completed={completed}
      onValidated={onValidated}
      title={t(`activity.lessonFour.${kind}.title`)}
      instruction={t(`activity.lessonFour.${kind}.instruction`)}
      feedback={feedback}
      onValidate={() => validateOrder(expected)}
    >
      <LessonFourScene
        image={toyBusesImage}
        alt={t("activity.lessonFour.busAlt")}
        numbers={numbers}
        selected={order}
        variant="buses"
        onChoose={(number) => chooseInOrder(number, expected)}
      />
      <div className={styles.orderTrack} aria-label={t("activity.lessonFour.currentOrder")} aria-live="polite">
        {expected.map((_, index) => <span key={index}>{order[index] ?? "?"}</span>)}
      </div>
    </ActivityFrame>
  );
}

export function PrimaryTwoLessonActivity({
  kind,
  completed,
  onValidated,
  lessonId,
}: LessonActivityProps & { kind: LessonStepKind }) {
  if (lessonId === LESSON_TWO_ID) return <LessonTwoActivity kind={kind} completed={completed} onValidated={onValidated} />;
  if (lessonId === LESSON_THREE_ID) return <LessonThreeActivity kind={kind} completed={completed} onValidated={onValidated} />;
  if (lessonId === LESSON_FOUR_ID) return <LessonFourActivity kind={kind} completed={completed} onValidated={onValidated} />;
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
