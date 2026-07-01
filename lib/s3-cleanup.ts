import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteDocumentObject } from "@/lib/s3";

export async function cleanupIfAllLinksInactive(documentId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: doc } = await admin
    .from("documents")
    .select("id, s3_key, user_id")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc?.s3_key) return;

  const { data: links } = await admin
    .from("share_links")
    .select("id, revoked_at, expires_at, expiry_type, first_viewed_at")
    .eq("document_id", documentId);

  if (!links || links.length === 0) return;

  const now = Date.now();
  const allInactive = links.every((link) => {
    if (link.revoked_at) return true;
    if (link.expires_at && new Date(link.expires_at).getTime() <= now) return true;
    if (link.expiry_type === "first_view" && link.first_viewed_at) return true;
    return false;
  });

  if (!allInactive) return;

  try {
    await deleteDocumentObject(doc.s3_key);
    await admin
      .from("documents")
      .update({ s3_key: null })
      .eq("id", documentId);
    // eslint-disable-next-line no-console
    console.log("S3 cleanup: deleted object for document", documentId);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("S3 cleanup failed for document", documentId, err);
  }
}
