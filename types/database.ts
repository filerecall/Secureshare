// Hand-written types for the M1 schema. In M2 we can replace this with
// `supabase gen types typescript` output if we want full coverage.

export type DocumentStatus = "active" | "revoked" | "expired";
export type ExpiryType = "days" | "first_view" | "manual";
export type AccessEventType = "viewed" | "downloaded" | "blocked";
export type SubscriptionPlan = "free" | "pro" | "business";
export type SubscriptionStatus = "free" | "active" | "past_due" | "cancelled";
export type SubscriptionInterval = "monthly" | "annual";

/** Object types (not interfaces) so Rows satisfy Supabase GenericTable Row = Record<string, unknown>. */
export type UserRow = {
  id: string;
  email: string;
  created_at: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_plan: SubscriptionPlan;
  subscription_status: SubscriptionStatus;
  subscription_interval: SubscriptionInterval | null;
  subscription_current_period_end: string | null;
};

export type DocumentRow = {
  id: string;
  user_id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  s3_key: string | null;
  status: DocumentStatus;
  created_at: string;
};

export type ShareLinkRow = {
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
};

export type AccessEventRow = {
  id: string;
  share_link_id: string;
  event_type: AccessEventType;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

/**
 * Supabase Database type. Shape matches what `supabase gen types typescript`
 * would output, so we can swap this for a generated file later without
 * touching call sites.
 *
 * The `Insert` types mark columns with DB defaults (id, created_at, status,
 * nullable fields) as optional. The `Update` types make everything optional
 * because partial updates are the norm.
 */
type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Optional<
          UserRow,
          | "created_at"
          | "stripe_customer_id"
          | "stripe_subscription_id"
          | "subscription_plan"
          | "subscription_status"
          | "subscription_interval"
          | "subscription_current_period_end"
        >;
        Update: Partial<UserRow>;
        Relationships: [];
      };
      documents: {
        Row: DocumentRow;
        Insert: Optional<DocumentRow, "id" | "created_at" | "status" | "s3_key">;
        Update: Partial<DocumentRow>;
        Relationships: [];
      };
      share_links: {
        Row: ShareLinkRow;
        Insert: Optional<
          ShareLinkRow,
          | "id"
          | "created_at"
          | "expiry_type"
          | "expiry_days"
          | "expires_at"
          | "revoked_at"
          | "first_viewed_at"
        >;
        Update: Partial<ShareLinkRow>;
        Relationships: [];
      };
      access_events: {
        Row: AccessEventRow;
        Insert: Optional<
          AccessEventRow,
          "id" | "created_at" | "ip_address" | "user_agent"
        >;
        Update: Partial<AccessEventRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
