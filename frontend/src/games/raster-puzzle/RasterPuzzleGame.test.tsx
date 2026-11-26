import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RasterPuzzleGame } from "./RasterPuzzleGame";

// La lecture des pixels n'existe pas dans le navigateur de test : on la remplace pour choisir les classes d'équivalence des morceaux.
const classesFor = vi.hoisted(() => ({ value: null as number[] | null }));
vi.mock("./tile-signature", async (original) => ({ ...(await original<typeof import("./tile-signature")>()), readTileClasses: () => classesFor.value }));

// Une image qui « se charge » aussitôt, et le mouvement réduit : l'introduction est très courte.
class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 320;
  naturalHeight = 320;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

beforeEach(() => {
  classesFor.value = null;
  window.localStorage.clear();
  vi.stubGlobal("Image", FakeImage);
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const stat = (name: string) => screen.getAllByRole("term").find((item) => item.textContent === name)?.nextElementSibling?.textContent;
const pieces = () => [...document.querySelectorAll<HTMLElement>("[data-tray] [data-piece]")];
const cell = (index: number) => document.querySelector<HTMLElement>(`[data-cell="${index}"]`) as HTMLElement;
const trayCount = (count: number) => waitFor(() => expect(pieces()).toHaveLength(count), { timeout: 8000 });
const inPlay = () => waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Glisse les tuiles"), { timeout: 8000 });

async function ready(user: ReturnType<typeof userEvent.setup>, count = 9) {
  render(<RasterPuzzleGame />);
  await trayCount(count);
  await inPlay();
  return user;
}

/** Pose chaque morceau dans sa vraie case (toucher le morceau, puis la case). */
async function solve(user: ReturnType<typeof userEvent.setup>, order: number[]) {
  for (const piece of order) {
    await user.click(document.querySelector(`[data-tray] [data-piece="${piece}"]`) as HTMLElement);
    await user.click(cell(piece));
  }
}

describe("Raster Puzzle : interface jouable", () => {
  it("montre la grille 3 × 3 vide, les cinq niveaux, la catégorie et les commandes ; rien à ranger tant que l'image est entière", () => {
    render(<RasterPuzzleGame />);
    expect(screen.getAllByRole("gridcell")).toHaveLength(9);
    const levels = within(screen.getByRole("group", { name: "Niveau" }));
    for (const name of ["Débutant, 2 × 2", "Facile, 3 × 3", "Intermédiaire, 4 × 4", "Avancé, 5 × 5", "Expert, 6 × 6"]) expect(levels.getByRole("button", { name })).toBeInTheDocument();
    expect(levels.getByRole("button", { name: "Facile, 3 × 3" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Toutes catégories")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recommencer" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Image suivante" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Indice" })).toBeDisabled();
    expect(stat("Images reconstituées")).toBe("0");
    expect(pieces()).toHaveLength(0);
    expect(screen.getByText("Regarde bien l'image !")).toBeInTheDocument();
  });

  it("après l'introduction, les neuf tuiles sont dans la zone de stockage, mélangées, et la main montre où les glisser", async () => {
    await ready(userEvent.setup());
    expect(pieces().map((element) => Number(element.dataset.piece))).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(screen.getByRole("button", { name: "Indice" })).toBeEnabled();
    expect(await screen.findByTestId("guide-hand")).toHaveAttribute("data-target", "tray");
    expect(screen.getByText("Glisse les tuiles dans la grille pour reconstituer l'image")).toBeInTheDocument();
  });

  it("toucher une tuile puis une case la pose ; la main disparaît dès la première tuile posée", async () => {
    const user = await ready(userEvent.setup());
    const piece = pieces()[0];
    await user.click(piece);
    expect(piece).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("status")).toHaveTextContent("Tuile choisie");
    await user.click(cell(4));
    expect(cell(4).dataset.holds).toBe(piece.dataset.piece);
    expect(cell(4)).toHaveAccessibleName("Ligne 2, colonne 2, tuile posée");
    expect(pieces()).toHaveLength(8);
    expect(screen.queryByTestId("guide-hand")).toBeNull();
  });

  it("toucher deux fois la même tuile la relâche ; toucher une tuile posée la reprend ; toucher la zone de stockage la range", async () => {
    const user = await ready(userEvent.setup());
    const piece = pieces()[0];
    await user.click(piece);
    await user.click(piece);
    expect(piece).toHaveAttribute("aria-pressed", "false");
    await user.click(piece);
    await user.click(cell(0));
    // Reprendre la tuile posée, puis la ranger en touchant la zone de stockage.
    await user.click(cell(0));
    expect(cell(0).dataset.selected).toBe("true");
    await user.click(screen.getByRole("button", { name: "Remettre la tuile dans la zone de stockage" }));
    expect(cell(0).dataset.holds).toBeUndefined();
    expect(pieces()).toHaveLength(9);
  });

  it("échange deux tuiles déjà posées, sans pénalité", async () => {
    const user = await ready(userEvent.setup());
    const [first, second] = pieces();
    const [a, b] = [first.dataset.piece, second.dataset.piece];
    await user.click(first);
    await user.click(cell(0));
    await user.click(second);
    await user.click(cell(1));
    await user.click(cell(0));
    await user.click(cell(1));
    expect([cell(0).dataset.holds, cell(1).dataset.holds]).toEqual([b, a]);
  });

  it("reconstituer l'image la valide toute seule : l'image revient, le compteur monte, Image suivante est montrée", async () => {
    const user = await ready(userEvent.setup());
    await solve(user, pieces().map((element) => Number(element.dataset.piece)));
    expect(await screen.findByText("Bravo ! L'image est reconstituée.", { selector: "p" })).toBeInTheDocument();
    expect(stat("Images reconstituées")).toBe("1");
    expect(document.querySelector("img[data-won]")).not.toBeNull();
    expect(window.localStorage.getItem("raster.puzzle.guided")).toBe("1");
    expect(await screen.findByTestId("guide-hand")).toHaveAttribute("data-target", "next");
  });

  it("deux tuiles de fond blanc identiques sont interchangeables : les permuter ne coûte rien", async () => {
    // Les morceaux 1 et 2 sont deux morceaux de fond blanc (même classe).
    classesFor.value = [0, 1, 1, 3, 4, 5, 6, 7, 8];
    const user = await ready(userEvent.setup());
    for (const [piece, target] of [[0, 0], [2, 1], [1, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8]]) {
      await user.click(document.querySelector(`[data-tray] [data-piece="${piece}"]`) as HTMLElement);
      await user.click(cell(target));
    }
    expect(stat("Images reconstituées")).toBe("1");
  });

  it("deux tuiles seulement ressemblantes ne sont pas interchangeables", async () => {
    classesFor.value = null;
    const user = await ready(userEvent.setup());
    for (const [piece, target] of [[0, 0], [2, 1], [1, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8]]) {
      await user.click(document.querySelector(`[data-tray] [data-piece="${piece}"]`) as HTMLElement);
      await user.click(cell(target));
    }
    expect(stat("Images reconstituées")).toBe("0");
    expect(screen.getByRole("status")).not.toHaveTextContent("Bravo");
  });

  it("change de niveau : la grille et le nombre de tuiles suivent (2 × 2, 4 × 4, 5 × 5, 6 × 6)", async () => {
    const user = await ready(userEvent.setup());
    for (const [name, count] of [["Débutant, 2 × 2", 4], ["Intermédiaire, 4 × 4", 16], ["Avancé, 5 × 5", 25], ["Expert, 6 × 6", 36]] as const) {
      await user.click(screen.getByRole("button", { name }));
      await trayCount(count);
      expect(screen.getAllByRole("gridcell")).toHaveLength(count);
    }
  }, 30000);

  it("parcourt les catégories avec les flèches, dans les deux sens", async () => {
    const user = await ready(userEvent.setup());
    await user.click(screen.getByRole("button", { name: "Catégorie suivante" }));
    expect(screen.getByText("Fruits")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Catégorie précédente" }));
    await user.click(screen.getByRole("button", { name: "Catégorie précédente" }));
    expect(screen.getByText("Objets du quotidien")).toBeInTheDocument();
  });

  it("Image suivante, Recommencer : une nouvelle manche, tuiles de nouveau mélangées dans la zone de stockage", async () => {
    const user = await ready(userEvent.setup());
    await user.click(pieces()[0]);
    await user.click(cell(0));
    await user.click(screen.getByRole("button", { name: "Recommencer" }));
    await trayCount(9);
    expect(cell(0).dataset.holds).toBeUndefined();
    await user.click(screen.getByRole("button", { name: "Image suivante" }));
    await trayCount(9);
    expect(screen.getAllByRole("gridcell").every((element) => element.dataset.holds === undefined)).toBe(true);
  });

  it("l'indice montre l'image entière un instant, puis la cache", async () => {
    const user = await ready(userEvent.setup());
    const image = document.querySelector("img[class*=fullImage]") as HTMLElement;
    expect(image.dataset.visible).toBeUndefined();
    await user.click(screen.getByRole("button", { name: "Indice" }));
    expect(image.dataset.visible).toBe("true");
    await waitFor(() => expect(image.dataset.visible).toBeUndefined(), { timeout: 4000 });
  });

  it("en pause, l'introduction n'avance pas", async () => {
    const user = userEvent.setup();
    render(<RasterPuzzleGame />);
    await user.click(screen.getAllByRole("button", { name: "Pause" })[0]);
    await new Promise((resolve) => setTimeout(resolve, 900));
    expect(pieces()).toHaveLength(0);
    expect(screen.getByText("Regarde bien l'image !")).toBeInTheDocument();
  });

  it("glisser-déposer : une tuile glissée sur une case s'y pose, une tuile reprise et lâchée sur la zone de stockage y retourne", async () => {
    const user = await ready(userEvent.setup());
    const piece = pieces()[0];
    const send = (target: EventTarget, type: string, x: number, y: number) =>
      act(() => {
        target.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 }));
      });
    const under = vi.fn<(x: number, y: number) => Element | null>();
    document.elementFromPoint = under;

    // Une tuile du stockage jusqu'à la case 5.
    under.mockReturnValue(cell(5));
    send(piece, "pointerdown", 10, 10);
    send(window, "pointermove", 14, 14);
    send(window, "pointermove", 80, 90);
    send(window, "pointerup", 80, 90);
    expect(cell(5).dataset.holds).toBe(piece.dataset.piece);
    expect(pieces()).toHaveLength(8);

    // La même tuile, reprise sur la grille et lâchée sur la zone de stockage.
    under.mockReturnValue(document.querySelector("[data-tray]"));
    send(cell(5), "pointerdown", 80, 90);
    send(window, "pointermove", 200, 200);
    send(window, "pointerup", 200, 200);
    expect(cell(5).dataset.holds).toBeUndefined();
    expect(pieces()).toHaveLength(9);

    // Un simple toucher (sans déplacement) ne glisse rien : il reste un clic. La tuile revenue est un nouvel élément.
    const back = document.querySelector(`[data-tray] [data-piece="${piece.dataset.piece}"]`) as HTMLElement;
    send(back, "pointerdown", 10, 10);
    send(window, "pointerup", 10, 10);
    expect(pieces()).toHaveLength(9);
    await user.click(back);
    expect(back).toHaveAttribute("aria-pressed", "true");
  });

  it("Échap relâche la tuile choisie", async () => {
    const user = await ready(userEvent.setup());
    await user.click(pieces()[0]);
    expect(pieces()[0]).toHaveAttribute("aria-pressed", "true");
    await user.keyboard("{Escape}");
    expect(pieces()[0]).toHaveAttribute("aria-pressed", "false");
  });

  it("pas de lecteur d'image : la partie reste jouable, chaque tuile étant unique", async () => {
    vi.stubGlobal("Image", class { naturalWidth = 0; naturalHeight = 0; onload = null; onerror: (() => void) | null = null; set src(_v: string) { queueMicrotask(() => this.onerror?.()); } });
    await ready(userEvent.setup());
    expect(pieces()).toHaveLength(9);
  });

  it("Valider : sans tuile posée, il invite à en poser ; il est inactif pendant l'introduction", async () => {
    const user = userEvent.setup();
    render(<RasterPuzzleGame />);
    expect(screen.getByRole("button", { name: "Valider" })).toBeDisabled();
    await inPlay();
    await user.click(screen.getByRole("button", { name: "Valider" }));
    expect(screen.getByText("Pose d'abord quelques tuiles, puis valide.", { selector: "p[data-kind]" })).toBeInTheDocument();
    expect(document.querySelectorAll("[data-verdict]")).toHaveLength(0);
  });

  it("Valider marque d'une coche les tuiles justes et d'une croix celles qui ne sont pas au bon endroit, sans rien changer", async () => {
    const user = await ready(userEvent.setup());
    const [first, second] = pieces().map((element) => Number(element.dataset.piece));
    // Une tuile à sa place, une autre au mauvais endroit.
    await user.click(document.querySelector(`[data-tray] [data-piece="${first}"]`) as HTMLElement);
    await user.click(cell(first));
    const wrongCell = (second + 1) % 9 === first ? (second + 2) % 9 : (second + 1) % 9;
    await user.click(document.querySelector(`[data-tray] [data-piece="${second}"]`) as HTMLElement);
    await user.click(cell(wrongCell));
    await user.click(screen.getByRole("button", { name: "Valider" }));
    expect(cell(first).dataset.verdict).toBe("right");
    expect(cell(wrongCell).dataset.verdict).toBe("wrong");
    expect(screen.getByText(/Les croix montrent les tuiles/, { selector: "p[data-kind]" })).toBeInTheDocument();
    // Rien n'est retiré ni pénalisé : les deux tuiles sont toujours posées.
    expect(cell(first).dataset.holds).toBe(String(first));
    expect(cell(wrongCell).dataset.holds).toBe(String(second));
    // Dès que l'enfant bouge une tuile, le verdict disparaît.
    await user.click(cell(wrongCell));
    await user.click(screen.getByRole("button", { name: "Remettre la tuile dans la zone de stockage" }));
    expect(document.querySelectorAll("[data-verdict]")).toHaveLength(0);
  });

  it("Valider avec seulement des tuiles justes : tout ce qui est posé est bon, l'image n'est pas encore finie", async () => {
    const user = await ready(userEvent.setup());
    const first = Number(pieces()[0].dataset.piece);
    await user.click(pieces()[0]);
    await user.click(cell(first));
    await user.click(screen.getByRole("button", { name: "Valider" }));
    expect(cell(first).dataset.verdict).toBe("right");
    expect(screen.getByText("Bien ! Tout ce qui est posé est juste, continue.", { selector: "p[data-kind]" })).toBeInTheDocument();
    expect(stat("Images reconstituées")).toBe("0");
  });

  it("grille pleine mais fausse : la validation est automatique, les mauvaises tuiles sont marquées d'une croix et rien n'est perdu", async () => {
    const user = await ready(userEvent.setup());
    // Deux tuiles permutées : toute la grille est pleine, seules deux cases sont fausses.
    const order = [1, 0, 2, 3, 4, 5, 6, 7, 8];
    for (const [cellIndex, piece] of order.entries()) {
      await user.click(document.querySelector(`[data-tray] [data-piece="${piece}"]`) as HTMLElement);
      await user.click(cell(cellIndex));
    }
    expect(stat("Images reconstituées")).toBe("0");
    expect([cell(0).dataset.verdict, cell(1).dataset.verdict, cell(2).dataset.verdict]).toEqual(["wrong", "wrong", "right"]);
    expect(screen.getByText(/Les croix montrent les tuiles/, { selector: "p[data-kind]" })).toBeInTheDocument();
    // L'enfant corrige : échange les deux tuiles, l'image est reconstituée et les marques disparaissent.
    await user.click(cell(0));
    await user.click(cell(1));
    expect(await screen.findByText("Bravo ! L'image est reconstituée.", { selector: "p" })).toBeInTheDocument();
    expect(document.querySelectorAll("[data-verdict]")).toHaveLength(0);
    expect(stat("Images reconstituées")).toBe("1");
  });
});
