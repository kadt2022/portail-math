import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BrowserRouter } from "react-router-dom";

import { PRIMARY_COURSES } from "../app/course-navigation";
import { DashboardPage } from "./DashboardPage";

function renderDashboard() {
  return render(<BrowserRouter><DashboardPage /></BrowserRouter>);
}

describe("Tableau de bord", () => {
  it("présente un seul titre principal et les deux parcours", () => {
    renderDashboard();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Choisir un parcours" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Parcours primaire" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Parcours secondaire" })).toBeInTheDocument();
  });

  it("relie les quatre niveaux disponibles aux vraies routes des cours", () => {
    renderDashboard();
    const primary=screen.getByRole("region", { name: "Parcours primaire" });
    const links=within(primary).getAllByRole("link");
    expect(links).toHaveLength(4);
    PRIMARY_COURSES.filter(course => course.availability === "available").forEach((course,index) => {
      expect(links[index]).toHaveAttribute("href",course.route);
    });
  });

  it("affiche les niveaux en préparation sans faux lien", () => {
    renderDashboard();
    const primary=screen.getByRole("region", { name: "Parcours primaire" });
    const secondary=screen.getByRole("region", { name: "Parcours secondaire" });
    expect(primary.querySelectorAll('[aria-disabled="true"]')).toHaveLength(2);
    expect(secondary.querySelectorAll('[aria-disabled="true"]')).toHaveLength(6);
    expect(within(secondary).queryByRole("link")).not.toBeInTheDocument();
    expect(within(secondary).getAllByText("À venir")).toHaveLength(6);
  });

  it("ouvre la présentation, la bibliothèque, les jeux, la progression et l'EXETAT", () => {
    renderDashboard();
    expect(screen.getByRole("link", { name: /découvrir mbuyamba/i })).toHaveAttribute("href", "/a-propos");
    expect(screen.getByRole("link", { name: /apprendre et explorer la bibliothèque/i })).toHaveAttribute("href", "/bibliotheque");
    expect(screen.getByRole("link", { name: /apprendre aussi en jouant/i })).toHaveAttribute("href", "/jeux");
    expect(screen.getByRole("link", { name: /comprendre ses progrès/i })).toHaveAttribute("href", "/progression");
    expect(screen.getByRole("link", { name: /voir les jeux/i })).toHaveAttribute("href", "/jeux");
    expect(screen.getAllByRole("link", { name: /commencer/i }).some((link) => link.getAttribute("href") === "/exetat")).toBe(true);
  });
});
