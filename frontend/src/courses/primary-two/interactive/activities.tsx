import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { ActivityFrame } from "../PrimaryTwoLessonActivities";
import {
  acceptedValues,
  accepts,
  buildIsCorrect,
  clockIsCorrect,
  collectIsCorrect,
  collectSignature,
  collectTotal,
  distributeShares,
  distributionIsFair,
  expectedOrder,
  firstOrderMistake,
  matchIsCorrect,
  parseAnswer,
  shuffle,
  symmetryIsCorrect,
  symmetryTargets,
} from "./logic";
import type {
  ActivitySpec,
  BuildPreview,
  BuildSpec,
  ChoiceSpec,
  ClockSpec,
  CollectSpec,
  DistributeSpec,
  MatchSpec,
  NumericSpec,
  OrderSpec,
  SelfCheckSpec,
  SingleActivitySpec,
  SymbolSpec,
  SymmetrySpec,
  Visual,
} from "./types";
import { ClockFace, ItemGlyph, TensView, VisualView } from "./visuals";
import styles from "./Interactive.module.css";

const NS = "primaryTwoLessons";
const DRAG_TYPE = "text/plain";

export type CheckResult = { ok: true } | { ok: false; message: string };
type Check = () => CheckResult;

interface BodyProps<S> {
  spec: S;
  solved: boolean;
  register: (check: Check) => void;
  touch: () => void;
}

function useTexts(base: string) {
  const { t } = useTranslation(NS);
  // Dans une manche (« u02l01.play.r1 »), un libellé absent est cherché au
  // niveau du jeu (« u02l01.play ») pour éviter de le répéter.
  const parent = base.split(".").slice(0, -1).join(".");
  return {
    t,
    tx: (key: string, options?: Record<string, unknown>) => t([`${base}.${key}`, `${parent}.${key}`], options),
  };
}

function useRegister(register: (check: Check) => void, check: Check) {
  useEffect(() => {
    register(check);
  });
}

function fail(message: string): CheckResult {
  return { ok: false, message };
}

function letter(index: number) {
  return String.fromCharCode(65 + index);
}

// ---------------------------------------------------------------- Numérique

function NumericBody({ spec, solved, register, touch }: BodyProps<NumericSpec>) {
  const { t, tx } = useTexts(spec.text);
  const [values, setValues] = useState<string[]>(() =>
    spec.fields.map((field) => (solved ? String(acceptedValues(field.accept)[0]) : "")),
  );

  useRegister(register, () => {
    const wrong = spec.fields
      .map((field, index) => (accepts(field.accept, parseAnswer(values[index])) ? null : index + 1))
      .filter((index): index is number => index !== null);
    if (wrong.length === 0) return { ok: true };
    if (values.some((value) => value.trim() === "")) return fail(`${t("common.feedback.fillAll")} ${tx("hint")}`);
    const list = spec.fields.length > 1 ? ` ${t("common.feedback.reviewQuestions", { list: wrong.join(", "), count: wrong.length })}` : "";
    return fail(`${tx("hint")}${list}`);
  });

  return (
    <>
      {spec.visual ? <div className={styles.visualStage}><VisualView visual={spec.visual} /></div> : null}
      <div className={spec.fields.length > 1 ? styles.fieldGrid : styles.fieldSingle}>
        {spec.fields.map((field, index) => {
          const id = `${spec.text}-${field.key}`.replace(/\W/g, "-");
          return (
            <div className={styles.fieldCard} key={field.key}>
              {field.visual ? <VisualView visual={field.visual} /> : null}
              <label htmlFor={id}>{tx(field.key)}</label>
              <span className={styles.answerLine}>
                <input
                  id={id}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  data-field={field.key}
                  value={values[index]}
                  onChange={(event) => {
                    const next = [...values];
                    next[index] = event.target.value;
                    setValues(next);
                    touch();
                  }}
                />
                {field.unit ? <span className={styles.unit}>{field.unit}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ------------------------------------------------------- Associer / classer

function MatchBody({ spec, solved, register, touch }: BodyProps<MatchSpec>) {
  const { t, tx } = useTexts(spec.text);
  const order = useMemo(() => shuffle(spec.items.map((item) => item.id), spec.text), [spec]);
  const [placement, setPlacement] = useState<Record<string, string | undefined>>(() =>
    solved ? Object.fromEntries(spec.items.map((item) => [item.id, item.bin])) : {},
  );
  const [selected, setSelected] = useState<string | null>(null);
  const itemsById = Object.fromEntries(spec.items.map((item) => [item.id, item]));
  const nameOf = (id: string) => {
    const item = itemsById[id];
    return item.labelKey ? tx(item.labelKey) : t("common.card", { letter: letter(order.indexOf(id)) });
  };
  const binLabel = (bin: MatchSpec["bins"][number]) => (typeof bin.label === "number" ? String(bin.label) : tx(bin.label));

  useRegister(register, () => {
    if (spec.items.some((item) => !placement[item.id])) return fail(t("common.feedback.placeAll"));
    if (matchIsCorrect(spec, placement)) return { ok: true };
    const wrong = spec.items.filter((item) => placement[item.id] !== item.bin).length;
    return fail(`${tx("hint")} ${t("common.feedback.wrongPlaced", { count: wrong })}`);
  });

  const place = (itemId: string, binId: string) => {
    setPlacement((current) => ({ ...current, [itemId]: binId }));
    setSelected(null);
    touch();
  };

  const renderItem = (id: string, inBin: boolean) => {
    const item = itemsById[id];
    return (
      <button
        type="button"
        key={id}
        data-item={id}
        draggable
        aria-pressed={selected === id}
        aria-label={nameOf(id)}
        className={`${styles.matchItem} ${selected === id ? styles.selected : ""} ${inBin ? styles.matchItemPlaced : ""}`}
        onDragStart={(event: DragEvent) => event.dataTransfer.setData(DRAG_TYPE, id)}
        onClick={() => {
          if (inBin) {
            setPlacement((current) => ({ ...current, [id]: undefined }));
          }
          setSelected(selected === id && !inBin ? null : id);
          touch();
        }}
      >
        {item.visual ? <VisualView visual={item.visual} /> : null}
        {item.labelKey ? <span className={styles.matchLabel}>{tx(item.labelKey)}</span> : <span className={styles.cardLetter}>{letter(order.indexOf(id))}</span>}
      </button>
    );
  };

  const bank = order.filter((id) => !placement[id]);
  return (
    <>
      <div className={styles.matchBank} aria-label={t("common.bank")} role="group">
        {bank.length ? bank.map((id) => renderItem(id, false)) : <p className={styles.emptyNote}>{t("common.bankEmpty")}</p>}
      </div>
      <p className={styles.selectionNote} aria-live="polite">
        {selected ? t("common.selected", { name: nameOf(selected) }) : t("common.selectFirst")}
      </p>
      <div className={styles.binRow}>
        {spec.bins.map((bin) => {
          const inside = order.filter((id) => placement[id] === bin.id);
          return (
            <div
              key={bin.id}
              className={styles.bin}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const id = event.dataTransfer.getData(DRAG_TYPE);
                if (itemsById[id]) place(id, bin.id);
              }}
            >
              <button
                type="button"
                data-bin={bin.id}
                className={styles.binTarget}
                aria-label={t("common.binTarget", { label: binLabel(bin), count: inside.length })}
                onClick={() => {
                  if (selected) place(selected, bin.id);
                }}
              >
                {binLabel(bin)}
              </button>
              <div className={styles.binContent}>{inside.map((id) => renderItem(id, true))}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// -------------------------------------------------------------- Construire

function previewVisual(preview: BuildPreview, values: Readonly<Record<string, number>>): Visual | ReactNode {
  switch (preview.kind) {
    case "tens":
      return { kind: "tens", tens: values[preview.tens] ?? 0, units: values[preview.units] ?? 0, item: preview.item };
    case "groups":
      return {
        kind: "groups",
        item: preview.item,
        container: preview.container,
        groups: Array.from({ length: values[preview.groups] ?? 0 }, () => (typeof preview.size === "number" ? preview.size : values[preview.size] ?? 0)),
      };
    case "collection":
      return { kind: "collection", item: preview.item, count: (preview.base ?? 0) + (values[preview.count] ?? 0), container: "none" };
    case "tenFrame": {
      const filled = (preview.base ?? 0) + (values[preview.count] ?? 0);
      return { kind: "tenFrame", filled, frames: Math.max(1, Math.ceil(filled / 10)) };
    }
    case "array":
      return { kind: "array", rows: values[preview.rows] ?? 0, cols: values[preview.cols] ?? 0, item: preview.item };
    case "containers":
      return null;
    case "jumps": {
      const marks = [preview.start];
      const jumps: [number, number][] = [];
      let position = preview.start;
      for (const id of preview.jumps) {
        const size = values[id] ?? 0;
        if (size === 0) continue;
        const next = position + preview.direction * size;
        jumps.push([position, next]);
        marks.push(next);
        position = next;
      }
      return { kind: "numberLine", from: preview.from, to: preview.to, marks, jumps };
    }
    case "transfer": {
      const move = values[preview.move] ?? 0;
      return { kind: "groups", item: preview.item, container: "basket", groups: [preview.a - move, preview.b + move] };
    }
  }
}

function BuildBody({ spec, solved, register, touch }: BodyProps<BuildSpec>) {
  const { t, tx } = useTexts(spec.text);
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(spec.controls.map((control) => [control.id, solved ? spec.goal[control.id] ?? control.start ?? control.min : control.start ?? control.min])),
  );

  useRegister(register, () => (buildIsCorrect(spec, values) ? { ok: true } : fail(tx("hint"))));

  const preview = spec.preview ? previewVisual(spec.preview, values) : null;
  return (
    <>
      {spec.visual ? <div className={styles.visualStage}><VisualView visual={spec.visual} /></div> : null}
      <div className={styles.controls}>
        {spec.controls.map((control) => {
          const label = tx(control.labelKey);
          const value = values[control.id];
          const change = (delta: number) => {
            setValues((current) => ({ ...current, [control.id]: Math.min(control.max, Math.max(control.min, value + delta)) }));
            touch();
          };
          return (
            <div className={styles.stepper} key={control.id}>
              <span>{label}</span>
              <div>
                <button type="button" data-control={control.id} data-action="minus" aria-label={t("common.decrease", { label })} disabled={value <= control.min} onClick={() => change(-1)}>−</button>
                <output aria-label={label} aria-live="polite">{value}</output>
                <button type="button" data-control={control.id} data-action="plus" aria-label={t("common.increase", { label })} disabled={value >= control.max} onClick={() => change(1)}>+</button>
              </div>
            </div>
          );
        })}
      </div>
      {spec.preview?.kind === "containers" ? (
        <div className={styles.previewStage}>
          <ContainersPreview count={values[spec.preview.count] ?? 0} liters={spec.preview.liters} target={spec.preview.target} />
        </div>
      ) : preview ? (
        <div className={styles.previewStage}><VisualView visual={preview as Visual} /></div>
      ) : null}
    </>
  );
}

function ContainersPreview({ count, liters, target }: { count: number; liters: number; target: number }) {
  const { t } = useTranslation(NS);
  return (
    <div className={styles.containersPreview}>
      <div className={styles.moneyRow}>
        {Array.from({ length: count }, (_, index) => <ItemGlyph key={index} item="bottle" size={40} />)}
      </div>
      <span aria-hidden="true">→</span>
      <span role="img" aria-label={t("common.containerLabel", { liters: target, filled: Math.min(target, count * liters) })}>
        <svg width="80" height="110" viewBox="0 0 80 110" aria-hidden="true">
          <rect x="8" y="12" width="64" height="94" rx="8" fill="#eef7fb" stroke="#2d6a8f" strokeWidth="3" />
          <rect x="11" y={106 - Math.min(1, (count * liters) / target) * 90} width="58" height={Math.min(1, (count * liters) / target) * 90} rx="5" fill={count * liters > target ? "#e0574a" : "#59b7e3"} />
          <rect x="28" y="2" width="24" height="10" rx="3" fill="#2d6a8f" />
        </svg>
      </span>
      {count * liters > target ? <strong className={styles.overflow}>{t("common.overflow")}</strong> : null}
    </div>
  );
}

// ------------------------------------------------------------------ Ranger

function OrderBody({ spec, solved, register, touch }: BodyProps<OrderSpec>) {
  const { t, tx } = useTexts(spec.text);
  const expected = expectedOrder(spec);
  const cards = useMemo(() => shuffle(spec.values, spec.text, expectedOrder(spec)), [spec]);
  const [slots, setSlots] = useState<(number | undefined)[]>(() => (solved ? [...expected] : spec.values.map(() => undefined)));
  const [selected, setSelected] = useState<number | null>(null);
  const label = (value: number) =>
    spec.sequence ? tx(`steps.${value}`) : spec.format ? t(`common.formats.${spec.format}`, { value }) : String(value);

  useRegister(register, () => {
    const mistake = firstOrderMistake(spec, slots);
    if (mistake === null) return { ok: true };
    if (mistake === "incomplete") return fail(t("common.feedback.placeAll"));
    const pairKey = spec.sequence ? "common.feedback.sequencePair" : spec.direction === "asc" ? "common.feedback.orderPair" : "common.feedback.orderPairDesc";
    return fail(`${tx("hint")} ${t(pairKey, { a: label(mistake[0]), b: label(mistake[1]) })}`);
  });

  const place = (index: number, value: number) => {
    setSlots((current) => {
      const next = current.map((slot) => (slot === value ? undefined : slot));
      next[index] = value;
      return next;
    });
    setSelected(null);
    touch();
  };

  return (
    <>
      {spec.visual ? <div className={styles.visualStage}><VisualView visual={spec.visual} /></div> : null}
      <div className={styles.cardBank} role="group" aria-label={t("common.bank")}>
        {cards.filter((value) => !slots.includes(value)).map((value) => (
          <button
            type="button"
            key={value}
            data-card={value}
            draggable
            aria-pressed={selected === value}
            className={`${spec.sequence ? styles.stepCard : styles.numberCard} ${selected === value ? styles.selected : ""}`}
            onDragStart={(event: DragEvent) => event.dataTransfer.setData(DRAG_TYPE, String(value))}
            onClick={() => { setSelected(selected === value ? null : value); touch(); }}
          >
            {label(value)}
          </button>
        ))}
      </div>
      <p className={styles.directionHint}>{t(spec.sequence ? "common.sequence" : spec.direction === "asc" ? "common.ascending" : "common.descending")}</p>
      <ol className={styles.slotRow}>
        {slots.map((value, index) => (
          <li key={index}>
            <button
              type="button"
              data-slot={index}
              className={`${value === undefined ? styles.slot : styles.slotFilled} ${spec.sequence ? styles.stepSlot : ""}`}
              aria-label={value === undefined ? t("common.emptySlot", { position: index + 1 }) : t("common.filledSlot", { position: index + 1, value: label(value) })}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const dropped = Number(event.dataTransfer.getData(DRAG_TYPE));
                if (spec.values.includes(dropped)) place(index, dropped);
              }}
              onClick={() => {
                if (selected !== null) place(index, selected);
                else if (value !== undefined) {
                  setSlots((current) => current.map((slot, position) => (position === index ? undefined : slot)));
                  setSelected(value);
                  touch();
                }
              }}
            >
              {value === undefined ? "?" : label(value)}
            </button>
          </li>
        ))}
      </ol>
    </>
  );
}

// ------------------------------------------------------------------- Choix

function ChoiceBody({ spec, solved, register, touch }: BodyProps<ChoiceSpec>) {
  const { t, tx } = useTexts(spec.text);
  const options = useMemo(() => shuffle(spec.options, spec.text), [spec]);
  const [picked, setPicked] = useState<string[]>(() => (solved ? [...spec.correct] : []));

  useRegister(register, () => {
    if (picked.length === 0) return fail(t("common.feedback.chooseOne"));
    const ok = picked.length === spec.correct.length && picked.every((id) => spec.correct.includes(id));
    if (ok) return { ok: true };
    const wrongId = picked.find((id) => !spec.correct.includes(id));
    const specific = wrongId ? t(`${spec.text}.why.${wrongId}`, { defaultValue: "" }) : "";
    const missing = spec.multiple && !wrongId ? ` ${t("common.feedback.missingChoice")}` : "";
    return fail(`${specific || tx("hint")}${missing}`);
  });

  return (
    <>
      {spec.visual ? <div className={styles.visualStage}><VisualView visual={spec.visual} /></div> : null}
      <fieldset className={styles.choiceGrid}>
        <legend className={styles.srOnly}>{tx("instruction")}</legend>
        {options.map((option) => (
          <label key={option.id} className={picked.includes(option.id) ? styles.choicePicked : styles.choice}>
            <input
              type={spec.multiple ? "checkbox" : "radio"}
              name={spec.text}
              value={option.id}
              checked={picked.includes(option.id)}
              onChange={() => {
                setPicked((current) =>
                  spec.multiple
                    ? current.includes(option.id) ? current.filter((id) => id !== option.id) : [...current, option.id]
                    : [option.id],
                );
                touch();
              }}
            />
            {option.visual ? <VisualView visual={option.visual} /> : null}
            <span>{tx(`options.${option.id}`)}</span>
          </label>
        ))}
      </fieldset>
    </>
  );
}

// ---------------------------------------------------------------- Symboles

const SYMBOLS = ["<", "=", ">"] as const;
function compareSymbol(a: number, b: number) {
  return a < b ? "<" : a > b ? ">" : "=";
}

function SymbolBody({ spec, solved, register, touch }: BodyProps<SymbolSpec>) {
  const { t, tx } = useTexts(spec.text);
  const [answers, setAnswers] = useState<(string | undefined)[]>(() => spec.pairs.map(([a, b]) => (solved ? compareSymbol(a, b) : undefined)));

  useRegister(register, () => {
    if (answers.some((answer) => !answer)) return fail(t("common.feedback.fillAll"));
    const wrong = spec.pairs.findIndex(([a, b], index) => answers[index] !== compareSymbol(a, b));
    if (wrong < 0) return { ok: true };
    const [a, b] = spec.pairs[wrong];
    return fail(`${tx("hint")} ${t("common.feedback.reviewPair", { a, b })}`);
  });

  return (
    <div className={styles.symbolList}>
      {spec.pairs.map(([a, b], index) => (
        <div className={styles.symbolRow} key={`${a}-${b}`} role="group" aria-label={t("common.comparePair", { a, b })}>
          <span className={styles.symbolNumber}>{a}{spec.showTens ? <TensView tens={Math.floor(a / 10)} units={a % 10} /> : null}</span>
          <span className={styles.symbolButtons}>
            {SYMBOLS.map((symbol) => (
              <button
                type="button"
                key={symbol}
                data-pair={index}
                data-symbol={symbol}
                aria-label={t(`common.symbols.${symbol === "<" ? "lt" : symbol === ">" ? "gt" : "eq"}`, { a, b })}
                aria-pressed={answers[index] === symbol}
                className={answers[index] === symbol ? styles.symbolPicked : undefined}
                onClick={() => {
                  setAnswers((current) => current.map((answer, position) => (position === index ? symbol : answer)));
                  touch();
                }}
              >
                {symbol}
              </button>
            ))}
          </span>
          <span className={styles.symbolNumber}>{b}{spec.showTens ? <TensView tens={Math.floor(b / 10)} units={b % 10} /> : null}</span>
        </div>
      ))}
    </div>
  );
}

// -------------------------------------------------------------- Distribuer

function DistributeBody({ spec, solved, register, touch }: BodyProps<DistributeSpec>) {
  const { t, tx } = useTexts(spec.text);
  const target = distributeShares(spec);
  const [shares, setShares] = useState<number[]>(() => Array.from({ length: spec.recipients }, () => (solved ? target.each : 0)));
  const [each, setEach] = useState(solved ? String(target.each) : "");
  const [rest, setRest] = useState(solved ? String(target.rest) : "");
  const remaining = spec.total - shares.reduce((sum, share) => sum + share, 0);
  const name = t(`common.items.${spec.item}`);

  useRegister(register, () => {
    if (!distributionIsFair(spec, shares)) {
      if (remaining >= spec.recipients) return fail(t("common.feedback.keepGiving"));
      return fail(`${tx("hint")} ${t("common.feedback.unfair")}`);
    }
    if (spec.askEach && parseAnswer(each) !== target.each) return fail(t("common.feedback.countEach"));
    if (spec.askRest && parseAnswer(rest) !== target.rest) return fail(t("common.feedback.countRest"));
    return { ok: true };
  });

  return (
    <>
      <div className={styles.pile} role="group" aria-label={t("common.pile", { count: remaining, item: name })}>
        {Array.from({ length: remaining }, (_, index) => <ItemGlyph key={index} item={spec.item} size={30} />)}
        {remaining === 0 ? <p className={styles.emptyNote}>{t("common.pileEmpty")}</p> : null}
      </div>
      <div className={styles.recipientRow}>
        {shares.map((share, index) => (
          <div key={index} className={`${styles.recipient} ${styles[`recipient_${spec.container}`] ?? ""}`}>
            <button
              type="button"
              data-recipient={index}
              className={styles.recipientTarget}
              disabled={remaining === 0}
              aria-label={t(`common.give.${spec.container}`, { n: index + 1, item: name })}
              onClick={() => {
                setShares((current) => current.map((value, position) => (position === index ? value + 1 : value)));
                touch();
              }}
            >
              {t(`common.recipient.${spec.container}`, { n: index + 1 })}
            </button>
            <div className={styles.recipientContent}>
              {Array.from({ length: share }, (_, item) => <ItemGlyph key={item} item={spec.item} size={26} />)}
            </div>
            <button
              type="button"
              className={styles.takeBack}
              data-takeback={index}
              disabled={share === 0}
              aria-label={t("common.takeBack", { n: index + 1 })}
              onClick={() => {
                setShares((current) => current.map((value, position) => (position === index ? value - 1 : value)));
                touch();
              }}
            >
              ↩
            </button>
          </div>
        ))}
      </div>
      {spec.askEach || spec.askRest ? (
        <div className={styles.fieldGrid}>
          {spec.askEach ? (
            <label className={styles.fieldCard}>
              <span>{t("common.eachQuestion", { item: name })}</span>
              <input type="text" inputMode="numeric" data-field="each" value={each} onChange={(event) => { setEach(event.target.value); touch(); }} />
            </label>
          ) : null}
          {spec.askRest ? (
            <label className={styles.fieldCard}>
              <span>{t("common.restQuestion", { item: name })}</span>
              <input type="text" inputMode="numeric" data-field="rest" value={rest} onChange={(event) => { setRest(event.target.value); touch(); }} />
            </label>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

// ------------------------------------------------------------- Rassembler

function CollectBody({ spec, solved, register, touch }: BodyProps<CollectSpec>) {
  const { t, tx } = useTexts(spec.text);
  const [counts, setCounts] = useState<Record<string, number>>(() => (solved ? { ...spec.solution } : {}));
  const [firstWay, setFirstWay] = useState<string | null>(null);
  const [round, setRound] = useState(0);

  useRegister(register, () => {
    const total = collectTotal(spec, counts);
    if (total === 0) return fail(t("common.feedback.chooseOne"));
    if (!collectIsCorrect(spec, counts)) {
      if ("equals" in spec.goal) {
        return fail(`${tx("hint")} ${t(total > spec.goal.equals ? "common.feedback.tooMuch" : "common.feedback.tooLittle")}`);
      }
      return fail(`${tx("hint")} ${t(total > spec.goal.atMost ? "common.feedback.overBudget" : "common.feedback.tooLittle")}`);
    }
    if (spec.twoWays && !solved) {
      const signature = collectSignature(counts);
      if (firstWay === null) {
        setFirstWay(signature);
        setCounts({});
        setRound(1);
        return fail(t("common.feedback.anotherWay"));
      }
      if (signature === firstWay) return fail(t("common.feedback.sameWay"));
    }
    return { ok: true };
  });

  const chosen = spec.supply.flatMap((supply) => Array.from({ length: counts[supply.id] ?? 0 }, (_, index) => ({ supply, index })));
  return (
    <>
      {spec.twoWays ? <p className={styles.roundNote}>{t("common.wayNumber", { number: round + 1 })}</p> : null}
      <div className={styles.supplyRow} role="group" aria-label={t("common.supply")}>
        {spec.supply.map((supply) => {
          const count = counts[supply.id] ?? 0;
          const full = count >= (supply.limit ?? Infinity);
          return (
            <button
              type="button"
              key={supply.id}
              data-supply={supply.id}
              disabled={full}
              className={styles.supplyButton}
              aria-label={t("common.addSupply", { name: tx(`supply.${supply.id}`) })}
              onClick={() => { setCounts((current) => ({ ...current, [supply.id]: count + 1 })); touch(); }}
            >
              <VisualView visual={supply.visual} />
            </button>
          );
        })}
      </div>
      <div className={styles.basket} role="group" aria-label={t("common.basket")}>
        {chosen.length === 0 ? <p className={styles.emptyNote}>{t("common.basketEmpty")}</p> : null}
        {chosen.map(({ supply, index }) => (
          <button
            type="button"
            key={`${supply.id}-${index}`}
            data-remove={supply.id}
            className={styles.basketItem}
            aria-label={t("common.removeSupply", { name: tx(`supply.${supply.id}`) })}
            onClick={() => { setCounts((current) => ({ ...current, [supply.id]: Math.max(0, (current[supply.id] ?? 0) - 1) })); touch(); }}
          >
            <VisualView visual={supply.visual} />
          </button>
        ))}
      </div>
    </>
  );
}

// ----------------------------------------------------------------- Horloge

function ClockBody({ spec, solved, register, touch }: BodyProps<ClockSpec>) {
  const { t, tx } = useTexts(spec.text);
  const [hour, setHour] = useState(solved ? spec.hour : spec.startHour ?? 12);
  const [minute, setMinute] = useState<number>(solved ? spec.minute : 0);

  useRegister(register, () => (clockIsCorrect(spec, hour, minute) ? { ok: true } : fail(tx("hint"))));

  const move = (delta: number) => {
    setHour((current) => ((current - 1 + delta + 12) % 12) + 1);
    touch();
  };
  return (
    <div className={styles.clockWorkspace}>
      <ClockFace hour={hour} minute={minute} />
      <div className={styles.clockControls}>
        <button type="button" data-clock="hour-minus" onClick={() => move(-1)}>{t("common.clock.hourBack")}</button>
        <button type="button" data-clock="hour-plus" onClick={() => move(1)}>{t("common.clock.hourForward")}</button>
        <button type="button" data-clock="minute-12" aria-pressed={minute === 0} onClick={() => { setMinute(0); touch(); }}>{t("common.clock.minuteOn12")}</button>
        <button type="button" data-clock="minute-6" aria-pressed={minute === 30} onClick={() => { setMinute(30); touch(); }}>{t("common.clock.minuteOn6")}</button>
      </div>
    </div>
  );
}

// --------------------------------------------------------------- Symétrie

function SymmetryBody({ spec, solved, register, touch }: BodyProps<SymmetrySpec>) {
  const { t, tx } = useTexts(spec.text);
  const [right, setRight] = useState<Set<string>>(() => new Set(solved ? symmetryTargets(spec) : []));
  const left = new Set(spec.left.map(([column, row]) => `${column},${row}`));

  useRegister(register, () => {
    if (symmetryIsCorrect(spec, right)) return { ok: true };
    const expected = symmetryTargets(spec);
    const extra = [...right].filter((cell) => !expected.includes(cell)).length;
    const missing = expected.filter((cell) => !right.has(cell)).length;
    return fail(`${tx("hint")} ${t("common.feedback.symmetry", { extra, missing })}`);
  });

  // Le modèle de gauche est décrit pour les lecteurs d'écran : chaque case
  // annonce sa colonne (distance à l'axe), sa ligne et si elle est colorée.
  const model = [...spec.left]
    .sort(([columnA, rowA], [columnB, rowB]) => rowA - rowB || columnA - columnB)
    .map(([column, row]) => t("common.modelCell", { column, row: row + 1 }))
    .join(" ; ");
  return (
    <>
    <p className={styles.srOnly}>{t("common.modelSummary", { cells: model })}</p>
    <div className={styles.symmetryGrid} style={{ gridTemplateColumns: `repeat(${spec.half}, 40px) 6px repeat(${spec.half}, 40px)`, ["--half" as string]: spec.half }}>
      {Array.from({ length: spec.rows }, (_, row) => [
        ...Array.from({ length: spec.half }, (_, index) => {
          const distance = spec.half - index;
          const filled = left.has(`${distance},${row}`);
          return (
            <span
              key={`l-${index}-${row}`}
              role="img"
              aria-label={t(filled ? "common.leftCellFilled" : "common.leftCellEmpty", { column: distance, row: row + 1 })}
              className={filled ? styles.cellFilled : styles.cell}
            />
          );
        }),
        <span key={`axis-${row}`} className={styles.axis} aria-hidden="true" />,
        ...Array.from({ length: spec.half }, (_, index) => {
          const distance = index + 1;
          const key = `${distance},${row}`;
          const on = right.has(key);
          return (
            <button
              type="button"
              key={`r-${index}-${row}`}
              data-cell={key}
              aria-pressed={on}
              aria-label={t("common.cell", { column: distance, row: row + 1 })}
              className={on ? styles.cellFilled : styles.cell}
              onClick={() => {
                setRight((current) => {
                  const next = new Set(current);
                  if (next.has(key)) next.delete(key);
                  else next.add(key);
                  return next;
                });
                touch();
              }}
            />
          );
        }),
      ])}
    </div>
    </>
  );
}

// ------------------------------------------------------- Auto-évaluation

function SelfCheckBody({ spec, solved, register, touch }: BodyProps<SelfCheckSpec>) {
  const { t, tx } = useTexts(spec.text);
  const [choice, setChoice] = useState(solved ? "alone" : "");
  useRegister(register, () => (choice ? { ok: true } : fail(t("common.feedback.chooseOne"))));
  return (
    <>
      <ul className={styles.recap}>
        {spec.recap.map((key) => <li key={key}>{tx(key)}</li>)}
      </ul>
      <fieldset className={styles.choiceGrid}>
        <legend className={styles.srOnly}>{tx("instruction")}</legend>
        {(["alone", "material", "review"] as const).map((option) => (
          <label key={option} className={choice === option ? styles.choicePicked : styles.choice}>
            <input type="radio" name={spec.text} value={option} checked={choice === option} onChange={() => { setChoice(option); touch(); }} />
            <span>{t(`common.selfcheck.${option}`)}</span>
          </label>
        ))}
      </fieldset>
    </>
  );
}

function Body(props: BodyProps<SingleActivitySpec>) {
  const { spec } = props;
  switch (spec.type) {
    case "numeric": return <NumericBody {...props} spec={spec} />;
    case "match": return <MatchBody {...props} spec={spec} />;
    case "build": return <BuildBody {...props} spec={spec} />;
    case "order": return <OrderBody {...props} spec={spec} />;
    case "choice": return <ChoiceBody {...props} spec={spec} />;
    case "symbol": return <SymbolBody {...props} spec={spec} />;
    case "distribute": return <DistributeBody {...props} spec={spec} />;
    case "collect": return <CollectBody {...props} spec={spec} />;
    case "clock": return <ClockBody {...props} spec={spec} />;
    case "symmetry": return <SymmetryBody {...props} spec={spec} />;
    case "selfcheck": return <SelfCheckBody {...props} spec={spec} />;
  }
}

// --------------------------------------------------------- Cadre commun

interface InteractiveActivityProps {
  spec: ActivitySpec;
  completed: boolean;
  onValidated: () => void;
}

/**
 * Affiche une activité décrite par des données dans le cadre d'activité
 * existant (titre, consigne, validation, retour). Une activité « rounds »
 * enchaîne plusieurs manches : l'étape n'est validée qu'à la dernière.
 */
export function InteractiveActivity({ spec, completed, onValidated }: InteractiveActivityProps) {
  const { t } = useTranslation(NS);
  const rounds = spec.type === "rounds" ? spec.rounds : [spec];
  const [round, setRound] = useState(completed ? rounds.length - 1 : 0);
  const [attempt, setAttempt] = useState(0);
  const [feedback, setFeedback] = useState("");
  const checkRef = useRef<Check | null>(null);
  const current = rounds[round];

  // Chaque corps d'activité publie sa fonction de vérification après rendu.
  const register = useCallback((next: Check) => {
    checkRef.current = next;
  }, []);

  const validate = () => {
    const result = checkRef.current?.() ?? fail(t("common.feedback.chooseOne"));
    if (!result.ok) {
      setFeedback(result.message);
      return;
    }
    if (round < rounds.length - 1) {
      setRound(round + 1);
      setAttempt((value) => value + 1);
      setFeedback(t("common.feedback.roundDone", { current: round + 1, total: rounds.length }));
      return;
    }
    setFeedback("");
    onValidated();
  };

  return (
    <ActivityFrame
      completed={completed}
      onValidated={onValidated}
      title={t(`${spec.text}.title`)}
      instruction={t(`${spec.text}.instruction`)}
      feedback={feedback}
      onValidate={validate}
    >
      {rounds.length > 1 ? (
        <div className={styles.roundHeader}>
          <span className={styles.roundBadge}>{t("common.round", { current: round + 1, total: rounds.length })}</span>
          <p>{t(`${current.text}.instruction`)}</p>
        </div>
      ) : null}
      <Body
        key={`${round}-${attempt}`}
        spec={current}
        solved={completed}
        register={register}
        touch={() => setFeedback("")}
      />
      {!completed ? (
        <button
          type="button"
          className={styles.restart}
          onClick={() => {
            setAttempt((value) => value + 1);
            setFeedback("");
          }}
        >
          ↺ {t("common.actions.restart")}
        </button>
      ) : null}
    </ActivityFrame>
  );
}
