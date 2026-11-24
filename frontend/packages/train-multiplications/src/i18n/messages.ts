// Textes du jeu, en français et en anglais. Le jeu ne dépend pas des traductions de l'hôte : l'hôte lui passe
// seulement la langue choisie.
//
// Écrit pour Yamba.

export const TRAIN_LOCALES = ["fr", "en"] as const;
export type TrainLocale = (typeof TRAIN_LOCALES)[number];

export function toTrainLocale(language: string | undefined): TrainLocale {
  return language?.toLowerCase().startsWith("en") ? "en" : "fr";
}

const fr = {
  label: "Jeu Le Train des multiplications",
  title: "Le Train des multiplications",
  line: "Première ligne — conduite libre",
  speed: "Vitesse",
  kmh: "km/h",
  stations: "Gares desservies",
  accelerate: "Accélérer",
  brake: "Freiner",
  reverse: "Reculer",
  forward: "Avancer",
  reverseHint: "Arrête le train pour changer de sens",
  stop: "Arrêter le train",
  whistle: "Siffler",
  cameras: "Caméras",
  "camera.behind": "Derrière",
  "camera.cab": "Cabine",
  "camera.side": "Latérale",
  "camera.loading": "Chargement",
  "camera.panorama": "Panorama",
  nextStation: "Prochaine gare",
  stopMark: "repère d'arrêt",
  meters: "m",
  ahead: "devant",
  behind: "derrière",
  atStation: "En gare",
  terminus: "Terminus : fais marche arrière pour repartir",
  switchLabel: "Aiguillage du village",
  "switch.main": "Voie 1",
  "switch.branch": "Voie 2",
  switchLocked: "Aiguillage franchi",
  arrived: "Arrêt réussi en {station}",
  arrivedPrecise: "Arrêt parfait en {station} : à {distance} m du repère !",
  bumped: "Heurtoir ! Le train s'est arrêté contre la butée.",
  entered: "{structure}",
  restart: "Revenir à la gare de départ",
  sound: "Son",
  soundOn: "Couper le son",
  soundOff: "Activer le son",
  unsupported: "Ce navigateur ne peut pas afficher la 3D (WebGL indisponible).",
  "howto.drive.title": "Conduire",
  "howto.drive.text": "Garde le doigt sur « Accélérer » pour ouvrir le régulateur, sur « Freiner » pour serrer les freins. Le train est lourd : il démarre doucement et met du temps à s'arrêter.",
  "howto.stop.title": "S'arrêter en gare",
  "howto.stop.text": "Le panneau en haut indique la distance jusqu'au repère d'arrêt de la prochaine gare. Arrête l'avant de la locomotive près du panneau STOP.",
  "howto.cameras.title": "Caméras",
  "howto.cameras.text": "Change de vue à tout moment : derrière le train, dans la cabine, sur le côté, ou au-dessus des wagons pour le chargement.",
  "howto.keys.title": "Clavier",
  "howto.keys.text": "Flèche haut : accélérer · flèche bas : freiner · R : changer de sens · Espace : arrêter · H : siffler · C ou 1 à 5 : caméras · V : aiguillage.",
} as const;

export type MessageKey = keyof typeof fr;

const en: Record<MessageKey, string> = {
  label: "Game The Multiplication Train",
  title: "The Multiplication Train",
  line: "First line — free driving",
  speed: "Speed",
  kmh: "km/h",
  stations: "Stations served",
  accelerate: "Accelerate",
  brake: "Brake",
  reverse: "Reverse",
  forward: "Forward",
  reverseHint: "Stop the train to change direction",
  stop: "Stop the train",
  whistle: "Whistle",
  cameras: "Cameras",
  "camera.behind": "Behind",
  "camera.cab": "Cab",
  "camera.side": "Side",
  "camera.loading": "Loading",
  "camera.panorama": "Panorama",
  nextStation: "Next station",
  stopMark: "stop mark",
  meters: "m",
  ahead: "ahead",
  behind: "behind",
  atStation: "At the station",
  terminus: "End of the line: reverse to leave",
  switchLabel: "Village switch",
  "switch.main": "Track 1",
  "switch.branch": "Track 2",
  switchLocked: "Switch passed",
  arrived: "Stopped at {station}",
  arrivedPrecise: "Perfect stop at {station}: {distance} m from the mark!",
  bumped: "Buffer stop! The train stopped against it.",
  entered: "{structure}",
  restart: "Back to the departure station",
  sound: "Sound",
  soundOn: "Mute",
  soundOff: "Turn sound on",
  unsupported: "This browser cannot display 3D (WebGL unavailable).",
  "howto.drive.title": "Driving",
  "howto.drive.text": "Hold “Accelerate” to open the regulator and “Brake” to apply the brakes. The train is heavy: it starts slowly and takes time to stop.",
  "howto.stop.title": "Stopping at a station",
  "howto.stop.text": "The panel at the top shows the distance to the next station's stop mark. Stop the front of the locomotive near the STOP board.",
  "howto.cameras.title": "Cameras",
  "howto.cameras.text": "Change view at any time: behind the train, in the cab, from the side, or above the wagons for loading.",
  "howto.keys.title": "Keyboard",
  "howto.keys.text": "Up arrow: accelerate · down arrow: brake · R: change direction · Space: stop · H: whistle · C or 1 to 5: cameras · V: switch.",
};

const NAMES: Record<string, string> = {
  "Gare de départ": "Departure station",
  "Halte du col": "Pass halt",
  "Gare du village": "Village station",
  "Tunnel du mont Kibo": "Mount Kibo tunnel",
  "Tunnel de la Dent": "Dent tunnel",
  "Grand viaduc de la vallée": "Great valley viaduct",
  "Pont de la gorge": "Gorge bridge",
  "Passage souterrain": "Underground passage",
};

export type Translator = (key: MessageKey, values?: Record<string, string | number>) => string;

export function createTranslator(locale: TrainLocale): Translator {
  const table = locale === "en" ? en : fr;
  return (key, values) => (table[key] as string).replace(/\{(\w+)\}/g, (_, name: string) => String(values?.[name] ?? ""));
}

/** Nom d'un lieu du réseau dans la langue choisie (les panneaux de la scène restent en français). */
export function placeName(locale: TrainLocale, name: string): string {
  return locale === "en" ? (NAMES[name] ?? name) : name;
}
