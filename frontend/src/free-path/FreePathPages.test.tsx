import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { FreePathPage, GrePage } from "./FreePathPages";
import { AppRouter } from "../app/AppRouter";
import { i18next } from "../i18n/i18n";

afterEach(async () => { vi.unstubAllGlobals(); await i18next.changeLanguage("fr"); });
describe("Parcours libre", () => {
 it.each(["fr", "en"])("affiche uniquement GRE et EXETAT en %s", async language => {
  await i18next.changeLanguage(language);
  render(<MemoryRouter><FreePathPage /></MemoryRouter>);
  const cards = screen.getAllByRole("article");
  expect(cards).toHaveLength(2);
  expect(within(cards[0]).getByRole("link")).toHaveAttribute("href", "/parcours-libre/gre");
  expect(within(cards[1]).getByRole("link")).toHaveAttribute("href", "/exetat");
  expect(within(cards[0]).getByText(language === "fr" ? "Contenu à venir" : "Content coming soon")).toBeInTheDocument();
 });
 it("GRE reste vide sans appel API ni progression enregistrée", () => {
  const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
  const storage = vi.spyOn(Storage.prototype, "setItem");
  render(<MemoryRouter><GrePage /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Contenu à venir" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Retour au Parcours libre" })).toHaveAttribute("href", "/parcours-libre");
  expect(fetch).not.toHaveBeenCalled(); expect(storage).not.toHaveBeenCalled(); storage.mockRestore();
 });
 it.each(["fr", "en"])("annonce les autres préparations et les trois rubriques GRE à venir en %s", async language => {
  await i18next.changeLanguage(language);
  const { unmount } = render(<MemoryRouter><FreePathPage /></MemoryRouter>);
  expect(screen.getByText(language === "fr" ? "Autres préparations" : "More preparations")).toBeInTheDocument();
  unmount();
  render(<MemoryRouter><GrePage /></MemoryRouter>);
  const items = screen.getAllByRole("listitem");
  expect(items).toHaveLength(3);
  items.forEach(item => expect(within(item).getByText(language === "fr" ? "Bientôt" : "Soon")).toBeInTheDocument());
 });
 it("présente le Parcours libre comme section propre, hors des cartes primaire et secondaire", () => {
  window.history.pushState({}, "", "/app"); render(<AppRouter />);
  const section = screen.getByRole("region", { name: "Parcours libre" });
  expect(within(section).getByRole("link", { name: /Explorer le parcours libre/i })).toHaveAttribute("href", "/app/parcours-libre");
  expect(screen.getByRole("region", { name: "Parcours primaire" })).not.toContainElement(section);
  expect(screen.getByRole("region", { name: "Choisir un parcours" })).toContainElement(section);
  expect(screen.getByRole("region", { name: "Parcours secondaire" })).not.toContainElement(section);
 });
 it("relie tableau de bord, menu, GRE et retour avec changement FR/EN", async () => {
  const user = userEvent.setup(); window.history.pushState({}, "", "/app"); render(<AppRouter />);
  const nav = screen.getByRole("navigation", { name: "Navigation principale" });
  expect(within(nav).getByRole("link", { name: "Parcours libre" })).toHaveAttribute("href", "/app/parcours-libre");
  expect(within(nav).getByRole("link", { name: "Préparer l'EXETAT" })).toHaveAttribute("href", "/app/exetat");
  await user.click(screen.getByRole("link", { name: /Explorer le parcours libre/i }));
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Parcours libre — Préparations aux examens");
  await user.click(screen.getByRole("link", { name: /Découvrir la préparation : GRE/ }));
  expect(window.location.pathname).toBe("/app/parcours-libre/gre");
  await user.click(screen.getByRole("button", { name: /^English$/ }));
  expect(screen.getByRole("heading", { name: "Content coming soon" })).toBeInTheDocument();
  await user.click(screen.getByRole("link", { name: "Back to free learning path" }));
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Free learning path — Exam preparation");
 });
 it("ouvre le catalogue EXETAT existant et son API", async () => {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } })); vi.stubGlobal("fetch", fetch);
  window.history.pushState({}, "", "/app/parcours-libre"); render(<AppRouter />);
  await userEvent.click(screen.getByRole("link", { name: /Découvrir la préparation : EXETAT/ }));
  expect(window.location.pathname).toBe("/app/exetat");
  expect(await screen.findByRole("heading", { name: "Choisis une matière" })).toBeInTheDocument();
  expect(fetch.mock.calls[0][0]).toBe("/api/v1/exetat/matieres");
 });
 it.each(["/app/parcours-libre", "/app/parcours-libre/gre"])("accepte la route directe %s", path => {
  window.history.pushState({}, "", path); render(<AppRouter />);
  expect(screen.queryByRole("heading", { name: /Cette page n'existe pas/ })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(path.endsWith("gre") ? "GRE" : "Parcours libre");
 });
});
