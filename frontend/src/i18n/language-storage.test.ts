import { beforeEach, describe, expect, it } from "vitest";

import {
  LANGUAGE_STORAGE_KEY,
  detectBrowserLanguage,
  loadStoredLanguage,
  resolveInitialLanguage,
  saveLanguage,
} from "./language-storage";

describe("Stockage de la préférence de langue", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("ne lit aucune préférence quand rien n'est enregistré", () => {
    expect(loadStoredLanguage()).toBeNull();
  });

  it("relit exactement la langue enregistrée", () => {
    saveLanguage("en");
    expect(loadStoredLanguage()).toBe("en");
  });

  it("ignore une valeur inconnue plutôt que de planter", () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "es");
    expect(loadStoredLanguage()).toBeNull();
  });

  it("ignore une valeur corrompue (JSON, objet...)", () => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, "{not-a-language}");
    expect(loadStoredLanguage()).toBeNull();
  });

  it("n'appelle jamais localStorage.clear()", () => {
    const original = Storage.prototype.clear;
    let called = false;
    Storage.prototype.clear = function patched() {
      called = true;
      return original.call(this);
    };
    try {
      saveLanguage("fr");
      loadStoredLanguage();
    } finally {
      Storage.prototype.clear = original;
    }
    expect(called).toBe(false);
  });
});

describe("Détection de la langue du navigateur", () => {
  it("reconnaît un préfixe anglais quelle que soit la variante régionale", () => {
    expect(detectBrowserLanguage(["en-US"])).toBe("en");
    expect(detectBrowserLanguage(["en-GB"])).toBe("en");
  });

  it("reconnaît un préfixe français", () => {
    expect(detectBrowserLanguage(["fr-CA"])).toBe("fr");
  });

  it("retourne null pour une langue non supportée", () => {
    expect(detectBrowserLanguage(["es-ES", "de-DE"])).toBeNull();
  });

  it("retourne null quand la liste est vide", () => {
    expect(detectBrowserLanguage([])).toBeNull();
  });
});

describe("Résolution de la langue initiale (ordre : préférence, navigateur, français)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("utilise le français quand rien n'est disponible", () => {
    Object.defineProperty(window.navigator, "languages", { value: [], configurable: true });
    Object.defineProperty(window.navigator, "language", { value: "", configurable: true });
    expect(resolveInitialLanguage()).toBe("fr");
  });

  it("utilise l'anglais si le navigateur est anglais et qu'aucune préférence n'est enregistrée", () => {
    Object.defineProperty(window.navigator, "languages", { value: ["en-US"], configurable: true });
    expect(resolveInitialLanguage()).toBe("en");
  });

  it("la préférence enregistrée est prioritaire sur le navigateur", () => {
    Object.defineProperty(window.navigator, "languages", { value: ["en-US"], configurable: true });
    saveLanguage("fr");
    expect(resolveInitialLanguage()).toBe("fr");
  });
});
