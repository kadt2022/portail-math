import { drawChallenge, type AnswerOption, type Challenge, type ChallengeFamily } from "./challenge";
import type { Random } from "./random";

// Une tentative = sept défis, un par famille, chacun avec ses trois réponses réparties sur les voies gauche, centre et
// droite. Les questions à retravailler passent avant les questions nouvelles de leur famille, et les positions sont
// tirées de façon qu'un enfant qui retiendrait « gauche, centre, droite » ne puisse pas réussir.

export type LaneIndex = 0 | 1 | 2;

export const LANES: readonly LaneIndex[] = [0, 1, 2];

export interface PlannedChallenge {
  rank: number;
  challenge: Challenge;
  /** Réponse portée par chaque voie, de gauche à droite. */
  lanes: readonly [AnswerOption, AnswerOption, AnswerOption];
  correctLane: LaneIndex;
  /** Question reprise de la liste à retravailler. */
  rework: boolean;
}

export interface Attempt {
  number: number;
  challenges: readonly PlannedChallenge[];
}

/** Question échouée (ou pas encore réussie) et voie de sa bonne réponse lors de l'échec. */
export interface ReworkEntry {
  challenge: Challenge;
  correctLaneWhenFailed: LaneIndex;
}

const MIN_PER_LANE = 2;
const MAX_IN_A_ROW = 2;

/** Positions valides : chaque voie au moins deux fois sur sept, jamais trois fois de suite, et aucune position interdite. */
export function isValidLaneSequence(sequence: readonly LaneIndex[], forbidden: ReadonlyMap<number, LaneIndex> = new Map()): boolean {
  if (sequence.length >= LANES.length * MIN_PER_LANE) {
    for (const lane of LANES) {
      if (sequence.filter((value) => value === lane).length < MIN_PER_LANE) return false;
    }
  }
  let run = 1;
  for (let i = 1; i < sequence.length; i += 1) {
    run = sequence[i] === sequence[i - 1] ? run + 1 : 1;
    if (run > MAX_IN_A_ROW) return false;
  }
  return sequence.every((lane, index) => forbidden.get(index) !== lane);
}

/** Tire une suite de positions valide ; après de nombreux essais, construit une suite sûre à partir d'un motif. */
export function drawLaneSequence(length: number, random: Random, forbidden: ReadonlyMap<number, LaneIndex>): LaneIndex[] {
  for (let tries = 0; tries < 2000; tries += 1) {
    const candidate = Array.from({ length }, () => random.pick(LANES));
    if (isValidLaneSequence(candidate, forbidden)) return candidate;
  }
  // Motif de repli : rotation 0,1,2 décalée jusqu'à respecter les positions interdites.
  for (let shift = 0; shift < 3; shift += 1) {
    for (const order of [[0, 1, 2], [0, 2, 1]] as const) {
      const candidate = Array.from({ length }, (_, i) => order[(i + shift) % 3] as LaneIndex);
      if (isValidLaneSequence(candidate, forbidden)) return candidate;
    }
  }
  throw new Error("Aucune suite de positions valide.");
}

export interface PlanAttemptInput {
  number: number;
  families: readonly ChallengeFamily[];
  /** Liste à retravailler, de la plus ancienne à la plus récente. */
  rework: readonly ReworkEntry[];
  /** Questions de la tentative précédente : elles ne reviennent pas tout de suite (sauf à retravailler). */
  recent: ReadonlySet<string>;
  random: Random;
}

export function planAttempt({ number, families, rework, recent, random }: PlanAttemptInput): Attempt {
  const used = new Set<string>();
  const picks = families.map((family) => {
    const pending = rework.find((entry) => entry.challenge.family === family && !used.has(entry.challenge.id));
    if (pending) {
      used.add(pending.challenge.id);
      return { challenge: pending.challenge, rework: true, forbiddenLane: pending.correctLaneWhenFailed };
    }
    const avoid = new Set([...recent, ...used, ...rework.map((entry) => entry.challenge.id)]);
    const challenge = drawChallenge(family, random, avoid);
    used.add(challenge.id);
    return { challenge, rework: false, forbiddenLane: undefined };
  });

  const forbidden = new Map<number, LaneIndex>();
  picks.forEach((pick, index) => {
    if (pick.forbiddenLane !== undefined) forbidden.set(index, pick.forbiddenLane);
  });
  const sequence = drawLaneSequence(picks.length, random, forbidden);

  const challenges = picks.map((pick, rank): PlannedChallenge => {
    const correctLane = sequence[rank];
    const [first, second] = random.shuffle(pick.challenge.distractors);
    const others = [first, second];
    const lanes = LANES.map((lane) => (lane === correctLane ? pick.challenge.answer : (others.shift() as AnswerOption)));
    return { rank, challenge: pick.challenge, lanes: [lanes[0], lanes[1], lanes[2]], correctLane, rework: pick.rework };
  });
  return { number, challenges };
}
