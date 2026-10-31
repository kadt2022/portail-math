import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { FreePathPage } from "./FreePathPages";
import { AppRouter } from "../app/AppRouter";
import { i18next } from "../i18n/i18n";

afterEach(async () => { vi.unstubAllGlobals(); await i18next.changeLanguage("fr"); });
describe("Parcours libre", () => {
 it.each(["fr", "en"])("affiche TRM, QMT, MBD à venir et l'EXETAT disponible en %s", async language => {
  await i18next.changeLanguage(language);
  render(<MemoryRouter><FreePathPage /></MemoryRouter>);
  const cards = screen.getAllByRole("article");
  expect(cards).toHaveLength(4);
  ["TRM", "QMT", "MBD"].forEach((sigil, index) => {
   expect(within(cards[index]).getByRole("heading")).toHaveTextContent(sigil);
   expect(within(cards[index]).queryByRole("link")).not.toBeInTheDocument();
   expect(within(cards[index]).getByText(language === "fr" ? "Contenu à venir" : "Content coming soon")).toBeInTheDocument();
  });
  expect(within(cards[3]).getByRole("link")).toHaveAttribute("href", "/exetat");
  expect(within(cards[3]).getByText(language === "fr" ? "Disponible" : "Available")).toBeInTheDocument();
  expect(screen.queryByText(/GRE|SAT|ACT|TOEFL|IELTS/)).not.toBeInTheDocument();
 });
 it("n'appelle aucune API et n'enregistre aucune progression", () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const storage = vi.spyOn(Storage.prototype, "setItem");
  render(<MemoryRouter><FreePathPage /></MemoryRouter>);
  expect(screen.getByText("D’autres tests arriveront bientôt.")).toBeInTheDocument();
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
 it("relie tableau de bord et menu à la page, avec changement FR/EN", async () => {
  const user = userEvent.setup(); window.history.pushState({}, "", "/app"); render(<AppRouter />);
  const nav = screen.getByRole("navigation", { name: "Navigation principale" });
  expect(within(nav).getByRole("link", { name: "Parcours libre" })).toHaveAttribute("href", "/app/parcours-libre");
  expect(within(nav).getByRole("link", { name: "Préparer l'EXETAT" })).toHaveAttribute("href", "/app/exetat");
  await user.click(screen.getByRole("link", { name: /Explorer le parcours libre/i }));
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Parcours libre — Tests de raisonnement");
  await user.click(screen.getByRole("button", { name: /^English$/ }));
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Free learning path — Reasoning tests");
 });
 it("ouvre le catalogue EXETAT existant et son API", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } })); vi.stubGlobal("fetch", fetch);
  window.history.pushState({}, "", "/app/parcours-libre"); render(<AppRouter />);
  await userEvent.click(screen.getByRole("link", { name: /Découvrir la préparation : EXETAT/ }));
  expect(window.location.pathname).toBe("/app/exetat");
  expect(await screen.findByRole("heading", { name: "Choisis une matière" })).toBeInTheDocument();
  expect(fetch.mock.calls[0][0]).toBe("/api/v1/exetat/matieres");
 });
 it("accepte la route directe", () => {
  window.history.pushState({}, "", "/app/parcours-libre"); render(<AppRouter />);
  expect(screen.queryByRole("heading", { name: /Cette page n'existe pas/ })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Parcours libre");
 });
});
