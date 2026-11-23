// Adresses des textures téléchargées de Léo, sans le moteur (Phaser) : le lecteur peut ainsi lancer le téléchargement des
// images du démarrage en même temps que celui du moteur (écran de chargement), et la scène les relit dans le cache HTTP.

import backCarUrl from "./assets/leo-car-back.webp";
import familyTrafficUrl from "./assets/leo-traffic-family-blue-v1-384.webp";
import compactTrafficUrl from "./assets/leo-traffic-compact-green-v1-384.webp";
import sedanTrafficUrl from "./assets/leo-traffic-sedan-gray-v1-390.webp";
import cityBusTrafficUrl from "./assets/leo-traffic-city-bus-v1.webp";
import schoolBusTrafficUrl from "./assets/leo-traffic-school-bus-occupied-v1.webp";
import taxiTrafficUrl from "./assets/leo-traffic-taxi-occupied-v1-384.webp";
import minibusTrafficUrl from "./assets/leo-traffic-minibus-v1-384.webp";
import frontCarUrl from "./assets/leo-car-front.webp";
import houseUrl from "./assets/leo-house-turquoise-396.webp";
import nearSideHouseUrl from "./assets/leo-house-near-side-v1.webp";
import villageTreeUrl from "./assets/leo-tree-v1.webp";
import nearSideFlowersUrl from "./assets/leo-flowers-near-side-v1.webp";
import nearSideGardenUrl from "./assets/leo-garden-near-side-v1.webp";
import houseYellowUrl from "./assets/leo-house-yellow-v1-compact.webp";
import leftCarUrl from "./assets/leo-car-left-253.webp";
import rightCarUrl from "./assets/leo-car-right-251.webp";
import bridgeLayerUrl from "./assets/leo-world-suspension-bridge-layer-v2.webp";
import bridgeDeckUrl from "./assets/leo-world-bridge-deck-v1.webp";
import bridgeRailUrl from "./assets/leo-world-bridge-rail-v1.webp";
import villageBackdropUrl from "./assets/leo-world-village-zone1-backdrop-v1.webp";
import cityTopUrl from "./assets/leo-world-city-top-v1.webp";
import cityBottomUrl from "./assets/leo-world-city-bottom-v1.webp";
import boulevardZone4Url from "./assets/leo-world-boulevard-zone4-v7-seated-below-crop.webp";
import pedestrianManUrl from "./assets/leo-pedestrian-man-walk-v1-815.webp";
import pedestrianWomanUrl from "./assets/leo-pedestrian-woman-walk-v1-815.webp";
import pedestrianChildUrl from "./assets/leo-pedestrian-child-walk-v1-815.webp";
import pedestrianDepthFrontUrl from "./assets/leo-pedestrian-depth-front-walk-v1-815.webp";
import pedestrianDepthBackUrl from "./assets/leo-pedestrian-depth-back-walk-v1-815.webp";
import crossSedanTurnUrl from "./assets/leo-cross-sedan-turn-v1.webp";
import { BUNDLE_TEXTURES } from "./leoZoneAssets";

/** Adresse de chaque texture téléchargée (une seule source de vérité pour le préchargement et les lots). */
export const TEXTURE_URLS: Record<string, string> = {
  "leo-traffic-family-blue": familyTrafficUrl,
  "leo-traffic-compact-green": compactTrafficUrl,
  "leo-traffic-sedan-gray": sedanTrafficUrl,
  "leo-traffic-city-bus": cityBusTrafficUrl,
  "leo-traffic-school-bus-occupied": schoolBusTrafficUrl,
  "leo-traffic-taxi-occupied": taxiTrafficUrl,
  "leo-traffic-minibus": minibusTrafficUrl,
  "leo-car-right": rightCarUrl,
  "leo-car-left": leftCarUrl,
  "leo-car-front": frontCarUrl,
  "leo-car-back": backCarUrl,
  "leo-house": houseUrl,
  "leo-house-near-side": nearSideHouseUrl,
  "leo-tree": villageTreeUrl,
  "leo-flowers-near-side": nearSideFlowersUrl,
  "leo-garden-near-side": nearSideGardenUrl,
  "leo-house-yellow": houseYellowUrl,
  "leo-world-bridge-deck": bridgeDeckUrl,
  "leo-world-bridge-rail": bridgeRailUrl,
  "leo-world-suspension-bridge-layer": bridgeLayerUrl,
  "leo-world-village-zone1-backdrop": villageBackdropUrl,
  "leo-world-city-top": cityTopUrl,
  "leo-world-city-bottom": cityBottomUrl,
  "leo-world-boulevard-zone4": boulevardZone4Url,
  "leo-pedestrian-man-sheet": pedestrianManUrl,
  "leo-pedestrian-woman-sheet": pedestrianWomanUrl,
  "leo-pedestrian-child-sheet": pedestrianChildUrl,
  "leo-pedestrian-depth-front-sheet": pedestrianDepthFrontUrl,
  "leo-pedestrian-depth-back-sheet": pedestrianDepthBackUrl,
  "leo-cross-sedan-turn": crossSedanTurnUrl,
};

/** Images indispensables à la première scène (lot commun) : ce qu'attend l'écran de chargement. */
export const STARTUP_TEXTURE_URLS: readonly string[] = BUNDLE_TEXTURES.common.map((key) => TEXTURE_URLS[key]);
