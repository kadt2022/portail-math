import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { YambaWritingGame } from "./YambaWritingGame";

// Le rouleau et la chute se jouent en temps réel : de la marge quand la machine est chargée (suite complète en parallèle).
vi.setConfig({ testTimeout: 30000 });

// Hasard figé : le premier fruit du catalogue (banane) sort toujours. Mouvement réduit : le rouleau et la chute sont très courts.
beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener: () => undefined, removeEventListener: () => undefined }));
});
beforeEach(() => window.localStorage.clear());
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const stat = (name: string) => screen.getAllByRole("term").find((item) => item.textContent === name)?.nextElementSibling?.textContent;

async function startRound(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: "Fruits" }));
  await user.click(screen.getByRole("button", { name: "Lancer" }));
  return screen.findByRole("group", { name: "Cases du mot" }, { timeout: 12000 });
}

const tile = (letter: string) => screen.getAllByRole("button", { name: `Lettre ${letter}` })[0];

async function type(user: ReturnType<typeof userEvent.setup>, word: string) {
  for (const letter of word) await user.click(tile(letter));
}

describe("Yamba écrit : interface jouable", () => {
  it("propose les quatre catégories et « Toutes catégories », un bouton Lancer, et aucune case avant le lancement", () => {
    render(<YambaWritingGame />);
    const categories = within(screen.getByRole("group", { name: "Catégorie" }));
    for (const name of ["Toutes catégories", "Fruits", "Animaux domestiques", "Animaux sauvages", "Objets du quotidien"]) {
      expect(categories.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(categories.getByRole("button", { name: "Toutes catégories" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Lancer" })).toBeEnabled();
    expect(screen.queryByRole("group", { name: "Cases du mot" })).toBeNull();
    expect(screen.getByRole("button", { name: "Demander un indice" })).toBeDisabled();
    expect(stat("Mots réussis")).toBe("0");
  });

  it("le rouleau tourne, l'image tombe, puis les cases vides et les lettres mélangées apparaissent, sans montrer le mot", async () => {
    const user = userEvent.setup();
    render(<YambaWritingGame />);
    await user.click(screen.getByRole("button", { name: "Fruits" }));
    await user.click(screen.getByRole("button", { name: "Lancer" }));
    expect(screen.getByRole("button", { name: "Fruits" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Lancer" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("La machine tourne");

    const slots = await screen.findByRole("group", { name: "Cases du mot" }, { timeout: 12000 });
    expect(within(slots).getAllByRole("button")).toHaveLength(6);
    expect(screen.getAllByRole("button", { name: /^Lettre / })).toHaveLength(6);
    expect(screen.getByRole("status")).toHaveTextContent("Touche les lettres");
    // Le mot attendu n'est écrit nulle part avant la réussite : ni dans le texte, ni dans le nom accessible de l'image.
    expect(screen.queryByText(/banane/i)).toBeNull();
    expect(screen.queryByRole("img", { name: /banane/i })).toBeNull();
  });

  it("former BANANE : le mot est juste, la réussite est annoncée, le score monte et une nouvelle manche est proposée", async () => {
    const user = userEvent.setup();
    render(<YambaWritingGame />);
    await startRound(user);
    await type(user, "BANANE");
    expect(await screen.findByText("Bravo ! Tu as écrit banane.")).toBeInTheDocument();
    expect(stat("Mots réussis")).toBe("1");
    expect(screen.getByRole("button", { name: "Nouvelle manche" })).toBeEnabled();
  });

  it("une erreur n'est pas punie : les mauvaises lettres sont signalées, se retirent d'un toucher, et l'indice remet les bonnes", async () => {
    const user = userEvent.setup();
    render(<YambaWritingGame />);
    const slots = await startRound(user);
    await type(user, "BANAEN");
    expect(screen.getByRole("status")).toHaveTextContent("Touche les lettres");
    const placed = within(slots).getAllByRole("button", { name: /posée/ });
    expect(placed).toHaveLength(6);
    expect(placed.some((slot) => slot.hasAttribute("data-wrong"))).toBe(true);

    await user.click(placed[4]);
    expect(within(slots).getAllByRole("button", { name: /posée/ })).toHaveLength(5);

    await user.click(screen.getByRole("button", { name: "Demander un indice" }));
    expect(within(slots).getAllByRole("button", { name: /posée/ }).length).toBeGreaterThanOrEqual(4);
    expect(stat("Mots réussis")).toBe("0");
  });

  it("le clavier écrit aussi : les lettres tapées se posent, Retour arrière retire la dernière", async () => {
    const user = userEvent.setup();
    render(<YambaWritingGame />);
    const slots = await startRound(user);
    await user.keyboard("ba");
    expect(within(slots).getAllByRole("button", { name: /posée/ })).toHaveLength(2);
    await user.keyboard("{Backspace}");
    expect(within(slots).getAllByRole("button", { name: /posée/ })).toHaveLength(1);
    await user.keyboard("anane");
    expect(await screen.findByText("Bravo ! Tu as écrit banane.")).toBeInTheDocument();
  });

  it("après la réussite, la nouvelle manche tire une autre illustration (jamais la même d'affilée)", async () => {
    const user = userEvent.setup();
    render(<YambaWritingGame />);
    await startRound(user);
    await type(user, "BANANE");
    await user.click(await screen.findByRole("button", { name: "Nouvelle manche" }));
    const slots = await screen.findByRole("group", { name: "Cases du mot" }, { timeout: 12000 });
    // Banane vient de sortir : avec le hasard figé à 0, la suivante est la première image restante (pomme : 5 lettres).
    expect(within(slots).getAllByRole("button")).toHaveLength(5);
  });

  it("Recommencer revient à l'écran de départ", async () => {
    const user = userEvent.setup();
    render(<YambaWritingGame />);
    await startRound(user);
    await user.click(screen.getByRole("button", { name: "Recommencer le jeu depuis le début" }));
    expect(screen.queryByRole("group", { name: "Cases du mot" })).toBeNull();
    expect(screen.getByRole("button", { name: "Lancer" })).toBeEnabled();
  });

  it("un mot composé garde son espace : seules les lettres sont des cases", async () => {
    const user = userEvent.setup();
    render(<YambaWritingGame />);
    // Fruits : le dixième est « noix de coco » ; on tire jusqu'à lui avec un hasard qui choisit le dernier candidat.
    (Math.random as ReturnType<typeof vi.fn>).mockReturnValue(0.999);
    await user.click(screen.getByRole("button", { name: "Fruits" }));
    await user.click(screen.getByRole("button", { name: "Lancer" }));
    const slots = await screen.findByRole("group", { name: "Cases du mot" }, { timeout: 12000 });
    expect(within(slots).getAllByRole("button")).toHaveLength(10);
  });

  it("une main clignotante guide chaque geste du débutant : Lancer, une lettre, la lettre à retirer, puis Nouvelle manche", async () => {
    const user = userEvent.setup();
    render(<YambaWritingGame />);
    // Départ : la main montre le bouton Lancer, avec sa bulle.
    expect(screen.getByTestId("guide-hand")).toHaveAttribute("data-target", "launch");
    // Le bouton dit déjà ce qu'il fait : la main seule suffit, sans bulle.
    expect(screen.queryByText(/Appuie ici/)).toBeNull();

    await user.click(screen.getByRole("button", { name: "Lancer" }));
    // Rouleau et chute : rien à toucher, pas de main.
    expect(screen.queryByTestId("guide-hand")).toBeNull();

    await screen.findByRole("group", { name: "Cases du mot" }, { timeout: 12000 });
    expect(await screen.findByTestId("guide-hand")).toHaveAttribute("data-target", "tile");
    // Ici le geste a besoin d'être expliqué : la bulle dit de placer les lettres dans les cases.
    expect(screen.getByText("Touche les lettres pour les placer dans les cases")).toBeInTheDocument();
    // Elle se pose au centre de la rangée de lettres : pas sur une lettre en particulier, encore moins sur la première.
    expect(document.querySelector("[data-guide='tile']")).toBe(screen.getByRole("group", { name: "Lettres disponibles" }));
    expect(document.querySelectorAll("button[data-guide]")).toHaveLength(1); // seul le bouton Lancer est marqué

    await type(user, "BANAEN");
    expect(await screen.findByText("Touche cette case pour retirer la lettre")).toBeInTheDocument();
    expect(screen.getByTestId("guide-hand")).toHaveAttribute("data-target", "wrong");
    expect(screen.getByText("Touche cette case pour retirer la lettre")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: /posée/ })[4]);
    await user.click(screen.getAllByRole("button", { name: /posée/ })[4]);
    await type(user, "NE");
    expect(await screen.findByText("Bravo ! Tu as écrit banane.")).toBeInTheDocument();
    expect(await screen.findByTestId("guide-hand")).toHaveAttribute("data-target", "launch");
    expect(screen.queryByText(/nouvelle image/)).toBeNull();
  });

  it("après un premier mot réussi, la main ne s'impose plus à chaque étape", async () => {
    window.localStorage.setItem("yamba.writing.guided", "1");
    const user = userEvent.setup();
    render(<YambaWritingGame />);
    expect(screen.queryByTestId("guide-hand")).toBeNull();
    await startRound(user);
    expect(screen.queryByTestId("guide-hand")).toBeNull();
  });

  it("enregistre la réussite du premier mot, puis arrête le guide permanent au lancement suivant", async () => {
    const user = userEvent.setup();
    render(<YambaWritingGame />);
    await startRound(user);
    await type(user, "BANANE");
    await screen.findByText("Bravo ! Tu as écrit banane.");
    expect(window.localStorage.getItem("yamba.writing.guided")).toBe("1");
    await user.click(screen.getByRole("button", { name: "Nouvelle manche" }));
    expect(screen.queryByTestId("guide-hand")).toBeNull();
  });

  it("la main suit chaque geste : quand une mauvaise lettre est retirée, elle passe à la mauvaise case suivante", async () => {
    // Positions simulées : chaque case du mot est 100 px plus loin que la précédente.
    const rectOf = (element: Element) => {
      const slots = [...document.querySelectorAll("[role='group'][aria-label='Cases du mot'] button")];
      const index = Math.max(0, slots.indexOf(element));
      return { left: index * 100, top: 0, width: 50, height: 50, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
    };
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      return rectOf(this);
    });
    const user = userEvent.setup();
    render(<YambaWritingGame />);
    await startRound(user);
    await type(user, "BANAEN");
    const hand = await screen.findByTestId("guide-hand");
    expect(hand).toHaveAttribute("data-target", "wrong");
    const first = hand.style.left;
    await user.click(screen.getAllByRole("button", { name: /posée/ })[4]);
    expect(screen.getByTestId("guide-hand").style.left).not.toBe(first);
  });

  it("le nombre de cases du mot est donné à la mise en page pour que le mot reste sur une seule ligne", async () => {
    const user = userEvent.setup();
    render(<YambaWritingGame />);
    (Math.random as ReturnType<typeof vi.fn>).mockReturnValue(0.999);
    await user.click(screen.getByRole("button", { name: "Fruits" }));
    await user.click(screen.getByRole("button", { name: "Lancer" }));
    await screen.findByRole("group", { name: "Cases du mot" }, { timeout: 12000 });
    // « noix de coco » : dix lettres et deux espaces.
    expect(screen.getByRole("region", { name: "Écris le mot" }).style.getPropertyValue("--count")).toBe("12");
  });

  it("en pause pendant la chute, la partie n'avance pas ; elle reprend là où elle en était", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    try {
      render(<YambaWritingGame />);
      fireEvent.click(screen.getByRole("button", { name: "Lancer" }));
      // Rouleau (700 ms en mouvement réduit) : la chute commence.
      act(() => {
        vi.advanceTimersByTime(760);
      });
      expect(screen.getByTestId("dropper")).toBeInTheDocument();
      act(() => {
        vi.advanceTimersByTime(60);
      });
      fireEvent.click(screen.getAllByRole("button", { name: "Pause" })[0]);
      // Longtemps après : la chute est figée, l'écriture n'a pas commencé et le son du choc n'a pas retenti derrière la pause.
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByTestId("dropper")).toBeInTheDocument();
      expect(screen.queryByRole("group", { name: "Cases du mot" })).toBeNull();
      fireEvent.click(screen.getAllByRole("button", { name: /^(Jouer|Reprendre|Continuer)$/ })[0]);
      act(() => {
        vi.advanceTimersByTime(400);
      });
      expect(screen.getByRole("group", { name: "Cases du mot" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
