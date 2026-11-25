import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { toTrainLocale, useTrainMultiplications } from "@mbuyamba/train-multiplications";

import type { EmbeddedPlayerProps } from "../player/EmbeddedPlayerProps";
import { EngineGamePlayer } from "../player/EngineGamePlayer";

export type TrainMultiplicationsPlayerProps = EmbeddedPlayerProps;

// Le Train des multiplications 3D dans le lecteur standard des jeux. Le jeu est un module à part
// (@mbuyamba/train-multiplications) : il fournit sa scène et ce que le lecteur affiche (titre, compteurs, instructions).
// Le portail n'apporte que le lecteur, le chargeur commun (voir loading/GameLoaderHost) et la langue choisie.
export function TrainMultiplicationsPlayer({ active = true, ...player }: TrainMultiplicationsPlayerProps) {
  const { i18n } = useTranslation("games");
  // Panneau de mesures sur demande (adresse ...?mesures), pour relever les images par seconde sur un téléphone.
  const showPerformance = useMemo(() => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("mesures"), []);
  // Moteur de rendu forcé sur demande (…?rendu=webgl ou …?rendu=webgpu), pour comparer sur un même appareil.
  const renderer = useMemo(() => {
    const value = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("rendu");
    return value === "webgl" || value === "webgpu" ? value : "auto";
  }, []);
  const game = useTrainMultiplications({ locale: toTrainLocale(i18n.language), active, showPerformance, renderer });
  return <EngineGamePlayer game={game} {...player} />;
}
