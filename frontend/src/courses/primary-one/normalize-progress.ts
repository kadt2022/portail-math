import type { CourseProgress } from "../course-engine/course-progress";
import { getAllLearningItems, questionsForStep } from "./course-catalogue";
import { getResult, loadResults } from "./learning-results";

// Prototype clicks have no exercise evidence. Preserve reading progress and
// the original identifiers while requiring a real answer for interactive work.
export function normalizePrimaryOneProgress(progress: CourseProgress): CourseProgress {
  let changed = false;
  const items = { ...progress.items };
  const results = loadResults();
  for (const item of getAllLearningItems()) {
    const saved = items[item.id];
    if (!saved) continue;
    if (!Array.isArray(saved.completedStepIds) || typeof saved.lastActivityAt !== "string") { delete items[item.id]; changed = true; continue; }
    const ids = item.steps.filter((step) => {
      if (!saved.completedStepIds.includes(step.id)) return false;
      return questionsForStep(item, step).every((q) => getResult(q,results)?.correct);
    }).map((step) => step.id);
    const next = item.steps.find((s) => !ids.includes(s.id));
    const completed = !next;
    if (saved.completed !== completed || ids.join() !== saved.completedStepIds.join() || (!completed && saved.currentStepId !== next?.id)) {
      items[item.id] = { ...saved, completedStepIds: ids, completed, currentStepId: next?.id ?? saved.currentStepId };
      changed = true;
    }
  }
  return changed ? { ...progress, items } : progress;
}
