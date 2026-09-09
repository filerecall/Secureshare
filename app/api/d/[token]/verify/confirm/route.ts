import { NextResponse, type NextRequest } from "next/server";
import type { ConfirmCodeResult } from "@/lib/recipient-verification";
import {
  confirmVerificationCode,
  issueVerificationSession,
  requiresVerification,
  verificationCookieName,
} from "@/lib/recipient-verification";
import { logAccessEvent, lookupShareLink } from "@/lib/share-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 2 of recipient verification: check the typed code and, if it's right,
 * set the HttpOnly session cookie that unlocks the viewer.
 *
 * The cookie is set here rather than on the page because a Next.js server
 * component can't write cookies - only route handlers and server actions can.
 */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const lookup = await lookupShareLink(params.token);

  if (!lookup.ok) {
    if ("shareLinkId" in lookup && lookup.shareLinkId) {
      await logAccessEvent(lookup.shareLinkId, "blocked");
    }
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { shareLink } = lookup;

  if (!requiresVerification(shareLink)) {
    return NextResponse.json({ error: "This link doesn't need a code" }, { status: 400 });
  }

  let body: { code?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (typeof body.code !== "string" || body.code.length > 12) {
    return NextResponse.json({ error: "Enter the 6-digit code" }, { status: 400 });
  }

  const result = await confirmVerificationCode(shareLink, body.code);

  if (!result.ok) {
    await logAccessEvent(shareLink.id, "blocked");
    const messages: Record<Exclude<ConfirmCodeResult, { ok: true }>["reason"], string> = {
      no_code: "Request a code first.",
      expired: "That code has expired. Request a new one.",
      too_many_attempts: "Too many incorrect attempts. Request a new code.",
      wrong_code: "That code isn't right.",
    };
    const reason = "reason" in result ? result.reason : "wrong_code";
    return NextResponse.json({ error: messages[reason] }, { status: 401 });
  }

  const session = issueVerificationSession(shareLink.id);
  const response = NextResponse.json({ ok: true });

  response.cookies.set({
    name: verificationCookieName(shareLink.id),
    value: session.value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.maxAgeSeconds,
  });

  return response;
}
