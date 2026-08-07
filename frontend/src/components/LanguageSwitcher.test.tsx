import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import i18next from "i18next";

import { LANGUAGE_STORAGE_KEY } from "../i18n/language-storage";
import { LanguageSwitcher } from "./LanguageSwitcher";

describe("Sélecteur de langue", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18next.changeLanguage("fr");
  });

  afterEach(async () => {
    await i18next.changeLanguage("fr");
  });

  it("indique la langue active et expose Français / English aux technologies d'assistance", () => {
    render(<LanguageSwitcher />);
    const fr = screen.getByRole("button", { name: /français/i });
    const en = screen.getByRole("button", { name: /english/i });
    expect(fr).toHaveAttribute("aria-pressed", "true");
    expect(en).toHaveAttribute("aria-pressed", "false");
  });

  it("change la langue immédiatement au clic, sans rechargement", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole("button", { name: /english/i }));

    await waitFor(() => {
      expect(i18next.language).toBe("en");
      expect(screen.getByRole("button", { name: /english/i })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: /français/i })).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("persiste le choix pour la prochaine visite", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);

    await user.click(screen.getByRole("button", { name: /english/i }));

    await waitFor(() => {
      expect(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe("en");
    });
  });

  it("est utilisable au clavier (chaque option est un vrai bouton)", () => {
    render(<LanguageSwitcher />);
    const en = screen.getByRole("button", { name: /english/i });
    en.focus();
    expect(en).toHaveFocus();
  });
});
