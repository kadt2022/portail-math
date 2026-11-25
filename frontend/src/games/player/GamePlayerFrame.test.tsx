import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import styles from "./GamePlayer.module.css";
import { GamePlayerFrame } from "./GamePlayerFrame";

describe("cadre d'attente du lecteur", () => {
  it("reprend les éléments et les styles du lecteur (bande du haut avec un compteur, corps 16/9) : même géométrie que lui", () => {
    const { container } = render(<GamePlayerFrame />);
    const root = container.firstElementChild as HTMLElement;
    expect(root).toHaveClass(styles.root);
    expect(root).toHaveAttribute("aria-hidden", "true");
    const [bar, body] = Array.from(root.children);
    expect(bar.tagName).toBe("HEADER");
    expect(bar).toHaveClass(styles.bar);
    expect(bar.querySelector("dl")).toHaveClass(styles.stats);
    expect(bar.querySelector("dl > div")).toHaveClass(styles.statItem);
    expect(body).toHaveClass(styles.body);
    expect(root.children).toHaveLength(2);
  });
});
