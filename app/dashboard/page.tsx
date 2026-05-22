import { Eye, FileUp, Send, UploadCloud } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { DocumentRow, type DocumentWithStats } from "@/components/DocumentRow";
import { UploadButton } from "@/components/UploadButton";
import { createClient } from "@/lib/supabase/server";
import type { DocumentRow as DocumentRecord } from "@/types/database";

export const metadata = { title: "Dashboard - FileRecall" };

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
        <EmptyState />
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

/** Polished empty state shown when the user has no documents yet. */
function EmptyState() {
  const steps = [
    { icon: FileUp, label: "Upload", body: "Add a PDF or document. Encrypted the moment it lands." },
    { icon: Send, label: "Share", body: "Send a tokenised link with an expiry you control." },
    { icon: Eye, label: "Track", body: "See every view and revoke access whenever you want." },
  ];
  return (
    <Card className="overflow-hidden p-0">
      {/* Gradient hero strip */}
      <div className="relative flex flex-col items-center gap-3 bg-brand-gradient px-6 py-12 text-center">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.22),transparent_70%)]"
        />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-inset ring-white/25">
          <UploadCloud className="h-7 w-7" aria-hidden />
        </span>
        <div className="relative">
          <h2 className="text-xl font-semibold text-white">Upload your first document</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-white/80">
            Nothing here yet. Add a file and you&apos;ll have a secure, revocable link in seconds.
          </p>
        </div>
      </div>

      {/* Three-step hint */}
      <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
        {steps.map(({ icon: Icon, label, body }) => (
          <div key={label} className="flex flex-col gap-2 bg-white p-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-slate-900">{label}</p>
            <p className="text-xs leading-relaxed text-slate-600">{body}</p>
          </div>
        ))}
      </div>
    </Card>
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
