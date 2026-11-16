import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { cameraZoomFor } from "./leoBridgeLayout";
import { MIN_CONTROL_SIZE, drivingLayout } from "./leoDrivingLayout";
import { ROAD_WIDTH, VEHICLE_LENGTH, WORLD_HEIGHT } from "./leoGeometry";
import type { LeoLivreurSnapshot } from "./LeoLivreurGame";

const { controllerMock, mountMock } = vi.hoisted(() => {
  const controllerMock = {
    listener: null as ((snapshot: LeoLivreurSnapshot) => void) | null,
    destroy: vi.fn(),
    refreshLayout: vi.fn(),
    startMission: vi.fn(),
    deliver: vi.fn(),
    reset: vi.fn(),
    setControl: vi.fn(),
    turn: vi.fn(),
    setPaused: vi.fn(),
    retryAssets: vi.fn(),
    setSound: vi.fn((on: boolean) => on),
    horn: vi.fn(),
  };
  const mountMock = vi.fn((_host: HTMLElement, listener: (snapshot: LeoLivreurSnapshot) => void) => {
    controllerMock.listener = listener;
    return controllerMock;
  });
  return { controllerMock, mountMock };
});

vi.mock("./LeoLivreurGame", () => ({ mountLeoLivreurGame: mountMock }));

import { LeoLivreurPrototypePage } from "./LeoLivreurPrototypePage";

// jsdom n’implémente pas la capture de pointeur : équivalent neutre, propre à chaque élément.
const captured = new WeakMap<Element, Set<number>>();
Object.assign(HTMLElement.prototype, {
  setPointerCapture(this: Element, id: number) { captured.set(this, (captured.get(this) ?? new Set()).add(id)); },
  releasePointerCapture(this: Element, id: number) { captured.get(this)?.delete(id); },
  hasPointerCapture(this: Element, id: number) { return captured.get(this)?.has(id) ?? false; },
});

const css = Object.values(import.meta.glob("./LeoLivreurPrototypePage.module.css", { query: "?raw", import: "default", eager: true }))[0] as string;

function setScreen(width: number, height: number, coarse: boolean) {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
  window.matchMedia = ((query: string) => ({
    matches: query.includes("coarse") ? coarse : false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

const driving: LeoLivreurSnapshot = {
  phase: "DRIVING",
  speedKmh: 48,
  heading: 0,
  steering: 0,
  cargo: 12,
  targetCargo: 12,
  distanceToHouse: 37,
  targetLabel: "Maison 2",
  signalState: "RED",
  signalMessage: null,
  signalDistance: 25,
  signalPrepare: true,
  travelledMeters: 300,
  routeLengthMeters: Number.POSITIVE_INFINITY,
  assets: "ready",
  assetsLoaded: null,
  assetsTotal: null,
};

describe("écran de conduite : trois lignes sans recouvrement", () => {
  it.each([
    ["ordinateur 1920 × 1080", 1920, 1080, false, "desktop"],
    ["ordinateur portable 1366 × 768", 1366, 768, false, "desktop"],
    ["portable avec barres du navigateur 1366 × 657", 1366, 657, false, "desktop"],
    ["tablette en paysage 1024 × 768", 1024, 768, true, "desktop"],
    ["téléphone en paysage 844 × 390", 844, 390, true, "landscape-compact"],
    ["petit téléphone en paysage 568 × 320", 568, 320, true, "landscape-compact"],
    ["téléphone en portrait 390 × 844", 390, 844, true, "portrait"],
    ["petit téléphone en portrait 320 × 568", 320, 568, true, "portrait"],
  ] as const)("%s : format, boutons tactiles, aucun débordement horizontal", (_name, width, height, coarse, format) => {
    const layout = drivingLayout({ width, height, coarsePointer: coarse });
    expect(layout.format).toBe(format);
    expect(layout.controlSize).toBeGreaterThanOrEqual(MIN_CONTROL_SIZE);
    // Le panneau de commandes est réservé d'abord : il ne prend jamais plus d'un tiers d'un écran paysage.
    if (format !== "portrait") expect(layout.controlSize + 24).toBeLessThanOrEqual(height / 3);
    if (format === "portrait") {
      // Cinq boutons sur une ligne + marges : aucun débordement horizontal.
      expect(5 * layout.controlSize + 4 * 8 + 12 + 16).toBeLessThanOrEqual(width);
      // Scène limitée à la hauteur utile du monde (zoom uniforme, aucune bande vide).
      expect(layout.sceneMaxHeight).not.toBeNull();
      expect((layout.sceneMaxHeight as number) / cameraZoomFor(width, height)).toBeLessThanOrEqual(WORLD_HEIGHT);
      expect((layout.sceneMaxHeight as number) / cameraZoomFor(width, height)).toBeGreaterThanOrEqual(ROAD_WIDTH + 2 * VEHICLE_LENGTH);
    } else {
      expect(layout.sceneMaxHeight).toBeNull();
    }
  });

  it("organise la grille en 100dvh (repli 100vh) : commandes et tableau de bord d'abord, scène sur l'espace restant", () => {
    expect(css).toContain("height: 100vh;\n  height: 100dvh;");
    expect(css).toContain("grid-template-rows: auto minmax(0, 1fr) auto;");
    expect(css).toContain("max-height: var(--scene-max, none);");
  });
});

describe("page : écran de conduite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setScreen(390, 844, true);
  });
  afterEach(() => {
    document.documentElement.style.overflow = "";
  });

  const enter = () => {
    render(<LeoLivreurPrototypePage />);
    fireEvent.click(screen.getByRole("button", { name: "Commencer la mission" }));
  };

  it("entre en conduite au départ de la mission : grand titre masqué, scène conservée, page figée", () => {
    render(<LeoLivreurPrototypePage />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Commencer la mission" }));
    expect(controllerMock.startMission).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(mountMock).toHaveBeenCalledTimes(1);
    expect(document.documentElement.style.overflow).toBe("hidden");
  });

  it("sépare les zones : tableau de bord, scène seule dans son cadre, panneau de commandes frère de la scène", () => {
    enter();
    const screenEl = screen.getByRole("region", { name: "Prototype de conduite de Léo" });
    const zones = [...screenEl.children];
    expect(zones).toHaveLength(3);
    expect(zones[0]).toHaveAttribute("aria-label", "Tableau de bord");
    expect(zones[1]).toHaveAttribute("data-zone", "scene");
    expect(zones[2]).toHaveAttribute("aria-label", "Commandes de conduite");
    // Aucune commande dans la zone de la scène : le canvas y est seul.
    expect(within(zones[1] as HTMLElement).queryAllByRole("button")).toHaveLength(0);
    // Seules la taille des boutons et la hauteur utile de la scène sont fixées par le code ; la grille CSS fait le reste.
    expect((screenEl as HTMLElement).style.getPropertyValue("--control-size")).toMatch(/px$/);
    expect((screenEl as HTMLElement).style.getPropertyValue("--scene-max")).toMatch(/px$/);
  });

  it("affiche pizzas, vitesse, distance et feu dans le tableau de bord, la consigne dans le panneau", () => {
    enter();
    act(() => controllerMock.listener?.(driving));
    const dashboard = screen.getByLabelText("Tableau de bord");
    expect(within(dashboard).getByText("12")).toBeInTheDocument();
    expect(within(dashboard).getByText("48")).toBeInTheDocument();
    expect(within(dashboard).getByText("37 m")).toBeInTheDocument();
    expect(within(dashboard).getByText("25 m")).toBeInTheDocument();
    const panel = screen.getByRole("region", { name: "Commandes de conduite" });
    expect(within(panel).getByText("Prochaine livraison : Maison 2")).toBeInTheDocument();
    expect(within(panel).getByText("Feu rouge à 25 m : prépare-toi à freiner.")).toBeInTheDocument();
  });

  it("permet des appuis prolongés et simultanés (Avancer + Gauche) et les relâche séparément", () => {
    enter();
    controllerMock.setControl.mockClear();
    const forward = within(screen.getByLabelText("Pédales")).getByRole("button", { name: "Avancer (maintenir)" });
    const left = within(screen.getByLabelText("Direction")).getByRole("button", { name: "Gauche (maintenir)" });
    fireEvent.pointerDown(forward, { pointerId: 1 });
    fireEvent.pointerDown(left, { pointerId: 2 });
    expect(controllerMock.setControl).toHaveBeenCalledWith("forward", true);
    expect(controllerMock.setControl).toHaveBeenCalledWith("left", true);
    fireEvent.pointerUp(left, { pointerId: 2 });
    expect(controllerMock.setControl).toHaveBeenLastCalledWith("left", false);
    expect(forward).toHaveAttribute("data-pressed", "true");
    fireEvent.pointerCancel(forward, { pointerId: 1 });
    expect(controllerMock.setControl).toHaveBeenLastCalledWith("forward", false);
  });

  it("coupe le son au départ ; le bouton Son l'active depuis le clic, puis le coupe", () => {
    setScreen(1366, 768, false);
    enter();
    const dashboard = screen.getByLabelText("Tableau de bord");
    const sound = within(dashboard).getByRole("button", { name: "Son du jeu" });
    expect(sound).toHaveAttribute("aria-pressed", "false");
    expect(sound).toHaveTextContent("Son : non");
    expect(controllerMock.setSound).not.toHaveBeenCalled();
    fireEvent.click(sound);
    expect(controllerMock.setSound).toHaveBeenLastCalledWith(true);
    expect(sound).toHaveAttribute("aria-pressed", "true");
    expect(sound).toHaveTextContent("Son : oui");
    fireEvent.click(sound);
    expect(controllerMock.setSound).toHaveBeenLastCalledWith(false);
    expect(sound).toHaveTextContent("Son : non");
  });

  it("sur téléphone, écrit seulement « Son », barré quand il est coupé, pour laisser la place à Pause et Quitter", () => {
    enter();
    const sound = screen.getByRole("button", { name: "Son du jeu" });
    expect(sound).toHaveTextContent(/^Son$/);
    expect(sound).toHaveAttribute("data-compact", "true");
    expect(sound).toHaveAttribute("data-sound", "off");
    expect(css).toContain('.dashboardButton[data-sound="off"][data-compact="true"] { text-decoration: line-through; }');
    fireEvent.click(sound);
    expect(sound).toHaveAttribute("data-sound", "on");
  });

  it("reste « Son : non » si le navigateur ne peut pas jouer de son", () => {
    enter();
    controllerMock.setSound.mockReturnValueOnce(false);
    const sound = screen.getByRole("button", { name: "Son du jeu" });
    fireEvent.click(sound);
    expect(sound).toHaveAttribute("aria-pressed", "false");
  });

  it("klaxonne tant que le bouton du centre est tenu, et le relâche à la pause", () => {
    enter();
    const panel = screen.getByRole("region", { name: "Commandes de conduite" });
    const horn = within(panel).getByRole("button", { name: "Klaxon (maintenir)" });
    fireEvent.pointerDown(horn, { pointerId: 3 });
    expect(controllerMock.horn).toHaveBeenLastCalledWith(true);
    expect(horn).toHaveAttribute("data-pressed", "true");
    expect(fireEvent.contextMenu(horn)).toBe(false);
    fireEvent.pointerUp(horn, { pointerId: 3 });
    expect(controllerMock.horn).toHaveBeenLastCalledWith(false);
    expect(horn).toHaveAttribute("data-pressed", "false");
    fireEvent.pointerDown(horn, { pointerId: 4 });
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(controllerMock.horn).toHaveBeenLastCalledWith(false);
  });

  it("range la direction à gauche et les pédales à droite, sans menu contextuel au long appui", () => {
    enter();
    expect(within(screen.getByLabelText("Direction")).getAllByRole("button").map((button) => button.dataset.control)).toEqual(["left", "right"]);
    const pedals = within(screen.getByLabelText("Pédales")).getAllByRole("button");
    expect(pedals.map((button) => button.dataset.control)).toEqual(["forward", "brake", "reverse"]);
    expect(fireEvent.contextMenu(pedals[1])).toBe(false);
  });

  it("relâche toutes les commandes à la perte de focus et quand l'onglet est caché", () => {
    enter();
    controllerMock.setControl.mockClear();
    fireEvent.blur(window);
    for (const control of ["left", "right", "forward", "brake", "reverse"]) expect(controllerMock.setControl).toHaveBeenCalledWith(control, false);
    controllerMock.setControl.mockClear();
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    fireEvent(document, new Event("visibilitychange"));
    expect(controllerMock.setControl).toHaveBeenCalledWith("forward", false);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
  });

  it("met en pause (commandes relâchées) puis reprend ; quitter reprend toujours le jeu", () => {
    enter();
    act(() => controllerMock.listener?.({ ...driving, signalState: null, signalDistance: null, signalPrepare: false }));
    controllerMock.setControl.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(controllerMock.setPaused).toHaveBeenLastCalledWith(true);
    expect(controllerMock.setControl).toHaveBeenCalledWith("forward", false);
    expect(screen.getByText("Jeu en pause. Appuie sur Reprendre pour continuer.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reprendre" }));
    expect(controllerMock.setPaused).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    fireEvent.click(screen.getByRole("button", { name: "Quitter le mode conduite" }));
    expect(controllerMock.setPaused).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("quitte aussi avec Échap et revient par le bouton Mode conduite", () => {
    enter();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mode conduite plein écran" }));
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("sur ordinateur, garde les boutons du panneau et rappelle le clavier", () => {
    setScreen(1920, 1080, false);
    enter();
    // Pendant la conduite (pas à l’écran de départ, où le bouton Commencer prend la place).
    act(() => controllerMock.listener?.({ ...driving, signalState: null, signalDistance: null }));
    expect(screen.getByLabelText("Pédales")).toBeInTheDocument();
    expect(screen.getByText(/flèches ou W A S D/)).toBeInTheDocument();
  });

  it("propose de livrer la pizza depuis le panneau quand Léo est arrêté devant la maison", () => {
    enter();
    act(() => controllerMock.listener?.({ ...driving, phase: "ARRIVED", signalState: null, signalDistance: null }));
    fireEvent.click(screen.getByRole("button", { name: "Livrer la pizza" }));
    expect(controllerMock.deliver).toHaveBeenCalledTimes(1);
  });

  it("affiche le chargement réel des images au démarrage, sans bouton Commencer tant que tout n'est pas prêt", () => {
    enter();
    const panel = screen.getByRole("region", { name: "Commandes de conduite" });
    expect(within(panel).getByText(/Chargement du jeu : 0 \/ 13 images/)).toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: "Commencer" })).not.toBeInTheDocument();
    act(() => controllerMock.listener?.({ ...driving, phase: "INTRO", signalState: null, signalDistance: null, signalPrepare: false }));
    expect(within(panel).getByRole("button", { name: "Commencer" })).toBeInTheDocument();
  });

  it("met la conduite en attente pendant le chargement de la suite du parcours, sans pourcentage inventé", () => {
    enter();
    act(() => controllerMock.listener?.({ ...driving, assets: "loading", assetsLoaded: null, assetsTotal: null }));
    expect(screen.getByText("Chargement de la suite du parcours… Léo attend un instant.")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("signale une erreur de téléchargement et permet de réessayer", () => {
    enter();
    act(() => controllerMock.listener?.({ ...driving, assets: "error", assetsLoaded: null, assetsTotal: null }));
    expect(screen.getByText(/n’a pas pu être téléchargée/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(controllerMock.retryAssets).toHaveBeenCalledTimes(1);
  });

  it("protège des gestes du navigateur et respecte les zones de sécurité du téléphone", () => {
    for (const rule of ["touch-action: none", "overscroll-behavior: none", "-webkit-touch-callout: none", "env(safe-area-inset-bottom", "env(safe-area-inset-left", "env(safe-area-inset-right"]) {
      expect(css).toContain(rule);
    }
  });
});
