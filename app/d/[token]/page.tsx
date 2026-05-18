import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { Download, FileText, Lock, ShieldOff } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
import { getSenderPlan, shouldShowFreeBranding } from "@/lib/sender-plan";
import {
  logAccessEvent,
  lookupShareLink,
  markFirstViewed,
  type ShareLinkBlockReason,
} from "@/lib/share-links";

export const metadata: Metadata = {
  title: "Secure document - FileRecall",
  // Recipient pages should never appear in search.
  robots: { index: false, follow: false },
};

// Force dynamic + opt out of every caching layer. Without these, a recipient
// who refreshes the page after the sender revokes can be served the previous
// "Download available" render from BFCache / Data Cache / Vercel's edge.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

interface PageProps {
  params: { token: string };
}

export default async function RecipientPage({ params }: PageProps) {
  // Belt to the suspenders above. unstable_noStore opts out of Next's Data
  // Cache for any fetches in this render and also disables Full Route Cache.
  noStore();
  const lookup = await lookupShareLink(params.token);

  if (!lookup.ok) {
    // Log the block attempt so the sender can see it in the audit log later.
    // For 'not_found' tokens we have nothing to attribute the event to, so
    // we skip logging in that case.
    if ("shareLinkId" in lookup && lookup.shareLinkId) {
      await logAccessEvent(lookup.shareLinkId, "blocked");
    }
    return (
      <RecipientShell>
        <BlockedCard reason={"reason" in lookup ? lookup.reason : "not_found"} />
      </RecipientShell>
    );
  }

  const { shareLink, document } = lookup;

  // Stamp first_viewed_at BEFORE logging the event so a refresh during this
  // request still sees the field set.
  await markFirstViewed(shareLink);
  await logAccessEvent(shareLink.id, "viewed");

  // Free-tier senders get a "Sent via FileRecall" footer shown to recipients
  // as a soft upsell. Paid tiers don't (they pay to remove the branding).
  const senderPlan = await getSenderPlan(document.user_id);
  const showFreeBranding = shouldShowFreeBranding(senderPlan);

  return (
    <RecipientShell freeBranding={showFreeBranding}>
      <Card className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <FileText className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-slate-900">
              {document.file_name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              {formatBytes(document.file_size)} · Shared securely with{" "}
              <span className="font-medium text-slate-900">{shareLink.recipient_email}</span>
            </p>
          </div>
        </div>

        <ExpiryNotice
          expiryType={shareLink.expiry_type}
          expiresAt={shareLink.expires_at}
        />

        <a
          href={`/api/d/${shareLink.token}/download`}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand px-7 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2"
        >
          <Download className="h-4 w-4" aria-hidden />
          Download document
        </a>

        <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
          <Lock className="h-3 w-3 text-emerald-600" aria-hidden />
          AES-256 encrypted at rest · TLS 1.3 in transit
        </p>
      </Card>
    </RecipientShell>
  );
}

function RecipientShell({
  children,
  freeBranding = false,
}: {
  children: React.ReactNode;
  freeBranding?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="px-4 py-6 sm:px-6">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-8 sm:items-center sm:px-6">
        <div className="w-full max-w-md">{children}</div>
      </main>
      {freeBranding ? (
        <footer className="px-4 pb-6 text-center sm:px-6">
          <a
            href="https://filerecall.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
          >
            Sent via <span className="font-semibold text-slate-700">FileRecall</span> -
            secure document delivery
          </a>
        </footer>
      ) : null}
    </div>
  );
}

function ExpiryNotice({
  expiryType,
  expiresAt,
}: {
  expiryType: string | null;
  expiresAt: string | null;
}) {
  let text: string;
  if (expiryType === "first_view") {
    text = "This link expires after this view. Save the file now if you need it.";
  } else if (expiryType === "days" && expiresAt) {
    text = `This link expires on ${formatDate(expiresAt)}.`;
  } else {
    text = "This link stays active until the sender revokes it.";
  }
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      {text}
    </div>
  );
}

function BlockedCard({ reason }: { reason: ShareLinkBlockReason }) {
  const messages: Record<ShareLinkBlockReason, { title: string; body: string }> = {
    not_found: {
      title: "Link not found",
      body: "We couldn't find a document for this link. Double-check the URL with the sender.",
    },
    revoked: {
      title: "Link revoked",
      body: "The sender has revoked access to this document. Contact them if you still need it.",
    },
    expired: {
      title: "Link expired",
      body: "This link has passed its expiry date and can no longer be opened.",
    },
    already_viewed: {
      title: "Link already used",
      body: "This was a single-view link and has already been opened. Ask the sender for a new one.",
    },
  };
  const { title, body } = messages[reason];
  return (
    <Card className="space-y-4 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <ShieldOff className="h-6 w-6 text-slate-500" aria-hidden />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{body}</p>
      </div>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
