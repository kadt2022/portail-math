// Fichier à part : les modules simulés ne s'importent qu'une fois par fichier ; ici, aucun survol ne les a chargés avant.
import { describe, expect, it, vi } from "vitest";

const { imported } = vi.hoisted(() => ({ imported: [] as string[] }));

// Modules des jeux remplacés : on ne vérifie ici que ce que le survol précharge.
vi.mock("./leo-driving/LeoDrivingPlayer", () => {
  imported.push("lecteur de Léo");
  return { LeoDrivingPlayer: () => null };
});
vi.mock("../prototypes/leo-livreur/LeoLivreurGame", () => {
  imported.push("moteur de Léo");
  return { mountLeoLivreurGame: vi.fn() };
});

vi.mock("./train-multiplications/TrainMultiplicationsPlayer", () => {
  imported.push("lecteur du Train");
  return { TrainMultiplicationsPlayer: () => null };
});
vi.mock("@mbuyamba/train-multiplications", () => ({
  preloadTrainMultiplicationsEngine: () => {
    imported.push("moteur du Train");
    return Promise.resolve();
  },
}));

import { LeoDrivingPlayer, TrainMultiplicationsPlayer } from "./embedded-games";

describe("ouverture d'un jeu depuis le catalogue", () => {
  it("sans survol préalable, Léo demande son lecteur et son moteur en même temps (pas l'un après l'autre)", async () => {
    // Le composant différé de React appelle son chargeur à la première ouverture.
    const lazy = LeoDrivingPlayer as unknown as { _init: (payload: unknown) => unknown; _payload: unknown };
    try {
      lazy._init(lazy._payload);
    } catch {
      // Le chargement est en cours : React le signale en lançant sa promesse.
    }
    await vi.dynamicImportSettled();
    expect([...imported].sort()).toEqual(["lecteur de Léo", "moteur de Léo"]);
  });

  it("sans survol préalable, le Train demande son lecteur et son moteur 3D en même temps", async () => {
    const lazy = TrainMultiplicationsPlayer as unknown as { _init: (payload: unknown) => unknown; _payload: unknown };
    try {
      lazy._init(lazy._payload);
    } catch {
      // Le chargement est en cours : React le signale en lançant sa promesse.
    }
    await vi.dynamicImportSettled();
    expect(imported.filter((name) => name.includes("Train")).sort()).toEqual(["lecteur du Train", "moteur du Train"]);
  });
});
