import { defineConfig } from "vitest/config";

// Le moteur est du TypeScript pur : ses tests tournent sans navigateur simulé (environnement « node »), ce qui garantit
// qu'il ne dépend ni du DOM ni de React.
export default defineConfig({
  test: {
    testTimeout: 120000,
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
