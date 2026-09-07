import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type PDFPageProxy } from "pdfjs-dist";

import styles from "./PdfReader.module.css";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const ZOOM_LEVELS = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2] as const;
type ReaderMode = "page" | "continuous";
type FitMode = "page" | "width" | "custom";
type OutlineNode = { title: string; pageNumber: number | null; items: OutlineNode[] };

export interface PdfReaderLabels {
  loading: string; error: string; previous: string; next: string; page: string; of: string;
  zoomOut: string; zoomIn: string; contents: string; closeContents: string; fullscreen: string;
  exitFullscreen: string; pageMode: string; continuousMode: string; fitPage: string; fitWidth: string;
  zoom: string;
}

export interface PdfReaderProps {
  url: string;
  title: string;
  subtitle?: string;
  backLabel?: string;
  onBack?: () => void;
  labels: PdfReaderLabels;
}

function clampPage(value: number, pageCount: number) {
  return Math.min(Math.max(Math.trunc(value) || 1, 1), Math.max(pageCount, 1));
}

function CanvasPage({ page, scale, label }: { page: PDFPageProxy; scale: number; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const viewport = page.getViewport({ scale });
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * ratio);
    canvas.height = Math.floor(viewport.height * ratio);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    const task = page.render({ canvas, canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
    void task.promise.catch(() => undefined);
    return () => task.cancel();
  }, [page, scale]);
  return <canvas ref={canvasRef} aria-label={label} />;
}

function ContinuousPage({ pdfDocument, number, scale, label, root }: { pdfDocument: PDFDocumentProxy; number: number; scale: number; label: string; root: HTMLDivElement | null }) {
  const hostRef = useRef<HTMLElement>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  useEffect(() => {
    const host = hostRef.current;
    if (!host || !root) return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void pdfDocument.getPage(number).then(setPage);
    }, { root, rootMargin: "500px 0px" });
    observer.observe(host);
    return () => observer.disconnect();
  }, [pdfDocument, number, root]);
  return (
    <article ref={hostRef} className={styles.continuousPage} data-page={number} style={{ width: `${595 * scale}px`, minHeight: `${842 * scale}px` }}>
      {page ? <CanvasPage page={page} scale={scale} label={`${label} ${number}`} /> : null}
    </article>
  );
}

function OutlineList({ nodes, currentPage, onSelect }: { nodes: OutlineNode[]; currentPage: number; onSelect: (page: number) => void }) {
  return <ul>{nodes.map((node, index) => (
    <li key={`${node.title}-${index}`}>
      <button type="button" className={node.pageNumber === currentPage ? styles.activeOutline : undefined} disabled={!node.pageNumber} onClick={() => node.pageNumber && onSelect(node.pageNumber)}>{node.title}</button>
      {node.items.length ? <OutlineList nodes={node.items} currentPage={currentPage} onSelect={onSelect} /> : null}
    </li>
  ))}</ul>;
}

export function PdfReader({ url, title, subtitle, backLabel, onBack, labels }: PdfReaderProps) {
  const readerRef = useRef<HTMLElement>(null);
  const targetPageRef = useRef(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportElement, setViewportElement] = useState<HTMLDivElement | null>(null);
  const [pdfDocument, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [singlePage, setSinglePage] = useState<PDFPageProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(() => Number(localStorage.getItem(`mbuyamba-reader:${url}`)) || 1);
  const [pageInput, setPageInput] = useState(String(pageNumber));
  const [mode, setMode] = useState<ReaderMode>("page");
  const [fitMode, setFitMode] = useState<FitMode>("custom");
  const [customZoom, setCustomZoom] = useState(1);
  const [scale, setScale] = useState(1);
  const [outline, setOutline] = useState<OutlineNode[]>([]);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(false);

  const pageCount = pdfDocument?.numPages ?? 0;
  const setViewport = useCallback((node: HTMLDivElement | null) => { viewportRef.current = node; setViewportElement(node); }, []);
  const goToPage = useCallback((value: number) => {
    const validPage = clampPage(value, pageCount);
    setPageNumber(validPage);
    setPageInput(String(validPage));
  }, [pageCount]);

  useEffect(() => {
    let active = true;
    const task = getDocument(url);
    void task.promise.then((nextDocument) => {
      if (!active) return;
      setDocument(nextDocument);
      setPageNumber((value) => {
        const validPage = clampPage(value, nextDocument.numPages);
        setPageInput(String(validPage));
        return validPage;
      });
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; void task.destroy(); };
  }, [url]);

  useEffect(() => {
    if (!pdfDocument) return;
    const validPage = clampPage(pageNumber, pdfDocument.numPages);
    let active = true;
    if (mode === "page") void pdfDocument.getPage(validPage).then((nextPage) => { if (active) setSinglePage(nextPage); });
    localStorage.setItem(`mbuyamba-reader:${url}`, String(validPage));
    return () => { active = false; };
  }, [pdfDocument, mode, pageNumber, url]);

  useEffect(() => {
    if (!pdfDocument) return;
    void pdfDocument.getOutline().then(async (items) => {
      const mapItems = async (source: NonNullable<typeof items>): Promise<OutlineNode[]> => Promise.all(source.map(async (item) => {
        const destination = typeof item.dest === "string" ? await pdfDocument.getDestination(item.dest) : item.dest;
        let target: number | null = null;
        if (destination?.[0]) {
          try { target = await pdfDocument.getPageIndex(destination[0] as Parameters<PDFDocumentProxy["getPageIndex"]>[0]) + 1; } catch { target = null; }
        }
        return { title: item.title, pageNumber: target, items: item.items ? await mapItems(item.items) : [] };
      }));
      setOutline(items ? await mapItems(items) : []);
    });
  }, [pdfDocument]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !singlePage) return;
    const fit = () => {
      const base = singlePage.getViewport({ scale: 1 });
      const widthScale = Math.max(0.5, (viewport.clientWidth - 28) / base.width);
      const heightScale = Math.max(0.5, (viewport.clientHeight - 20) / base.height);
      if (fitMode === "custom") {
        const chromeLikeWidth = Math.min(900, Math.max(320, viewport.clientWidth - 28));
        setScale((chromeLikeWidth / base.width) * customZoom);
      } else {
        setScale(fitMode === "width" ? widthScale : Math.min(widthScale, heightScale));
      }
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [customZoom, fitMode, singlePage]);

  useEffect(() => {
    if (mode !== "continuous" || !viewportElement || !pdfDocument) return;
    const pages = Array.from(viewportElement.querySelectorAll<HTMLElement>("[data-page]"));
    const target = viewportElement.querySelector<HTMLElement>(`[data-page="${targetPageRef.current}"]`);
    target?.scrollIntoView({ block: "center" });
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      const value = Number((visible?.target as HTMLElement | undefined)?.dataset.page);
      if (value) {
        setPageNumber(value);
        setPageInput(String(value));
      }
    }, { root: viewportElement, threshold: [0.15, 0.35, 0.6] });
    pages.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [pdfDocument, mode, viewportElement]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (mode !== "page" || target?.matches("input, textarea, select, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft") goToPage(pageNumber - 1);
      if (event.key === "ArrowRight") goToPage(pageNumber + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goToPage, mode, pageNumber]);

  useEffect(() => {
    const update = () => setIsFullscreen(document.fullscreenElement === readerRef.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  const selectZoom = (value: number) => { setFitMode("custom"); setCustomZoom(value); };
  const changeZoom = (direction: -1 | 1) => {
    const currentZoom = fitMode === "custom" ? customZoom : 1;
    let index = ZOOM_LEVELS.findIndex((value) => value > currentZoom + 0.001);
    if (direction < 0) {
      index = -1;
      for (let candidate = ZOOM_LEVELS.length - 1; candidate >= 0; candidate -= 1) {
        if (ZOOM_LEVELS[candidate] < currentZoom - 0.001) { index = candidate; break; }
      }
    }
    selectZoom(ZOOM_LEVELS[index < 0 ? (direction > 0 ? ZOOM_LEVELS.length - 1 : 0) : index]);
  };
  const changeMode = (nextMode: ReaderMode) => { targetPageRef.current = pageNumber; setMode(nextMode); };
  const submitPage = () => goToPage(Number(pageInput));
  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen(); else await readerRef.current?.requestFullscreen();
  };

  const continuousPages = useMemo(() => Array.from({ length: pageCount }, (_, index) => index + 1), [pageCount]);
  const activeOutlinePage = useMemo(() => {
    let active = 0;
    const visit = (nodes: OutlineNode[]) => nodes.forEach((node) => {
      if (node.pageNumber && node.pageNumber <= pageNumber) active = Math.max(active, node.pageNumber);
      visit(node.items);
    });
    visit(outline);
    return active;
  }, [outline, pageNumber]);

  return (
    <section ref={readerRef} className={styles.reader} aria-label={title}>
      <div className={styles.toolbar}>
        {onBack && backLabel ? (
          <div className={styles.identity}>
            <button type="button" className={styles.backButton} onClick={onBack} aria-label={backLabel}>← <span>{backLabel}</span></button>
            <div className={styles.bookTitle}><strong>{title}</strong>{subtitle ? <span>{subtitle}</span> : null}</div>
          </div>
        ) : null}
        <button type="button" title={outlineOpen ? labels.closeContents : labels.contents} aria-label={outlineOpen ? labels.closeContents : labels.contents} aria-expanded={outlineOpen} onClick={() => setOutlineOpen((value) => !value)}>☰ <span>{labels.contents}</span></button>
        <div className={styles.pageControls}>
          <button type="button" title={labels.previous} aria-label={labels.previous} onClick={() => goToPage(pageNumber - 1)} disabled={pageNumber <= 1}>‹</button>
          <label>{labels.page} <input aria-label={labels.page} inputMode="numeric" value={pageInput} onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ""))} onBlur={submitPage} onKeyDown={(event) => { if (event.key === "Enter") submitPage(); }} /> {labels.of} {pageCount || "…"}</label>
          <button type="button" title={labels.next} aria-label={labels.next} onClick={() => goToPage(pageNumber + 1)} disabled={!pageCount || pageNumber >= pageCount}>›</button>
        </div>
        <div className={styles.segmented} aria-label={`${labels.pageMode} / ${labels.continuousMode}`}>
          <button type="button" aria-pressed={mode === "page"} onClick={() => changeMode("page")}>{labels.pageMode}</button>
          <button type="button" aria-pressed={mode === "continuous"} onClick={() => changeMode("continuous")}>{labels.continuousMode}</button>
        </div>
        <select aria-label={labels.zoom} value={fitMode === "custom" ? String(customZoom) : fitMode} onChange={(event) => { const value = event.target.value; if (value === "page" || value === "width") setFitMode(value); else selectZoom(Number(value)); }}>
          <option value="page">{labels.fitPage}</option><option value="width">{labels.fitWidth}</option>
          {ZOOM_LEVELS.map((value) => <option key={value} value={value}>{Math.round(value * 100)} %</option>)}
        </select>
        <div className={styles.zoomControls}>
          <button type="button" title={labels.zoomOut} aria-label={labels.zoomOut} onClick={() => changeZoom(-1)}>−</button>
          <strong>{Math.round((fitMode === "custom" ? customZoom : scale) * 100)} %</strong>
          <button type="button" title={labels.zoomIn} aria-label={labels.zoomIn} onClick={() => changeZoom(1)}>+</button>
        </div>
        <button type="button" title={isFullscreen ? labels.exitFullscreen : labels.fullscreen} aria-label={isFullscreen ? labels.exitFullscreen : labels.fullscreen} onClick={() => void toggleFullscreen()}>⛶ <span>{isFullscreen ? labels.exitFullscreen : labels.fullscreen}</span></button>
      </div>
      <div className={styles.body}>
        {outlineOpen ? <aside className={styles.outline} aria-label={labels.contents}><button type="button" className={styles.closeOutline} onClick={() => setOutlineOpen(false)} aria-label={labels.closeContents}>×</button>{outline.length ? <OutlineList nodes={outline} currentPage={activeOutlinePage} onSelect={(page) => { goToPage(page); if (mode === "continuous") viewportElement?.querySelector<HTMLElement>(`[data-page="${page}"]`)?.scrollIntoView({ block: "start" }); }} /> : <p>{labels.loading}</p>}</aside> : null}
        <div ref={setViewport} className={`${styles.viewport} ${mode === "continuous" ? styles.continuousViewport : ""}`}>
          {!pdfDocument && !error ? <p className={styles.status}>{labels.loading}</p> : null}
          {error ? <p className={styles.error} role="alert">{labels.error}</p> : null}
          {mode === "page" && singlePage ? <CanvasPage page={singlePage} scale={scale} label={`${labels.page} ${pageNumber}`} /> : null}
          {mode === "continuous" && pdfDocument ? continuousPages.map((number) => <ContinuousPage key={number} pdfDocument={pdfDocument} number={number} scale={scale} label={labels.page} root={viewportElement} />) : null}
        </div>
      </div>
    </section>
  );
}
