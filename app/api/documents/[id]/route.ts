import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deleteDocumentObject } from "@/lib/s3";
import type { DocumentRow } from "@/types/database";

export const runtime = "nodejs";

/**
 * DELETE /api/documents/[id]
 * Removes a document the caller owns. Deletes the S3 object first (best
 * effort) and then the database row. RLS guarantees the caller can only
 * touch their own rows, so we don't need to check ownership ourselves -
 * a non-owner gets a 404 because the select returns nothing.
 */
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: doc, error: fetchError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", params.id)
    .maybeSingle<DocumentRow>();

  if (fetchError) {
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
  if (!doc) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (doc.s3_key) {
    try {
      await deleteDocumentObject(doc.s3_key);
    } catch (err) {
      // S3 cleanup is best-effort: removing the DB row is the user-visible
      // action. Orphan objects can be reaped by a lifecycle policy later.
      console.error("S3 object delete failed", { key: doc.s3_key, err });
    }
  }

  const { error: deleteError } = await supabase.from("documents").delete().eq("id", doc.id);
  if (deleteError) {
    return NextResponse.json({ error: "Could not delete document." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
