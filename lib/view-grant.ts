import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";

/**
 * Short-lived proof that "this browser is the one that just opened the link".
 *
 * A 'first_view' link is consumed the moment the recipient page renders, but
 * the page is only a shell - the bytes are fetched a moment later by the
 * viewer from /api/d/[token]/view. Without a grant that second request looks
 * exactly like a stranger re-opening a used link, so it gets blocked and the
 * recipient sees "Access denied" on their one and only view.
 *
 * The grant closes that gap without weakening the link: it is signed
 * server-side, bound to one share link, and expires in minutes, so a
 * forwarded URL is still dead - a forwarded page never carries a grant
 * because the page itself is blocked before it can mint one.
 */
export const VIEW_GRANT_PARAM = "g";

/** How long the viewer has to pull the file after the page renders. */
export const VIEW_GRANT_TTL_MS = 10 * 60 * 1000;

function sign(payload: string): string {
  return createHmac("sha256", env.supabaseServiceRoleKey())
    .update(payload)
    .digest("base64url");
}

export function issueViewGrant(shareLinkId: string): string {
  const exp = Date.now() + VIEW_GRANT_TTL_MS;
  return `${exp}.${sign(`${shareLinkId}.${exp}`)}`;
}

export function verifyViewGrant(grant: string | null | undefined, shareLinkId: string): boolean {
  if (!grant) return false;

  const dot = grant.indexOf(".");
  if (dot <= 0) return false;

  const expPart = grant.slice(0, dot);
  const provided = grant.slice(dot + 1);

  const exp = Number(expPart);
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;

  const expected = sign(`${shareLinkId}.${exp}`);
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
