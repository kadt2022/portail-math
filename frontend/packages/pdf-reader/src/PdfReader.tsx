import { useEffect, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type PDFPageProxy } from "pdfjs-dist";

import styles from "./PdfReader.module.css";

GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export interface PdfReaderLabels {
  loading: string;
  error: string;
  previous: string;
  next: string;
  page: string;
  of: string;
  zoomOut: string;
  zoomIn: string;
  download: string;
}

export interface PdfReaderProps {
  url: string;
  title: string;
  labels: PdfReaderLabels;
}

export function PdfReader({ url, title, labels }: PdfReaderProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const autoFitRef = useRef(true);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState<PDFPageProxy | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.15);
  const [error, setError] = useState(false);

  useEffect(() => {
    const task = getDocument(url);
    void task.promise.then(setDocument).catch(() => setError(true));
    return () => {
      void task.destroy();
    };
  }, [url]);

  useEffect(() => {
    if (!document) return;
    let active = true;
    void document.getPage(pageNumber).then((nextPage) => {
      if (active) setPage(nextPage);
    });
    return () => {
      active = false;
    };
  }, [document, pageNumber]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !page) return;
    const fitPage = () => {
      if (!autoFitRef.current) return;
      const baseViewport = page.getViewport({ scale: 1 });
      setScale(Math.min(1.35, Math.max(0.5, (viewport.clientWidth - 48) / baseViewport.width)));
    };
    fitPage();
    const observer = new ResizeObserver(fitPage);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [page]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !page) return;
    const viewport = page.getViewport({ scale });
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * ratio);
    canvas.height = Math.floor(viewport.height * ratio);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;
    const context = canvas.getContext("2d");
    if (!context) return;
    const renderTask = page.render({ canvas, canvasContext: context, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] });
    return () => renderTask.cancel();
  }, [page, scale]);

  const pageCount = document?.numPages ?? 0;

  return (
    <section className={styles.reader} aria-label={title}>
      <div className={styles.toolbar}>
        <div className={styles.pageControls}>
          <button type="button" onClick={() => setPageNumber((value) => Math.max(1, value - 1))} disabled={pageNumber <= 1} aria-label={labels.previous}>‹</button>
          <span>{labels.page} <strong>{pageNumber}</strong> {labels.of} {pageCount || "…"}</span>
          <button type="button" onClick={() => setPageNumber((value) => Math.min(pageCount, value + 1))} disabled={!pageCount || pageNumber >= pageCount} aria-label={labels.next}>›</button>
        </div>
        <div className={styles.zoomControls}>
          <button type="button" onClick={() => { autoFitRef.current = false; setScale((value) => Math.max(0.5, value - 0.15)); }} aria-label={labels.zoomOut}>−</button>
          <span>{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => { autoFitRef.current = false; setScale((value) => Math.min(2.2, value + 0.15)); }} aria-label={labels.zoomIn}>+</button>
          <a href={url} download aria-label={labels.download}>↓</a>
        </div>
      </div>

      <div ref={viewportRef} className={styles.viewport}>
        {!document && !error ? <p className={styles.status}>{labels.loading}</p> : null}
        {error ? <p className={styles.error} role="alert">{labels.error}</p> : null}
        <canvas ref={canvasRef} aria-label={`${labels.page} ${pageNumber}`} />
      </div>
    </section>
  );
}
