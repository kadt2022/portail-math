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
  },
});
