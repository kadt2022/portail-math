import { planAttempt, type Attempt, type LaneIndex, type PlannedChallenge, type ReworkEntry } from "./attempt";
import { LEVEL_ONE_FAMILIES, type AnswerOption, type ChallengeFamily } from "./challenge";
import type { Random } from "./random";

// Niveau 1 — Première traversée : sept bonnes voies d'affilée. Une erreur met fin à la tentative ; la suivante repart
// du premier défi avec des questions renouvelées, sauf les questions à retravailler, qui restent dans la liste tant que
// l'enfant ne les a pas réussies (même si l'erreur est venue avant elles).

export type LevelPhase = "playing" | "failed" | "completed";

export interface AnswerResult {
  correct: boolean;
  planned: PlannedChallenge;
  chosenLane: LaneIndex;
  chosen: AnswerOption;
  /** Défis réussis dans la tentative en cours après cette réponse. */
  solved: number;
  completed: boolean;
}

export interface LevelSnapshot {
  phase: LevelPhase;
  attempt: Attempt;
  /** Rang du défi en cours (0 à 6) ; égal au nombre de défis réussis dans la tentative. */
  index: number;
  total: number;
  rework: readonly ReworkEntry[];
  /** Tentatives commencées depuis le début de la partie. */
  attempts: number;
}

export class FractionRiverLevel {
  private readonly random: Random;
  private readonly families: readonly ChallengeFamily[];
  private reworkList: ReworkEntry[] = [];
  private current: Attempt;
  private position = 0;
  private state: LevelPhase = "playing";

  constructor(random: Random, families: readonly ChallengeFamily[] = LEVEL_ONE_FAMILIES) {
    this.random = random;
    this.families = families;
    this.current = planAttempt({ number: 1, families, rework: [], recent: new Set(), random });
  }

  get snapshot(): LevelSnapshot {
    return {
      phase: this.state,
      attempt: this.current,
      index: this.position,
      total: this.families.length,
      rework: [...this.reworkList],
      attempts: this.current.number,
    };
  }

  /** Défi en cours, ou null si la tentative est terminée. */
  get challenge(): PlannedChallenge | null {
    return this.state === "playing" ? this.current.challenges[this.position] : null;
  }

  /** Le bateau a franchi la ligne de décision du défi en cours dans la voie donnée. */
  answer(lane: LaneIndex): AnswerResult {
    const planned = this.challenge;
    if (!planned) {
      throw new Error("Aucun défi en cours : la tentative est terminée.");
    }
    const chosen = planned.lanes[lane];
    const correct = lane === planned.correctLane;
    if (correct) {
      this.reworkList = this.reworkList.filter((entry) => entry.challenge.id !== planned.challenge.id);
      this.position += 1;
      if (this.position === this.current.challenges.length) this.state = "completed";
    } else {
      if (!this.reworkList.some((entry) => entry.challenge.id === planned.challenge.id)) {
        this.reworkList.push({ challenge: planned.challenge, correctLaneWhenFailed: planned.correctLane });
      } else {
        this.reworkList = this.reworkList.map((entry) => (entry.challenge.id === planned.challenge.id ? { ...entry, correctLaneWhenFailed: planned.correctLane } : entry));
      }
      this.state = "failed";
    }
    return { correct, planned, chosenLane: lane, chosen, solved: this.position, completed: this.state === "completed" };
  }

  /** Nouvelle tentative depuis le premier défi : après une erreur, une réussite, ou à la demande du joueur. */
  restart(): Attempt {
    const recent = new Set(this.current.challenges.map((planned) => planned.challenge.id));
    this.current = planAttempt({ number: this.current.number + 1, families: this.families, rework: this.reworkList, recent, random: this.random });
    this.position = 0;
    this.state = "playing";
    return this.current;
  }
}
