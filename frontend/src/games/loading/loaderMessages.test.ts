import { describe, expect, it } from "vitest";

import { loaderMessage, nextMessageChangeIn } from "./loaderMessages";

const s = (seconds: number) => seconds * 1000;

describe("messages du chargeur commun", () => {
  it("connexion rapide : aucun message secondaire", () => {
    expect(loaderMessage({ phase: "init", sinceStart: s(3), sincePhase: s(3) })).toBeNull();
    expect(loaderMessage({ phase: "resources", sinceStart: s(14), sincePhase: s(10) })).toBeNull();
  });

  it("initialisation de 10 s ou plus : « Veuillez patienter… »", () => {
    expect(loaderMessage({ phase: "init", sinceStart: s(9.999), sincePhase: s(9.999) })).toBeNull();
    expect(loaderMessage({ phase: "init", sinceStart: s(10), sincePhase: s(10) })).toBe("initWait");
  });

  it("ressources depuis 15 s : le message actuel ; son seuil part du début de la phase", () => {
    expect(loaderMessage({ phase: "resources", sinceStart: s(30), sincePhase: s(14.9) })).toBeNull();
    expect(loaderMessage({ phase: "resources", sinceStart: s(30), sincePhase: s(15) })).toBe("slow");
  });

  it("90 s depuis le clic : nouveau message, puis alternance toutes les 20 s", () => {
    const at = (seconds: number) => loaderMessage({ phase: "resources", sinceStart: s(seconds), sincePhase: s(seconds - 5) });
    expect(at(89.9)).toBe("slow");
    expect(at(90)).toBe("long");
    expect(at(109)).toBe("long");
    expect(at(110)).toBe("slow");
    expect(at(130)).toBe("long");
    expect(at(150)).toBe("slow");
    expect(at(170)).toBe("long");
    // Et ainsi de suite, jusqu'à la fin du chargement (par exemple après 10 minutes).
    expect(at(600)).toBe(Math.floor((600 - 90) / 20) % 2 === 0 ? "long" : "slow");
  });

  it("initialisation de plus de 90 s : alternance, sans changer de phase", () => {
    expect(loaderMessage({ phase: "init", sinceStart: s(90), sincePhase: s(90) })).toBe("long");
    expect(loaderMessage({ phase: "init", sinceStart: s(110), sincePhase: s(110) })).toBe("slow");
  });

  it("un seul chronomètre, réglé sur le prochain changement possible", () => {
    expect(nextMessageChangeIn({ phase: "init", sinceStart: s(4), sincePhase: s(4) })).toBe(s(6));
    expect(nextMessageChangeIn({ phase: "resources", sinceStart: s(20), sincePhase: s(2) })).toBe(s(13));
    // Seuil de phase déjà passé : prochain rendez-vous à 90 s.
    expect(nextMessageChangeIn({ phase: "resources", sinceStart: s(40), sincePhase: s(20) })).toBe(s(50));
    expect(nextMessageChangeIn({ phase: "resources", sinceStart: s(95), sincePhase: s(80) })).toBe(s(15));
  });
});
