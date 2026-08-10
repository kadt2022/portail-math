import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";

import { CourseNavigation } from "./CourseNavigation";
import { PRIMARY_COURSES } from "./course-navigation";

function renderNavigation(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CourseNavigation />
      <button type="button">Zone extérieure</button>
    </MemoryRouter>,
  );
}

describe("Navigation horizontale des cours", () => {
  beforeEach(async () => {
    await act(async () => {
      await i18next.changeLanguage("fr");
    });
  });

  afterEach(async () => {
    await act(async () => {
      await i18next.changeLanguage("fr");
    });
  });

  it("affiche les quatre entrées dans l'ordre demandé", () => {
    renderNavigation();
    const navigation = screen.getByRole("navigation", { name: /navigation des cours/i });
    const entries = [...navigation.querySelectorAll("button, a")];

    expect(entries.map((entry) => entry.textContent?.trim())).toEqual([
      "Cours primaires",
      "Cours secondaires",
      "Préparation EXETAT",
      "Ma progression",
    ]);
  });

  it("ouvre les six niveaux primaires avec leurs routes centralisées", async () => {
    const user = userEvent.setup();
    renderNavigation();

    await user.click(screen.getByRole("button", { name: /cours primaires/i }));
    const panel = screen.getByRole("group", { name: /niveaux du primaire/i });
    const links = within(panel).getAllByRole("link");

    expect(links).toHaveLength(6);
    PRIMARY_COURSES.forEach((course, index) => {
      expect(links[index]).toHaveAttribute("href", course.route);
    });
  });

  it("ferme le sous-menu au second clic et lors d'un clic extérieur", async () => {
    const user = userEvent.setup();
    renderNavigation();
    const trigger = screen.getByRole("button", { name: /cours primaires/i });

    await user.click(trigger);
    expect(screen.getByRole("group", { name: /niveaux du primaire/i })).toBeInTheDocument();

    await user.click(trigger);
    expect(screen.queryByRole("group", { name: /niveaux du primaire/i })).not.toBeInTheDocument();

    await user.click(trigger);
    await user.click(screen.getByRole("button", { name: /zone extérieure/i }));
    expect(screen.queryByRole("group", { name: /niveaux du primaire/i })).not.toBeInTheDocument();
  });

  it("ferme avec Échap et rend le focus au bouton déclencheur", async () => {
    const user = userEvent.setup();
    renderNavigation();
    const trigger = screen.getByRole("button", { name: /cours primaires/i });

    await user.click(trigger);
    await user.keyboard("{Escape}");

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("s'ouvre au clavier avec Entrée, Espace et Flèche bas", async () => {
    const user = userEvent.setup();
    renderNavigation();
    const trigger = screen.getByRole("button", { name: /cours primaires/i });

    trigger.focus();
    await user.keyboard("{Enter}");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    await user.keyboard(" ");
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    await user.keyboard("{ArrowDown}");
    expect(await screen.findByRole("link", { name: /1re primaire/i })).toHaveFocus();
  });

  it("n'affiche qu'un sous-menu à la fois et ne crée aucun faux lien secondaire", async () => {
    const user = userEvent.setup();
    renderNavigation();

    await user.click(screen.getByRole("button", { name: /cours primaires/i }));
    await user.click(screen.getByRole("button", { name: /cours secondaires/i }));

    expect(screen.queryByRole("group", { name: /niveaux du primaire/i })).not.toBeInTheDocument();
    const panel = screen.getByRole("group", { name: /disponibilité des cours secondaires/i });
    expect(within(panel).getByText("À venir")).toBeInTheDocument();
    expect(within(panel).queryByRole("link")).not.toBeInTheDocument();
  });

  it("indique la section primaire et le niveau courant autrement que par la couleur", async () => {
    const user = userEvent.setup();
    renderNavigation("/apprentissages/primaire/3/mathematiques");
    const trigger = screen.getByRole("button", { name: /cours primaires/i });

    expect(trigger).toHaveAttribute("aria-current", "page");
    await user.click(trigger);

    const currentLevel = screen.getByRole("link", { name: /3e primaire/i });
    expect(currentLevel).toHaveAttribute("aria-current", "page");
    expect(currentLevel).toHaveTextContent("✓");
  });

  it("actualise immédiatement les menus et niveaux en anglais", async () => {
    const user = userEvent.setup();
    renderNavigation();

    await act(() => i18next.changeLanguage("en"));
    expect(screen.getByRole("link", { name: /exetat preparation/i })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /primary courses/i }));
    expect(screen.getByRole("link", { name: /1st year of primary/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /6th year of primary/i })).toBeInTheDocument();
  });
});
