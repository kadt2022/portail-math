import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { FreePathExamsPage, FreePathPage, FreePathTestsPage } from "./FreePathPages";
import { AppRouter } from "../app/AppRouter";
import { i18next } from "../i18n/i18n";

afterEach(async () => { vi.unstubAllGlobals(); await i18next.changeLanguage("fr"); });
describe("Parcours libre", () => {
 it.each(["fr", "en"])("la page de choix propose deux familles distinctes en %s", async language => {
  await i18next.changeLanguage(language);
  render(<MemoryRouter><FreePathPage /></MemoryRouter>);
  const cards = screen.getAllByRole("article");
  expect(cards).toHaveLength(2);
  expect(within(cards[0]).getByRole("link")).toHaveAttribute("href", "/parcours-libre/tests");
  expect(within(cards[1]).getByRole("link")).toHaveAttribute("href", "/parcours-libre/examens");
  expect(within(cards[0]).getByRole("heading")).toHaveTextContent(language === "fr" ? "Tests de raisonnement" : "Reasoning tests");
  expect(within(cards[1]).getByRole("heading")).toHaveTextContent(language === "fr" ? "Préparations aux examens" : "Exam preparation");
  expect(screen.queryByText(/TRM|EXETAT/)).not.toBeInTheDocument();
 });
 it.each(["fr", "en"])("la page des tests affiche TRM, QMT, MBD à venir en %s", async language => {
  await i18next.changeLanguage(language);
  render(<MemoryRouter><FreePathTestsPage /></MemoryRouter>);
  const cards = screen.getAllByRole("article");
  expect(cards).toHaveLength(3);
  ["TRM", "QMT", "MBD"].forEach((sigil, index) => {
   expect(within(cards[index]).getByRole("heading")).toHaveTextContent(sigil);
   expect(within(cards[index]).queryByRole("link")).not.toBeInTheDocument();
   expect(within(cards[index]).getByText(language === "fr" ? "Contenu à venir" : "Content coming soon")).toBeInTheDocument();
  });
  expect(screen.queryByText(/EXETAT|GRE|SAT|ACT|TOEFL|IELTS/)).not.toBeInTheDocument();
 });
 it.each(["fr", "en"])("la page des examens ne contient que l'EXETAT en %s", async language => {
  await i18next.changeLanguage(language);
  render(<MemoryRouter><FreePathExamsPage /></MemoryRouter>);
  const cards = screen.getAllByRole("article");
  expect(cards).toHaveLength(1);
  expect(within(cards[0]).getByRole("link")).toHaveAttribute("href", "/exetat");
  expect(within(cards[0]).getByText(language === "fr" ? "Disponible" : "Available")).toBeInTheDocument();
 });
 it("n'appelle aucune API et n'enregistre aucune progression", () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const storage = vi.spyOn(Storage.prototype, "setItem");
  render(<MemoryRouter><FreePathPage /></MemoryRouter>);
    expect(fetch).not.toHaveBeenCalled(); expect(storage).not.toHaveBeenCalled(); storage.mockRestore();
 });
 it("présente le Parcours libre comme section propre, hors des cartes primaire et secondaire", () => {
  window.history.pushState({}, "", "/app"); render(<AppRouter />);
  const section = screen.getByRole("region", { name: "Parcours libre" });
  expect(within(section).getByRole("link", { name: /Explorer le parcours libre/i })).toHaveAttribute("href", "/app/parcours-libre");
  expect(screen.getByRole("region", { name: "Parcours primaire" })).not.toContainElement(section);
  expect(screen.getByRole("region", { name: "Choisir un parcours" })).toContainElement(section);
  expect(screen.getByRole("region", { name: "Parcours secondaire" })).not.toContainElement(section);
 });
 it("un clic sur Parcours libre ouvre la page de choix et ses deux sous-menus", async () => {
  const user = userEvent.setup(); window.history.pushState({}, "", "/app"); render(<AppRouter />);
  const nav = screen.getByRole("navigation", { name: "Navigation principale" });
  expect(within(nav).queryByRole("link", { name: "Préparer l'EXETAT" })).not.toBeInTheDocument();
  const group = within(nav).getByRole("button", { name: "Sections du Parcours libre" });
  expect(group).toHaveAttribute("aria-expanded", "false");
  await user.click(group);
  expect(window.location.pathname).toBe("/app/parcours-libre");
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Parcours libre");
  expect(group).toHaveAttribute("aria-expanded", "true");
  expect(within(nav).getByRole("link", { name: "Tests de raisonnement" })).toHaveAttribute("href", "/app/parcours-libre/tests");
  expect(within(nav).getByRole("link", { name: "Préparations aux examens" })).toHaveAttribute("href", "/app/parcours-libre/examens");
 });
 it("relie le tableau de bord à la page de choix puis aux deux pages, avec changement FR/EN", async () => {
  const user = userEvent.setup(); window.history.pushState({}, "", "/app"); render(<AppRouter />);
  await user.click(screen.getByRole("link", { name: /Explorer le parcours libre/i }));
  expect(window.location.pathname).toBe("/app/parcours-libre");
  await user.click(screen.getByRole("link", { name: /Ouvrir : Tests de raisonnement/ }));
  expect(window.location.pathname).toBe("/app/parcours-libre/tests");
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Tests de raisonnement");
  await user.click(screen.getByRole("button", { name: /^English$/ }));
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Reasoning tests");
 });
 it("marque le sous-menu actif selon la page", async () => {
  window.history.pushState({}, "", "/app/parcours-libre/examens"); render(<AppRouter />);
  const nav = screen.getByRole("navigation", { name: "Navigation principale" });
  expect(within(nav).getByRole("link", { name: "Préparations aux examens" })).toHaveAttribute("aria-current", "page");
  expect(within(nav).getByRole("link", { name: "Tests de raisonnement" })).not.toHaveAttribute("aria-current");
 });
 it("ouvre le catalogue EXETAT existant et son API", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } })); vi.stubGlobal("fetch", fetch);
  window.history.pushState({}, "", "/app/parcours-libre/examens"); render(<AppRouter />);
  await userEvent.click(screen.getByRole("link", { name: /Découvrir la préparation : EXETAT/ }));
  expect(window.location.pathname).toBe("/app/exetat");
  expect(await screen.findByRole("heading", { name: "Choisis une matière" })).toBeInTheDocument();
  expect(fetch.mock.calls[0][0]).toBe("/api/v1/exetat/matieres");
 });
 it.each(["/app/parcours-libre", "/app/parcours-libre/tests", "/app/parcours-libre/examens"])("accepte la route directe %s", path => {
  window.history.pushState({}, "", path); render(<AppRouter />);
  expect(screen.queryByRole("heading", { name: /Cette page n'existe pas/ })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
 });
});
