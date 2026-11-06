import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PRIMARY_ONE_MODULES, lessonPath, questionsForStep } from "./course-catalogue";
import { PrimaryOneLessonPage } from "./PrimaryOneLessonPage";
import { getAssessmentSummary, resetSessionLearningResults } from "./learning-results";
import { getSessionCourseProgress, resetSessionCourseProgress } from "../course-engine/useCourseProgress";
import { PRIMARY_ONE_COURSE_ID } from "./course-catalogue";

const lesson=PRIMARY_ONE_MODULES[0].lessons[0];
function renderLesson(id=lesson.id,moduleId=lesson.moduleId) {
  return render(<MemoryRouter initialEntries={[lessonPath(moduleId,id)]}><Routes><Route path="/apprentissages/primaire/1/mathematiques/modules/:moduleId/lecons/:lessonId" element={<PrimaryOneLessonPage />} /></Routes></MemoryRouter>);
}
describe("Parcours d’une leçon avec réponses vérifiées", () => {
  beforeEach(async () => {resetSessionCourseProgress();resetSessionLearningResults();localStorage.clear();await act(() => i18next.changeLanguage("fr"));});
  it("reprend l’étape et conserve une mauvaise tentative après rechargement",async () => {
    const user=userEvent.setup();
    const first=renderLesson();
    await user.click(screen.getByRole("button",{name:"Continuer"}));
    expect(screen.getByText(/Étape 2 sur 6 — Je comprends/)).toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:"Continuer"}));
    expect(screen.getByRole("button",{name:"Continuer"})).toBeDisabled();
    await user.click(screen.getByRole("button",{name:"Bouchon bleu"}));
    await user.click(screen.getByRole("button",{name:"Vérifier ma réponse"}));
    expect(screen.getByRole("button",{name:"Continuer"})).toBeDisabled();
    expect(getSessionCourseProgress(PRIMARY_ONE_COURSE_ID).items[lesson.id].completedStepIds).toHaveLength(2);
    first.unmount();renderLesson();
    expect(screen.getByText(/Étape 3 sur 6 — Je manipule/)).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Bouchon bleu"})).toHaveAttribute("aria-pressed","true");
    await user.click(screen.getByRole("button",{name:"Bouchon bleu"}));
    await user.click(screen.getByRole("button",{name:"Bouchon rouge 1"}));
    await user.click(screen.getByRole("button",{name:"Bouchon rouge 2"}));
    await user.click(screen.getByRole("button",{name:"Vérifier ma réponse"}));
    expect(screen.getByRole("button",{name:"Continuer"})).toBeEnabled();
  });
  it("termine les six étapes et propose la suite après les vrais exercices",async () => {
    const user=userEvent.setup();renderLesson();
    const next=async()=>user.click(screen.getByRole("button",{name:"Continuer"}));
    const verify=async()=>user.click(screen.getByRole("button",{name:"Vérifier ma réponse"}));
    await next();await next();
    await user.click(screen.getByRole("button",{name:"Bouchon rouge 1"}));await user.click(screen.getByRole("button",{name:"Bouchon rouge 2"}));await verify();await next();
    await user.click(screen.getByRole("button",{name:"Carré"}));await verify();await user.click(screen.getByRole("button",{name:"Question suivante"}));
    await user.click(screen.getByRole("button",{name:"Même couleur, tailles différentes"}));await verify();await user.click(screen.getByRole("button",{name:"Question suivante"}));
    await user.click(screen.getByRole("button",{name:"Petit cercle"}));await user.click(screen.getByRole("button",{name:"Grand cercle"}));await verify();await next();
    await user.click(screen.getByRole("button",{name:"Cercle 1"}));await user.click(screen.getByRole("button",{name:"Cercle 2"}));await verify();await next();
    expect(screen.getByRole("button",{name:"Terminer la leçon"})).toBeDisabled();
    await user.click(screen.getByRole("button",{name:"Petit cercle"}));await user.click(screen.getByRole("button",{name:"Grand cercle"}));await verify();
    await user.click(screen.getByRole("button",{name:"Terminer la leçon"}));
    expect(screen.getByRole("heading",{name:/bravo, la leçon est terminée/i})).toBeInTheDocument();
    expect(screen.getByRole("link",{name:/leçon suivante/i})).toHaveAttribute("href",lessonPath(lesson.moduleId,PRIMARY_ONE_MODULES[0].lessons[1].id));
    expect(getSessionCourseProgress(PRIMARY_ONE_COURSE_ID).items[lesson.id].completed).toBe(true);
    expect(getAssessmentSummary(lesson.steps.flatMap((step) => questionsForStep(lesson, step)))).toMatchObject({ correct: 6, total: 6 });
  });
  it("affiche la vidéo de Yamba seulement dans l’étape Je découvre de la première leçon",async () => {
    const user=userEvent.setup();
    const videoName="Vidéo de Yamba : Même ou différent ?";
    const first=renderLesson();
    expect(screen.getByText(/Étape 1 sur 6 — Je découvre/)).toBeInTheDocument();
    expect(screen.getByLabelText(videoName)).toHaveAttribute("src",expect.stringContaining("meme-ou-different"));
    await user.click(screen.getByRole("button",{name:"Continuer"}));
    expect(screen.getByText(/Étape 2 sur 6 — Je comprends/)).toBeInTheDocument();
    expect(screen.queryByLabelText(videoName)).not.toBeInTheDocument();
    first.unmount();
    const other=PRIMARY_ONE_MODULES[0].lessons[2];renderLesson(other.id,other.moduleId);
    expect(screen.getByText(/Étape 1 sur 6 — Je découvre/)).toBeInTheDocument();
    expect(document.querySelector("video")).toBeNull();
  });
  it("intègre la vidéo du tri uniquement à la découverte et conserve la progression pendant sa lecture",async () => {
    const user=userEvent.setup();
    const sorting=PRIMARY_ONE_MODULES[0].lessons[1];
    renderLesson(sorting.id,sorting.moduleId);
    const video=screen.getByLabelText("Vidéo de Yamba : Je trie par couleur ou par forme");
    expect(video).toHaveAttribute("src",expect.stringContaining("tri-couleur-forme"));
    expect(video).toHaveAttribute("controls");
    expect(video).toHaveAttribute("playsinline");
    fireEvent.play(video);fireEvent.ended(video);
    expect(getSessionCourseProgress(PRIMARY_ONE_COURSE_ID).items[sorting.id].completedStepIds).toHaveLength(0);
    await user.click(screen.getByRole("button",{name:"Continuer"}));
    expect(screen.getByText(/Étape 2 sur 6 — Je comprends/)).toBeInTheDocument();
    expect(document.querySelector("video")).toBeNull();
  });
  it("laisse la progression inchangée pendant et après la lecture de la vidéo",async () => {
    const user=userEvent.setup();renderLesson();
    const video=screen.getByLabelText("Vidéo de Yamba : Même ou différent ?");
    fireEvent.play(video);fireEvent.ended(video);
    const stored=()=>getSessionCourseProgress(PRIMARY_ONE_COURSE_ID).items[lesson.id];
    expect(stored().completedStepIds).toHaveLength(0);
    expect(screen.getByRole("button",{name:"Continuer"})).toBeEnabled();
    await user.click(screen.getByRole("button",{name:"Continuer"}));
    expect(screen.getByText(/Étape 2 sur 6 — Je comprends/)).toBeInTheDocument();
    expect(stored().completedStepIds).toHaveLength(1);
  });
  it("affiche les résultats d’une évaluation et un lien de révision après une erreur",async () => {
    const user=userEvent.setup();const item=PRIMARY_ONE_MODULES[9].evaluation;renderLesson(item.id,item.moduleId);
    const finishOrder=async()=>{for(const v of ["matin","après-midi","soir"]) await user.click(screen.getByRole("button",{name:v}));};
    await user.click(screen.getByRole("button",{name:"Vérifier ma réponse"}));
    await finishOrder();await user.click(screen.getByRole("button",{name:"Vérifier ma réponse"}));await user.click(screen.getByRole("button",{name:"Continuer"}));
    for(const side of [1,2]) for(let i=0;i<6;i++) await user.click(screen.getByRole("button",{name:`Ajouter — Bol ${side}`}));
    await user.click(screen.getByRole("button",{name:"Vérifier ma réponse"}));await user.click(screen.getByRole("button",{name:"Terminer l'évaluation"}));
    expect(screen.getByText("1 réussite au premier essai sur 2")).toBeInTheDocument();
    expect(screen.getByRole("link",{name:"Ma journée et ma semaine"})).toHaveAttribute("href",lessonPath("MATH-1P-U10","MATH-1P-U10-L01"));
  });
});
