import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";

import { ShipWorkshop } from "@mbuyamba/turbo-pulse-3d";

/**
 * Atelier du vaisseau de Turbo Pulse 3D (adresse directe /jeux/turbo-pulse-3d). Première étape : présentation et construction du
 * vaisseau, sans gameplay. Absent du catalogue tant que le résultat n'est pas validé. « ?debug » affiche les mesures, « ?light »
 * coupe les ombres.
 */
export function TurboPulse3DWorkshopPage() {
  const { i18n } = useTranslation();
  const [params] = useSearchParams();
  const english = i18n.language.toLowerCase().startsWith("en");
  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#0a0720" }}>
      <ShipWorkshop language={i18n.language} debug={params.has("debug")} light={params.has("light")} />
      <Link
        to="/jeux"
        style={{ position: "absolute", top: 10, right: 12, padding: "10px 16px", borderRadius: 999, background: "rgb(30 26 80 / 85%)", color: "#fff", fontWeight: 700, textDecoration: "none", border: "2px solid rgb(255 255 255 / 25%)" }}
      >
        {english ? "Close" : "Fermer"}
      </Link>
    </main>
  );
}
