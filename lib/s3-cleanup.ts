import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { deleteDocumentObject, isExpectedDocumentS3Key } from "@/lib/s3";
import { VIEW_GRANT_TTL_MS } from "@/lib/view-grant";

export async function cleanupIfAllLinksInactive(documentId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: doc } = await admin
    .from("documents")
    .select("id, s3_key, user_id")
    .eq("id", documentId)
    .maybeSingle();

  if (!doc?.s3_key) return;

  // Never delete a key this document isn't entitled to. Without this, a user
  // who repointed their own row at someone else's object could have us delete
  // that object for them just by letting their link expire.
  if (!isExpectedDocumentS3Key(doc.s3_key, doc.user_id, doc.id)) {
    // eslint-disable-next-line no-console
    console.error("Refusing to delete an unexpected s3_key", { documentId });
    return;
  }

  const { data: links } = await admin
    .from("share_links")
    .select("id, revoked_at, expires_at, expiry_type, first_viewed_at")
    .eq("document_id", documentId);

  if (!links || links.length === 0) return;

  const now = Date.now();
  const allInactive = links.every((link) => {
    if (link.revoked_at) return true;
    if (link.expires_at && new Date(link.expires_at).getTime() <= now) return true;
    if (link.expiry_type === "first_view" && link.first_viewed_at) {
      // A just-consumed single-view link is still being read: the recipient's
      // viewer fetches the bytes a moment after the page renders. Deleting the
      // object now would break the one view they are entitled to, so treat it
      // as active until the view grant window has closed.
      const viewedAt = new Date(link.first_viewed_at).getTime();
      if (Number.isFinite(viewedAt) && now - viewedAt < VIEW_GRANT_TTL_MS) return false;
      return true;
    }
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
