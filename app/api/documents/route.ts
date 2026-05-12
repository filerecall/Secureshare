import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildDocumentS3Key, presignDocumentUpload } from "@/lib/s3";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/upload-constraints";
import type { DocumentRow } from "@/types/database";

// The AWS SDK only runs on the Node.js runtime, not edge.
export const runtime = "nodejs";

interface CreateBody {
  fileName: string;
  fileSize: number;
  mimeType: string;
}

type Validated = { ok: true; value: CreateBody } | { ok: false; error: string };

function validateBody(body: unknown): Validated {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.fileName !== "string" || b.fileName.length === 0 || b.fileName.length > 255) {
    return { ok: false, error: "File name is required and must be 255 chars or fewer." };
  }
  if (
    typeof b.fileSize !== "number" ||
    !Number.isFinite(b.fileSize) ||
    b.fileSize <= 0 ||
    b.fileSize > MAX_FILE_SIZE_BYTES
  ) {
    const limitMb = Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024);
    return { ok: false, error: `File size must be between 1 byte and ${limitMb} MB.` };
  }
  if (typeof b.mimeType !== "string" || !ALLOWED_MIME_TYPES.has(b.mimeType)) {
    return { ok: false, error: `File type "${b.mimeType}" is not supported.` };
  }
  return { ok: true, value: { fileName: b.fileName, fileSize: b.fileSize, mimeType: b.mimeType } };
}

/**
 * POST /api/documents
 * Body: { fileName, fileSize, mimeType }
 * Returns: { document, uploadUrl }
 *
 * Inserts a documents row scoped to the authenticated user, then generates
 * a short-lived presigned S3 PUT URL the browser uses to upload the bytes
 * directly. The row exists before the upload starts, so a failed upload
 * leaves an orphan we can clean up via DELETE /api/documents/[id].
 */
export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const result = validateBody(raw);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const { fileName, fileSize, mimeType } = result.value;

  // 1. Create the row first so we have a UUID to build the S3 key from.
  const { data: inserted, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      file_name: fileName,
      file_size: fileSize,
      mime_type: mimeType,
    })
    .select()
    .single<DocumentRow>();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: "Could not create the document record." },
      { status: 500 },
    );
  }

  // 2. Compose the key and write it back to the row.
  const s3Key = buildDocumentS3Key(user.id, inserted.id);
  const { data: updated, error: updateError } = await supabase
    .from("documents")
    .update({ s3_key: s3Key })
    .eq("id", inserted.id)
    .select()
    .single<DocumentRow>();

  if (updateError || !updated) {
    await supabase.from("documents").delete().eq("id", inserted.id);
    return NextResponse.json({ error: "Could not record the S3 key." }, { status: 500 });
  }

  // 3. Generate the presigned PUT URL.
  let uploadUrl: string;
  try {
    uploadUrl = await presignDocumentUpload({ key: s3Key, contentType: mimeType });
  } catch (err) {
    console.error("Presign failed", err);
    await supabase.from("documents").delete().eq("id", inserted.id);
    return NextResponse.json(
      { error: "Could not prepare the upload URL." },
      { status: 500 },
    );
  }

  return NextResponse.json({ document: updated, uploadUrl });
}

/**
 * GET /api/documents
 * Returns the authenticated user's documents, newest first.
 * RLS scopes this automatically, but we add an explicit filter as a belt.
 */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Could not load documents." }, { status: 500 });
  }
  return NextResponse.json({ documents: data ?? [] });
}
