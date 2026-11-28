import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { FlightGame } from "@mbuyamba/turbo-pulse-3d";

/**
 * Turbo Pulse 3D, étape 2 : piloter le vaisseau jusqu'à la station en évitant les boules (adresse directe /jeux/turbo-pulse-3d).
 * Absent du catalogue tant que le résultat n'est pas validé. Réglages d'essai : « ?debug » (mesures), « ?light » (rendu allégé),
 * « ?distance=200 » (trajet court), « ?fixed » (résolution fixe).
 */
export function TurboPulse3DGamePage() {
  const { i18n } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const english = i18n.language.toLowerCase().startsWith("en");
  // Appareil tactile à peu de cœurs : rendu allégé d'office.
  const modest = typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 8) <= 4 && window.matchMedia?.("(pointer: coarse)").matches === true;
  const distance = Number(params.get("distance"));
  return (
    <main style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#05030f" }}>
      <FlightGame
        language={i18n.language}
        debug={params.has("debug")}
        light={params.has("light") || modest}
        adaptive={!params.has("fixed")}
        distance={Number.isFinite(distance) && distance >= 60 ? distance : undefined}
        onWorkshop={() => navigate("/jeux/turbo-pulse-3d/atelier")}
      >
        <Link to="/jeux">{english ? "Close" : "Fermer"}</Link>
      </FlightGame>
    </main>
  );
}
