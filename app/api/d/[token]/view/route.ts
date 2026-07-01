import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import mammoth from "mammoth";
import { env } from "@/lib/env";
import { sendViewNotificationEmail } from "@/lib/email/view-notification-email";
import { parsePptx } from "@/lib/pptx-parser";
import { getS3Client } from "@/lib/s3";
import { logAccessEvent, lookupShareLink } from "@/lib/share-links";
import { createAdminClient } from "@/lib/supabase/admin";
import { watermarkPdf } from "@/lib/watermark";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const lookup = await lookupShareLink(params.token);

  if (!lookup.ok) {
    if ("shareLinkId" in lookup && lookup.shareLinkId) {
      await logAccessEvent(lookup.shareLinkId, "blocked");
    }
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const { shareLink, document } = lookup;

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

    return new NextResponse(Buffer.from(watermarked), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Content-Length": watermarked.byteLength.toString(),
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
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

    return NextResponse.json(
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
    );
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mimeType === "application/vnd.ms-powerpoint"
  ) {
    const slides = await parsePptx(Buffer.from(inputBytes));

    return NextResponse.json(
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
    );
  }

  if (mimeType === "text/plain" || mimeType === "text/csv") {
    const text = new TextDecoder().decode(inputBytes);

    return NextResponse.json(
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
    );
  }

  return NextResponse.json({ error: "Unsupported file type for viewing" }, { status: 415 });
}
