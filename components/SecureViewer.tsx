"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Minus,
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

type ViewerState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "pdf"; url: string }
  | { status: "docx"; html: string; watermarkText: string }
  | { status: "text"; content: string; watermarkText: string };

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

export function SecureViewer({ token, fileName }: Props) {
  const [state, setState] = useState<ViewerState>({ status: "loading" });
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfUrlRef = useRef<string | null>(null);

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

  useEffect(() => {
    function blockKeys(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "p" || e.key === "P")) {
        e.preventDefault();
      }
    }

    function blockContext(e: MouseEvent) {
      e.preventDefault();
    }

    document.addEventListener("keydown", blockKeys);
    document.addEventListener("contextmenu", blockContext);

    return () => {
      document.removeEventListener("keydown", blockKeys);
      document.removeEventListener("contextmenu", blockContext);
    };
  }, []);

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

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
      {/* Toolbar */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <div className="mr-auto flex min-w-0 items-center gap-2">
          <FileText className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="truncate text-sm font-medium text-slate-700">{fileName}</span>
        </div>

        {state.status === "pdf" && numPages > 0 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => goTo(currentPage - 1)}
              disabled={currentPage <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-200 disabled:opacity-40"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[5rem] text-center text-xs text-slate-600">
              {currentPage} / {numPages}
            </span>
            <button
              onClick={() => goTo(currentPage + 1)}
              disabled={currentPage >= numPages}
              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-200 disabled:opacity-40"
              aria-label="Next page"
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

      {/* Document content */}
      <div
        ref={containerRef}
        className="viewer-content relative flex-1 overflow-auto bg-slate-100"
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
        {state.status === "docx" && (
          <DocxContent html={state.html} watermarkText={state.watermarkText} scale={scale} />
        )}
        {state.status === "text" && (
          <TextContent content={state.content} watermarkText={state.watermarkText} scale={scale} />
        )}
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
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><text x="200" y="75" text-anchor="middle" dominant-baseline="middle" transform="rotate(-35,200,75)" font-family="Helvetica,Arial,sans-serif" font-size="18" font-weight="600" fill="rgba(40,45,60,0.28)">${escaped}</text><text x="0" y="225" text-anchor="middle" dominant-baseline="middle" transform="rotate(-35,0,225)" font-family="Helvetica,Arial,sans-serif" font-size="18" font-weight="600" fill="rgba(40,45,60,0.28)">${escaped}</text></svg>`;

  const bgUrl = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        zIndex: 10,
        backgroundImage: bgUrl,
        backgroundRepeat: "repeat",
        backgroundSize: "400px 300px",
      }}
      aria-hidden
    />
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
