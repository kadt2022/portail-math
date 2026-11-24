import "@testing-library/jest-dom/vitest";
// jsdom ne dessine pas : les panneaux de la scène écrivent dans un canevas factice.
import "vitest-canvas-mock";

if (typeof globalThis.ResizeObserver !== "function") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
