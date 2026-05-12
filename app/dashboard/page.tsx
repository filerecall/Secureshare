import { FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { UploadButton } from "@/components/UploadButton";
import { createClient } from "@/lib/supabase/server";
import type { DocumentRow, DocumentStatus } from "@/types/database";

export const metadata = { title: "Dashboard - SecureShare" };

// Render at request time so newly-uploaded docs appear after router.refresh().
export const dynamic = "force-dynamic";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

const statusStyles: Record<DocumentStatus, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  revoked: "bg-red-50 text-red-700 ring-red-100",
  expired: "bg-slate-100 text-slate-600 ring-slate-200",
};

export default async function DashboardPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  const docs: DocumentRow[] = error ? [] : (data ?? []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold text-slate-900">Your documents</h1>
          <p className="text-sm text-slate-600">
            Upload a file to start sharing it through a secure, revocable link.
          </p>
        </div>
        <UploadButton />
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50 text-sm text-red-700">
          Could not load your documents. Please refresh the page.
        </Card>
      ) : docs.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <FileText className="h-6 w-6 text-slate-500" aria-hidden />
          </div>
          <div>
            <p className="text-base font-medium text-slate-900">No documents yet</p>
            <p className="mt-1 max-w-sm text-sm text-slate-600">
              Click &quot;Upload document&quot; above to add your first file.
            </p>
          </div>
        </Card>
      ) : (
        <Card className="p-0">
          <ul className="divide-y divide-slate-200">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-4 px-6 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                    <FileText className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {doc.file_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatBytes(doc.file_size)} · {formatDate(doc.created_at)}
                    </p>
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[doc.status]}`}
                >
                  {doc.status}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
