import { useId, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";

import { challengeOfDay } from "./daily-challenge";
import styles from "./DailyChallenge.module.css";

type Verdict = "idle" | "empty" | "correct" | "wrong";

const OPERATOR_SIGNS: Record<string, string> = {
  "+": "+",
  "-": "−",
  x: "×",
};

// Le défi est purement local : aucune tentative n'est enregistrée, aucun score
// n'est envoyé. C'est une accroche du tableau de bord, pas une évaluation ;
// l'enfant peut recommencer autant de fois qu'il veut.
export function DailyChallenge() {
  const { t } = useTranslation("dashboard");
  const inputId = useId();
  const challenge = useMemo(() => challengeOfDay(new Date()), []);
  const [answer, setAnswer] = useState("");
  const [verdict, setVerdict] = useState<Verdict>("idle");

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const typed = answer.trim();
    if (typed === "") {
      setVerdict("empty");
      return;
    }
    setVerdict(Number(typed) === challenge.answer ? "correct" : "wrong");
  }

  return (
    <section className={styles.section} aria-labelledby="defi-du-jour-titre">
      <div className={styles.card}>
        <div className={styles.halo} aria-hidden="true" />

        <p className={styles.kicker}>{t("dailyChallenge.kicker")}</p>
        <h2 id="defi-du-jour-titre" className={styles.heading}>
          {t("dailyChallenge.heading")}
        </h2>

        <p className={styles.operation}>
          <span className={styles.number}>{challenge.left}</span>
          <span className={styles.operator} aria-hidden="true">
            {OPERATOR_SIGNS[challenge.operator]}
          </span>
          <span className={styles.number}>{challenge.right}</span>
          <span className={styles.operator} aria-hidden="true">
            =
          </span>
          <span className={styles.mystery} aria-hidden="true">
            ?
          </span>
        </p>

        <form className={styles.form} onSubmit={onSubmit}>
          <label className={styles.label} htmlFor={inputId}>
            {t("dailyChallenge.inputLabel")}
          </label>
          <div className={styles.controls}>
            <input
              id={inputId}
              className={styles.input}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={answer}
              onChange={(event) => {
                setAnswer(event.target.value);
                setVerdict("idle");
              }}
            />
            <button className={styles.submit} type="submit">
              {verdict === "wrong" ? t("dailyChallenge.retry") : t("dailyChallenge.check")}
            </button>
          </div>
        </form>

        <p className={`${styles.feedback} ${styles[verdict]}`} role="status">
          {verdict === "idle" ? t("dailyChallenge.hint") : t(`dailyChallenge.${verdict}`)}
        </p>
      </div>
    </section>
  );
}
