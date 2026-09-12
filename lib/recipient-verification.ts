import "server-only";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LinkVerificationCodeRow, ShareLinkRow } from "@/types/database";

/**
 * Recipient verification - "only the intended reader can open it".
 *
 * A link flagged `require_email_verification` won't serve the document until
 * the opener proves they can read the mailbox the link was issued to: they
 * type their address, we email a 6-digit code to the ADDRESS ON THE LINK (not
 * to whatever they typed), and only that code unlocks the view. Forwarding the
 * link no longer forwards access.
 */

/** How long a code stays usable. */
export const CODE_TTL_MS = 10 * 60 * 1000;
/**
 * How long a passed verification lasts before the reader must do it again.
 *
 * This is an INACTIVITY window, not a hard cap: every served page refreshes
 * it, so a long read never gets interrupted, while a browser left alone -
 * or one that got the link second-hand - goes cold quickly.
 */
export const SESSION_TTL_MS = 15 * 60 * 1000;
/** Wrong guesses allowed against a single code before it dies. */
export const MAX_ATTEMPTS = 5;
/** Codes we'll send for one link in a rolling hour. Caps email abuse. */
export const MAX_CODES_PER_HOUR = 5;

export function requiresVerification(shareLink: ShareLinkRow): boolean {
  return shareLink.require_email_verification === true;
}

export function verificationCookieName(shareLinkId: string): string {
  return `fr_verify_${shareLinkId}`;
}

function sign(payload: string): string {
  return createHmac("sha256", env.supabaseServiceRoleKey()).update(payload).digest("base64url");
}

function hashCode(shareLinkId: string, code: string): string {
  // Salted with the link id so an identical code on two links hashes
  // differently, and keyed with a server secret so the hash can't be
  // brute-forced offline from a database dump alone (only 10^6 codes exist).
  return sign(`code.${shareLinkId}.${code}`);
}

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Trim + lowercase so "  Bob@Example.COM " matches "bob@example.com". */
export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

// ──────────────────────────────────────────────────────────────────
// Verified-session token (stored in an HttpOnly cookie)
// ──────────────────────────────────────────────────────────────────

export function issueVerificationSession(shareLinkId: string): {
  value: string;
  maxAgeSeconds: number;
} {
  const exp = Date.now() + SESSION_TTL_MS;
  return {
    value: `${exp}.${sign(`session.${shareLinkId}.${exp}`)}`,
    maxAgeSeconds: Math.floor(SESSION_TTL_MS / 1000),
  };
}

export function verifySession(value: string | null | undefined, shareLinkId: string): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot <= 0) return false;

  const exp = Number(value.slice(0, dot));
  if (!Number.isFinite(exp) || exp <= Date.now()) return false;

  return constantTimeEquals(sign(`session.${shareLinkId}.${exp}`), value.slice(dot + 1));
}

// ──────────────────────────────────────────────────────────────────
// Codes
// ──────────────────────────────────────────────────────────────────

export type RequestCodeResult =
  | { ok: true; code: string }
  /** The typed address isn't the recipient. Caller must NOT reveal this. */
  | { ok: false; reason: "email_mismatch" }
  | { ok: false; reason: "rate_limited" }
  | { ok: false; reason: "storage_failed" };

/**
 * Mint a code for `shareLink` if `typedEmail` really is its recipient.
 *
 * Returns the plaintext code for the caller to email - it is never returned to
 * the browser. Only the hash is stored.
 */
export async function requestVerificationCode(
  shareLink: ShareLinkRow,
  typedEmail: string,
  ipAddress: string | null,
): Promise<RequestCodeResult> {
  if (normaliseEmail(typedEmail) !== normaliseEmail(shareLink.recipient_email)) {
    return { ok: false, reason: "email_mismatch" };
  }

  const admin = createAdminClient();
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: recent, error: countError } = await admin
    .from("link_verification_codes")
    .select("id")
    .eq("share_link_id", shareLink.id)
    .gte("created_at", windowStart);

  // A failed count must not become a free pass for unlimited sends.
  if (countError) return { ok: false, reason: "storage_failed" };
  if ((recent?.length ?? 0) >= MAX_CODES_PER_HOUR) return { ok: false, reason: "rate_limited" };

  // randomInt is drawn from the CSPRNG, unlike Math.random.
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");

  const { error: insertError } = await admin.from("link_verification_codes").insert({
    share_link_id: shareLink.id,
    code_hash: hashCode(shareLink.id, code),
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    ip_address: ipAddress,
  });

  if (insertError) {
    // eslint-disable-next-line no-console
    console.error("Failed to store verification code", insertError);
    return { ok: false, reason: "storage_failed" };
  }

  return { ok: true, code };
}

export type ConfirmCodeResult =
  | { ok: true }
  | { ok: false; reason: "no_code" | "expired" | "too_many_attempts" | "wrong_code" };

/**
 * Check a typed code against the newest live code for the link.
 *
 * Only the most recent code counts: requesting a new one supersedes the old,
 * which is what a recipient expects after clicking "send it again".
 */
export async function confirmVerificationCode(
  shareLink: ShareLinkRow,
  typedCode: string,
): Promise<ConfirmCodeResult> {
  const cleaned = typedCode.replace(/\D/g, "");
  const admin = createAdminClient();

  const { data: rows, error } = await admin
    .from("link_verification_codes")
    .select("*")
    .eq("share_link_id", shareLink.id)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) return { ok: false, reason: "no_code" };

  const row = (rows as LinkVerificationCodeRow[] | null)?.[0];
  if (!row || row.consumed_at) return { ok: false, reason: "no_code" };
  if (new Date(row.expires_at).getTime() <= Date.now()) return { ok: false, reason: "expired" };
  if (row.attempts >= MAX_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };

  // Count the guess BEFORE judging it. If the comparison or a later write
  // throws, the attempt has still been paid for - otherwise a client that
  // aborts mid-request gets unlimited free guesses.
  await admin
    .from("link_verification_codes")
    .update({ attempts: row.attempts + 1 })
    .eq("id", row.id);

  if (cleaned.length !== 6 || !constantTimeEquals(hashCode(shareLink.id, cleaned), row.code_hash)) {
    return { ok: false, reason: "wrong_code" };
  }

  // Consume it in the same write that checks it's unconsumed, so two requests
  // racing with the same code can't both win. The loser is told the code is
  // spent rather than being let in.
  const { data: consumed, error: consumeError } = await admin
    .from("link_verification_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("consumed_at", null)
    .select("id");

  if (consumeError || (consumed?.length ?? 0) === 0) {
    return { ok: false, reason: "no_code" };
  }

  return { ok: true };
}
