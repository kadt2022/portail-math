import { useState } from "react";
import { useTranslation } from "react-i18next";

import { MangoBasketScene } from "../../components/learning-world/MangoBasketScene";
import {
  applyMangoBasketAction,
  createFruitBasketState,
  MANGO_BASKET_IDS,
} from "../../components/learning-world/mango-basket-engine";
import type { MangoBasketState } from "../../components/learning-world/mango-basket-engine";
import styles from "../PrimaryThreeLesson.module.css";
import { ActivityShell } from "./ActivityShell";
import { NumericStepper } from "./NumericStepper";
import { hintForAttempts, useAttempts } from "./use-attempts";
import type { ExerciseWidgetProps, ShareTokensExercise } from "./exercise-types";

type ShareTokensProps = ExerciseWidgetProps<ShareTokensExercise>;

// « Je manipule » la division : le moteur conserve la part attendue et le
// reste, tandis que la représentation peut être abstraite ou illustrée.
export function ShareTokens({ exercise, titleKey, instructionKey, hintKey, strongHintKey, completed, onValidated }: ShareTokensProps) {
  const props = { exercise, titleKey, instructionKey, hintKey, strongHintKey, completed, onValidated };
  return exercise.manipulative === "mango-baskets"
    ? <MangoShareTokens {...props} />
    : <TokenShareSteppers {...props} />;
}

function TokenShareSteppers({ exercise, titleKey, instructionKey, hintKey, strongHintKey, completed, onValidated }: ShareTokensProps) {
  const { t } = useTranslation("primaryThree");
  const share = Math.floor(exercise.total / exercise.bowls);
  const rest = exercise.total % exercise.bowls;
  const [perBowl, setPerBowl] = useState(completed ? share : 0);
  const [left, setLeft] = useState(completed ? rest : 0);
  const { attempts, registerWrong, reset } = useAttempts();
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);

  const validate = () => {
    if (perBowl === share && left === rest) {
      onValidated();
      return;
    }
    registerWrong();
  };

  return (
    <ActivityShell titleKey={titleKey} instructionKey={instructionKey} completed={completed} feedback={feedback} onValidate={validate}>
      <p className={styles.targetNumber}>{t("exercise.share.target", { total: exercise.total, bowls: exercise.bowls })}</p>
      <div className={styles.groupsPreview} aria-hidden="true">
        {Array.from({ length: exercise.bowls }, (_, bowlIndex) => (
          <span key={bowlIndex} className={styles.groupBubble}>
            {Array.from({ length: perBowl }, (_, itemIndex) => (
              <i key={itemIndex} />
            ))}
          </span>
        ))}
      </div>
      <div className={styles.twoControls}>
        <NumericStepper
          label={t("exercise.share.perBowl")}
          value={perBowl}
          min={0}
          max={exercise.total}
          decreaseLabel={t("exercise.share.removePerBowl")}
          increaseLabel={t("exercise.share.addPerBowl")}
          onChange={(value) => {
            setPerBowl(value);
            reset();
          }}
        />
        <NumericStepper
          label={t("exercise.share.left")}
          value={left}
          min={0}
          max={exercise.total}
          decreaseLabel={t("exercise.share.removeLeft")}
          increaseLabel={t("exercise.share.addLeft")}
          onChange={(value) => {
            setLeft(value);
            reset();
          }}
        />
      </div>
    </ActivityShell>
  );
}

function completedOrangeState(total: number, bowls: number): MangoBasketState {
  const share = Math.floor(total / bowls);
  let state = createFruitBasketState(total, "orange");
  let fruitNumber = 1;

  for (const basketId of MANGO_BASKET_IDS.slice(0, bowls)) {
    for (let index = 0; index < share; index += 1) {
      state = applyMangoBasketAction(state, {
        type: "move-object",
        objectInstanceId: `orange-${fruitNumber}`,
        fromZoneId: "stock",
        toZoneId: basketId,
      });
      fruitNumber += 1;
    }
  }

  return state;
}

function MangoShareTokens({ exercise, titleKey, instructionKey, hintKey, strongHintKey, completed, onValidated }: ShareTokensProps) {
  const { t } = useTranslation("primaryThree");
  const share = Math.floor(exercise.total / exercise.bowls);
  const rest = exercise.total % exercise.bowls;
  const [state, setState] = useState<MangoBasketState>(() => completed
    ? completedOrangeState(exercise.total, exercise.bowls)
    : createFruitBasketState(exercise.total, "orange"));
  const [perBasketAnswer, setPerBasketAnswer] = useState(completed ? String(share) : "");
  const [remainderAnswer, setRemainderAnswer] = useState(completed ? String(rest) : "");
  const { attempts, registerWrong, reset } = useAttempts();
  const feedback = hintForAttempts(attempts, t, hintKey, strongHintKey);

  const validate = () => {
    const basketsAreEqual = MANGO_BASKET_IDS
      .slice(0, exercise.bowls)
      .every((basketId) => state.zones[basketId].length === share);
    const answersAreCorrect = perBasketAnswer.trim() !== ""
      && remainderAnswer.trim() !== ""
      && Number(perBasketAnswer) === share
      && Number(remainderAnswer) === rest;
    if (basketsAreEqual && state.zones.stock.length === rest && answersAreCorrect) {
      onValidated();
      return;
    }
    registerWrong();
  };

  return (
    <ActivityShell titleKey={titleKey} instructionKey={instructionKey} completed={completed} feedback={feedback} onValidate={validate}>
      <MangoBasketScene
        state={state}
        fruit="orange"
        showCounts={false}
        onAction={(action) => {
          setState((current) => applyMangoBasketAction(current, action));
          reset();
        }}
        onReset={() => {
          setState(createFruitBasketState(exercise.total, "orange"));
          setPerBasketAnswer("");
          setRemainderAnswer("");
          reset();
        }}
      />
      <section className={styles.observationAnswers} aria-labelledby="sharing-observation-title">
        <h3 id="sharing-observation-title">{t("exercise.share.observationTitle")}</h3>
        <p>{t("exercise.share.observationInstruction")}</p>
        <div className={styles.sharingAnswerGrid}>
          <label>
            <span>{t("exercise.share.orangePerBasket")}</span>
            <span className={styles.sharingAnswerLine}>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="?"
                value={perBasketAnswer}
                aria-label={t("exercise.share.orangePerBasketLabel")}
                onChange={(event) => {
                  setPerBasketAnswer(event.target.value);
                  reset();
                }}
              />
              {t("exercise.share.oranges")}
            </span>
          </label>
          <label>
            <span>{t("exercise.share.orangeRemainder")}</span>
            <span className={styles.sharingAnswerLine}>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                placeholder="?"
                value={remainderAnswer}
                aria-label={t("exercise.share.orangeRemainderLabel")}
                onChange={(event) => {
                  setRemainderAnswer(event.target.value);
                  reset();
                }}
              />
              {t("exercise.share.orangesInStart")}
            </span>
          </label>
        </div>
      </section>
    </ActivityShell>
  );
}
