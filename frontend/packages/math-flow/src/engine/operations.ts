// Les quatre opérations de la famille Math Flow. Le moteur ne connaît que cette interface : seule la multiplication est jouable
// pour le moment, les contraintes des trois autres sont prévues et testées, sans jeu associé.

export type OperationId = "addition" | "subtraction" | "multiplication" | "division";

export interface Operation {
  readonly id: OperationId;
  readonly symbol: string;
  /** Résultat calculé par le moteur. Il ne provient jamais du plateau. */
  compute(a: number, b: number): number;
  /**
   * Le couple est-il permis ? `easy` : premiers niveaux (soustraction sans résultat négatif ; division exacte).
   * La multiplication et l'addition acceptent tout couple.
   */
  accepts(a: number, b: number, easy?: boolean): boolean;
  /** Ordre des opérandes affichés, à partir des deux nombres dans leur ordre d'arrivée. */
  arrange(first: number, second: number): readonly [number, number];
}

export const ADDITION: Operation = {
  id: "addition",
  symbol: "+",
  compute: (a, b) => a + b,
  accepts: () => true,
  arrange: (first, second) => [first, second],
};

export const SUBTRACTION: Operation = {
  id: "subtraction",
  symbol: "−",
  compute: (a, b) => a - b,
  accepts: (a, b, easy = true) => !easy || a >= b,
  // Aux premiers niveaux, le plus grand nombre passe en premier pour éviter un résultat négatif.
  arrange: (first, second) => (first >= second ? [first, second] : [second, first]),
};

export const MULTIPLICATION: Operation = {
  id: "multiplication",
  symbol: "×",
  compute: (a, b) => a * b,
  accepts: () => true,
  arrange: (first, second) => [first, second],
};

export const DIVISION: Operation = {
  id: "division",
  symbol: "÷",
  compute: (a, b) => {
    if (b === 0) throw new Error("Division par zéro");
    return a / b;
  },
  accepts: (a, b, easy = true) => b !== 0 && (!easy || a % b === 0),
  // Le dividende est le plus grand des deux nombres ; le diviseur ne peut pas être nul.
  arrange: (first, second) => (first >= second ? [first, second] : [second, first]),
};

export const OPERATIONS: Readonly<Record<OperationId, Operation>> = { addition: ADDITION, subtraction: SUBTRACTION, multiplication: MULTIPLICATION, division: DIVISION };

export function getOperation(id: OperationId): Operation {
  return OPERATIONS[id];
}
