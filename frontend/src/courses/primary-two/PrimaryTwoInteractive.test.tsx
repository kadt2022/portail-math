import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { AppRouter } from "../../app/AppRouter";
import { i18next } from "../../i18n/i18n";
import { getSessionCourseProgress, resetSessionCourseProgress } from "../course-engine/useCourseProgress";
import { INTERACTIVE_CONTENT } from "./content";
import { lessonPath, PRIMARY_TWO_COURSE } from "./course-catalogue";
import { solveActivity, validateButton } from "./test-support/solve-activity";

// Parcours complet de chaque leçon et évaluation pilotée par données :
// les six phases (ou les questions d'évaluation) sont résolues par
// l'interface, la navigation avance d'étape en étape, puis l'écran de fin
// s'affiche. Aucune progression n'est écrite dans le navigateur.

function moduleOf(itemId: string) {
  return itemId === "MATH-2P-BILAN" ? "MATH-2P-U10" : itemId.slice(0, "MATH-2P-U00".length);
}

describe("Parcours interactifs de 2e primaire (U01-EVAL à U10 et bilan)", () => {
  beforeEach(async () => {
    cleanup();
    resetSessionCourseProgress();
    localStorage.clear();
    sessionStorage.clear();
    await i18next.changeLanguage("fr");
  });

  afterEach(() => cleanup());

  it.each(INTERACTIVE_CONTENT.map((content) => [content.id, content] as const))(
    "%s se termine en passant par toutes ses étapes",
    async (id, content) => {
      window.history.pushState({}, "", `/app${lessonPath(moduleOf(id), id)}`);
      const { container } = render(<AppRouter />);
      await waitFor(() => expect(container.querySelector("#activity-title")).not.toBeNull());

      content.activities.forEach((activity, index) => {
        const panel = container.querySelector("section[aria-labelledby='activity-title']") as HTMLElement;
        // Une validation sans réponse ne doit jamais réussir.
        if (activity.type !== "rounds") {
          fireEvent.click(validateButton(panel));
          expect(panel.textContent, `${id} étape ${index + 1} validée à vide`).not.toContain("activité est réussie");
        }
        solveActivity(panel, activity);
        expect(screen.getByText(/activité est réussie/i), `${id} étape ${index + 1}`).toBeInTheDocument();
        const stored = getSessionCourseProgress(PRIMARY_TWO_COURSE.id).items[id];
        expect(stored.completedStepIds).toHaveLength(index + 1);
        fireEvent.click(screen.getByRole("button", { name: index === content.activities.length - 1 ? /terminer/i : /continuer/i }));
      });

      const finalTitle = id === "MATH-2P-BILAN" ? i18next.t("journey.courseFinished", { ns: "primaryTwo" }) : i18next.t(`${content.text}.complete`, { ns: "primaryTwoLessons" });
      expect(screen.getByRole("heading", { level: 1, name: finalTitle })).toBeInTheDocument();
      expect(getSessionCourseProgress(PRIMARY_TWO_COURSE.id).items[id].completed).toBe(true);
      expect(localStorage.length).toBe(0);
      expect(sessionStorage.length).toBe(0);
    },
  );
});
