import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { toRiverLocale, useRiverFractions } from "@mbuyamba/riviere-fractions";

import type { EmbeddedPlayerProps } from "../player/EmbeddedPlayerProps";
import { EngineGamePlayer } from "../player/EngineGamePlayer";

export type RiviereFractionsPlayerProps = EmbeddedPlayerProps;

// La Rivière des Fractions dans le lecteur standard des jeux. Le jeu est un module à part (@mbuyamba/riviere-fractions) :
// il fournit sa scène et ce que le lecteur affiche (titre, compteurs, commandes, instructions). Le portail n'apporte que
// le lecteur, le chargeur commun (voir loading/GameLoaderHost) et la langue choisie.
export function RiviereFractionsPlayer({ active = true, ...player }: RiviereFractionsPlayerProps) {
  const { i18n } = useTranslation("games");
  // Panneau de mesures sur demande (adresse ...?mesures), pour relever les images par seconde sur un téléphone.
  const showPerformance = useMemo(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("mesures"), []);
  const game = useRiverFractions({ locale: toRiverLocale(i18n.language), active, showPerformance });
  return <EngineGamePlayer game={game} {...player} />;
}
