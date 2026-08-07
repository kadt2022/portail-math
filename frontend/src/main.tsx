import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { AppRouter } from "./app/AppRouter";
import "./i18n/i18n";
import "./styles/tokens.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Élément racine introuvable : #root");
}

createRoot(container).render(
  <StrictMode>
    <div className="pm-root">
      <AppRouter />
    </div>
  </StrictMode>,
);
