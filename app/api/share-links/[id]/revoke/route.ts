import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cleanupIfAllLinksInactive } from "@/lib/s3-cleanup";
import type { ShareLinkRow } from "@/types/database";

/**
 * Revoke a share link. Idempotent: revoking an already-revoked link
 * succeeds without re-stamping revoked_at, so the original revocation
 * time stays accurate in the audit trail.
 *
 * Authorisation is handled by RLS on share_links - the policy allows
 * updates only when the linked document is owned by auth.uid(). A user
 * trying to revoke someone else's link sees a 404 rather than 403, which
 * also avoids leaking whether a given id exists.
 */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: existing, error: fetchError } = await supabase
    .from("share_links")
    .select("id, revoked_at")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }

  if (existing.revoked_at) {
    return NextResponse.json({ shareLink: existing satisfies Partial<ShareLinkRow> });
  }

  const { data: updated, error: updateError } = await supabase
    .from("share_links")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single<ShareLinkRow>();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Failed to revoke link" }, { status: 500 });
  }

  void cleanupIfAllLinksInactive(updated.document_id);

  return NextResponse.json({ shareLink: updated });
}
