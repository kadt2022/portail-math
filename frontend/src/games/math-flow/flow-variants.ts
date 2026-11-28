import { ADDITION, DIVISION, MULTIPLICATION, SUBTRACTION, type Operation } from "@mbuyamba/math-flow";

export type FlowVariantId = "addition" | "subtraction" | "multiplication" | "division";

/** Un jeu de la famille Flow : même principe, mêmes tableaux et même décor ; seule l'opération (et donc les textes) change. */
export interface FlowVariant {
  readonly id: FlowVariantId;
  /** Identifiant du jeu dans le catalogue et dans l'adresse. */
  readonly gameId: string;
  readonly operation: Operation;
  /** Racine des textes dans le namespace « games ». */
  readonly i18n: string;
}

export const FLOW_VARIANTS: Readonly<Record<FlowVariantId, FlowVariant>> = {
  addition: { id: "addition", gameId: "addi-flow", operation: ADDITION, i18n: "addiFlow" },
  subtraction: { id: "subtraction", gameId: "soustra-flow", operation: SUBTRACTION, i18n: "soustraFlow" },
  multiplication: { id: "multiplication", gameId: "multipli-flow", operation: MULTIPLICATION, i18n: "multipliFlow" },
  division: { id: "division", gameId: "divi-flow", operation: DIVISION, i18n: "diviFlow" },
};

export const FLOW_VARIANT_LIST: readonly FlowVariant[] = Object.values(FLOW_VARIANTS);
