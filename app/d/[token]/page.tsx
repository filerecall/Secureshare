import type { Metadata } from "next";
import { unstable_noStore as noStore } from "next/cache";
import { Lock, ShieldOff } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/Logo";
import { SecureViewer } from "@/components/SecureViewer";
import { getSenderPlan, shouldShowFreeBranding } from "@/lib/sender-plan";
import {
  logAccessEvent,
  lookupShareLink,
  markFirstViewed,
  type ShareLinkBlockReason,
} from "@/lib/share-links";

export const metadata: Metadata = {
  title: "Secure document - FileRecall",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const VIEWABLE_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
  "text/plain",
  "text/csv",
]);

interface PageProps {
  params: { token: string };
}

export default async function RecipientPage({ params }: PageProps) {
  noStore();
  const lookup = await lookupShareLink(params.token);

  if (!lookup.ok) {
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

  await markFirstViewed(shareLink);
  await logAccessEvent(shareLink.id, "viewed");

  const senderPlan = await getSenderPlan(document.user_id);
  const showFreeBranding = shouldShowFreeBranding(senderPlan);
  const isViewable = VIEWABLE_TYPES.has(document.mime_type);

  if (isViewable) {
    return (
      <ViewerShell freeBranding={showFreeBranding}>
        <div className="mb-3 flex items-center justify-between gap-4 px-1">
          <ExpiryNotice
            expiryType={shareLink.expiry_type}
            expiresAt={shareLink.expires_at}
          />
          <p className="flex shrink-0 items-center gap-1.5 text-xs text-slate-500">
            <Lock className="h-3 w-3 text-emerald-600" aria-hidden />
            End-to-end secured
          </p>
        </div>
        <SecureViewer
          token={params.token}
          fileName={document.file_name}
          mimeType={document.mime_type}
          recipientEmail={shareLink.recipient_email}
        />
      </ViewerShell>
    );
  }

  return (
    <RecipientShell freeBranding={showFreeBranding}>
      <Card className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
            <ShieldOff className="h-6 w-6" aria-hidden />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold text-slate-900">
              {document.file_name}
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              This file type cannot be viewed in the browser.
            </p>
          </div>
        </div>
      </Card>
    </RecipientShell>
  );
}

function ViewerShell({
  children,
  freeBranding = false,
}: {
  children: React.ReactNode;
  freeBranding?: boolean;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="flex items-center justify-between px-4 py-3 sm:px-6">
        <Logo />
        <p className="text-xs text-slate-400">View only</p>
      </header>
      <main className="flex flex-1 flex-col px-4 pb-4 sm:px-6">
        {children}
      </main>
      {freeBranding ? (
        <footer className="px-4 pb-4 text-center sm:px-6">
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
    text = "This link expires after this view.";
  } else if (expiryType === "days" && expiresAt) {
    text = `Expires on ${formatDate(expiresAt)}.`;
  } else {
    text = "Active until revoked.";
  }
  return (
    <p className="text-xs text-amber-700">{text}</p>
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

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
