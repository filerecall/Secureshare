import { FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DocumentRow } from "@/components/DocumentRow";
import { UploadButton } from "@/components/UploadButton";
import { createClient } from "@/lib/supabase/server";
import type { DocumentRow as DocumentRecord } from "@/types/database";

export const metadata = { title: "Dashboard - SecureShare" };

// Render at request time so newly-uploaded docs appear after router.refresh().
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("created_at", { ascending: false });

  const docs: DocumentRecord[] = error ? [] : (data ?? []);

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
              <DocumentRow key={doc.id} document={doc} />
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
