import { describe, expect, it } from "vitest";

import { dayPartAt } from "./greeting";

describe("Salutation selon l'heure", () => {
  it("dit bonjour jusqu'a midi", () => {
    expect(dayPartAt(new Date(2026, 0, 15, 0, 0))).toBe("morning");
    expect(dayPartAt(new Date(2026, 0, 15, 11, 59))).toBe("morning");
  });

  it("bascule l'apres-midi de midi a 18 h", () => {
    expect(dayPartAt(new Date(2026, 0, 15, 12, 0))).toBe("afternoon");
    expect(dayPartAt(new Date(2026, 0, 15, 17, 59))).toBe("afternoon");
  });

  it("passe au soir a partir de 18 h", () => {
    expect(dayPartAt(new Date(2026, 0, 15, 18, 0))).toBe("evening");
    expect(dayPartAt(new Date(2026, 0, 15, 23, 59))).toBe("evening");
  });
});
