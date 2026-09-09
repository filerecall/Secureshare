import { NextResponse, type NextRequest } from "next/server";
import { sendVerificationCodeEmail } from "@/lib/email/verification-code-email";
import {
  CODE_TTL_MS,
  requestVerificationCode,
  requiresVerification,
} from "@/lib/recipient-verification";
import { logAccessEvent, lookupShareLink } from "@/lib/share-links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 1 of recipient verification: the opener types an email address and we
 * post a code to the address the link was issued to.
 *
 * The response is deliberately identical whether or not the typed address was
 * the right one. Telling a stranger "that's not the recipient" hands them a
 * free oracle for guessing who the document was sent to.
 */
export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const lookup = await lookupShareLink(params.token);

  if (!lookup.ok) {
    if ("shareLinkId" in lookup && lookup.shareLinkId) {
      await logAccessEvent(lookup.shareLinkId, "blocked");
    }
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { shareLink, document } = lookup;

  if (!requiresVerification(shareLink)) {
    return NextResponse.json({ error: "This link doesn't need a code" }, { status: 400 });
  }

  let body: { email?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (typeof body.email !== "string" || body.email.length > 320) {
    return NextResponse.json({ error: "Enter your email address" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const result = await requestVerificationCode(shareLink, body.email, ip);

  if (!result.ok) {
    // `in` rather than plain narrowing: this project compiles with
    // strict:false, so TypeScript won't discriminate on `ok` alone.
    const reason = "reason" in result ? result.reason : "storage_failed";

    if (reason === "rate_limited") {
      return NextResponse.json(
        { error: "Too many codes requested. Try again in an hour." },
        { status: 429 },
      );
    }
    if (reason === "email_mismatch") {
      // Someone who isn't the recipient - very often a forwarded link. Worth
      // recording: the sender's audit log is how they catch forwarding.
      await logAccessEvent(shareLink.id, "blocked");
      // Same shape and status as success. No oracle.
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Could not send a code. Try again." }, { status: 500 });
  }

  const emailResult = await sendVerificationCodeEmail({
    recipientEmail: shareLink.recipient_email,
    documentName: document.file_name,
    code: result.code,
    expiresInMinutes: Math.round(CODE_TTL_MS / 60000),
  });

  if (!emailResult.sent) {
    return NextResponse.json(
      { error: "We couldn't send the code. Please try again shortly." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
