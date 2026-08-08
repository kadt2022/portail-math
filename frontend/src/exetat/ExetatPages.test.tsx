import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { i18next } from "../i18n/i18n";
import { ExetatCataloguePage, ExetatQuizPage, ExetatResultsPage } from "./ExetatPages";
import { PROGRESS_STORAGE_KEY } from "./progress-storage";

const currentQuestion = {
  quizId: "quiz-1",
  sourceQuizId: null,
  mode: "STANDARD",
  questionNumber: 1,
  totalQuestions: 5,
  question: {
    id: "cercle-001",
    topic: "Équation du cercle",
    difficulty: "EASY",
    statement: "Quel est le centre du cercle ?",
    choices: [
      { id: "A", label: "(0, 0)" },
      { id: "B", label: "(2, 3)" },
    ],
    points: 1,
  },
  score: 0,
  answered: false,
  answerResult: null,
} as const;

const standardResult = {
  quizId: "quiz-1",
  mode: "STANDARD",
  sourceQuizId: null,
  subjectId: "cercle",
  subjectName: "Le cercle",
  status: "COMPLETED",
  score: 4,
  totalQuestions: 5,
  percentage: 80,
  correctAnswers: 4,
  incorrectAnswers: 1,
  failedQuestionIds: ["cercle-001"],
  correctedQuestionIds: [],
  appreciation: "Très bien",
  startedAt: "2026-08-08T10:00:00Z",
  completedAt: "2026-08-08T10:05:00Z",
} as const;

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function renderQuiz(path = "/exetat/matieres/cercle/quiz") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/exetat/matieres/:subjectId/quiz" element={<ExetatQuizPage />} />
        <Route path="/exetat/quizzes/:quizId/resultats" element={<p>résultats atteints</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderResults(path = "/exetat/quizzes/quiz-1/resultats") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/exetat/quizzes/:quizId/resultats" element={<ExetatResultsPage />} />
        <Route path="/exetat/matieres/:subjectId/quiz" element={<p>quiz de révision atteint</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Parcours EXETAT React", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18next.changeLanguage("fr");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("charge le catalogue depuis l'API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse([
          {
            id: "cercle",
            name: "Le cercle",
            category: "Géométrie",
            description: "Réviser le cercle.",
            icon: "circle",
            questionCount: 5,
            topicCount: 4,
            estimatedMinutes: 10,
            difficulties: ["EASY"],
            status: "AVAILABLE",
          },
        ]),
      ),
    );

    render(
      <MemoryRouter>
        <ExetatCataloguePage />
      </MemoryRouter>,
    );

    expect(await screen.findByRole("heading", { name: "Le cercle" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /découvrir la matière/i })).toHaveAttribute(
      "href",
      "/exetat/matieres/cercle",
    );
  });

  it("démarre un quiz et affiche la correction de la réponse", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(
          {
            quizId: "quiz-1",
            sourceQuizId: null,
            subjectId: "cercle",
            subjectName: "Le cercle",
            mode: "STANDARD",
            totalQuestions: 5,
            currentQuestionNumber: 1,
            status: "IN_PROGRESS",
          },
          201,
        ),
      )
      .mockResolvedValueOnce(jsonResponse(currentQuestion))
      .mockResolvedValueOnce(
        jsonResponse({
          quizId: "quiz-1",
          questionId: "cercle-001",
          status: "SUCCESS",
          correct: true,
          selectedChoiceId: "B",
          correctChoiceId: "B",
          correctChoiceLabel: "(2, 3)",
          solution: {
            summary: "Le centre se lit directement.",
            steps: ["Repérer les coordonnées."],
            formula: "(x-a)² + (y-b)² = r²",
            advice: "Observe les signes.",
          },
          score: 1,
          correctAnswers: 1,
          answeredQuestions: 1,
          totalQuestions: 5,
          hasNextQuestion: true,
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderQuiz();

    expect(await screen.findByText("Quel est le centre du cercle ?")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /\(2, 3\)/ }));
    await user.click(screen.getByRole("button", { name: /valider ma réponse/i }));

    expect(await screen.findByText(/bravo, c'est la bonne réponse/i)).toBeInTheDocument();
    expect(screen.getByText("Le centre se lit directement.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/exetat/quizzes/quiz-1/answers",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("affiche l'erreur métier quand les résultats ne sont pas encore disponibles", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ message: "Réponds aux cinq questions avant de consulter ton score." }, 409),
      ),
    );

    renderResults();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Réponds aux cinq questions avant de consulter ton score.",
    );
  });

  it("affiche les résultats, les enregistre une seule fois et lance la révision", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(standardResult))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            quizId: "review-1",
            sourceQuizId: "quiz-1",
            subjectId: "cercle",
            subjectName: "Le cercle",
            mode: "REVIEW",
            totalQuestions: 1,
            currentQuestionNumber: 1,
            status: "IN_PROGRESS",
          },
          201,
        ),
      );
    vi.stubGlobal("fetch", fetchMock);

    renderResults();

    expect(await screen.findByText("80%")).toBeInTheDocument();
    const stored = JSON.parse(window.localStorage.getItem(PROGRESS_STORAGE_KEY) ?? "{}");
    expect(stored.subjects.cercle.attemptCount).toBe(1);
    expect(stored.recordedQuizIds).toEqual(["quiz-1"]);

    await user.click(screen.getByRole("button", { name: /revoir mes erreurs/i }));
    expect(await screen.findByText("quiz de révision atteint")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/exetat/quizzes/quiz-1/reviews",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("distingue le résultat d'une révision du score normal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({
          ...standardResult,
          quizId: "review-1",
          mode: "REVIEW",
          sourceQuizId: "quiz-1",
          correctedQuestionIds: ["cercle-001"],
          failedQuestionIds: [],
          percentage: 100,
          score: 1,
          totalQuestions: 1,
          correctAnswers: 1,
          incorrectAnswers: 0,
        }),
      ),
    );

    renderResults("/exetat/quizzes/review-1/resultats");

    expect(await screen.findByText("Révision terminée")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tes erreurs corrigées" })).toBeInTheDocument();
  });
});
