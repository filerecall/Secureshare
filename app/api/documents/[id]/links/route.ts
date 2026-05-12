import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";
import { buildShareUrl, generateShareToken } from "@/lib/share-tokens";
import type { ExpiryType, ShareLinkRow } from "@/types/database";

interface CreateShareLinkBody {
  recipientEmail: string;
  expiryType: ExpiryType;
  expiryDays?: number;
}

const EXPIRY_TYPES: readonly ExpiryType[] = ["days", "first_view", "manual"] as const;
const MIN_EXPIRY_DAYS = 1;
const MAX_EXPIRY_DAYS = 365;
// Bare-bones email check. Real validation happens when we send the M2 email.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type ValidationResult =
  | { ok: true; value: CreateShareLinkBody }
  | { ok: false; error: string };

function validate(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "Invalid request body" };
  }
  const b = raw as Record<string, unknown>;

  if (typeof b.recipientEmail !== "string" || !EMAIL_PATTERN.test(b.recipientEmail.trim())) {
    return { ok: false, error: "Enter a valid recipient email" };
  }
  const recipientEmail = b.recipientEmail.trim().toLowerCase();

  if (typeof b.expiryType !== "string" || !EXPIRY_TYPES.includes(b.expiryType as ExpiryType)) {
    return { ok: false, error: "Choose an expiry option" };
  }
  const expiryType = b.expiryType as ExpiryType;

  let expiryDays: number | undefined;
  if (expiryType === "days") {
    if (typeof b.expiryDays !== "number" || !Number.isInteger(b.expiryDays)) {
      return { ok: false, error: "Number of days is required" };
    }
    if (b.expiryDays < MIN_EXPIRY_DAYS || b.expiryDays > MAX_EXPIRY_DAYS) {
      return { ok: false, error: `Days must be between ${MIN_EXPIRY_DAYS} and ${MAX_EXPIRY_DAYS}` };
    }
    expiryDays = b.expiryDays;
  }

  return { ok: true, value: { recipientEmail, expiryType, expiryDays } };
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = validate(raw);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const { recipientEmail, expiryType, expiryDays } = result.value;

  // Confirm the document exists, belongs to this user, and is still active.
  // RLS will reject the read for documents the user doesn't own, so a null
  // result here is "not yours or not found", which we surface as 404 to avoid
  // confirming the existence of other users' rows.
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("id, status, s3_key")
    .eq("id", params.id)
    .maybeSingle();

  if (docError || !document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }
  if (document.status !== "active") {
    return NextResponse.json({ error: "Document is no longer active" }, { status: 409 });
  }
  if (!document.s3_key) {
    // Document row exists but the upload never completed. Block sharing.
    return NextResponse.json({ error: "Document is still uploading" }, { status: 409 });
  }

  const token = generateShareToken();
  const expiresAt =
    expiryType === "days" && expiryDays
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const { data: shareLink, error: insertError } = await supabase
    .from("share_links")
    .insert({
      document_id: document.id,
      token,
      recipient_email: recipientEmail,
      expiry_type: expiryType,
      expiry_days: expiryDays ?? null,
      expires_at: expiresAt,
    })
    .select()
    .single<ShareLinkRow>();

  if (insertError || !shareLink) {
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }

  return NextResponse.json({
    shareLink,
    url: buildShareUrl(env.siteUrl(), shareLink.token),
  });
}
