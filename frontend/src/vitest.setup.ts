import "@testing-library/jest-dom/vitest";
// jsdom ne fournit aucun contexte de rendu canvas : sans ce polyfill, Phaser
// ne peut pas démarrer et la scène de jeu reste intestable.
import "vitest-canvas-mock";
import "./i18n/test-language-setup";
import "./i18n/i18n";

// jsdom n'implémente pas window.matchMedia : ce filet par défaut (aucune
// media query ne correspond) évite un crash à l'import pour tout composant
// responsive qui l'utilise. Une suite de tests précise peut toujours
// remplacer window.matchMedia localement pour simuler une correspondance.
if (typeof window.matchMedia !== "function") {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
