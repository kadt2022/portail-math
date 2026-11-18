import { describe, expect, it } from "vitest";

import { distributeRows } from "../games/gallery-layout";
import { chunkRows, sharedColumns } from "./library-rows";

describe("rangées de la bibliothèque", () => {
  it("découpe une liste selon les tailles de rangées", () => {
    expect(chunkRows([1, 2, 3, 4, 5], [2, 3])).toEqual([[1, 2], [3, 4, 5]]);
    expect(chunkRows([], [])).toEqual([]);
  });

  it("partage le nombre de colonnes de la rangée la plus longue, même avec un livre isolé en tête", () => {
    // 3 livres, 2 par rangée : le livre isolé passe en premier ([1, 2]).
    const rows = chunkRows(["a", "b", "c"], distributeRows(3, 2));
    expect(rows.map((row) => row.length)).toEqual([1, 2]);
    expect(sharedColumns(rows)).toBe(2);
    expect(sharedColumns([])).toBe(1);
    expect(sharedColumns([[1, 2, 3, 4]])).toBe(4);
  });
});
