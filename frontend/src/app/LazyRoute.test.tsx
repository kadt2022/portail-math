import { act, render, screen } from "@testing-library/react";
import { useState, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useGameLoading } from "../games/loading/GameLoaderHost";
import { lazyRoute, preloadRoutes } from "./LazyRoute";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((ok, ko) => {
    resolve = ok;
    reject = ko;
  });
  return { promise, resolve, reject };
}

describe("pages chargées à la demande", () => {
  afterEach(() => vi.restoreAllMocks());

  it("affiche un indicateur sans pourcentage pendant le téléchargement, puis la page", async () => {
    const download = deferred<() => ReactElement>();
    const Page = lazyRoute(() => download.promise);
    render(<Page />);
    expect(screen.getByRole("status")).toHaveTextContent("Chargement…");
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
    await act(async () => download.resolve(() => <p>Contenu de la page</p>));
    expect(await screen.findByText("Contenu de la page")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("propose de réessayer quand le téléchargement échoue, sans boucle automatique", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const download = deferred<() => ReactElement>();
    // Premier essai en échec ; les suivants (préchargement des autres tests) réussissent.
    const load = vi.fn<() => Promise<() => ReactElement>>(() => Promise.resolve(() => <p>Revenue</p>));
    load.mockImplementationOnce(() => download.promise);
    const Page = lazyRoute(load);
    render(<Page />);
    await act(async () => download.reject(new Error("réseau")));
    expect(await screen.findByRole("alert")).toHaveTextContent("La page n’a pas pu être téléchargée.");
    expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("affiche immédiatement une page déjà téléchargée, sans indicateur ni nouvelle instance au rendu suivant", async () => {
    let mounts = 0;
    function Counter() {
      const [id] = useState(() => {
        mounts += 1;
        return mounts;
      });
      return <p>Instance {id}</p>;
    }
    const load = vi.fn(() => Promise.resolve(Counter));
    const Page = lazyRoute(load);
    await preloadRoutes();
    function Parent({ tick }: { tick: number }) {
      return <div data-tick={tick}><Page /></div>;
    }
    const { rerender } = render(<Parent tick={0} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("Instance 1")).toBeInTheDocument();
    rerender(<Parent tick={1} />);
    expect(screen.getByText("Instance 1")).toBeInTheDocument();
    expect(mounts).toBe(1);
  });

  it("ne précharge jamais les pages de jeu lourdes", async () => {
    const heavy = vi.fn(() => Promise.resolve(() => <p>Jeu</p>));
    lazyRoute(heavy, { heavy: true });
    await preloadRoutes();
    expect(heavy).not.toHaveBeenCalled();
  });

  it("page d'un jeu : le chargeur commun des jeux dès l'arrivée, à la place de l'indicateur ; puis le jeu, une fois prêt", async () => {
    const download = deferred<() => ReactElement>();
    const Page = lazyRoute(() => download.promise, { heavy: true, game: "grille-magique" });
    render(<Page />);
    // Avant même le code de la page : le chargeur des jeux, à 0 %, et non l'indicateur des pages.
    expect(screen.queryByText("Chargement…")).not.toBeInTheDocument();
    expect(screen.getByText("Initialisation du jeu…")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Chargement du jeu" })).toHaveAttribute("aria-valuenow", "0");
    function GamePage() {
      const loading = useGameLoading();
      // Page arrivée : le code du lecteur est là (jalon posé par l'hôte) ; le jeu signale qu'il est prêt.
      return (
        <button type="button" onClick={() => loading.ready()}>
          Jeu monté
        </button>
      );
    }
    await act(async () => download.resolve(GamePage));
    expect(screen.getByRole("progressbar", { name: "Chargement du jeu" })).toHaveAttribute("aria-valuenow", "7");
    // La page est masquée sous le chargeur tant que le jeu n'est pas prêt.
    expect(screen.queryByRole("button", { name: "Jeu monté" })).not.toBeInTheDocument();
    // (Texte masqué : sans nom accessible tant qu'il est caché, d'où la recherche par le texte du bouton.)
    await act(async () => screen.getByText("Jeu monté").click());
    expect(screen.queryByRole("progressbar", { name: "Chargement du jeu", hidden: true })).toBeNull();
    expect(document.querySelector("[data-loading]")).toBeNull();
    expect(screen.getByRole("button", { name: "Jeu monté" })).toBeInTheDocument();
    expect(screen.queryByRole("progressbar", { name: "Chargement du jeu" })).not.toBeInTheDocument();
  });
});
