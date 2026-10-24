import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityShell } from "../components/exercise-kit/ActivityShell";
import { ChoiceGroup } from "../components/exercise-kit/ChoiceGroup";
import { NumericStepper } from "../components/exercise-kit/NumericStepper";
import { useAttempts } from "../components/exercise-kit/use-attempts";
import type { ObjectCard, Question, Response } from "./exercise-model";
import { getResult, recordResponse, restartQuestion } from "./learning-results";
import styles from "./PrimaryOneActivity.module.css";

function initialResponse(q: Question): Response {
  switch (q.kind) {
    case "build": return { numbers: [q.initial ?? 0] };
    case "split": return { numbers: Array.from({ length: q.ways }, () => [q.fixedLeft ?? 0, 0]).flat() };
    case "path": return { numbers: q.start ?? [0, 2] };
    case "align": return { numbers: [2, 1] };
    case "capacity": case "tens": return { numbers: [0, 0] };
    default: return {};
  }
}

function Tokens({ count, token = "●" }: { count: number; token?: string }) {
  const { t } = useTranslation("primaryOne");
  return <div className={styles.tokens} role="img" aria-label={t("activity.objects", { count })}>
    {count === 0 ? <span>{t("activity.empty")}</span> : Array.from({ length: count }, (_, i) => <span key={i} aria-hidden="true">{token}</span>)}
  </div>;
}

function Card({ card }: { card: ObjectCard }) {
  return <><span aria-hidden="true" className={`${styles.shape} ${styles[card.shape ?? "circle"]}`} style={{ width: card.shape === "rectangle" ? (card.size ?? 48) * 1.4 : card.size ?? 48, height: card.size ?? 48, backgroundColor: card.color ?? "#18775c" }} /><span>{card.label}</span></>;
}

function ResponseControls({ q, response, onChange }: { q: Question; response: Response; onChange: (r: Response) => void }) {
  const { t } = useTranslation("primaryOne");
  const nums = response.numbers ?? [];
  const values = response.values ?? [];
  const numberAt = (i: number) => nums[i] ?? 0;
  const setNumber = (i: number, n: number) => {
    const next = [...nums]; next[i] = n; onChange({ ...response, numbers: next });
  };
  const toggle = (n: number) => onChange({ ...response, numbers: nums.includes(n) ? nums.filter((v) => v !== n) : [...nums, n] });
  const stepper = (label: string, value: number, change: (n: number) => void, max = 20, min = 0) => <NumericStepper label={label} value={value} min={min} max={max} decreaseLabel={t("activity.decrease", { label })} increaseLabel={t("activity.increase", { label })} onChange={change} />;
  switch (q.kind) {
    case "choice": return <>
      {q.cards ? <div className={styles.controls}>{q.cards.map((card, i) => <span className={styles.card} key={i}><Card card={card} /></span>)}</div> : null}
      <ChoiceGroup choices={q.choices} selected={response.text ?? null} ariaLabel={t(q.promptKey)} onSelect={(text) => onChange({ text })} />
    </>;
    case "select": return <div className={styles.controls} role="group" aria-label={t(q.promptKey)}>{q.cards.map((card, i) => <button type="button" className={styles.card} key={i} aria-pressed={nums.includes(i)} onClick={() => toggle(i)}><Card card={card} /></button>)}</div>;
    case "order": return <>
      <div className={styles.controls} role="group" aria-label={t("activity.cards")}>{q.values.map((v, i) => <button type="button" className={styles.card} key={v} disabled={values.includes(v)} onClick={() => onChange({ values: [...values, v] })}>
        {q.lengths ? <span aria-hidden="true" style={{ width: `${q.lengths[i] * 14}px`, height: 14, background: "#b36228" }} /> : null}{v}
      </button>)}</div>
      <output className={styles.ordered} aria-label={t("activity.order")}>{values.join(" → ") || "…"}</output>
      <button type="button" onClick={() => onChange({ values: [] })}>{t("activity.reset")}</button>
    </>;
    case "number": return <>
      {q.visual ? <div className={styles.groups}>{q.visual.map((n, i) => <div className={styles.group} key={i}><strong>{t("activity.group", { number: i + 1 })}</strong><Tokens count={n} /></div>)}{q.visual.length > 1 ? <strong>{q.symbol}</strong> : null}</div> : null}
      <label>{t("activity.answer")}<input className={styles.questionInput} inputMode="numeric" type="number" min={0} max={20} value={response.text ?? ""} onChange={(e) => onChange({ text: e.target.value })} /></label>
    </>;
    case "build": return <>
      {stepper(t("activity.quantity"), numberAt(0), (n) => setNumber(0, n), 20, q.fixed ?? 0)}
      <Tokens count={numberAt(0)} token={q.token} />
      {q.fixed !== undefined ? <p>{t("activity.added", { count: numberAt(0) - q.fixed })}</p> : null}
      {q.target === 10 || q.target === 20 ? Array.from({ length: q.target / 10 }, (_, frame) => <div className={styles.tenFrame} aria-hidden="true" key={frame}>{Array.from({ length: 10 }, (_, i) => <span key={i}>{frame * 10 + i < numberAt(0) ? "●" : ""}</span>)}</div>) : null}
    </>;
    case "story": case "remove": return <>
      {q.kind === "story" ? <><p>{t("activity.storyChoose")}</p><ChoiceGroup choices={["mangues", "poissons", "graines"]} selected={response.text ?? null} ariaLabel={t("activity.storyChoose")} onSelect={(text) => onChange({ ...response, text })} /></> : null}
      <div className={styles.controls} role="group" aria-label={t("activity.removeObjects")}>{Array.from({ length: q.total }, (_, i) => <button className={nums.includes(i) ? styles.removed : undefined} key={i} type="button" aria-label={t("activity.object", { number: i + 1 })} aria-pressed={nums.includes(i)} onClick={() => toggle(i)}><span aria-hidden="true">{q.kind === "remove" ? q.token ?? "●" : "●"}</span></button>)}</div>
      <p aria-live="polite">{t("activity.remaining", { count: q.total - nums.length })}</p>
      {q.kind === "story" && response.text ? <p>{t("activity.story", { total: q.total, objects: response.text, removed: nums.length, remaining: q.total - nums.length })}</p> : null}
    </>;
    case "split": return <div>{Array.from({ length: q.ways }, (_, way) => <section className={styles.group} key={way}>
      <h3>{t("activity.way", { number: way + 1 })}</h3>
      <div className={styles.groups}>{[0, 1].map((side) => <div key={side}>
        {stepper(t("activity.bowl", { number: side + 1 }), numberAt(way * 2 + side), (n) => setNumber(way * 2 + side, n), q.total, side === 0 && q.fixedLeft !== undefined ? q.fixedLeft : 0)}
        <Tokens count={numberAt(way * 2 + side)} />
      </div>)}</div>
      <p>{numberAt(way * 2)} + {numberAt(way * 2 + 1)} = {numberAt(way * 2) + numberAt(way * 2 + 1)}</p>
    </section>)}</div>;
    case "path": {
      const [x, y] = nums;
      const move = (dx: number, dy: number) => {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && nx < 5 && ny >= 0 && ny < 3 && !q.walls?.includes(`${nx}:${ny}`)) onChange({ numbers: [nx, ny] });
      };
      return <><div className={styles.board} role="img" aria-label={t("activity.pathPosition", { column: x + 1, row: y + 1, targetColumn:q.target[0]+1,targetRow:q.target[1]+1,walls:q.walls?.map((w)=>{const [cx,cy]=w.split(":").map(Number);return `${cx+1}, ${cy+1}`;}).join(" ; ") || t("activity.noObstacles") })}>{Array.from({ length: 15 }, (_, i) => {
        const cx = i % 5, cy = Math.floor(i / 5);
        return <span key={i} className={q.walls?.includes(`${cx}:${cy}`) ? styles.wall : cx === q.target[0] && cy === q.target[1] ? styles.goal : undefined} aria-hidden="true">{cx === x && cy === y ? "🧒" : cx === q.target[0] && cy === q.target[1] ? "🌻" : "·"}</span>;
      })}</div><div className={styles.controls}>{[["left", -1, 0, "←"], ["up", 0, -1, "↑"], ["down", 0, 1, "↓"], ["right", 1, 0, "→"]].map(([label, dx, dy, icon]) => <button type="button" key={label} aria-label={t(`activity.${label}`)} onClick={() => move(Number(dx), Number(dy))}>{icon}</button>)}</div><button type="button" onClick={() => onChange(initialResponse(q))}>{t("activity.reset")}</button></>;
    }
    case "position": return <><p>{t("activity.screenReference")}</p><div className={styles.controls} role="group" aria-label={t("activity.position")}>
      {["gauche", "haut", "bas", "droite"].map((position) => <button type="button" key={position} aria-pressed={response.text === position} onClick={() => onChange({ text: position })}>{position === "gauche" ? "● ✏️" : position === "droite" ? "✏️ ●" : position === "haut" ? "● ↑ ✏️" : "✏️ ↓ ●"}<br />{t(`activity.${position}`)}</button>)}
    </div><div className={styles.positionPreview} aria-hidden="true"><span style={{gridColumn:2,gridRow:2}}>✏️</span>{response.text?<span style={{gridColumn:response.text==="gauche"?1:response.text==="droite"?3:2,gridRow:response.text==="haut"?1:response.text==="bas"?3:2}}>●</span>:null}</div><p aria-live="polite">{response.text ? t("activity.placed", { position: t(`activity.${response.text}`) }) : ""}</p></>;
    case "pattern": return <><div className={styles.controls}>{Array.from({ length: 6 }, (_, i) => <div key={i}><p>{t("activity.slot", { number: i + 1 })}</p><ChoiceGroup choices={["jaune", "vert"]} selected={values[i] ?? null} ariaLabel={t("activity.slot", { number: i + 1 })} onSelect={(v) => { const next = [...values]; next[i] = v; onChange({ values: next }); }} /></div>)}</div></>;
    case "trace": {
      const point = (n: number) => `${(n % 3) * 90 + 50} ${Math.floor(n / 3) * 90 + 50}`;
      const d = nums.length >= 3 ? `M ${point(nums[0])} Q ${point(nums[1])} ${point(nums[2])}` + nums.slice(3).map((n) => ` T ${point(n)}`).join("") : nums.length ? `M ${point(nums[0])}` : "";
      return <><p>{t("activity.traceGrid")}</p><div className={styles.traceBoard}><svg viewBox="0 0 280 280" aria-hidden="true"><path d={d} fill="none" stroke="#176980" strokeWidth="9" /></svg><div className={styles.traceGrid}>{Array.from({ length: 9 }, (_, i) => <button type="button" key={i} aria-label={t("activity.point", { number: i + 1 })} onClick={() => onChange({ numbers: [...nums, i] })}>{i + 1}</button>)}</div></div><button type="button" onClick={() => onChange({ numbers: [] })}>{t("activity.reset")}</button></>;
    }
    case "measure": return <><p>{t("activity.unitInstruction")}</p><div className={styles.unitLine}>{Array.from({ length: q.units }, (_, i) => <button type="button" key={i} aria-label={t("activity.unit", { number: i + 1 })} aria-pressed={nums.includes(i)} onClick={() => onChange({ numbers: nums.includes(i) ? nums.filter((n) => n !== i) : [...nums, i].sort((a, b) => a - b) })}>{nums.includes(i) ? "▰" : "·"}</button>)}</div><p>{t("activity.unitsPlaced", { count: nums.length })}</p></>;
    case "align": return <><div className={styles.ruler} aria-label={t("activity.referenceZero")}><strong>0</strong>{[0, 1].map((i) => <span key={i} className={styles.ribbon} style={{ width: i === 0 ? "50%" : "75%", marginLeft: `${numberAt(i) * 5}%` }} />)}</div>{[0, 1].map((i) => <div key={i}>{stepper(t("activity.ribbon", { number: i + 1 }), numberAt(i), (n) => setNumber(i, n), 3)}</div>)}</>;
    case "balance": return <><div className={styles.controls}>{["stone", "leaf"].map((v) => <button type="button" key={v} aria-pressed={values.includes(v)} onClick={() => onChange({ ...response, values: values.includes(v) ? values.filter((n) => n !== v) : [...values, v] })}>{t(`activity.${v}`)}</button>)}</div><div className={styles.scale} role="img" aria-label={values.length === 2 ? t("activity.stoneLower") : t("activity.scaleEmpty")}><span className={values.includes("stone") ? styles.heavy : undefined}>{values.includes("stone") ? "🪨" : "…"}</span><span>{values.includes("leaf") ? "🍃" : "…"}</span></div><ChoiceGroup choices={["stone", "leaf"]} selected={response.text ?? null} ariaLabel={t("activity.heaviest")} labelFor={(v) => t(`activity.${v}`)} onSelect={(text) => onChange({ ...response, text })} /></>;
    case "capacity": return <div className={styles.groups}>{q.targets.map((target, i) => <div className={styles.group} key={i}><h3>{t("activity.container", { number: i + 1, count: target })}</h3>{stepper(t("activity.cups", { number: i + 1 }), numberAt(i), (n) => setNumber(i, n), 8)}<Tokens count={numberAt(i)} token="🥤" /></div>)}</div>;
    case "tens": return <>
      {!q.exchange ? stepper(t("activity.tens"), numberAt(0), (n) => setNumber(0, n), 2) : null}
      {stepper(t("activity.units"), numberAt(1), (n) => setNumber(1, n), q.exchange ? 20 : 9)}
      <div className={styles.tokens}>{Array.from({ length: numberAt(0) }, (_, i) => <span key={i} aria-label={t("activity.bundle")}>▥</span>)}</div><Tokens count={numberAt(1)} token="│" />
      {q.exchange ? <button type="button" disabled={numberAt(1) < 10} onClick={() => onChange({ numbers: [numberAt(0) + 1, numberAt(1) - 10, 1] })}>{t("activity.exchange")}</button> : null}
      <p>{numberAt(0)} × 10 + {numberAt(1)} = {numberAt(0) * 10 + numberAt(1)}</p>
    </>;
    case "house": return <>
      <div className={styles.house} aria-hidden="true">{values[0] === "triangle" ? <div className={styles.roof} /> : null}{values[1] === "square" ? <div className={styles.houseWall}>{values[2] === "rectangle" ? <span style={{ width: 40, height: 90, background: "#9a5b30" }} /> : null}{values[3] === "circle" ? <span style={{ width: 40, height: 40, borderRadius: "50%", background: "#7bb2c1", alignSelf: "center" }} /> : null}</div> : null}</div>
      {["roof", "wall", "door", "window"].map((part, i) => <div key={part}><h3>{t(`activity.${part}`)}</h3><ChoiceGroup choices={["circle", "square", "triangle", "rectangle"]} selected={values[i] ?? null} ariaLabel={t(`activity.${part}`)} labelFor={(v) => t(`activity.${v}`)} onSelect={(v) => { const next = [...values]; next[i] = v; onChange({ values: next }); }} /></div>)}
    </>;
    case "pair": return <><div className={styles.pairs}>{Array.from({length:Math.max(q.left,q.right)},(_,i)=><div key={i} className={styles.pairRow}>
      <span aria-label={t("activity.leftObject",{number:i+1})}>{i<q.left?"●":""}</span>
      {i<Math.min(q.left,q.right)?<button type="button" aria-label={t("activity.makePair",{number:i+1})} aria-pressed={nums.includes(i)} onClick={()=>toggle(i)}>{nums.includes(i)?"● ━ ●":"↔"}</button>:<span>{t("activity.noPartner")}</span>}
      <span aria-label={t("activity.rightObject",{number:i+1})}>{i<q.right?"●":""}</span>
    </div>)}</div>{q.choices?<ChoiceGroup choices={q.choices} selected={response.text??null} ariaLabel={t("activity.compare")} onSelect={(text)=>onChange({...response,text})}/>:<label>{t("activity.difference")}<input className={styles.questionInput} type="number" inputMode="numeric" value={response.text??""} onChange={(e)=>onChange({...response,text:e.target.value})}/></label>}</>;
  }
}

export function PrimaryOneQuestion({ question, onValidated, onRestart }: { question: Question; onValidated: () => void; onRestart?: () => void }) {
  const { t } = useTranslation("primaryOne");
  const [result, setResult] = useState(() => getResult(question));
  const [response, setResponse] = useState<Response>(() => getResult(question)?.response ?? initialResponse(question));
  const { attempts, registerWrong, reset } = useAttempts();
  const completed = Boolean(result?.correct);
  const wrongAttempts = Math.max(attempts, result?.attempts ?? 0);
  const feedback = wrongAttempts > 0 ? t(wrongAttempts > 1 ? question.explanationKey : question.hintKey) : "";
  return <div className={styles.panel}>
    <ActivityShell namespace="primaryOne" titleKey="activity.question" instructionKey={question.promptKey} completed={completed} feedback={feedback} onValidate={() => {
      const next = recordResponse(question, response); setResult(next);
      if (next.correct) onValidated(); else registerWrong();
    }}>
      <fieldset disabled={completed} style={{ border: 0, margin: 0, padding: 0, minWidth: 0 }} aria-label={t(question.promptKey)}><ResponseControls q={question} response={response} onChange={setResponse} /></fieldset>
    </ActivityShell>
    {completed ? <button type="button" className={styles.next} onClick={() => { restartQuestion(question,initialResponse(question)); setResult(undefined); setResponse(initialResponse(question)); reset(); onRestart?.(); }}>{t("activity.retryQuestion")}</button> : null}
  </div>;
}

export function PrimaryOneActivity({ questions, completed, onValidated, onRestart }: { questions: readonly Question[]; completed: boolean; onValidated: () => void; onRestart: () => void }) {
  const { t } = useTranslation("primaryOne");
  const [index, setIndex] = useState(() => {
    const first = questions.findIndex((q) => !getResult(q)?.correct); return first < 0 ? 0 : first;
  });
  const [passed, setPassed] = useState(() => Boolean(getResult(questions[index])?.correct));
  const question = questions[index];
  useEffect(() => {
    if (!completed && questions.every((q) => getResult(q)?.correct)) onValidated();
  }, [questions,completed,onValidated]);
  return <div>
    <p aria-live="polite">{t("activity.questionProgress", { current: index + 1, total: questions.length })}</p>
    <PrimaryOneQuestion key={question.id} question={question} onRestart={() => {setPassed(false);onRestart();}} onValidated={() => { setPassed(true); if (index === questions.length - 1) onValidated(); }} />
    {passed && index < questions.length - 1 ? <button type="button" className={styles.next} onClick={() => { setIndex(index + 1); setPassed(Boolean(getResult(questions[index + 1])?.correct)); }}>{t("activity.nextQuestion")}</button> : null}
  </div>;
}
