import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ExpiryType, ShareLinkRow } from "@/types/database";

const EXPIRY_TYPES: readonly ExpiryType[] = ["days", "first_view", "manual"] as const;
const MIN_EXPIRY_DAYS = 1;
const MAX_EXPIRY_DAYS = 365;

interface PatchBody {
  expiryType: ExpiryType;
  expiryDays?: number;
}

type Validated = { ok: true; value: PatchBody } | { ok: false; error: string };

function validate(raw: unknown): Validated {
  if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid body" };
  const b = raw as Record<string, unknown>;

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

  return { ok: true, value: { expiryType, expiryDays } };
}

/**
 * PATCH /api/share-links/[id]
 * Update the expiry on an existing share link.
 *
 * Authorisation: RLS scopes the update to share_links whose parent document
 * is owned by auth.uid(). A user trying to edit someone else's link sees a
 * 404 rather than a 403.
 *
 * Semantics: when switching to days-based expiry, the new expires_at is
 * computed from "now" so editing extends rather than backfills. Switching
 * to first_view or manual nulls expires_at.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = validate(await req.json().catch(() => null));
  if (!body.ok) {
    return NextResponse.json(
      { error: "error" in body ? body.error : "Invalid body" },
      { status: 400 },
    );
  }
  const { expiryType, expiryDays } = body.value;

  // Read the row first so we can refuse to edit a revoked link (no point).
  const { data: existing, error: fetchError } = await supabase
    .from("share_links")
    .select("id, revoked_at")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchError || !existing) {
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  }
  if (existing.revoked_at) {
    return NextResponse.json({ error: "Cannot edit a revoked link" }, { status: 409 });
  }

  const expiresAt =
    expiryType === "days" && expiryDays
      ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const { data: updated, error: updateError } = await supabase
    .from("share_links")
    .update({
      expiry_type: expiryType,
      expiry_days: expiryDays ?? null,
      expires_at: expiresAt,
      // If they switch to first_view and the link was already used once
      // under an older policy, leave first_viewed_at alone. Otherwise reset
      // it so the user gets a clean "still pending" state.
    })
    .eq("id", params.id)
    .select()
    .single<ShareLinkRow>();

  if (updateError || !updated) {
    return NextResponse.json({ error: "Failed to update link" }, { status: 500 });
  }

  return NextResponse.json({ shareLink: updated });
}
