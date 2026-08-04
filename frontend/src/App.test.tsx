import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { App } from "./App";

describe("Page technique du socle React", () => {
  it("affiche un titre de niveau 1", () => {
    render(<App />);
    expect(
      screen.getByRole("heading", { level: 1, name: /portail react est en place/i }),
    ).toBeInTheDocument();
  });

  it("annonce que les pages et les jeux existants ne changent pas", () => {
    render(<App />);
    expect(screen.getByText(/servies par Thymeleaf/i)).toBeInTheDocument();
    expect(screen.getByText(/moteur Phaser conservé/i)).toBeInTheDocument();
  });

  it("ne touche à aucune clé de stockage local", () => {
    const lues: string[] = [];
    const ecrites: string[] = [];
    const lireOrigine = Storage.prototype.getItem;
    const ecrireOrigine = Storage.prototype.setItem;
    Storage.prototype.getItem = function patchLecture(key: string) {
      lues.push(key);
      return lireOrigine.call(this, key);
    };
    Storage.prototype.setItem = function patchEcriture(key: string, value: string) {
      ecrites.push(key);
      return ecrireOrigine.call(this, key, value);
    };

    try {
      render(<App />);
    } finally {
      Storage.prototype.getItem = lireOrigine;
      Storage.prototype.setItem = ecrireOrigine;
    }

    expect(lues).toEqual([]);
    expect(ecrites).toEqual([]);
  });
});
