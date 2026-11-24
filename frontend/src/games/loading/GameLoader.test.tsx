import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense, lazy, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GameLoader } from "./GameLoader";
import { GameLoaderHost, ReachMilestone, useGameLoading } from "./GameLoaderHost";
import { createLoadingSession } from "./loadingSession";

const bar = () => document.querySelector('[role=progressbar][aria-label="Chargement du jeu"]');
const LONG = "Le chargement peut prendre plusieurs minutes, voire davantage si votre connexion Internet est lente. Merci pour votre patience.";
const SLOW = "Le chargement prend un peu plus de temps. Merci de patienter. Sur une connexion lente, cela peut prendre jusqu'à une minute, voire davantage.";

describe("chargeur commun des jeux", () => {
  let time = 0;
  const now = () => time;
  const wait = (ms: number) =>
    act(() => {
      time += ms;
      vi.advanceTimersByTime(ms);
    });

  beforeEach(() => {
    time = 0;
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it("dès le clic : « Initialisation du jeu… » à 0 %, sans message ; puis les jalons atteints font avancer la barre", () => {
    const session = createLoadingSession({ player: 3, engine: 5, mounted: 2 }, now);
    render(<GameLoader session={session} now={now} />);
    expect(screen.getByText("Initialisation du jeu…")).toBeInTheDocument();
    expect(bar()).toHaveAttribute("aria-valuenow", "0");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    act(() => session.milestone("player"));
    act(() => session.milestone("engine"));
    expect(bar()).toHaveAttribute("aria-valuenow", "8");
    expect(screen.getByText("8 %")).toBeInTheDocument();
    expect(screen.queryByText(/Turbo Pulse|Léo/)).not.toBeInTheDocument();
  });

  it("initialisation de plus de 10 s : « Veuillez patienter… » ; puis, ressources : 10 %, titre changé, message retiré", () => {
    const session = createLoadingSession({ player: 7, mounted: 3 }, now);
    const { container } = render(<GameLoader session={session} now={now} />);
    const loader = container.firstElementChild;
    act(() => session.milestone("player"));
    wait(9_999);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    wait(1);
    expect(screen.getByRole("status")).toHaveTextContent("Veuillez patienter…");
    act(() => session.milestone("mounted"));
    expect(screen.getByText("Chargement des ressources…")).toBeInTheDocument();
    expect(bar()).toHaveAttribute("aria-valuenow", "10");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    // Même composant, sans démontage : même élément, même fond.
    expect(container.firstElementChild).toBe(loader);
  });

  it("ressources depuis 15 s : le message actuel ; 90 s après le clic : le nouveau message, puis alternance toutes les 20 s", () => {
    const session = createLoadingSession({ player: 1 }, now);
    render(<GameLoader session={session} now={now} />);
    wait(5_000);
    act(() => session.milestone("player"));
    act(() => session.reportResources(0.3));
    wait(14_999);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    wait(1);
    expect(screen.getByRole("status")).toHaveTextContent(SLOW);
    wait(90_000 - 20_000);
    expect(screen.getByRole("status")).toHaveTextContent(LONG);
    wait(20_000);
    expect(screen.getByRole("status")).toHaveTextContent(SLOW);
    wait(20_000);
    expect(screen.getByRole("status")).toHaveTextContent(LONG);
    wait(20_000);
    expect(screen.getByRole("status")).toHaveTextContent(SLOW);
    // La progression continue sous les messages.
    act(() => session.reportResources(0.5));
    expect(bar()).toHaveAttribute("aria-valuenow", "55");
  });

  it("initialisation encore en cours à 90 s : alternance des messages, même titre et même progression", () => {
    const session = createLoadingSession({ player: 3, engine: 5, mounted: 2 }, now);
    render(<GameLoader session={session} now={now} />);
    act(() => session.milestone("player"));
    wait(90_000);
    expect(screen.getByText("Initialisation du jeu…")).toBeInTheDocument();
    expect(bar()).toHaveAttribute("aria-valuenow", "3");
    expect(screen.getByRole("status")).toHaveTextContent(LONG);
    wait(20_000);
    expect(screen.getByRole("status")).toHaveTextContent(SLOW);
  });

  it("vraie erreur : un message et Réessayer, qui relance le jeu ; Fermer reste disponible", async () => {
    vi.useRealTimers();
    const session = createLoadingSession({ player: 1 });
    const retry = vi.fn();
    const close = vi.fn();
    render(<GameLoader session={session} onClose={close} />);
    act(() => session.fail(retry));
    expect(screen.getByRole("alert")).toHaveTextContent("Le téléchargement a été interrompu.");
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    expect(close).toHaveBeenCalledOnce();
  });

  it("habillage du jeu par les variables --loading-*", () => {
    const { container } = render(<GameLoader session={createLoadingSession({})} theme={{ "--loading-fill": "orange" } as React.CSSProperties} />);
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--loading-fill")).toBe("orange");
  });

  it("chronomètre supprimé quand le chargeur disparaît (jeu fermé ou autre jeu affiché)", () => {
    const session = createLoadingSession({ player: 1 }, now);
    const { unmount } = render(<GameLoader session={session} now={now} />);
    expect(vi.getTimerCount()).toBe(1);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("hôte du chargeur", () => {
  /** Lecteur simulé : signale qu'il est monté, puis ses ressources, puis prêt. */
  function FakePlayer({ onLoading }: { onLoading: (session: ReturnType<typeof useGameLoading>) => void }) {
    const loading = useGameLoading();
    useEffect(() => {
      onLoading(loading);
    }, [loading, onLoading]);
    return <p>Accueil du jeu</p>;
  }

  it("chargeur affiché avant même le code du jeu, gardé sans démontage jusqu'au jeu prêt, puis retiré aussitôt", async () => {
    let resolvePlayer: (value: { default: typeof FakePlayer }) => void = () => {};
    const Player = lazy(() => new Promise<{ default: typeof FakePlayer }>((resolve) => (resolvePlayer = resolve)));
    let loading: ReturnType<typeof useGameLoading> | null = null;
    const session = createLoadingSession({ player: 3, engine: 5, mounted: 2 });
    const { container } = render(
      <GameLoaderHost game="turbo-pulse" session={session}>
        <Suspense fallback={<div data-testid="cadre" />}>
          <ReachMilestone id="player" />
          <Player onLoading={(each) => (loading = each)} />
        </Suspense>
      </GameLoaderHost>,
    );
    const loader = container.querySelector("[data-phase]");
    expect(loader).toHaveAttribute("data-phase", "init");
    expect(bar()).toHaveAttribute("aria-valuenow", "0");
    await act(async () => resolvePlayer({ default: FakePlayer }));
    // Le code du lecteur est arrivé : jalon atteint, et le lecteur reçoit la même séance.
    expect(bar()).toHaveAttribute("aria-valuenow", "3");
    expect(loading).toBe(session);
    act(() => {
      session.milestone("engine");
      session.milestone("mounted");
      session.reportResources(0.5);
    });
    expect(container.querySelector("[data-phase]")).toBe(loader);
    expect(bar()).toHaveAttribute("aria-valuenow", "55");
    act(() => session.ready());
    expect(bar()).toBeNull();
    expect(screen.getByText("Accueil du jeu")).toBeInTheDocument();
  });

  it("jeu masqué (un autre jeu est affiché) : son chargeur est retiré ; il revient, sur la même séance, s'il est rouvert", () => {
    const session = createLoadingSession({ player: 1 });
    const { rerender } = render(<GameLoaderHost game="conduire-avec-leo" session={session} visible={false}><div /></GameLoaderHost>);
    expect(bar()).toBeNull();
    rerender(<GameLoaderHost game="conduire-avec-leo" session={session} visible><div /></GameLoaderHost>);
    expect(bar()).not.toBeNull();
  });

  it("hors d'un hôte, un lecteur reçoit une séance détachée (rien n'est affiché)", () => {
    let loading: ReturnType<typeof useGameLoading> | null = null;
    render(<FakePlayer onLoading={(each) => (loading = each)} />);
    expect(loading).not.toBeNull();
    expect(bar()).toBeNull();
  });
});
