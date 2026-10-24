import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { PRIMARY_ONE_MODULES, lessonPath } from "./course-catalogue";
import { PrimaryOneLessonPage } from "./PrimaryOneLessonPage";
import { PRIMARY_ONE_PROGRESS_KEY } from "./progress-storage";
import { RESULTS_KEY } from "./learning-results";

const lesson=PRIMARY_ONE_MODULES[0].lessons[0];
function renderLesson(id=lesson.id,moduleId=lesson.moduleId) {
  return render(<MemoryRouter initialEntries={[lessonPath(moduleId,id)]}><Routes><Route path="/apprentissages/primaire/1/mathematiques/modules/:moduleId/lecons/:lessonId" element={<PrimaryOneLessonPage />} /></Routes></MemoryRouter>);
}
describe("Parcours d’une leçon avec réponses vérifiées", () => {
  beforeEach(async () => {localStorage.clear();await act(() => i18next.changeLanguage("fr"));});
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
    expect(JSON.parse(localStorage.getItem(PRIMARY_ONE_PROGRESS_KEY)!).items[lesson.id].completedStepIds).toHaveLength(2);
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
    expect(JSON.parse(localStorage.getItem(PRIMARY_ONE_PROGRESS_KEY)!).items[lesson.id].completed).toBe(true);
    expect(Object.keys(JSON.parse(localStorage.getItem(RESULTS_KEY)!))).toHaveLength(6);
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
