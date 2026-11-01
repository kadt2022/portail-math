import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LessonVideoPlayer } from "./LessonVideoPlayer";

const TITLE = "Vidéo de Yamba : Même ou différent ?";

describe("LessonVideoPlayer", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("affiche un lecteur HTML5 local avec ses commandes, sans lecture automatique", () => {
    render(<LessonVideoPlayer src="/app/assets/video.mp4" title={TITLE} />);

    const video = screen.getByLabelText(TITLE) as HTMLVideoElement;
    expect(video.tagName).toBe("VIDEO");
    expect(video).toHaveAttribute("src", "/app/assets/video.mp4");
    expect(video.controls).toBe(true);
    expect(video.autoplay).toBe(false);
    expect(video).toHaveAttribute("preload", "metadata");
  });

  it("permet de revoir la vidéo depuis le début", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(<LessonVideoPlayer src="/app/assets/video.mp4" title={TITLE} />);
    const video = screen.getByLabelText(TITLE) as HTMLVideoElement;
    Object.defineProperty(video, "currentTime", { writable: true, value: 31 });

    await userEvent.setup().click(screen.getByRole("button", { name: "Revoir la vidéo" }));

    expect(video.currentTime).toBe(0);
    expect(play).toHaveBeenCalledTimes(1);
  });

  it("ignore un refus de lecture du navigateur lors du replay", async () => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockRejectedValue(new Error("NotAllowedError"));
    render(<LessonVideoPlayer src="/app/assets/video.mp4" title={TITLE} />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Revoir la vidéo" }));

    expect(screen.getByLabelText(TITLE)).toBeInTheDocument();
  });

  it("remplace le lecteur par un message si la vidéo est indisponible", () => {
    render(<LessonVideoPlayer src="/app/assets/absente.mp4" title={TITLE} />);

    fireEvent.error(screen.getByLabelText(TITLE));

    expect(screen.queryByLabelText(TITLE)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "La vidéo n’est pas disponible pour le moment. Tu peux quand même continuer la leçon.",
    );
  });
});
