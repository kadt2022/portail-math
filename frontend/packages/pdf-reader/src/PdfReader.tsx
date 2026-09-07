import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentProxy, type PDFPageProxy } from "pdfjs-dist";
// Le suffixe ?url laisse Vite copier le worker parmi les assets et renvoyer son
// URL finale hachée. Un simple new URL("pdfjs-dist/...", import.meta.url) n'est
// pas réécrit par Vite pour un specifier de paquet : dans le build de prod, le
// chemin resterait relatif au chunk émis (/app/assets/pdfjs-dist/...) et pdf.js
// échouerait à démarrer son worker, laissant chaque livre en état d'erreur.
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import styles from "./PdfReader.module.css";

GlobalWorkerOptions.workerSrc = workerSrc;

const ZOOM_LEVELS = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2] as const;
const DEFAULT_ZOOM = 1;
const CHROME_LIKE_PAGE_WIDTH = 850;
const LARGE_SCREEN_QUERY = "(min-width: 1200px)";
type ReaderMode = "page" | "continuous";
type FitMode = "page" | "width" | "custom";
type OutlineNode = { title: string; pageNumber: number | null; items: OutlineNode[] };
type PageTextItem = { text: string; height: number };

export interface PdfReaderLabels {
  loading: string; error: string; previous: string; next: string; page: string; of: string;
  zoomOut: string; zoomIn: string; contents: string; closeContents: string; contentsLoading: string;
  contentsUnavailable: string; fullscreen: string; exitFullscreen: string; pageMode: string;
  continuousMode: string; fitPage: string; fitWidth: string; zoom: string;
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

function shouldOpenOutlineByDefault() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia(LARGE_SCREEN_QUERY).matches;
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function extractTextItems(items: Awaited<ReturnType<PDFPageProxy["getTextContent"]>>["items"]): PageTextItem[] {
  return items.flatMap((item) => {
    if (!("str" in item)) return [];
    const text = normalizeText(item.str);
    if (!text) return [];
    return [{ text, height: typeof item.height === "number" ? item.height : 0 }];
  });
}

function findLessonTitle(items: PageTextItem[]) {
  const markerIndex = items.findIndex((item) => /LE[ÇC]ON\s*\d+/i.test(item.text));
  if (markerIndex < 0) return "";

  const ignored = /^(?:\d+|UNIT[ÉE]\s*\d+|OBJECTIF|JE D[ÉE]COUVRE|JE COMPRENDS|JE MANIPULE|JE M['’]ENTRA[IÎ]NE|FICHE PORTAIL)/i;
  const candidates = items
    .slice(markerIndex + 1, markerIndex + 12)
    .filter((item) => item.text.length >= 3 && item.text.length <= 100 && !ignored.test(item.text));

  if (!candidates.length) return "";
  return [...candidates].sort((a, b) => b.height - a.height)[0].text;
}

async function buildFallbackOutline(pdfDocument: PDFDocumentProxy): Promise<OutlineNode[]> {
  const roots: OutlineNode[] = [];
  const unitNodes = new Map<number, OutlineNode>();
  const introSeen = new Set<string>();

  const addIntro = (title: string, pageNumber: number) => {
    if (introSeen.has(title)) return;
    introSeen.add(title);
    roots.push({ title, pageNumber, items: [] });
  };

  const getUnit = (unitNumber: number, pageNumber: number) => {
    let unit = unitNodes.get(unitNumber);
    if (!unit) {
      unit = { title: `Unité ${unitNumber}`, pageNumber, items: [] };
      unitNodes.set(unitNumber, unit);
      roots.push(unit);
    }
    return unit;
  };

  for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
    try {
      const page = await pdfDocument.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const textItems = extractTextItems(textContent.items);
      const pageText = normalizeText(textItems.map((item) => item.text).join(" "));

      if (pageNumber <= 8) {
        if (pageNumber === 1) addIntro("Titre", pageNumber);
        if (/\bBienvenue\b/i.test(pageText)) addIntro("Bienvenue", pageNumber);
        if (/Ce que tu vas apprendre/i.test(pageText)) addIntro("Ce que tu vas apprendre", pageNumber);
        if (/\bSommaire\b/i.test(pageText)) addIntro("Sommaire", pageNumber);
      }

      const lessonMatch = pageText.match(/LE[ÇC]ON\s*(\d+)\s*[•·\-–—:]?\s*UNIT[ÉE]\s*(\d+)/i);
      if (lessonMatch) {
        const lessonNumber = Number(lessonMatch[1]);
        const unitNumber = Number(lessonMatch[2]);
        const title = findLessonTitle(textItems);
        const label = title ? `Leçon ${lessonNumber} - ${title}` : `Leçon ${lessonNumber}`;
        const unit = getUnit(unitNumber, pageNumber);
        if (!unit.items.some((item) => item.title === label)) {
          unit.items.push({ title: label, pageNumber, items: [] });
        }
        continue;
      }

      const evaluationMatch = pageText.match(/[ÉE]VALUATION(?:\s*[-–—•:]?\s*UNIT[ÉE])?\s*(\d+)/i);
      if (evaluationMatch) {
        const unitNumber = Number(evaluationMatch[1]);
        const unit = getUnit(unitNumber, pageNumber);
        const label = `Évaluation - Unité ${unitNumber}`;
        if (!unit.items.some((item) => item.title === label)) {
          unit.items.push({ title: label, pageNumber, items: [] });
        }
      }
    } catch {
      // Une page illisible ne doit pas annuler le sommaire construit à partir des autres pages.
    }
  }

  return roots;
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

function PageModeIcon() {
  return (
    <svg className={styles.modeIcon} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="5" y="2.5" width="10" height="15" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ContinuousModeIcon() {
  return (
    <svg className={styles.modeIcon} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="5" y="1.5" width="10" height="4.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="5" y="7.75" width="10" height="4.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="5" y="14" width="10" height="4.5" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
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
  const [mode, setMode] = useState<ReaderMode>("continuous");
  const [fitMode, setFitMode] = useState<FitMode>("custom");
  const [customZoom, setCustomZoom] = useState(DEFAULT_ZOOM);
  const [scale, setScale] = useState(DEFAULT_ZOOM);
  const [outline, setOutline] = useState<OutlineNode[]>([]);
  const [outlineLoading, setOutlineLoading] = useState(shouldOpenOutlineByDefault);
  const [outlineOpen, setOutlineOpen] = useState(shouldOpenOutlineByDefault);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(false);

  const pageCount = pdfDocument?.numPages ?? 0;
  const setViewport = useCallback((node: HTMLDivElement | null) => { viewportRef.current = node; setViewportElement(node); }, []);
  const goToPage = useCallback((value: number) => {
    const validPage = clampPage(value, pageCount);
    setPageNumber(validPage);
    setPageInput(String(validPage));
    // En mode continu, changer de page ne suffit pas : sans défilement, le
    // document reste sur l'ancienne page et l'observateur d'intersection
    // réécrit aussitôt le numéro demandé avec la page encore visible.
    if (mode === "continuous") {
      viewportRef.current
        ?.querySelector<HTMLElement>(`[data-page="${validPage}"]`)
        ?.scrollIntoView?.({ block: "start" });
    }
  }, [mode, pageCount]);

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
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(LARGE_SCREEN_QUERY);
    const update = (event: MediaQueryListEvent) => {
      setOutlineOpen(event.matches);
    };
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!pdfDocument) return;
    const validPage = clampPage(pageNumber, pdfDocument.numPages);
    let active = true;
    void pdfDocument.getPage(validPage).then((nextPage) => { if (active) setSinglePage(nextPage); });
    localStorage.setItem(`mbuyamba-reader:${url}`, String(validPage));
    return () => { active = false; };
  }, [pdfDocument, pageNumber, url]);

  useEffect(() => {
    if (!pdfDocument || !outlineOpen || outline.length) return;
    let active = true;
    const loadOutline = async () => {
      try {
        const items = await pdfDocument.getOutline();
        const mapItems = async (source: NonNullable<typeof items>): Promise<OutlineNode[]> => Promise.all(source.map(async (item) => {
          let destination = typeof item.dest === "string" ? null : item.dest;
          if (typeof item.dest === "string") {
            try {
              destination = await pdfDocument.getDestination(item.dest);
            } catch {
              destination = null;
            }
          }

          let target: number | null = null;
          if (destination?.[0]) {
            try {
              target = await pdfDocument.getPageIndex(destination[0] as Parameters<PDFDocumentProxy["getPageIndex"]>[0]) + 1;
            } catch {
              target = null;
            }
          }

          const childItems = item.items?.length ? await mapItems(item.items) : [];
          return { title: item.title, pageNumber: target, items: childItems };
        }));

        const nativeOutline = items ? await mapItems(items) : [];
        if (nativeOutline.length) {
          if (active) setOutline(nativeOutline);
          return;
        }

        const generatedOutline = await buildFallbackOutline(pdfDocument);
        if (active) setOutline(generatedOutline);
      } catch {
        try {
          const generatedOutline = await buildFallbackOutline(pdfDocument);
          if (active) setOutline(generatedOutline);
        } catch {
          if (active) setOutline([]);
        }
      } finally {
        if (active) setOutlineLoading(false);
      }
    };

    void loadOutline();
    return () => { active = false; };
  }, [outline.length, outlineOpen, pdfDocument]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !singlePage) return;
    const fit = () => {
      const base = singlePage.getViewport({ scale: 1 });
      const widthScale = Math.max(0.5, (viewport.clientWidth - 28) / base.width);
      const heightScale = Math.max(0.5, (viewport.clientHeight - 20) / base.height);
      if (fitMode === "custom") {
        const chromeLikeWidth = Math.min(CHROME_LIKE_PAGE_WIDTH, Math.max(320, viewport.clientWidth - 28));
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
    target?.scrollIntoView?.({ block: "center" });
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
    const currentZoom = fitMode === "custom" ? customZoom : DEFAULT_ZOOM;
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
        <button type="button" title={outlineOpen ? labels.closeContents : labels.contents} aria-label={outlineOpen ? labels.closeContents : labels.contents} aria-expanded={outlineOpen} onClick={() => { if (!outlineOpen && !outline.length) setOutlineLoading(true); setOutlineOpen((value) => !value); }}>☰ <span>{labels.contents}</span></button>
        <div className={styles.pageControls}>
          <button type="button" title={labels.previous} aria-label={labels.previous} onClick={() => goToPage(pageNumber - 1)} disabled={pageNumber <= 1}>‹</button>
          <label>{labels.page} <input aria-label={labels.page} inputMode="numeric" value={pageInput} onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ""))} onBlur={submitPage} onKeyDown={(event) => { if (event.key === "Enter") submitPage(); }} /> {labels.of} {pageCount || "…"}</label>
          <button type="button" title={labels.next} aria-label={labels.next} onClick={() => goToPage(pageNumber + 1)} disabled={!pageCount || pageNumber >= pageCount}>›</button>
        </div>
        <div className={styles.segmented} aria-label={`${labels.pageMode} / ${labels.continuousMode}`}>
          <button type="button" title={labels.pageMode} aria-label={labels.pageMode} aria-pressed={mode === "page"} onClick={() => changeMode("page")}><PageModeIcon /></button>
          <button type="button" title={labels.continuousMode} aria-label={labels.continuousMode} aria-pressed={mode === "continuous"} onClick={() => changeMode("continuous")}><ContinuousModeIcon /></button>
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
        {outlineOpen ? <aside className={styles.outline} aria-label={labels.contents}><button type="button" className={styles.closeOutline} onClick={() => setOutlineOpen(false)} aria-label={labels.closeContents}>×</button>{outlineLoading ? <p>{labels.contentsLoading}</p> : outline.length ? <OutlineList nodes={outline} currentPage={activeOutlinePage} onSelect={goToPage} /> : <p>{labels.contentsUnavailable}</p>}</aside> : null}
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
