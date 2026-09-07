import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const renderTask = { promise: Promise.resolve(), cancel: vi.fn() };
const pdfPage = { getViewport: ({ scale }: { scale: number }) => ({ width: 595 * scale, height: 842 * scale }), render: vi.fn(() => renderTask) };
const pdfDocument = { numPages: 75, getPage: vi.fn(async () => pdfPage), getOutline: vi.fn(async () => []), getDestination: vi.fn(), getPageIndex: vi.fn() };

// jsdom ne fournit ni IntersectionObserver (mode continu) ni scrollIntoView.
class NoopIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: vi.fn(() => ({ promise: Promise.resolve(pdfDocument), destroy: vi.fn() })),
}));

import { PdfReader, type PdfReaderLabels } from "./PdfReader";

const labels: PdfReaderLabels = {
  loading: "Chargement", error: "Erreur", previous: "Précédent", next: "Suivant", page: "Page", of: "sur",
  zoomOut: "Zoom moins", zoomIn: "Zoom plus", contents: "Sommaire", closeContents: "Fermer le sommaire",
  fullscreen: "Plein écran", exitFullscreen: "Quitter le plein écran", pageMode: "Page", continuousMode: "Continu",
  fitPage: "Ajuster à la page", fitWidth: "Ajuster à la largeur", zoom: "Zoom",
};

describe("PdfReader", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("IntersectionObserver", NoopIntersectionObserver);
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("propose tous les modes de zoom sans téléchargement", async () => {
    render(<PdfReader url="/livre.pdf" title="Livre" labels={labels} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Suivant" })).toBeEnabled());
    const zoom = screen.getByRole("combobox", { name: "Zoom" });
    expect(zoom).toHaveValue("1");
    expect(zoom).toHaveTextContent("75 %");
    expect(zoom).toHaveTextContent("100 %");
    expect(zoom).toHaveTextContent("200 %");
    expect(zoom).toHaveTextContent("Ajuster à la page");
    expect(zoom).toHaveTextContent("Ajuster à la largeur");
    expect(screen.queryByRole("link", { name: /télécharger/i })).not.toBeInTheDocument();
  });

  it("fait défiler jusqu'à la page demandée en mode continu", async () => {
    render(<PdfReader url="/livre.pdf" title="Livre" labels={labels} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Suivant" })).toBeEnabled());

    fireEvent.click(screen.getByRole("button", { name: "Continu" }));
    const scrollIntoView = Element.prototype.scrollIntoView as ReturnType<typeof vi.fn>;
    scrollIntoView.mockClear();

    fireEvent.click(screen.getByRole("button", { name: "Suivant" }));

    await waitFor(() => {
      const target = document.querySelector('[data-page="2"]');
      expect(target).not.toBeNull();
      expect(scrollIntoView.mock.instances).toContain(target);
    });
  });

  it("valide la saisie de page et mémorise la position", async () => {
    render(<PdfReader url="/livre.pdf" title="Livre" labels={labels} />);
    const input = await screen.findByRole("textbox", { name: "Page" });
    fireEvent.change(input, { target: { value: "42" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(localStorage.getItem("mbuyamba-reader:/livre.pdf")).toBe("42"));
    fireEvent.change(input, { target: { value: "100" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue("75");
  });
});
