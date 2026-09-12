import "server-only";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { isExpectedDocumentS3Key } from "@/lib/s3";
import { cleanupIfAllLinksInactive } from "@/lib/s3-cleanup";
import { verifyViewGrant } from "@/lib/view-grant";
import type { AccessEventType, Database, DocumentRow, ShareLinkRow } from "@/types/database";

export type ShareLinkBlockReason = "not_found" | "revoked" | "expired" | "already_viewed";

export interface LookupOptions {
  /**
   * Signed grant minted by the recipient page for the browser that just
   * consumed a 'first_view' link. Lets that same browser finish pulling the
   * file it is already allowed to see. Ignored for every other expiry type.
   */
  viewGrant?: string | null;
}

export type ShareLinkLookup =
  | { ok: true; shareLink: ShareLinkRow; document: DocumentRow }
  | { ok: false; reason: ShareLinkBlockReason; shareLinkId?: string };

/**
 * Read a share-link by token and validate it can be served right now.
 *
 * Uses the service-role client because the recipient is unauthenticated and
 * RLS would otherwise reject the read. The token itself is the authn factor:
 * it's 256 bits of entropy and only the sender's recipient knows it.
 */
export async function lookupShareLink(
  token: string,
  options: LookupOptions = {},
): Promise<ShareLinkLookup> {
  if (!token || token.length < 32) return { ok: false, reason: "not_found" };

  const admin = createAdminClient();

  const { data: shareLink, error } = await admin
    .from("share_links")
    .select("*")
    .eq("token", token)
    .maybeSingle<ShareLinkRow>();

  if (error || !shareLink) {
    return { ok: false, reason: "not_found" };
  }

  if (shareLink.revoked_at) {
    return { ok: false, reason: "revoked", shareLinkId: shareLink.id };
  }

  if (shareLink.expires_at && new Date(shareLink.expires_at).getTime() <= Date.now()) {
    void cleanupIfAllLinksInactive(shareLink.document_id);
    return { ok: false, reason: "expired", shareLinkId: shareLink.id };
  }

  if (shareLink.expiry_type === "first_view" && shareLink.first_viewed_at) {
    // The browser that consumed the view is still allowed to finish loading
    // it. Everyone else - including that browser after the grant expires -
    // is blocked.
    if (!verifyViewGrant(options.viewGrant, shareLink.id)) {
      void cleanupIfAllLinksInactive(shareLink.document_id);
      return { ok: false, reason: "already_viewed", shareLinkId: shareLink.id };
    }
  }

  const { data: document, error: docError } = await admin
    .from("documents")
    .select("*")
    .eq("id", shareLink.document_id)
    .maybeSingle<DocumentRow>();

  if (docError || !document) {
    return { ok: false, reason: "not_found", shareLinkId: shareLink.id };
  }

  // Belt-and-braces: if the document itself has been revoked from the sender
  // side, even a non-revoked link should not serve it.
  if (document.status !== "active") {
    return { ok: false, reason: "revoked", shareLinkId: shareLink.id };
  }

  // The stored key must be the one this document is entitled to. A user can
  // edit their own documents row through RLS, so a tampered s3_key pointing at
  // another tenant's object would otherwise be served by this (service-role)
  // path. Treat a mismatch as not-found rather than explaining why.
  if (document.s3_key && !isExpectedDocumentS3Key(document.s3_key, document.user_id, document.id)) {
    // eslint-disable-next-line no-console
    console.error("Refusing document with an unexpected s3_key", {
      documentId: document.id,
      shareLinkId: shareLink.id,
    });
    return { ok: false, reason: "not_found", shareLinkId: shareLink.id };
  }

  return { ok: true, shareLink, document };
}

/**
 * Stamp first_viewed_at the first time a 'first_view' link is opened.
 * No-op for other expiry types or when already viewed.
 */
export async function markFirstViewed(shareLink: ShareLinkRow): Promise<boolean> {
  if (shareLink.expiry_type !== "first_view") return true;
  if (shareLink.first_viewed_at) return false;

  const admin = createAdminClient();

  // `.is("first_viewed_at", null)` makes the database pick the winner. Two
  // people opening the same single-view link at the same moment would both
  // read null and both write otherwise - the guard has to be part of the
  // write, not a check before it. Whoever loses gets no row back.
  const { data, error } = await admin
    .from("share_links")
    .update({ first_viewed_at: new Date().toISOString() })
    .eq("id", shareLink.id)
    .is("first_viewed_at", null)
    .select("id");

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to stamp first_viewed_at", { shareLinkId: shareLink.id, error });
    return false;
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Record an access event. Best-effort: failures are logged but don't break
 * the recipient flow. We never want a logging failure to deny access to a
 * valid recipient or, conversely, to silently grant access by skipping the
 * block path.
 */
export async function logAccessEvent(
  shareLinkId: string,
  eventType: AccessEventType,
  client?: SupabaseClient<Database>,
): Promise<void> {
  const supabase = client ?? createAdminClient();
  const { ipAddress, userAgent } = readRequestMeta();

  const { error } = await supabase.from("access_events").insert({
    share_link_id: shareLinkId,
    event_type: eventType,
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to log access event", { shareLinkId, eventType, error });
  }
}

/**
 * Pull IP and user-agent off the incoming request. Works in both server
 * components and route handlers because both have access to the `headers()`
 * helper. On Vercel, the client IP is in `x-forwarded-for` (first hop).
 */
function readRequestMeta(): { ipAddress: string | null; userAgent: string | null } {
  try {
    const h = headers();
    const forwarded = h.get("x-forwarded-for");
    const ipAddress = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
    const userAgent = h.get("user-agent");
    return { ipAddress, userAgent };
  } catch {
    return { ipAddress: null, userAgent: null };
  }
}
