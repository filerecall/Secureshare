import "server-only";
import { randomBytes } from "node:crypto";

/**
 * Generate a URL-safe share-link token. 32 random bytes encoded as base64url
 * yields ~43 characters and ~256 bits of entropy, which is what the M1 spec
 * calls for ("cryptographically random, 32+ bytes"). 1 in 2^256 collision
 * chance is well below anything practically relevant.
 */
export function generateShareToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Compute the absolute recipient URL for a token. Used both to return the
 * URL on share-link creation and to copy into emails later in M2.
 */
export function buildShareUrl(siteUrl: string, token: string): string {
  return `${siteUrl.replace(/\/$/, "")}/d/${token}`;
}
