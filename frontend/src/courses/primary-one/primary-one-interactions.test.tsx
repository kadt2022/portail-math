import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrimaryOneActivity, PrimaryOneQuestion } from "./PrimaryOneActivity";
import { LESSON_CONTENT } from "./lesson-content";
import { solutionResponse, type Question } from "./exercise-model";
import { getResult, recordResponse } from "./learning-results";

const kinds=new Map<string,Question>();
Object.values(LESSON_CONTENT).flatMap((l)=>[...l.manipulate,...l.practice,...l.play,...l.remember]).forEach((q)=>{if(!kinds.has(q.kind))kinds.set(q.kind,q);});
describe("Interactions accessibles de 1re primaire",()=>{
  beforeEach(async()=>{cleanup();localStorage.clear();await act(()=>i18next.changeLanguage("fr"));});
  it.each([...kinds.values()])("$kind exige une réponse et permet de réussir avec les contrôles",async(q)=>{
    const user=userEvent.setup();const onValidated=vi.fn();render(<PrimaryOneQuestion question={q} onValidated={onValidated}/>);
    const verify=()=>user.click(screen.getByRole("button",{name:"Vérifier ma réponse"}));
    await verify();expect(onValidated).not.toHaveBeenCalled();
    const add=async(label:string,count:number)=>{for(let i=0;i<count;i++)await user.click(screen.getByRole("button",{name:`Ajouter — ${label}`}));};
    switch(q.kind){
      case "choice":await user.click(screen.getByRole("button",{name:q.answers[0]}));break;
      case "select":for(const n of q.answers)await user.click(screen.getByRole("button",{name:q.cards[n].label}));break;
      case "order":for(const v of q.answer)await user.click(screen.getByRole("button",{name:v}));break;
      case "number":await user.type(screen.getByRole("spinbutton"),String(q.answer));break;
      case "build":await add("Quantité",q.target-(q.initial??0));break;
      case "remove":for(let i=0;i<q.remove;i++)await user.click(screen.getByRole("button",{name:`Objet ${i+1}`}));break;
      case "split":for(let w=0;w<q.ways;w++){
        const section=screen.getByRole("heading",{name:`Façon ${w+1}`}).closest("section")!;
        const a=q.equal?q.total/2:w;const b=q.total-a;
        for(let i=0;i<a;i++)await user.click(within(section).getByRole("button",{name:"Ajouter — Bol 1"}));
        for(let i=0;i<b;i++)await user.click(within(section).getByRole("button",{name:"Ajouter — Bol 2"}));
      }break;
      case "path":{
        const [x,y]=q.start??[0,2];for(let i=x;i<q.target[0];i++)await user.click(screen.getByRole("button",{name:"Aller à droite"}));for(let i=y;i>q.target[1];i--)await user.click(screen.getByRole("button",{name:"Monter"}));break;
      }
      case "position":await user.click(screen.getByRole("button",{name:new RegExp(q.answer==="gauche"?"À gauche":"À droite")}));break;
      case "pattern":for(let i=0;i<6;i++)await user.click(within(screen.getByRole("group",{name:`Case ${i+1}`})).getByRole("button",{name:i%2?"vert":"jaune"}));break;
      case "trace":for(const n of [1,5,3])await user.click(screen.getByRole("button",{name:`Point ${n}`}));break;
      case "measure":for(let i=0;i<q.units;i++)await user.click(screen.getByRole("button",{name:`Poser ou retirer l’unité ${i+1}`}));break;
      case "align":for(let i=0;i<2;i++)for(let n=0;n<(i===0?2:1);n++)await user.click(screen.getByRole("button",{name:`Retirer — Décalage du ruban ${i+1}`}));break;
      case "balance":{
        const stoneButtons=screen.getAllByRole("button",{name:"La pierre"});await user.click(stoneButtons[0]);await user.click(screen.getAllByRole("button",{name:"La feuille"})[0]);await user.click(stoneButtons[1]);break;
      }
      case "capacity":for(const [i,n]of q.targets.entries())await add(`Tasses du bol ${i+1}`,n);break;
      case "tens":await add("Dizaines",Math.floor(q.target/10));await add("Unités",q.target%10);break;
      case "house":for(const [i,part]of ["Le toit","Le mur","La porte","La fenêtre"].entries())await user.click(within(screen.getByRole("group",{name:part})).getByRole("button",{name:["Triangle △","Carré □","Rectangle ▭","Cercle ○"][i]}));break;
      case "story":await user.click(screen.getByRole("button",{name:"mangues"}));for(let i=0;i<q.remove;i++)await user.click(screen.getByRole("button",{name:`Objet ${i+1}`}));break;
      case "pair":for(let i=0;i<Math.min(q.left,q.right);i++)await user.click(screen.getByRole("button",{name:`Associer la paire ${i+1}`}));if(q.choices)await user.click(screen.getByRole("button",{name:q.answer}));else await user.type(screen.getByRole("spinbutton"),q.answer);break;
    }
    await verify();expect(onValidated).toHaveBeenCalledOnce();expect(getResult(q)).toMatchObject({correct:true,attempts:2});
  });
  it("permet l’échange de dix unités contre une dizaine sans perdre la quantité",async()=>{
    const q=LESSON_CONTENT["MATH-1P-U07-L03"].play[0];const onValidated=vi.fn();const user=userEvent.setup();render(<PrimaryOneQuestion question={q} onValidated={onValidated}/>);
    expect(screen.getByRole("button",{name:"Échanger dix unités contre une dizaine"})).toBeDisabled();
    for(let i=0;i<10;i++)await user.click(screen.getByRole("button",{name:"Ajouter — Unités"}));
    await user.click(screen.getByRole("button",{name:"Échanger dix unités contre une dizaine"}));
    expect(screen.getByText("1 × 10 + 0 = 10")).toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:"Vérifier ma réponse"}));expect(onValidated).toHaveBeenCalledOnce();
  });
  it("permet de réinitialiser un échange de dizaines effectué en trop",async()=>{
    const q=LESSON_CONTENT["MATH-1P-U07-L03"].play[0];const onValidated=vi.fn();const user=userEvent.setup();render(<PrimaryOneQuestion question={q} onValidated={onValidated}/>);
    for(let i=0;i<20;i++)await user.click(screen.getByRole("button",{name:"Ajouter — Unités"}));
    await user.click(screen.getByRole("button",{name:"Échanger dix unités contre une dizaine"}));
    await user.click(screen.getByRole("button",{name:"Échanger dix unités contre une dizaine"}));
    expect(screen.getByText("2 × 10 + 0 = 20")).toBeInTheDocument();
    await user.click(screen.getByRole("button",{name:"Recommencer la manipulation"}));
    expect(screen.getByText("0 × 10 + 0 = 0")).toBeInTheDocument();
    for(let i=0;i<10;i++)await user.click(screen.getByRole("button",{name:"Ajouter — Unités"}));
    await user.click(screen.getByRole("button",{name:"Échanger dix unités contre une dizaine"}));
    await user.click(screen.getByRole("button",{name:"Vérifier ma réponse"}));
    expect(onValidated).toHaveBeenCalledOnce();
  });
  it("revalide une étape après la reprise d’une question antérieure",async()=>{
    const questions=LESSON_CONTENT["MATH-1P-U01-L01"].practice;
    questions.forEach((question)=>recordResponse(question,solutionResponse(question)));
    const onValidated=vi.fn();const onRestart=vi.fn();const user=userEvent.setup();
    render(<PrimaryOneActivity questions={questions} completed onValidated={onValidated} onRestart={onRestart}/>);
    await user.click(screen.getByRole("button",{name:"Refaire cette question"}));
    expect(onRestart).toHaveBeenCalledOnce();
    const first=questions[0];if(first.kind!=="select")throw new Error("Question de test inattendue");
    for(const answer of first.answers)await user.click(screen.getByRole("button",{name:first.cards[answer].label}));
    await user.click(screen.getByRole("button",{name:"Vérifier ma réponse"}));
    expect(onValidated).toHaveBeenCalledOnce();
  });
  it("empêche de traverser un mur du labyrinthe",async()=>{
    const q=LESSON_CONTENT["MATH-1P-U09-L04"].play[0];const user=userEvent.setup();render(<PrimaryOneQuestion question={q} onValidated={vi.fn()}/>);
    await user.click(screen.getByRole("button",{name:"Aller à droite"}));await user.click(screen.getByRole("button",{name:"Monter"}));
    expect(screen.getByRole("img",{name:/colonne 2, ligne 3/})).toBeInTheDocument();
  });
});
