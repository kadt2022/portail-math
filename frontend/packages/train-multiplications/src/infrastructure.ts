// Les infrastructures ferroviaires, réutilisables hors du jeu (autres cartes, autres jeux, magasin de ressources) :
// tracé, réseau, relief, et constructeurs de géométrie en TypeScript pur (positions, normales, couleurs par sommet,
// indices). Rien ici ne dépend de Babylon.js ni d'un paysage particulier : chaque constructeur suit une voie et se
// pose où l'on veut. Le jeu, lui, n'est que l'un de leurs utilisateurs.
//
// Écrit pour Yamba.

export { buildTrack, branchTrack, trackFrame, type Track, type TrackPoint } from "./domain/track";
export { createNetwork, isBridge, isUnderground, structureAt, type Network, type Structure, type StructureKind, type StationStop, type SignalPost } from "./domain/network";
export { createRelief, terrainTiles, type Relief } from "./engine/geometry/terrain";
export { trackMesh, railMesh, bufferStop, turnoutFrog } from "./engine/geometry/trackGeometry";
export { stoneViaduct, trussBridge, tunnelLining, tunnelLamps, tunnelPortal, galleryPortal, TRUSS, TUNNEL, type BridgePlan } from "./engine/geometry/structures";
export { stationMesh, islandPlatform, stopBoard, stationPlacement, PLATFORM } from "./engine/geometry/stations";
export { signalModel, switchStand, switchLever } from "./engine/geometry/signals";
export { locomotiveBody, tenderBody, wagonBody, mangoCrate } from "./engine/geometry/rollingStock";
export { decorAnchors, inRailwayClearance, RAILWAY_CLEARANCE, type AnchorKind, type DecorAnchor } from "./world/anchors";
export type { MeshData } from "./engine/geometry/kit";
