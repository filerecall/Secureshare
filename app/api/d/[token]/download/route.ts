import { NextResponse, type NextRequest } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { env } from "@/lib/env";
import { PLANS } from "@/lib/plans";
import { getS3Client, presignDocumentDownload } from "@/lib/s3";
import { getSenderPlan } from "@/lib/sender-plan";
import { logAccessEvent, lookupShareLink } from "@/lib/share-links";
import { watermarkPdf } from "@/lib/watermark";

// AWS SDK + pdf-lib need Node runtime. We also fetch + transform the PDF
// here on Pro+ plans, so don't run on edge.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const lookup = await lookupShareLink(params.token);

  if (!lookup.ok) {
    if ("shareLinkId" in lookup && lookup.shareLinkId) {
      await logAccessEvent(lookup.shareLinkId, "blocked");
    }
    return NextResponse.redirect(new URL(`/d/${params.token}`, req.url));
  }

  const { shareLink, document } = lookup;

  if (!document.s3_key) {
    return NextResponse.json({ error: "Document is not ready" }, { status: 409 });
  }

  await logAccessEvent(shareLink.id, "downloaded");

  // Look up the sender's plan. If they're on a plan that includes
  // watermarking and the file is a PDF, stream a watermarked copy. Otherwise
  // fall through to the original redirect-to-S3 flow which is faster and
  // cheaper.
  const senderPlan = await getSenderPlan(document.user_id);
  const canWatermark = PLANS[senderPlan].limits.watermarking;
  const isPdf = document.mime_type === "application/pdf";

  if (canWatermark && isPdf) {
    return streamWatermarkedPdf({
      s3Key: document.s3_key,
      fileName: document.file_name,
      recipientEmail: shareLink.recipient_email,
    });
  }

  const url = await presignDocumentDownload({
    key: document.s3_key,
    downloadFileName: document.file_name,
  });
  return NextResponse.redirect(url, { status: 302 });
}

async function streamWatermarkedPdf(opts: {
  s3Key: string;
  fileName: string;
  recipientEmail: string;
}): Promise<NextResponse> {
  // Pull the original file from S3 into memory. For very large PDFs we'd
  // want a streaming approach; the M2 size cap is 500 MB and most documents
  // will be a small fraction of that, so a buffer is fine for now.
  const s3Response = await getS3Client().send(
    new GetObjectCommand({ Bucket: env.awsS3Bucket(), Key: opts.s3Key }),
  );

  if (!s3Response.Body) {
    return NextResponse.json({ error: "Empty file" }, { status: 500 });
  }

  const inputBytes = await s3Response.Body.transformToByteArray();

  const watermarked = await watermarkPdf(inputBytes, {
    recipientEmail: opts.recipientEmail,
    accessedAt: new Date().toISOString(),
  });

  const safeFileName = opts.fileName.replace(/"/g, "");

  return new NextResponse(Buffer.from(watermarked), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeFileName}"`,
      "Content-Length": watermarked.byteLength.toString(),
      // No cache; every download must re-stamp with the current recipient
      // and timestamp.
      "Cache-Control": "no-store",
    },
  });
}
