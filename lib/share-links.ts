import "server-only";
import { headers } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AccessEventType, DocumentRow, ShareLinkRow } from "@/types/database";

export type ShareLinkBlockReason = "not_found" | "revoked" | "expired" | "already_viewed";

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
export async function lookupShareLink(token: string): Promise<ShareLinkLookup> {
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
    return { ok: false, reason: "expired", shareLinkId: shareLink.id };
  }

  // first_view links are consumed by the first successful page load. The
  // recipient page calls markFirstViewed() after this lookup succeeds; on
  // every subsequent request that field is non-null and we deny access.
  if (shareLink.expiry_type === "first_view" && shareLink.first_viewed_at) {
    return { ok: false, reason: "already_viewed", shareLinkId: shareLink.id };
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

  return { ok: true, shareLink, document };
}

/**
 * Stamp first_viewed_at the first time a 'first_view' link is opened.
 * No-op for other expiry types or when already viewed.
 */
export async function markFirstViewed(shareLink: ShareLinkRow): Promise<void> {
  if (shareLink.expiry_type !== "first_view") return;
  if (shareLink.first_viewed_at) return;

  const admin = createAdminClient();
  await admin
    .from("share_links")
    .update({ first_viewed_at: new Date().toISOString() })
    .eq("id", shareLink.id);
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
  client?: SupabaseClient,
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
