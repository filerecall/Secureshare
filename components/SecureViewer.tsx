"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Minus,
  PanelLeft,
  Plus,
  Search,
  X,
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface Props {
  token: string;
  fileName: string;
  mimeType: string;
  recipientEmail: string;
}

interface PptxSlide {
  index: number;
  paragraphs: string[];
  images: { src: string }[];
}

type ViewerState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "pdf"; url: string }
  | { status: "docx"; html: string; watermarkText: string }
  | { status: "text"; content: string; watermarkText: string }
  | { status: "pptx"; slides: PptxSlide[]; watermarkText: string };

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

export function SecureViewer({ token, fileName }: Props) {
  const [state, setState] = useState<ViewerState>({ status: "loading" });
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toastVisible, setToastVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const pinchRef = useRef<{ startDist: number; startZoom: number } | null>(null);

  const scale = ZOOM_STEPS[zoomIndex] ?? 1;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/d/${token}/view`, { cache: "no-store" });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? "Failed to load document");
        }

        if (cancelled) return;

        const contentType = res.headers.get("content-type") ?? "";

        if (contentType.includes("application/pdf")) {
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          pdfUrlRef.current = url;
          setState({ status: "pdf", url });
        } else {
          const data = await res.json();
          if (data.type === "docx") {
            const wm = `FileRecall | ${data.watermark.recipientEmail} | ${data.watermark.accessedAt}`;
            setState({ status: "docx", html: data.html, watermarkText: wm });
          } else if (data.type === "pptx") {
            const wm = `FileRecall | ${data.watermark.recipientEmail} | ${data.watermark.accessedAt}`;
            setState({ status: "pptx", slides: data.slides, watermarkText: wm });
            setNumPages(data.slides.length);
          } else if (data.type === "text") {
            const wm = `FileRecall | ${data.watermark.recipientEmail} | ${data.watermark.accessedAt}`;
            setState({ status: "text", content: data.content, watermarkText: wm });
          } else {
            throw new Error("Unsupported format");
          }
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Failed to load document",
          });
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
      if (pdfUrlRef.current) {
        URL.revokeObjectURL(pdfUrlRef.current);
        pdfUrlRef.current = null;
      }
    };
  }, [token]);

  // Auto-dismiss toast after 6 seconds
  useEffect(() => {
    if (!toastVisible) return;
    const timer = setTimeout(() => setToastVisible(false), 6000);
    return () => clearTimeout(timer);
  }, [toastVisible]);

  // Block save/print + keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }

      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setCurrentPage((p) => Math.max(1, p - 1));
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setCurrentPage((p) => Math.min(p + 1, numPages || 1));
      }
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoomIndex((i) => Math.min(i + 1, ZOOM_STEPS.length - 1));
      }
      if (e.key === "-") {
        e.preventDefault();
        setZoomIndex((i) => Math.max(i - 1, 0));
      }
    }

    function blockContext(e: MouseEvent) {
      e.preventDefault();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("contextmenu", blockContext);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", blockContext);
    };
  }, [numPages]);

  // Pinch-to-zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function getTouchDist(e: TouchEvent): number {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      return Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    }

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length === 2) {
        pinchRef.current = { startDist: getTouchDist(e), startZoom: zoomIndex };
      }
    }

    function onTouchMove(e: TouchEvent) {
      if (e.touches.length === 2 && pinchRef.current) {
        e.preventDefault();
        const currentDist = getTouchDist(e);
        const ratio = currentDist / pinchRef.current.startDist;
        const delta = Math.round((ratio - 1) * 3);
        const newIndex = Math.max(0, Math.min(pinchRef.current.startZoom + delta, ZOOM_STEPS.length - 1));
        setZoomIndex(newIndex);
      }
    }

    function onTouchEnd() {
      pinchRef.current = null;
    }

    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd);

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
    };
  }, [zoomIndex]);

  const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
    setCurrentPage(1);
  }, []);

  function goTo(page: number) {
    setCurrentPage(Math.max(1, Math.min(page, numPages)));
  }

  function zoomIn() {
    setZoomIndex((i) => Math.min(i + 1, ZOOM_STEPS.length - 1));
  }

  function zoomOut() {
    setZoomIndex((i) => Math.max(i - 1, 0));
  }

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm">Loading document...</p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <FileText className="h-6 w-6 text-red-500" />
          </div>
          <p className="text-sm text-slate-700">{state.message}</p>
        </div>
      </div>
    );
  }

  const isPdf = state.status === "pdf";
  const isPptx = state.status === "pptx";
  const hasPages = isPdf || isPptx;

  return (
    <div className="relative flex h-[calc(100dvh-4rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        {isPdf && numPages > 1 && (
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-200 ${sidebarOpen ? "bg-slate-200" : ""}`}
            aria-label="Toggle page thumbnails"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}

        <div className="mr-auto flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="truncate text-sm font-medium text-slate-700">{fileName}</span>
        </div>

        {hasPages && numPages > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-200 disabled:opacity-40"
              aria-label={isPptx ? "Previous slide" : "Previous page"}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[5rem] text-center text-xs text-slate-600">
              {isPptx ? `Slide ${currentPage}` : currentPage} / {numPages}
            </span>
            <button
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-200 disabled:opacity-40"
              aria-label={isPptx ? "Next slide" : "Next page"}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 border-l border-slate-300 pl-2">
          <button
            onClick={zoomOut}
            disabled={zoomIndex <= 0}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-200 disabled:opacity-40"
            aria-label="Zoom out"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-[3rem] text-center text-xs text-slate-600">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={zoomIn}
            disabled={zoomIndex >= ZOOM_STEPS.length - 1}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-200 disabled:opacity-40"
            aria-label="Zoom in"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="border-l border-slate-300 pl-2">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className={`flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-200 ${searchOpen ? "bg-slate-200" : ""}`}
            aria-label="Toggle search"
          >
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in document..."
            className="min-w-0 flex-1 text-sm text-slate-700 placeholder-slate-400 outline-none"
            autoFocus
          />
          <button
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery("");
            }}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-slate-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main area with optional sidebar */}
      <div className="flex min-h-0 flex-1">
        {/* Thumbnails sidebar */}
        {isPdf && sidebarOpen && numPages > 1 && (
          <ThumbnailSidebar
            url={state.url}
            numPages={numPages}
            currentPage={currentPage}
            onPageSelect={goTo}
          />
        )}

        {/* Document content */}
        <div
          ref={containerRef}
          className="viewer-content relative min-w-0 flex-1 overflow-auto bg-slate-100"
        >
          {state.status === "pdf" && (
            <PdfContent
              url={state.url}
              scale={scale}
              currentPage={currentPage}
              onLoadSuccess={onDocumentLoadSuccess}
              onPageChange={setCurrentPage}
              numPages={numPages}
              searchQuery={searchQuery}
            />
          )}
          {state.status === "pptx" && (
            <PptxContent
              slides={state.slides}
              currentSlide={currentPage}
              watermarkText={state.watermarkText}
              scale={scale}
            />
          )}
          {state.status === "docx" && (
            <DocxContent html={state.html} watermarkText={state.watermarkText} scale={scale} />
          )}
          {state.status === "text" && (
            <TextContent content={state.content} watermarkText={state.watermarkText} scale={scale} />
          )}
        </div>
      </div>

      {/* Screenshot warning toast */}
      {toastVisible && (
        <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 animate-fade-in">
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 shadow-lg">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <p className="text-xs font-medium text-amber-800">
              This document is watermarked and traceable. Screenshots can be identified.
            </p>
            <button
              onClick={() => setToastVisible(false)}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-amber-500 hover:text-amber-700"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ThumbnailSidebar({
  url,
  numPages,
  currentPage,
  onPageSelect,
}: {
  url: string;
  numPages: number;
  currentPage: number;
  onPageSelect: (page: number) => void;
}) {
  return (
    <div className="flex w-[140px] shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex-1 overflow-y-auto p-2">
        <Document file={url} loading={null}>
          {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageSelect(pageNum)}
              className={`mb-2 w-full cursor-pointer rounded-md border-2 p-1 transition ${
                currentPage === pageNum
                  ? "border-brand bg-white shadow-sm"
                  : "border-transparent hover:border-slate-300 hover:bg-white"
              }`}
              aria-label={`Go to page ${pageNum}`}
            >
              <Page
                pageNumber={pageNum}
                width={110}
                renderTextLayer={false}
                renderAnnotationLayer={false}
                loading={
                  <div className="flex h-[155px] items-center justify-center bg-white">
                    <Loader2 className="h-3 w-3 animate-spin text-slate-300" />
                  </div>
                }
              />
              <p className="mt-1 text-center text-[10px] text-slate-500">{pageNum}</p>
            </button>
          ))}
        </Document>
      </div>
    </div>
  );
}

function PdfContent({
  url,
  scale,
  currentPage,
  onLoadSuccess,
  onPageChange,
  numPages,
  searchQuery,
}: {
  url: string;
  scale: number;
  currentPage: number;
  onLoadSuccess: (data: { numPages: number }) => void;
  onPageChange: (page: number) => void;
  numPages: number;
  searchQuery: string;
}) {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const scrollingToRef = useRef(false);

  useEffect(() => {
    if (numPages === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (scrollingToRef.current) return;
        let mostVisible: { page: number; ratio: number } | null = null;
        for (const entry of entries) {
          const page = Number(entry.target.getAttribute("data-page"));
          if (!page) continue;
          if (!mostVisible || entry.intersectionRatio > mostVisible.ratio) {
            mostVisible = { page, ratio: entry.intersectionRatio };
          }
        }
        if (mostVisible && mostVisible.ratio > 0.3) {
          onPageChange(mostVisible.page);
        }
      },
      { threshold: [0, 0.3, 0.5, 0.7, 1] },
    );

    for (const [, el] of pageRefs.current) {
      observerRef.current.observe(el);
    }

    return () => observerRef.current?.disconnect();
  }, [numPages, onPageChange]);

  useEffect(() => {
    const el = pageRefs.current.get(currentPage);
    if (!el) return;

    const container = el.closest(".viewer-content");
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const isVisible =
      elRect.top >= containerRect.top - 50 && elRect.top <= containerRect.bottom - 100;

    if (!isVisible) {
      scrollingToRef.current = true;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        scrollingToRef.current = false;
      }, 500);
    }
  }, [currentPage]);

  function setPageRef(page: number, el: HTMLDivElement | null) {
    if (el) {
      pageRefs.current.set(page, el);
      observerRef.current?.observe(el);
    } else {
      const existing = pageRefs.current.get(page);
      if (existing) observerRef.current?.unobserve(existing);
      pageRefs.current.delete(page);
    }
  }

  return (
    <Document
      file={url}
      onLoadSuccess={onLoadSuccess}
      loading={
        <div className="flex h-full items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      }
      className="flex flex-col items-center gap-4 p-4"
    >
      {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNum) => (
        <div
          key={pageNum}
          ref={(el) => setPageRef(pageNum, el)}
          data-page={pageNum}
          className="relative shadow-md"
        >
          <Page
            pageNumber={pageNum}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={false}
            loading={
              <div className="flex h-[800px] w-[600px] items-center justify-center bg-white">
                <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
              </div>
            }
            customTextRenderer={
              searchQuery
                ? (textItem) => highlightSearchText(textItem.str, searchQuery)
                : undefined
            }
          />
        </div>
      ))}
    </Document>
  );
}

function highlightSearchText(text: string, query: string): string {
  if (!query || query.length < 2) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  return text.replace(regex, '<mark style="background:#FBBF24;padding:0 1px;border-radius:2px">$1</mark>');
}

function WatermarkOverlay({ text }: { text: string }) {
  const items: { top: number; left: number }[] = [];
  const rowH = 160;
  const colW = 380;
  const rows = 50;
  const cols = 4;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const stagger = r % 2 === 0 ? 0 : colW * 0.5;
      items.push({
        top: r * rowH - 300,
        left: c * colW + stagger - 400,
      });
    }
  }

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ zIndex: 10 }}
      aria-hidden
    >
      {items.map((pos, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            top: `${pos.top}px`,
            left: `${pos.left}px`,
            transform: "rotate(-35deg)",
            whiteSpace: "nowrap",
            fontSize: "18px",
            fontWeight: 600,
            fontFamily: "Helvetica, Arial, sans-serif",
            color: "rgba(40, 45, 60, 0.28)",
            userSelect: "none",
            letterSpacing: "0.5px",
          }}
        >
          {text}
        </span>
      ))}
    </div>
  );
}

function PptxContent({
  slides,
  currentSlide,
  watermarkText,
  scale,
}: {
  slides: PptxSlide[];
  currentSlide: number;
  watermarkText: string;
  scale: number;
}) {
  const slide = slides[currentSlide - 1];
  if (!slide) return null;

  const isTitle =
    slide.paragraphs.length <= 3 &&
    slide.paragraphs.some((p) => p.length < 60);

  return (
    <div className="flex justify-center p-4">
      <div
        className="relative w-full max-w-[960px]"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        <div
          className="relative overflow-hidden rounded-sm bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 shadow-md"
          style={{ aspectRatio: "16 / 9" }}
        >
          <WatermarkOverlay text={watermarkText} />
          <div
            className={`flex h-full select-none flex-col p-10 ${isTitle ? "items-center justify-center text-center" : "justify-start"}`}
            style={{ userSelect: "none" }}
          >
            {slide.paragraphs.map((para, i) => {
              if (isTitle && i === 0) {
                return (
                  <p
                    key={i}
                    className="mb-4 text-3xl font-bold leading-tight text-white"
                  >
                    {para}
                  </p>
                );
              }
              if (isTitle) {
                return (
                  <p key={i} className="text-lg text-slate-300">
                    {para}
                  </p>
                );
              }
              if (i === 0) {
                return (
                  <p
                    key={i}
                    className="mb-6 text-2xl font-bold text-white"
                  >
                    {para}
                  </p>
                );
              }
              return (
                <p
                  key={i}
                  className="mb-3 text-base leading-relaxed text-slate-200"
                >
                  {para}
                </p>
              );
            })}
            {slide.images.length > 0 && (
              <div className="mt-4 flex flex-wrap items-start gap-4">
                {slide.images.map((img, i) => (
                  <img
                    key={i}
                    src={img.src}
                    alt=""
                    className="max-h-[300px] max-w-full rounded object-contain"
                    draggable={false}
                    onContextMenu={(e) => e.preventDefault()}
                  />
                ))}
              </div>
            )}
            {slide.paragraphs.length === 0 && slide.images.length === 0 && (
              <p className="text-sm italic text-slate-500">
                (Empty slide)
              </p>
            )}
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">
          Slide {currentSlide} of {slides.length}
        </p>
      </div>
    </div>
  );
}

function DocxContent({
  html,
  watermarkText,
  scale,
}: {
  html: string;
  watermarkText: string;
  scale: number;
}) {
  return (
    <div className="flex justify-center p-4">
      <div
        className="relative w-full max-w-[850px] rounded-sm bg-white shadow-md"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        <WatermarkOverlay text={watermarkText} />
        <div
          className="docx-content select-none px-16 py-12"
          style={{ userSelect: "none" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}

function TextContent({
  content,
  watermarkText,
  scale,
}: {
  content: string;
  watermarkText: string;
  scale: number;
}) {
  return (
    <div className="flex justify-center p-4">
      <div
        className="relative w-full max-w-[850px] rounded-sm bg-white shadow-md"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        <WatermarkOverlay text={watermarkText} />
        <pre
          className="select-none whitespace-pre-wrap break-words px-16 py-12 font-mono text-sm leading-relaxed text-slate-800"
          style={{ userSelect: "none" }}
        >
          {content}
        </pre>
      </div>
    </div>
  );
}
