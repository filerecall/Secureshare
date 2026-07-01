"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, FileText, Link as LinkIcon, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ShareDialog } from "@/components/ShareDialog";
import type { DocumentRow as DocumentRecord, DocumentStatus } from "@/types/database";

export interface DocumentStats {
  viewCount: number;
  downloadCount: number;
  activeLinkCount: number;
  lastAccessedAt: string | null;
}

export interface DocumentWithStats extends DocumentRecord {
  stats: DocumentStats;
}

interface Props {
  document: DocumentWithStats;
}

const statusStyles: Record<DocumentStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  revoked: "bg-red-50 text-red-700 ring-red-100",
  expired: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function DocumentRow({ document }: Props) {
  const router = useRouter();
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const canShare = document.status === "active" && !!document.s3_key;
  const { stats } = document;

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${document.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.refresh();
    } catch {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <li className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{document.file_name}</p>
            <p className="text-xs text-slate-500">
              {formatBytes(document.file_size)} · {formatDate(document.created_at)}
            </p>
            <DocumentStatsRow stats={stats} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[document.status]}`}
          >
            {document.status}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShareOpen(true)}
            disabled={!canShare}
            title={canShare ? "Manage share links" : "Document is not shareable"}
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            Share
          </Button>
          {confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Delete?</span>
              <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button size="sm" variant="danger" onClick={handleDelete} loading={deleting}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Yes
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              title="Delete document"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}
        </div>
      </li>
      <ShareDialog
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        documentId={document.id}
        documentName={document.file_name}
      />
    </>
  );
}

function DocumentStatsRow({ stats }: { stats: DocumentStats }) {
  const hasAnyActivity = stats.viewCount > 0 || stats.downloadCount > 0;

  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
      <span
        className="inline-flex items-center gap-1"
        title={`${stats.activeLinkCount} active share link${stats.activeLinkCount === 1 ? "" : "s"}`}
      >
        <LinkIcon className="h-3 w-3" aria-hidden />
        {stats.activeLinkCount} active
      </span>
      <span className="inline-flex items-center gap-1" title="Total views">
        <Eye className="h-3 w-3" aria-hidden />
        {stats.viewCount}
      </span>
      <span className="inline-flex items-center gap-1" title="Total downloads">
        <Download className="h-3 w-3" aria-hidden />
        {stats.downloadCount}
      </span>
      {hasAnyActivity && stats.lastAccessedAt ? (
        <span className="text-slate-400">Last opened {formatRelative(stats.lastAccessedAt)}</span>
      ) : (
        <span className="text-slate-400">No access yet</span>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff);
  if (abs < 60_000) return "just now";
  if (abs < 3_600_000) return `${Math.round(abs / 60_000)}m ago`;
  if (abs < 86_400_000) return `${Math.round(abs / 3_600_000)}h ago`;
  return `${Math.round(abs / 86_400_000)}d ago`;
}
