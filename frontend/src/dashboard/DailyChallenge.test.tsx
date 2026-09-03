import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { challengeOfDay } from "./daily-challenge";
import { DailyChallenge } from "./DailyChallenge";

function answerOfToday(): number {
  return challengeOfDay(new Date()).answer;
}

describe("Défi du jour", () => {
  it("annonce la consigne tant que rien n'est saisi", () => {
    render(<DailyChallenge />);
    expect(screen.getByText(/nouveau calcul chaque jour/i)).toBeInTheDocument();
  });

  it("félicite la bonne réponse", async () => {
    const user = userEvent.setup();
    render(<DailyChallenge />);

    await user.type(screen.getByLabelText(/ta réponse/i), String(answerOfToday()));
    await user.click(screen.getByRole("button", { name: /vérifier/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/bravo/i);
  });

  it("invite à recommencer après une réponse fausse, sans bloquer l'enfant", async () => {
    const user = userEvent.setup();
    render(<DailyChallenge />);

    await user.type(screen.getByLabelText(/ta réponse/i), String(answerOfToday() + 1));
    await user.click(screen.getByRole("button", { name: /vérifier/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/recompte/i);
    expect(screen.getByRole("button", { name: /réessayer/i })).toBeEnabled();
  });

  it("réclame une réponse avant de valider dans le vide", async () => {
    const user = userEvent.setup();
    render(<DailyChallenge />);

    await user.click(screen.getByRole("button", { name: /vérifier/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/écris d’abord ta réponse/i);
  });
});
