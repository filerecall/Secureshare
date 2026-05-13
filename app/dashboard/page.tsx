import { FileText } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DocumentRow, type DocumentWithStats } from "@/components/DocumentRow";
import { UploadButton } from "@/components/UploadButton";
import { createClient } from "@/lib/supabase/server";
import type { DocumentRow as DocumentRecord } from "@/types/database";

export const metadata = { title: "Dashboard - SecureShare" };

// Render at request time so newly-uploaded docs appear after router.refresh().
export const dynamic = "force-dynamic";

// Shape PostgREST gives back when nesting share_links and access_events under
// documents. RLS still applies on the joined rows so a user only sees their
// own links + events.
type DocumentWithJoins = DocumentRecord & {
  share_links: Array<{
    id: string;
    revoked_at: string | null;
    expires_at: string | null;
    expiry_type: string | null;
    first_viewed_at: string | null;
    access_events: Array<{
      event_type: "viewed" | "downloaded" | "blocked";
      created_at: string;
    }>;
  }>;
};

export default async function DashboardPage() {
  const supabase = createClient();

  // Pull documents with their share_links and access_events nested. The view
  // count math happens in JS because Supabase's PostgREST API doesn't expose
  // PostgreSQL aggregates directly; this is fine for the volumes M2 expects
  // (a single user's documents). If we ever outgrow it, swap for a SQL view.
  const { data, error } = await supabase
    .from("documents")
    .select(
      `
        *,
        share_links (
          id,
          revoked_at,
          expires_at,
          expiry_type,
          first_viewed_at,
          access_events ( event_type, created_at )
        )
      `,
    )
    .order("created_at", { ascending: false });

  const docs: DocumentWithStats[] = error
    ? []
    : ((data ?? []) as unknown as DocumentWithJoins[]).map(toDocumentWithStats);

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

function toDocumentWithStats(doc: DocumentWithJoins): DocumentWithStats {
  let viewCount = 0;
  let downloadCount = 0;
  let activeLinkCount = 0;
  let lastAccessedAt: string | null = null;
  const now = Date.now();

  for (const link of doc.share_links) {
    const isRevoked = !!link.revoked_at;
    const isExpired = link.expires_at != null && new Date(link.expires_at).getTime() <= now;
    const isUsedFirstView = link.expiry_type === "first_view" && !!link.first_viewed_at;
    if (!isRevoked && !isExpired && !isUsedFirstView) {
      activeLinkCount += 1;
    }

    for (const event of link.access_events) {
      if (event.event_type === "viewed") viewCount += 1;
      if (event.event_type === "downloaded") downloadCount += 1;
      if (event.event_type === "viewed" || event.event_type === "downloaded") {
        if (!lastAccessedAt || event.created_at > lastAccessedAt) {
          lastAccessedAt = event.created_at;
        }
      }
    }
  }

  // Strip the joined arrays before passing to the client component, both to
  // shrink the payload and because the client only needs the aggregates.
  return {
    id: doc.id,
    user_id: doc.user_id,
    file_name: doc.file_name,
    file_size: doc.file_size,
    mime_type: doc.mime_type,
    s3_key: doc.s3_key,
    status: doc.status,
    created_at: doc.created_at,
    stats: {
      viewCount,
      downloadCount,
      activeLinkCount,
      lastAccessedAt,
    },
  };
}
