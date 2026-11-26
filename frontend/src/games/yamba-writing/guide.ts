// La main qui guide l'enfant : à chaque étape, elle montre où toucher. Elle ne montre jamais QUELLE lettre convient : elle désigne
// seulement la zone à toucher (la première lettre disponible, la lettre à retirer), l'orthographe reste à l'enfant.

export type GuidePhase = "idle" | "spinning" | "dropping" | "writing" | "won";
export type GuideTarget = "launch" | "tile" | "wrong";

export interface GuideInput {
  phase: GuidePhase;
  /** Une tentative complète est fausse : des lettres sont à retirer. */
  hasWrongLetters: boolean;
  /** Il reste des lettres à poser. */
  hasFreeTile: boolean;
  /** Jeu en pause ou masqué. */
  frozen: boolean;
  /** Débutant : il n'a pas encore réussi de mot. La main reste alors affichée à chaque étape. */
  beginner: boolean;
  /** Joueur expérimenté resté sans rien faire un moment : la main revient lui rappeler le geste. */
  nudged: boolean;
}

export interface Guide {
  target: GuideTarget;
  /** Clé du texte de la bulle (namespace « games »). */
  textKey: string;
}

/** Étape à montrer, ou null (rien à toucher pendant le rouleau et la chute, ou la main n'est pas utile). */
export function chooseGuide(input: GuideInput): Guide | null {
  if (input.frozen || (!input.beginner && !input.nudged)) return null;
  switch (input.phase) {
    case "idle":
      return { target: "launch", textKey: "yambaWriting.game.guide.launch" };
    case "won":
      return { target: "launch", textKey: "yambaWriting.game.guide.again" };
    case "writing":
      if (input.hasWrongLetters) return { target: "wrong", textKey: "yambaWriting.game.guide.remove" };
      return input.hasFreeTile ? { target: "tile", textKey: "yambaWriting.game.guide.letter" } : null;
    default:
      return null;
  }
}
