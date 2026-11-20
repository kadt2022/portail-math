import { render, screen } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FeaturedGame } from "./FeaturedGame";
import { featuredGame } from "./game-catalogue";

afterEach(() => {
  vi.useRealTimers();
});

function renderBanner() {
  if (!featuredGame) throw new Error("Aucun jeu à la une dans le catalogue");
  return render(
    <MemoryRouter>
      <FeaturedGame game={featuredGame} />
    </MemoryRouter>,
  );
}

describe("Bannière du jeu à la une", () => {
  it("est un lien entier vers le jeu, sans pastilles de catégorie", () => {
    renderBanner();
    const banner = screen.getByRole("link", { name: "Jouer à Conduire avec Léo" });
    expect(banner).toHaveAttribute("href", "/jeux/conduire-avec-leo");
    expect(banner).toHaveTextContent("Conduire avec Léo");
    expect(banner).not.toHaveTextContent("Jeu éducatif");
  });

  it("compose le décor, Léo de profil, Léo de face et le bus de la voie d'en face (tous décoratifs)", () => {
    const { container } = renderBanner();
    const images = container.querySelectorAll("img");
    // ciel, ville, voiture de profil, voiture de face, bus inter-urbain
    expect(images).toHaveLength(5);
    for (const image of images) expect(image).toHaveAttribute("alt", "");
    // Chaque véhicule de profil a deux roues animées (disques posés sur les roues du dessin).
    expect(container.querySelectorAll('[class*="wheel"], [class*="busWheel"]')).toHaveLength(4);
  });

  it("rejoue le mouvement au passage de la souris, mais seulement une fois l'arrivée terminée", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = renderBanner();
    const banner = screen.getByRole("link", { name: "Jouer à Conduire avec Léo" });
    const frontCar = () => container.querySelector('img[class*="car"]');
    const initial = frontCar();

    // Pendant l'arrivée de Léo : le survol ne relance rien.
    await user.hover(banner);
    expect(frontCar()).toBe(initial);
    await user.unhover(banner);

    // Une fois l'arrivée terminée : le passage de la souris relance toute la séquence.
    vi.setSystemTime(Date.now() + 10_000);
    await user.hover(banner);
    expect(frontCar()).not.toBe(initial);
  });
});

describe("Ondulation du décor", () => {
  it("compose un canvas décoratif caché au repos, sans WebGL le survol et le toucher ne cassent rien", () => {
    const { container } = renderBanner();
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    const banner = screen.getByRole("link", { name: "Jouer à Conduire avec Léo" });
    expect(() => {
      fireEvent.pointerMove(banner, { pointerType: "mouse", clientX: 40, clientY: 40 });
      fireEvent.pointerDown(banner, { pointerType: "touch", clientX: 40, clientY: 40 });
      fireEvent.pointerLeave(banner);
    }).not.toThrow();
    // Le lien reste intact : la navigation n'est pas retardée.
    expect(banner).toHaveAttribute("href", "/jeux/conduire-avec-leo");
  });
});

describe("Dégradé au toucher", () => {
  it("un toucher lance le dégradé, un autre le relance, sans retarder le lien", () => {
    renderBanner();
    const banner = screen.getByRole("link", { name: "Jouer à Conduire avec Léo" });
    expect(banner.className).not.toMatch(/glowTouch/);
    fireEvent.pointerDown(banner, { pointerType: "touch", clientX: 10, clientY: 10 });
    expect(banner.className).toMatch(/glowTouch/);
    fireEvent.pointerDown(banner, { pointerType: "touch", clientX: 20, clientY: 20 });
    expect(banner.className).toMatch(/glowTouch/);
    // La souris ne lance pas ce dégradé : il est réservé au toucher (au survol, il vient du style).
    fireEvent.pointerDown(banner, { pointerType: "mouse" });
    expect(banner).toHaveAttribute("href", "/jeux/conduire-avec-leo");
  });
});
