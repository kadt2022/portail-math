import type { LaneIndex, PlannedChallenge } from "../domain/attempt";
import type { ChallengeFamily, Expression } from "../domain/challenge";
import { explain, type Explanation } from "../domain/explanation";
import { FractionRiverLevel } from "../domain/level";
import type { Random } from "../domain/random";
import { answerText, questionParts, signLabelOf, type QuestionPart, type SignLabel } from "./presentation";

// Cas d'utilisation de la traversée : le domaine décide, la scène montre, l'interface affiche. La session relie les
// trois sans dépendre ni de React ni de Babylon.js : la scène lui est passée par un port, l'interface lit sa vue.

/** Ce que la session demande à la scène 3D. Babylon.js l'implémente ; les tests utilisent un faux. */
export interface ScenePort {
  /** Étiquettes des trois panneaux de chaque embranchement, de gauche à droite. */
  setSigns(signs: readonly (readonly [SignLabel, SignLabel, SignLabel])[]): void;
  /** Montre le verdict d'un embranchement : panneau validé, ou barrage dans la voie choisie. */
  showVerdict(fork: number, chosenLane: LaneIndex, correct: boolean): void;
  /** Ramène le bateau au départ et efface les verdicts. */
  resetCrossing(): void;
  /** Le niveau est réussi : fête à l'arrivée. */
  celebrate(): void;
}

export type SessionPhase = "intro" | "sailing" | "wrong" | "completed";

export interface ChallengeView {
  rank: number;
  family: ChallengeFamily;
  expression: Expression;
  parts: readonly QuestionPart[];
  laneAnswers: readonly [string, string, string];
  rework: boolean;
}

export type FeedbackView =
  | { kind: "correct"; id: number; rank: number; answer: string }
  | { kind: "wrong"; id: number; rank: number; chosen: string; answer: string; correctLane: LaneIndex; explanation: Explanation; rework: true };

export interface SessionView {
  phase: SessionPhase;
  /** Rang du défi à venir (0 à 6). */
  rank: number;
  total: number;
  solved: number;
  attempt: number;
  challenge: ChallengeView | null;
  feedback: FeedbackView | null;
}

/** Événements publics de la partie : le point d'extension des futurs comptes et de la sauvegarde de progression. */
export type RiverGameEvent =
  | { type: "attempt-started"; attempt: number }
  | { type: "challenge-answered"; attempt: number; rank: number; challengeId: string; family: ChallengeFamily; correct: boolean }
  | { type: "attempt-failed"; attempt: number; rank: number }
  | { type: "level-completed"; attempts: number };

export interface RiverSessionOptions {
  random: Random;
  onView?: (view: SessionView) => void;
  onEvent?: (event: RiverGameEvent) => void;
}

function challengeView(planned: PlannedChallenge): ChallengeView {
  const [left, centre, right] = planned.lanes.map((option) => answerText(option.written));
  return {
    rank: planned.rank,
    family: planned.challenge.family,
    expression: planned.challenge.expression,
    parts: questionParts(planned.challenge.expression),
    laneAnswers: [left, centre, right],
    rework: planned.rework,
  };
}

export class RiverSession {
  private readonly level: FractionRiverLevel;
  private readonly viewListeners = new Set<(view: SessionView) => void>();
  private readonly eventListeners = new Set<(event: RiverGameEvent) => void>();
  private scene: ScenePort | null = null;
  private phase: SessionPhase = "intro";
  private feedback: FeedbackView | null = null;
  private feedbackId = 0;

  constructor({ random, onView, onEvent }: RiverSessionOptions) {
    this.level = new FractionRiverLevel(random);
    if (onView) this.viewListeners.add(onView);
    if (onEvent) this.eventListeners.add(onEvent);
  }

  /** S'abonne aux changements de vue ; renvoie de quoi se désabonner. */
  subscribe(listener: (view: SessionView) => void): () => void {
    this.viewListeners.add(listener);
    return () => this.viewListeners.delete(listener);
  }

  /** S'abonne aux événements publics de la partie ; renvoie de quoi se désabonner. */
  listen(listener: (event: RiverGameEvent) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private onEvent(event: RiverGameEvent): void {
    for (const listener of this.eventListeners) listener(event);
  }

  get view(): SessionView {
    const snapshot = this.level.snapshot;
    const current = this.level.challenge;
    return {
      phase: this.phase,
      rank: snapshot.index,
      total: snapshot.total,
      solved: snapshot.index,
      attempt: snapshot.attempts,
      challenge: current && this.phase !== "intro" ? challengeView(current) : null,
      feedback: this.feedback,
    };
  }

  /** La scène est prête : elle reçoit les panneaux de la tentative en cours. */
  attach(scene: ScenePort): void {
    this.scene = scene;
    this.sendSigns();
  }

  detach(): void {
    this.scene = null;
  }

  /** L'enfant largue les amarres : la traversée commence. */
  start(): void {
    if (this.phase !== "intro") return;
    this.phase = "sailing";
    this.onEvent({ type: "attempt-started", attempt: this.level.snapshot.attempts });
    this.publish();
  }

  /** Le bateau a franchi la ligne de décision d'un embranchement dans une voie : c'est sa réponse. */
  laneCrossed(fork: number, lane: LaneIndex): void {
    const current = this.level.challenge;
    if (this.phase !== "sailing" || !current || fork !== current.rank) return;
    const result = this.level.answer(lane);
    const attempt = this.level.snapshot.attempts;
    this.onEvent({ type: "challenge-answered", attempt, rank: current.rank, challengeId: current.challenge.id, family: current.challenge.family, correct: result.correct });
    this.scene?.showVerdict(fork, lane, result.correct);
    this.feedbackId += 1;
    if (result.correct) {
      this.feedback = { kind: "correct", id: this.feedbackId, rank: current.rank, answer: answerText(current.challenge.answer.written) };
      if (result.completed) {
        this.phase = "completed";
        this.scene?.celebrate();
        this.onEvent({ type: "level-completed", attempts: attempt });
      }
    } else {
      this.phase = "wrong";
      this.feedback = {
        kind: "wrong",
        id: this.feedbackId,
        rank: current.rank,
        chosen: answerText(result.chosen.written),
        answer: answerText(current.challenge.answer.written),
        correctLane: current.correctLane,
        explanation: explain(current.challenge, result.chosen),
        rework: true,
      };
      this.onEvent({ type: "attempt-failed", attempt, rank: current.rank });
    }
    this.publish();
  }

  /** Nouvelle traversée depuis le premier défi (après une erreur, une réussite, ou à la demande). */
  restart(): void {
    this.level.restart();
    this.feedback = null;
    this.phase = "sailing";
    this.scene?.resetCrossing();
    this.sendSigns();
    this.onEvent({ type: "attempt-started", attempt: this.level.snapshot.attempts });
    this.publish();
  }

  /** Efface un message de réussite une fois lu (les messages d'erreur restent jusqu'au recommencement). */
  dismissFeedback(id: number): void {
    if (this.feedback?.id === id && this.feedback.kind === "correct") {
      this.feedback = null;
      this.publish();
    }
  }

  private sendSigns(): void {
    if (!this.scene) return;
    const signs = this.level.snapshot.attempt.challenges.map((planned) => {
      const [left, centre, right] = planned.lanes.map((option) => signLabelOf(option.written));
      return [left, centre, right] as const;
    });
    this.scene.setSigns(signs);
  }

  private publish(): void {
    const view = this.view;
    for (const listener of this.viewListeners) listener(view);
  }
}
