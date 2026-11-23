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

import { LeoDrivingPlayer } from "./embedded-games";

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
});
