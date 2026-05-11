// Hand-written types for the M1 schema. In M2 we can replace this with
// `supabase gen types typescript` output if we want full coverage.

export type DocumentStatus = "active" | "revoked" | "expired";
export type ExpiryType = "days" | "first_view" | "manual";
export type AccessEventType = "viewed" | "downloaded" | "blocked";

export interface UserRow {
  id: string;
  email: string;
  created_at: string;
}

export interface DocumentRow {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  s3_key: string | null;
  status: DocumentStatus;
  created_at: string;
}

export interface ShareLinkRow {
  id: string;
  document_id: string;
  token: string;
  recipient_email: string;
  expiry_type: ExpiryType | null;
  expiry_days: number | null;
  expires_at: string | null;
  revoked_at: string | null;
  first_viewed_at: string | null;
  created_at: string;
}

export interface AccessEventRow {
  id: string;
  share_link_id: string;
  event_type: AccessEventType;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
