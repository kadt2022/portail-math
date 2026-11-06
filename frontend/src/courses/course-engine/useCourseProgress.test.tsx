import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PRIMARY_TWO_COURSE } from "../primary-two/course-catalogue";
import { resetSessionCourseProgress, useCourseProgress } from "./useCourseProgress";

function Probe() {
  const { progress, startItem } = useCourseProgress(PRIMARY_TWO_COURSE.id);
  const lesson = PRIMARY_TWO_COURSE.modules[0].lessons[0];
  return <button type="button" onClick={() => startItem(lesson)}>{Object.keys(progress.items).length}</button>;
}

describe("progression de cours en mémoire", () => {
  beforeEach(() => {
    resetSessionCourseProgress();
  });

  it("n'écrit rien dans le stockage du navigateur", () => {
    const write = vi.spyOn(Storage.prototype, "setItem");
    render(<Probe />);

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByRole("button")).toHaveTextContent("1");
    expect(write).not.toHaveBeenCalled();
    write.mockRestore();
  });

  it("perd l'état après réinitialisation de la session", () => {
    const { unmount } = render(<Probe />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveTextContent("1");

    unmount();
    resetSessionCourseProgress();
    render(<Probe />);
    expect(screen.getByRole("button")).toHaveTextContent("0");
  });
});
