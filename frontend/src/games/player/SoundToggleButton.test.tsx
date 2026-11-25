import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SoundToggleButton } from "./SoundToggleButton";

describe("SoundToggleButton", () => {
  it("annonce son état, affiche son libellé et déclenche la bascule au clic", async () => {
    const onToggle = vi.fn();
    const { rerender } = render(<SoundToggleButton on label="Couper le son" onToggle={onToggle} />);
    const button = screen.getByRole("button", { name: "Couper le son" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button.querySelector("path[d^='M15.5']")).not.toBeNull();
    await userEvent.setup().click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<SoundToggleButton on={false} label="Remettre le son" onToggle={onToggle} />);
    const muted = screen.getByRole("button", { name: "Remettre le son" });
    expect(muted).toHaveAttribute("aria-pressed", "false");
    expect(muted.querySelector("path[d^='m16 9']")).not.toBeNull();
  });
});
