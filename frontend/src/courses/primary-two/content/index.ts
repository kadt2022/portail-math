import type { ActivitySpec, LessonContent } from "../interactive/types";
import { UNIT_01 } from "./unit-01";
import { UNIT_02 } from "./unit-02";
import { UNIT_03 } from "./unit-03";
import { UNIT_04 } from "./unit-04";
import { UNIT_05 } from "./unit-05";
import { UNIT_06 } from "./unit-06";

// Registre des leçons et évaluations pilotées par données. Une entrée ici
// rend l'élément jouable ; le catalogue publie automatiquement chaque
// élément présent dans ce registre.

export const INTERACTIVE_CONTENT: readonly LessonContent[] = [...UNIT_01, ...UNIT_02, ...UNIT_03, ...UNIT_04, ...UNIT_05, ...UNIT_06];

const byId = new Map(INTERACTIVE_CONTENT.map((content) => [content.id, content]));

export function getInteractiveContent(itemId: string | undefined): LessonContent | undefined {
  return itemId ? byId.get(itemId) : undefined;
}

export function getInteractiveActivity(itemId: string, stepIndex: number): ActivitySpec | undefined {
  return byId.get(itemId)?.activities[stepIndex];
}
