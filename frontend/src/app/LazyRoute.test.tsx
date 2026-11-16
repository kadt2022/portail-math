import { act, render, screen } from "@testing-library/react";
import { useState, type ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
});
