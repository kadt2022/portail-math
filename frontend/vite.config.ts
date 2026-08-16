import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Le portail React est servi sous /app/ : la base doit le refléter, sinon les
// URL des ressources générées pointeraient à la racine et échoueraient une fois
// empaquetées dans le JAR.
export default defineConfig({
  base: "/app/",
  plugins: [react()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Sans cible explicite, esbuild minifie les media queries vers la
    // syntaxe d'intervalle (`width<=899px`) : plus courte, mais muette sur
    // les navigateurs plus anciens (Safari < 16.4) au lieu d'ignorer la
    // règle proprement. Une cible large force la syntaxe classique
    // (`max-width`), comprise partout, pour le même résultat.
    cssTarget: ["chrome90", "safari14", "firefox90"],
  },
  server: {
    port: 5173,
    proxy: {
      // En développement, Vite sert React et relaie le reste à Spring Boot :
      // aucune configuration CORS n'est alors nécessaire.
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
      "/actuator": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/vitest.setup.ts"],
    css: true,
    // Vitest résout "phaser" par le champ "main" du paquet, c'est-à-dire la
    // source CommonJS non compilée. Celle-ci contient une garde bancale
    // (`typeof WEBGL_DEBUG`, toujours vraie) qui exige le module de debug
    // optionnel phaser3spectorjs, absent des dépendances : l'import échoue
    // avant même le premier test. Le bundle navigateur, lui, est déjà
    // compilé sans cette branche. Cet alias ne concerne que les tests ; le
    // build applicatif garde la résolution standard de Vite.
    alias: {
      phaser: "phaser/dist/phaser.js",
    },
    coverage: {
      provider: "v8",
      // Écrit sous build/ (racine du dépôt), au même endroit que le rapport
      // JaCoCo du backend : la CI télécharge tout ce qui vit sous build/
      // comme un seul arbre pour l'analyse Sonar (voir build.gradle).
      reportsDirectory: "../build/reports/coverage/frontend",
      reporter: ["text", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/vite-env.d.ts", "src/main.tsx"],
    },
  },
});
