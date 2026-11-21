import { useCallback, useEffect, useReducer, useRef } from "react";

import type { LeoLivreurController, LeoLivreurSnapshot } from "./LeoLivreurGame";
import {
  currentAddress,
  currentQuestion,
  initialMission,
  missionReducer,
  newSeed,
  type MissionState,
} from "./leoMission";
import { isCorrect, parseAnswer } from "./leoQuestions";

export interface LeoMission {
  state: MissionState;
  /** Commencer : ouvre la pizzeria (commandes et question de chargement). */
  start(): void;
  answer(value: string): void;
  depart(): void;
  /** Clic sur LIVRER. */
  deliver(): void;
  /** Après une question réussie : maison suivante, question de bilan des pizzas, ou bilan de la tournée. */
  next(): void;
  /** Ferme la notification de livraison manquée. */
  dismissNotice(): void;
  /** Après le bilan d'une tournée : retour au restaurant ou bilan final. */
  nextTour(): void;
  /** Nouvelle partie, avec de nouvelles commandes et de nouvelles questions. */
  replay(): void;
  /** Bouton LIVRER visible : conduite en cours et Léo arrêté dans la zone de la bonne maison. */
  canDeliver: boolean;
}

/**
 * Relie la mission (état pur, `missionReducer`) à la scène de conduite : destination, conduite neutralisée pendant le
 * restaurant, la remise et les questions, animation de remise, retour au restaurant et signaux sonores.
 * `seed` : partie reproductible (tests) ; sans graine, chaque partie est différente.
 */
export function useLeoMission(controller: LeoLivreurController | null, snapshot: LeoLivreurSnapshot, seed?: number): LeoMission {
  const [state, dispatch] = useReducer(missionReducer, seed ?? 0, (value) => initialMission(seed === undefined ? newSeed() : value));
  const address = currentAddress(state);
  const stage = state.stage;

  // La scène vise toujours la maison en cours : distance restante et repères la suivent dès le restaurant.
  useEffect(() => {
    controller?.setDestination(address.destination);
  }, [controller, address]);

  // Maison entièrement dépassée sans livraison : la mission la déclare manquée (une seule fois, dans l'ordre). Le nom
  // de la destination publié par la scène doit être celui de la maison en cours : aucun ancien instantané ne compte.
  const passed = snapshot.destinationStatus === "passed" && snapshot.targetLabel === address.label;
  useEffect(() => {
    if (stage === "driving" && passed) dispatch({ type: "passed", ids: [address.id] });
  }, [stage, passed, address]);

  // Une seule animation par remise, même si l'effet est rejoué (mode strict de React, nouveau rendu).
  const handover = useRef<{ key: string; done: Promise<void> } | null>(null);
  const handoverKey = `${state.plan.seed}-${state.tour}-${state.stop}`;

  // Conduite rendue seulement sur la route ; partout ailleurs (restaurant, remise, question, bilans), Léo reste arrêté.
  useEffect(() => {
    if (!controller || stage === "welcome") return;
    if (stage === "driving") {
      controller.resumeDriving();
      return;
    }
    controller.lockDriving();
    if (stage === "handover") {
      if (handover.current?.key !== handoverKey) handover.current = { key: handoverKey, done: controller.handOver() };
      let cancelled = false;
      void handover.current.done.then(() => {
        if (!cancelled) dispatch({ type: "handover-done" });
      });
      return () => {
        cancelled = true;
      };
    }
    if (stage === "returning") {
      controller.returnToRestaurant();
      dispatch({ type: "returned" });
    }
    return undefined;
  }, [controller, stage, handoverKey]);

  const answer = useCallback(
    (value: string) => {
      const question = currentQuestion(state);
      if (!question || state.solved || parseAnswer(value) === null) return;
      controller?.cue(isCorrect(question, value) ? "correct" : "retry");
      dispatch({ type: "answer", value });
    },
    [controller, state],
  );

  const arrived = snapshot.phase === "ARRIVED" && snapshot.targetLabel === address.label;
  return {
    state,
    start: () => dispatch({ type: "open-restaurant" }),
    answer,
    depart: () => dispatch({ type: "depart", meters: snapshot.travelledMeters }),
    deliver: () => dispatch({ type: "deliver", stoppedAt: arrived ? address.id : null }),
    next: () => dispatch({ type: "continue", meters: snapshot.travelledMeters }),
    nextTour: () => dispatch({ type: "next-tour" }),
    dismissNotice: () => dispatch({ type: "dismiss-notice" }),
    replay: () => {
      controller?.reset();
      dispatch({ type: "replay", seed: seed === undefined ? newSeed() : seed + 1 });
      dispatch({ type: "open-restaurant" });
    },
    canDeliver: stage === "driving" && arrived,
  };
}
