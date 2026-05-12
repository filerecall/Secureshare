import { NextResponse, type NextRequest } from "next/server";
import { logAccessEvent, lookupShareLink } from "@/lib/share-links";
import { presignDocumentDownload } from "@/lib/s3";

// This route MUST run on every request - we revalidate the token, log a
// 'downloaded' event, and mint a fresh short-lived presigned URL each time.
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const lookup = await lookupShareLink(params.token);

  if (!lookup.ok) {
    if (lookup.shareLinkId) {
      await logAccessEvent(lookup.shareLinkId, "blocked");
    }
    // Send the recipient back to the friendly view-page so they see the
    // human explanation, not raw JSON.
    return NextResponse.redirect(new URL(`/d/${params.token}`, _req.url));
  }

  const { shareLink, document } = lookup;

  if (!document.s3_key) {
    // Defensive: the share-link create endpoint blocks this, but a row
    // edited out-of-band could still hit us.
    return NextResponse.json({ error: "Document is not ready" }, { status: 409 });
  }

  await logAccessEvent(shareLink.id, "downloaded");

  const url = await presignDocumentDownload({
    key: document.s3_key,
    downloadFileName: document.file_name,
  });

  // 302 so the browser follows immediately and starts the download with the
  // ResponseContentDisposition we set on the presigned GET.
  return NextResponse.redirect(url, { status: 302 });
}
