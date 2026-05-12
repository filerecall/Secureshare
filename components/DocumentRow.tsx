"use client";

import { useState } from "react";
import { FileText, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ShareDialog } from "@/components/ShareDialog";
import type { DocumentRow as DocumentRecord, DocumentStatus } from "@/types/database";

interface Props {
  document: DocumentRecord;
}

const statusStyles: Record<DocumentStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  revoked: "bg-red-50 text-red-700 ring-red-100",
  expired: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function DocumentRow({ document }: Props) {
  const [shareOpen, setShareOpen] = useState(false);
  const canShare = document.status === "active" && !!document.s3_key;

  return (
    <>
      <li className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
            <FileText className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{document.file_name}</p>
            <p className="text-xs text-slate-500">
              {formatBytes(document.file_size)} · {formatDate(document.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
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
            title={canShare ? "Create a share link" : "Document is not shareable"}
          >
            <Share2 className="h-3.5 w-3.5" aria-hidden />
            Share
          </Button>
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
