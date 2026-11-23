import { Fraction } from "./fraction";
import type { Random } from "./random";

// Les défis du niveau 1. Chaque famille a son rang dans la traversée (de la division simple à la fraction d'une
// quantité) et sait produire au moins trente variantes. Chaque mauvaise réponse proposée correspond à une erreur
// d'enfant précise : c'est elle qui choisit l'explication affichée après une erreur.

export const LEVEL_ONE_FAMILIES = [
  "division-small",
  "division",
  "fraction-as-division",
  "simplify",
  "equivalent-missing",
  "addition-same-denominator",
  "fraction-of-quantity",
] as const;

export type ChallengeFamily = (typeof LEVEL_ONE_FAMILIES)[number];

/** Écriture d'une fraction telle qu'elle est montrée (6/12 reste 6/12), indépendamment de sa valeur. */
export interface WrittenFraction {
  numerator: number;
  denominator: number;
}

export type Written = { kind: "integer"; value: number } | ({ kind: "fraction" } & WrittenFraction);

export type Expression =
  | { kind: "division"; dividend: number; divisor: number }
  | { kind: "fraction"; fraction: WrittenFraction }
  | { kind: "equivalent"; left: WrittenFraction; rightDenominator: number }
  | { kind: "sum"; left: WrittenFraction; right: WrittenFraction }
  | { kind: "fraction-of"; part: WrittenFraction; quantity: number };

export type MistakeCode =
  | "copied-divisor"
  | "subtracted"
  | "halved"
  | "numerator-only"
  | "inverted"
  | "neighbour"
  | "added-instead-of-multiplied"
  | "numerator-unchanged"
  | "added-denominators"
  | "kept-one-numerator"
  | "remainder-instead-of-part"
  | "multiplied-instead-of-divided"
  | "copied-denominator";

export interface AnswerOption {
  written: Written;
  value: Fraction;
  /** Erreur que révèle ce choix ; absente pour la bonne réponse. */
  mistake: MistakeCode | null;
}

export interface Challenge {
  /** Identifiant stable d'une question (famille + nombres) : sert à la retravailler et à éviter les répétitions. */
  id: string;
  family: ChallengeFamily;
  expression: Expression;
  answer: AnswerOption;
  distractors: readonly [AnswerOption, AnswerOption];
}

export function integer(value: number): Written {
  return { kind: "integer", value };
}

export function fraction(numerator: number, denominator: number): Written {
  return { kind: "fraction", numerator, denominator };
}

export function valueOf(written: Written): Fraction {
  return written.kind === "integer" ? Fraction.integer(written.value) : Fraction.of(written.numerator, written.denominator);
}

function option(written: Written, mistake: MistakeCode | null): AnswerOption {
  return { written, value: valueOf(written), mistake };
}

/**
 * Garde les deux premières mauvaises réponses valables : strictement positives, de valeur différente de la bonne
 * réponse et l'une de l'autre (jamais 2/4 à côté de 1/2).
 */
function pickDistractors(answer: AnswerOption, candidates: readonly AnswerOption[]): readonly [AnswerOption, AnswerOption] {
  const kept: AnswerOption[] = [];
  for (const candidate of candidates) {
    if (candidate.value.numerator <= 0) continue;
    if (candidate.value.equals(answer.value)) continue;
    if (kept.some((other) => other.value.equals(candidate.value))) continue;
    kept.push(candidate);
    if (kept.length === 2) return [kept[0], kept[1]];
  }
  throw new Error(`Pas assez de mauvaises réponses valables pour ${answer.value.toString()}.`);
}

function neighbours(value: number): AnswerOption[] {
  return [option(integer(value + 1), "neighbour"), option(integer(value - 1), "neighbour"), option(integer(value + 2), "neighbour")];
}

function build(family: ChallengeFamily, signature: string, expression: Expression, answer: AnswerOption, candidates: AnswerOption[]): Challenge {
  return { id: `${family}:${signature}`, family, expression, answer, distractors: pickDistractors(answer, candidates) };
}

function divisionChallenge(family: ChallengeFamily, divisor: number, quotient: number): Challenge {
  const dividend = divisor * quotient;
  return build(family, `${dividend}/${divisor}`, { kind: "division", dividend, divisor }, option(integer(quotient), null), [
    option(integer(divisor), "copied-divisor"),
    option(integer(dividend - divisor), "subtracted"),
    ...neighbours(quotient),
  ]);
}

const PROPER_FRACTIONS: readonly WrittenFraction[] = [
  { numerator: 1, denominator: 2 },
  { numerator: 1, denominator: 3 },
  { numerator: 2, denominator: 3 },
  { numerator: 1, denominator: 4 },
  { numerator: 3, denominator: 4 },
  { numerator: 1, denominator: 5 },
  { numerator: 2, denominator: 5 },
  { numerator: 3, denominator: 5 },
];

/** Fraction usuelle voisine (même famille de dénominateurs) : l'erreur de l'enfant qui « simplifie à l'œil ». */
function nearbyFractions(target: WrittenFraction): AnswerOption[] {
  return PROPER_FRACTIONS.filter((candidate) => candidate.denominator === target.denominator || candidate.denominator === target.denominator + 1 || candidate.denominator === target.denominator - 1)
    .map((candidate) => option(fraction(candidate.numerator, candidate.denominator), "neighbour"));
}

const generators: Record<ChallengeFamily, () => Challenge[]> = {
  // 12 ÷ 4 = 3 — tables de 2 à 5.
  "division-small": () => {
    const list: Challenge[] = [];
    for (let divisor = 2; divisor <= 5; divisor += 1) {
      for (let quotient = 2; quotient <= 9; quotient += 1) list.push(divisionChallenge("division-small", divisor, quotient));
    }
    return list;
  },
  // 42 ÷ 7 = 6 — tables jusqu'à 10.
  division: () => {
    const list: Challenge[] = [];
    for (let divisor = 6; divisor <= 10; divisor += 1) {
      for (let quotient = 3; quotient <= 10; quotient += 1) list.push(divisionChallenge("division", divisor, quotient));
    }
    return list;
  },
  // 8/4 = 2 — une fraction est une division.
  "fraction-as-division": () => {
    const list: Challenge[] = [];
    for (let denominator = 2; denominator <= 6; denominator += 1) {
      for (let quotient = 2; quotient <= 7; quotient += 1) {
        const numerator = denominator * quotient;
        const candidates = [option(fraction(denominator, numerator), "inverted")];
        if (numerator % 2 === 0) candidates.push(option(integer(numerator / 2), "halved"));
        candidates.push(option(integer(numerator), "numerator-only"), ...neighbours(quotient));
        list.push(build("fraction-as-division", `${numerator}/${denominator}`, { kind: "fraction", fraction: { numerator, denominator } }, option(integer(quotient), null), candidates));
      }
    }
    return list;
  },
  // 6/12 = 1/2 — simplifier.
  simplify: () => {
    const list: Challenge[] = [];
    for (const reduced of PROPER_FRACTIONS) {
      for (let factor = 2; factor <= 6; factor += 1) {
        const written = { numerator: reduced.numerator * factor, denominator: reduced.denominator * factor };
        const inverted = reduced.numerator === 1 ? integer(reduced.denominator) : fraction(reduced.denominator, reduced.numerator);
        list.push(
          build("simplify", `${written.numerator}/${written.denominator}`, { kind: "fraction", fraction: written }, option(fraction(reduced.numerator, reduced.denominator), null), [
            option(inverted, "inverted"),
            ...nearbyFractions(reduced),
          ]),
        );
      }
    }
    return list;
  },
  // 2/3 = ?/9 — réponse 6.
  "equivalent-missing": () => {
    const list: Challenge[] = [];
    for (const base of PROPER_FRACTIONS) {
      for (let factor = 2; factor <= 5; factor += 1) {
        const rightDenominator = base.denominator * factor;
        list.push(
          build("equivalent-missing", `${base.numerator}/${base.denominator}=?/${rightDenominator}`, { kind: "equivalent", left: base, rightDenominator }, option(integer(base.numerator * factor), null), [
            option(integer(base.numerator + rightDenominator - base.denominator), "added-instead-of-multiplied"),
            option(integer(base.numerator), "numerator-unchanged"),
            ...neighbours(base.numerator * factor),
          ]),
        );
      }
    }
    return list;
  },
  // 1/5 + 2/5 = 3/5 — même dénominateur, résultat écrit tel qu'il vient de l'addition.
  "addition-same-denominator": () => {
    const list: Challenge[] = [];
    for (let denominator = 3; denominator <= 9; denominator += 1) {
      for (let first = 1; first < denominator - 1; first += 1) {
        for (let second = first; first + second < denominator; second += 1) {
          const total = first + second;
          list.push(
            build("addition-same-denominator", `${first}/${denominator}+${second}/${denominator}`,
              { kind: "sum", left: { numerator: first, denominator }, right: { numerator: second, denominator } },
              option(fraction(total, denominator), null),
              [
                option(fraction(total, denominator * 2), "added-denominators"),
                option(fraction(second, denominator), "kept-one-numerator"),
                option(fraction(first, denominator), "kept-one-numerator"),
                option(fraction(total + 1, denominator), "neighbour"),
              ]),
          );
        }
      }
    }
    return list;
  },
  // 1/3 de 12 = 4.
  "fraction-of-quantity": () => {
    const list: Challenge[] = [];
    for (let denominator = 2; denominator <= 5; denominator += 1) {
      for (let share = 2; share <= 9; share += 1) {
        const quantity = denominator * share;
        list.push(
          build("fraction-of-quantity", `1/${denominator}*${quantity}`, { kind: "fraction-of", part: { numerator: 1, denominator }, quantity }, option(integer(share), null), [
            option(integer(quantity - share), "remainder-instead-of-part"),
            option(integer(quantity * denominator), "multiplied-instead-of-divided"),
            option(integer(denominator), "copied-denominator"),
            ...neighbours(share),
          ]),
        );
      }
    }
    return list;
  },
};

const cache = new Map<ChallengeFamily, Challenge[]>();

/** Toutes les variantes d'une famille (calculées une fois). */
export function variantsOf(family: ChallengeFamily): readonly Challenge[] {
  let list = cache.get(family);
  if (!list) {
    list = generators[family]();
    cache.set(family, list);
  }
  return list;
}

/** Une question nouvelle de la famille, en évitant les identifiants donnés quand c'est possible. */
export function drawChallenge(family: ChallengeFamily, random: Random, avoid: ReadonlySet<string>): Challenge {
  const all = variantsOf(family);
  const fresh = all.filter((challenge) => !avoid.has(challenge.id));
  return random.pick(fresh.length > 0 ? fresh : all);
}

/** Bonne réponse d'une question, exprimée dans sa forme mathématique (pour vérifier les générateurs). */
export function expectedValue(expression: Expression): Fraction {
  switch (expression.kind) {
    case "division":
      return Fraction.integer(expression.dividend).dividedBy(Fraction.integer(expression.divisor));
    case "fraction":
      return Fraction.of(expression.fraction.numerator, expression.fraction.denominator);
    case "equivalent":
      // ?/d = a/b  ⇒  ? = a × d / b
      return Fraction.of(expression.left.numerator, expression.left.denominator).times(Fraction.integer(expression.rightDenominator));
    case "sum":
      return Fraction.of(expression.left.numerator, expression.left.denominator).plus(Fraction.of(expression.right.numerator, expression.right.denominator));
    case "fraction-of":
      return Fraction.of(expression.part.numerator, expression.part.denominator).times(Fraction.integer(expression.quantity));
  }
}
