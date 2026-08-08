import { defineConfig } from "vite";

// Prototype exploratoire isolé du frontend/ principal : dépendances et
// build séparés, pour ne rien risquer sur le tableau de bord pendant
// qu'on vérifie si Babylon.js tient la route.
export default defineConfig({
  server: {
    port: 5174,
  },
  build: {
    // Un seul fichier de sortie : plus simple à inspecter et à intégrer
    // dans un aperçu autonome pendant la phase d'exploration. Le découpage
    // par défaut est pertinent pour la vraie intégration au portail, pas
    // pour ce spike.
    rolldownOptions: {
      output: {
        codeSplitting: false,
      },
    },
  },
});
