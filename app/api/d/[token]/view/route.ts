import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import mammoth from "mammoth";
import { env } from "@/lib/env";
import { sendViewNotificationEmail } from "@/lib/email/view-notification-email";
import { parsePptx } from "@/lib/pptx-parser";
import {
  issueVerificationSession,
  requiresVerification,
  verificationCookieName,
  verifySession,
} from "@/lib/recipient-verification";
import type { ShareLinkRow } from "@/types/database";
import { getS3Client } from "@/lib/s3";
import { logAccessEvent, lookupShareLink } from "@/lib/share-links";
import { createAdminClient } from "@/lib/supabase/admin";
import { VIEW_GRANT_PARAM } from "@/lib/view-grant";
import { watermarkPdf } from "@/lib/watermark";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Push the verification window forward on every document actually served.
 *
 * Makes the window measure INACTIVITY rather than total time: someone reading
 * a long contract is never interrupted, but a browser that stops asking for
 * the document goes cold in SESSION_TTL_MS.
 */
function refreshVerification<T extends NextResponse>(res: T, shareLink: ShareLinkRow): T {
  if (!requiresVerification(shareLink)) return res;

  const session = issueVerificationSession(shareLink.id);
  res.cookies.set({
    name: verificationCookieName(shareLink.id),
    value: session.value,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: session.maxAgeSeconds,
  });
  return res;
}

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const lookup = await lookupShareLink(params.token, {
    viewGrant: req.nextUrl.searchParams.get(VIEW_GRANT_PARAM),
  });

  if (!lookup.ok) {
    if ("shareLinkId" in lookup && lookup.shareLinkId) {
      await logAccessEvent(lookup.shareLinkId, "blocked");
    }
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { shareLink, document } = lookup;

  // The page-level gate is a UI affordance; this is the security boundary.
  // Someone who skips the page and calls this endpoint directly gets nothing
  // without the verification cookie.
  if (requiresVerification(shareLink)) {
    const cookie = req.cookies.get(verificationCookieName(shareLink.id))?.value;
    if (!verifySession(cookie, shareLink.id)) {
      await logAccessEvent(shareLink.id, "blocked");
      return NextResponse.json({ error: "Verification required" }, { status: 403 });
    }
  }

  if (!document.s3_key) {
    return NextResponse.json({ error: "Document is not ready" }, { status: 409 });
  }

  await logAccessEvent(shareLink.id, "viewed");

  void (async () => {
    try {
      const admin = createAdminClient();
      const { data: sender } = await admin
        .from("users")
        .select("email")
        .eq("id", document.user_id)
        .maybeSingle<{ email: string }>();

      if (sender?.email) {
        await sendViewNotificationEmail({
          senderEmail: sender.email,
          recipientEmail: shareLink.recipient_email,
          documentName: document.file_name,
          viewedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("View notification email failed", err);
    }
  })();

  const s3Response = await getS3Client().send(
    new GetObjectCommand({ Bucket: env.awsS3Bucket(), Key: document.s3_key }),
  );

  if (!s3Response.Body) {
    return NextResponse.json({ error: "Empty file" }, { status: 500 });
  }

  const inputBytes = await s3Response.Body.transformToByteArray();
  const mimeType = document.mime_type;

  if (mimeType === "application/pdf") {
    const watermarked = await watermarkPdf(inputBytes, {
      recipientEmail: shareLink.recipient_email,
      accessedAt: new Date().toISOString(),
    });

    return refreshVerification(
      new NextResponse(Buffer.from(watermarked), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": "inline",
          "Content-Length": watermarked.byteLength.toString(),
          "Cache-Control": "no-store, no-cache, must-revalidate",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'",
        },
      }),
      shareLink,
    );
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const result = await mammoth.convertToHtml(
      { buffer: Buffer.from(inputBytes) },
      {
        styleMap: [
          "p[style-name='Heading 1'] => h1:fresh",
          "p[style-name='Heading 2'] => h2:fresh",
          "p[style-name='Heading 3'] => h3:fresh",
        ],
      },
    );

    return refreshVerification(
      NextResponse.json(
        {
          type: "docx",
          html: result.value,
          watermark: {
            recipientEmail: shareLink.recipient_email,
            accessedAt: new Date().toISOString(),
          },
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Content-Type-Options": "nosniff",
          },
        },
      ),
      shareLink,
    );
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mimeType === "application/vnd.ms-powerpoint"
  ) {
    const slides = await parsePptx(Buffer.from(inputBytes));

    return refreshVerification(
      NextResponse.json(
        {
          type: "pptx",
          slides,
          watermark: {
            recipientEmail: shareLink.recipient_email,
            accessedAt: new Date().toISOString(),
          },
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Content-Type-Options": "nosniff",
          },
        },
      ),
      shareLink,
    );
  }

  if (mimeType === "text/plain" || mimeType === "text/csv") {
    const text = new TextDecoder().decode(inputBytes);

    return refreshVerification(
      NextResponse.json(
        {
          type: "text",
          content: text,
          watermark: {
            recipientEmail: shareLink.recipient_email,
            accessedAt: new Date().toISOString(),
          },
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
            "X-Content-Type-Options": "nosniff",
          },
        },
      ),
      shareLink,
    );
  }

  return NextResponse.json({ error: "Unsupported file type for viewing" }, { status: 415 });
}
