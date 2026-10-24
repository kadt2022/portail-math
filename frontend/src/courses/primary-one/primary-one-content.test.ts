import { beforeEach, describe, expect, it } from "vitest";
import i18next from "i18next";
import { getAllLearningItems, getLearningItems, PRIMARY_ONE_FINAL, PRIMARY_ONE_MODULES, questionsForStep } from "./course-catalogue";
import { completeLearningStep, createEmptyCourseProgress, getCoursePrimaryAction, getCourseProgress } from "./course-progress";
import { isCorrect, solutionResponse } from "./exercise-model";
import { EVALUATIONS, LESSON_CONTENT } from "./lesson-content";
import { getAssessmentSummary, getResult, recordResponse, restartQuestion, RESULTS_KEY } from "./learning-results";
import { normalizePrimaryOneProgress } from "./normalize-progress";

const allQuestions = getAllLearningItems().flatMap((item) => item.steps.flatMap((step) => questionsForStep(item,step)));
function finish(item: ReturnType<typeof getAllLearningItems>[number], progress = createEmptyCourseProgress()) {
  return item.steps.reduce((current,step) => {
    questionsForStep(item,step).forEach((q) => recordResponse(q,solutionResponse(q)));
    return completeLearningStep(current,item,step.id);
  },progress);
}

describe("Contenu RDC et validation des exercices", () => {
  beforeEach(() => localStorage.clear());
  it("offre les 40 leçons, 10 évaluations et 8 questions finales avec leurs textes français", () => {
    expect(PRIMARY_ONE_MODULES.map((m) => m.lessons.length)).toEqual([4,4,4,4,5,5,4,4,4,2]);
    expect(Object.keys(LESSON_CONTENT)).toHaveLength(40);
    expect(Object.keys(EVALUATIONS)).toHaveLength(11);
    expect(EVALUATIONS[PRIMARY_ONE_FINAL.id]).toHaveLength(8);
    expect(allQuestions).toHaveLength(288);
    expect(new Set(allQuestions.map((q) => q.id)).size).toBe(288);
    for (const item of getAllLearningItems()) {
      expect(i18next.exists(item.titleKey,{ns:"primaryOne",lng:"fr"})).toBe(true);
      for (const step of item.steps) for (const q of questionsForStep(item,step)) {
        for (const key of [q.promptKey,q.hintKey,q.explanationKey]) expect(i18next.exists(key,{ns:"primaryOne",lng:"fr"})).toBe(true);
      }
    }
  });
  it.each(allQuestions)("$id accepte la réponse attendue et refuse une réponse incorrecte", (q) => {
    expect(isCorrect(q,solutionResponse(q))).toBe(true);
    expect(isCorrect(q,{text:"incorrect",numbers:[999],values:["incorrect"]})).toBe(false);
    expect(isCorrect(q,{})).toBe(false);
  });
  it("accepte plusieurs décompositions et refuse de répéter une même façon", () => {
    const q=LESSON_CONTENT["MATH-1P-U03-L04"].practice[1];
    expect(isCorrect(q,{numbers:[5,4,6,3]})).toBe(true);
    expect(isCorrect(q,{numbers:[5,4,4,5]})).toBe(false);
    const between=LESSON_CONTENT["MATH-1P-U04-L03"].practice[2];
    expect(isCorrect(between,{text:"6"})).toBe(true);
    expect(isCorrect(between,{text:"7"})).toBe(true);
  });
  it("distingue les tentatives, la correction et la réussite autonome après rechargement", () => {
    const qs=EVALUATIONS["MATH-1P-U02-EVAL"];
    expect(recordResponse(qs[0],{}).correct).toBe(false);
    recordResponse(qs[0],solutionResponse(qs[0]));
    expect(getResult(qs[0])).toMatchObject({correct:true,attempts:2});
    expect(getAssessmentSummary(qs)).toMatchObject({correct:1,firstTry:0,total:4});
    expect(getAssessmentSummary(qs).reviewLessonIds).toContain(qs[0].reviewLessonId);
  });
  it("reprend les prototypes sans transformer leurs clics en acquis", () => {
    const lesson=PRIMARY_ONE_MODULES[0].lessons[0];
    const progress=createEmptyCourseProgress();
    progress.items[lesson.id]={moduleId:lesson.moduleId,itemId:lesson.id,currentStepId:`${lesson.id}-S03`,completedStepIds:[`${lesson.id}-S01`,`${lesson.id}-S02`,`${lesson.id}-S03`],completed:true,lastActivityAt:"2026-01-01"};
    const migrated=normalizePrimaryOneProgress(progress).items[lesson.id];
    expect(migrated.completed).toBe(false);
    expect(migrated.completedStepIds).toEqual([`${lesson.id}-S01`]);
    expect(migrated.currentStepId).toBe(`${lesson.id}-S04`);
    expect(progress.items[lesson.id].completed).toBe(true);
  });
  it("ne donne pas 100 % pour les quatre premières leçons et exige le bilan final", () => {
    let p=createEmptyCourseProgress();
    for (const item of getLearningItems(PRIMARY_ONE_MODULES[0])) p=finish(item,p);
    expect(getCourseProgress(p)).toMatchObject({completedLessons:4,totalLessons:40,completed:false});
    expect(getCourseProgress(p).percentage).toBeLessThan(10);
    for (const item of getAllLearningItems().filter((i) => i.id!==PRIMARY_ONE_FINAL.id)) p=finish(item,p);
    expect(getCourseProgress(p).percentage).toBeLessThan(100);
    expect(getCoursePrimaryAction(p)).toMatchObject({itemId:PRIMARY_ONE_FINAL.id});
    p=finish(PRIMARY_ONE_FINAL,p);
    expect(getCourseProgress(p)).toMatchObject({percentage:100,completed:true});
    expect(normalizePrimaryOneProgress(p)).toEqual(p);
  });
  it("ignore un stockage illisible et refuse les réponses de format invalide", () => {
    localStorage.setItem(RESULTS_KEY,"{invalide");
    expect(getResult(allQuestions[0])).toBeUndefined();
    expect(isCorrect(allQuestions[0],{numbers:"bad"} as never)).toBe(false);
    const zero=LESSON_CONTENT["MATH-1P-U02-L03"].practice[0];
    expect(isCorrect(zero,{text:""})).toBe(false);
    expect(isCorrect(zero,{text:"0"})).toBe(true);
  });
  it("refuse les cases non remplies d’une frise, même après avoir rempli la dernière case",()=>{
    const q=LESSON_CONTENT["MATH-1P-U01-L04"].practice[2];
    const values:string[]=[];values[0]="jaune";values[2]="jaune";values[4]="jaune";values[5]="vert";
    expect(isCorrect(q,{values})).toBe(false);
  });
  it("permet de refaire une question sans effacer le diagnostic du premier essai",()=>{
    const q=EVALUATIONS["MATH-1P-U02-EVAL"][0];
    recordResponse(q,{});recordResponse(q,solutionResponse(q));
    restartQuestion(q,{});
    expect(getResult(q)?.correct).toBe(false);
    recordResponse(q,solutionResponse(q));
    expect(getAssessmentSummary([q])).toMatchObject({correct:1,firstTry:0});
    expect(getResult(q)?.attempts).toBe(3);
  });
});
