import { defineConfig } from "vitest/config";

// Configuration propre au module : ses tests tournent sans l'application hôte (aucun fichier du portail n'est chargé).
// Dans le portail, la configuration racine les exécute aussi, avec sa propre préparation.
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    setupFiles: ["./tests/setup.ts"],
    css: { modules: { classNameStrategy: "non-scoped" } },
  },
});
