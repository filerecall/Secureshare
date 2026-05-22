import type { SubscriptionInterval, SubscriptionPlan } from "@/types/database";

const MB = 1024 * 1024;

export interface PlanLimits {
  /** Max number of documents a user can have at once. null = unlimited. */
  maxDocuments: number | null;
  /** Max file size in bytes for a single upload. */
  maxFileSizeBytes: number;
  /** PDF watermarking enabled for downloads. */
  watermarking: boolean;
  /** Recipient-side download control (block download, view-only). M3. */
  downloadControl: boolean;
  /** Per-document custom branding on the recipient page. M3. */
  customBranding: boolean;
  /** Multi-user team accounts. M3. */
  teamAccounts: boolean;
  /** Programmatic API access. M3. */
  apiAccess: boolean;
}

/** A single bullet on a pricing card. included=false renders as a muted "X". */
export interface PlanFeature {
  label: string;
  included: boolean;
}

export interface PlanDefinition {
  id: SubscriptionPlan;
  name: string;
  tagline: string;
  /** Whether the user can subscribe via Checkout. Free = no Stripe involved. */
  payable: boolean;
  prices: {
    monthly: { amount: number; currency: "USD" };
    annual: { amount: number; currency: "USD" };
  };
  features: PlanFeature[];
  limits: PlanLimits;
}

// Pricing per client spec: Free $0 / Pro $9 / Business $29 (monthly).
// Annual = 20% off 12x monthly.
//
// IMPORTANT: the limits block (maxDocuments, maxFileSizeBytes, watermarking)
// is what's actually ENFORCED in code. Several feature bullets below
// (password protection, download blocking, custom access message, team
// seats, shared dashboard, audit log UI, IP allow/deny, custom branding)
// are marketing copy from the client's pricing design and are NOT yet
// enforced - they're M3 work. Listed here because the client asked for the
// pricing page to match their screenshot exactly.
export const PLANS: Record<SubscriptionPlan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Perfect for trying secure file sharing and basic document tracking.",
    payable: false,
    prices: {
      monthly: { amount: 0, currency: "USD" },
      annual: { amount: 0, currency: "USD" },
    },
    features: [
      { label: "5 files per month", included: true },
      { label: "Basic tracking", included: true },
      { label: "7 day link expiry", included: true },
      { label: "No watermarking", included: false },
      { label: "No password protection", included: false },
      { label: "No recall after 24 hours", included: false },
      { label: "No custom branding", included: false },
    ],
    limits: {
      maxDocuments: 5,
      maxFileSizeBytes: 25 * MB,
      watermarking: false,
      downloadControl: false,
      customBranding: false,
      teamAccounts: false,
      apiAccess: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Advanced protection and tracking for professionals and growing businesses.",
    payable: true,
    prices: {
      // $9/mo, $86.40/yr (20% off 12 x $9).
      monthly: { amount: 9_00, currency: "USD" },
      annual: { amount: 86_40, currency: "USD" },
    },
    features: [
      { label: "50 files per month", included: true },
      { label: "Full tracking", included: true },
      { label: "Expiry controls", included: true },
      { label: "Dynamic watermarking", included: true },
      { label: "Password protection", included: true },
      { label: "Unlimited recall", included: true },
      { label: "Download blocking", included: true },
      { label: "Custom access page message", included: true },
    ],
    limits: {
      maxDocuments: 50,
      maxFileSizeBytes: 250 * MB,
      watermarking: true,
      downloadControl: false, // marketing-listed; M3
      customBranding: false,
      teamAccounts: false,
      apiAccess: false,
    },
  },
  business: {
    id: "business",
    name: "Business",
    tagline: "Built for teams sharing sensitive files across organizations.",
    payable: true,
    prices: {
      // $29/mo, $278.40/yr (20% off 12 x $29).
      monthly: { amount: 29_00, currency: "USD" },
      annual: { amount: 278_40, currency: "USD" },
    },
    features: [
      { label: "300 files per month", included: true },
      { label: "3 team seats", included: true },
      { label: "Shared dashboard", included: true },
      { label: "Audit logs", included: true },
      { label: "IP allow/deny lists", included: true },
      { label: "Priority support", included: true },
      { label: "Custom branding", included: true },
    ],
    limits: {
      maxDocuments: 300,
      maxFileSizeBytes: 500 * MB,
      watermarking: true,
      downloadControl: false, // marketing-listed; M3
      customBranding: false, // marketing-listed; M3
      teamAccounts: false, // marketing-listed; M3
      apiAccess: false,
    },
  },
};

export const PLAN_ORDER: SubscriptionPlan[] = ["free", "pro", "business"];
export const INTERVAL_ORDER: SubscriptionInterval[] = ["monthly", "annual"];

export function formatPrice(amountCents: number): string {
  if (amountCents === 0) return "$0";
  const amount = amountCents / 100;
  return `$${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
}

/**
 * Look up a plan's Stripe price id for a given interval. Resolved at call
 * time so missing env values only fail when the price is actually needed.
 */
export function resolveStripePriceId(
  plan: SubscriptionPlan,
  interval: SubscriptionInterval,
  envFns: {
    stripePriceProMonthly: () => string;
    stripePriceProAnnual: () => string;
    stripePriceBusinessMonthly: () => string;
    stripePriceBusinessAnnual: () => string;
  },
): string {
  if (plan === "free") {
    throw new Error("Free plan does not have a Stripe price");
  }
  if (plan === "pro" && interval === "monthly") return envFns.stripePriceProMonthly();
  if (plan === "pro" && interval === "annual") return envFns.stripePriceProAnnual();
  if (plan === "business" && interval === "monthly") return envFns.stripePriceBusinessMonthly();
  if (plan === "business" && interval === "annual") return envFns.stripePriceBusinessAnnual();
  throw new Error(`Unknown plan/interval combo: ${plan}/${interval}`);
}
