import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { PRIMARY_ONE_MODULES } from "./course-catalogue";
import { PrimaryOneLessonPage } from "./PrimaryOneLessonPage";

const lesson = PRIMARY_ONE_MODULES[0].lessons[0];
const lessonRoute = `/apprentissages/primaire/1/mathematiques/modules/${lesson.moduleId}/lecons/${lesson.id}`;

function renderLesson() {
  return render(
    <MemoryRouter initialEntries={[lessonRoute]}>
      <Routes>
        <Route
          path="/apprentissages/primaire/1/mathematiques/modules/:moduleId/lecons/:lessonId"
          element={<PrimaryOneLessonPage />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Parcours d'une leçon", () => {
  beforeEach(async () => {
    localStorage.clear();
    await act(() => i18next.changeLanguage("fr"));
  });

  it("reprend la dernière étape non terminée après remontage de l'application", async () => {
    const user = userEvent.setup();
    const firstRender = renderLesson();
    expect(screen.getByText(/Étape 1 sur 3 — Je découvre/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /continuer/i }));
    expect(screen.getByText(/Étape 2 sur 3 — Je manipule/i)).toBeInTheDocument();
    firstRender.unmount();

    renderLesson();
    expect(screen.getByText(/Étape 2 sur 3 — Je manipule/i)).toBeInTheDocument();
  });

  it("termine une leçon et propose les deux actions attendues", async () => {
    const user = userEvent.setup();
    renderLesson();

    await user.click(screen.getByRole("button", { name: /continuer/i }));
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    await user.click(screen.getByRole("button", { name: /terminer la leçon/i }));

    expect(screen.getByRole("heading", { name: /bravo, la leçon est terminée/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /retour au module/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /leçon suivante/i })).toBeInTheDocument();
  });
});
