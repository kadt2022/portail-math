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

// jsdom n'implémente pas ResizeObserver : ce filet neutre (aucune
// notification de redimensionnement) évite un crash à l'instanciation pour
// tout composant qui observe la taille d'un conteneur (ex. TurboPulsePage,
// qui y adapte le monde de jeu Phaser). Les tests qui doivent vérifier un
// comportement déclenché par un vrai redimensionnement le simulent
// directement (ex. scene.scale.resize()) plutôt que via cet observateur.
if (typeof globalThis.ResizeObserver !== "function") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
