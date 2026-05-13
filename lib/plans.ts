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

export interface PlanDefinition {
  id: SubscriptionPlan;
  name: string;
  tagline: string;
  /** Whether the user can subscribe via Checkout. Free = no Stripe involved. */
  payable: boolean;
  prices: {
    monthly: { amount: number; currency: "AUD" };
    annual: { amount: number; currency: "AUD" };
  };
  features: string[];
  limits: PlanLimits;
}

export const PLANS: Record<SubscriptionPlan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Try the product. Push to paid when limits bite.",
    payable: false,
    prices: {
      monthly: { amount: 0, currency: "AUD" },
      annual: { amount: 0, currency: "AUD" },
    },
    features: [
      "1 file at a time",
      "Max file size: 25 MB",
      "Basic analytics (views only)",
      "Expiry controls",
      "No watermarking",
      "No download control",
      "No custom branding",
    ],
    limits: {
      maxDocuments: 1,
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
    tagline: "For freelancers, lawyers, accountants, consultants, and creators.",
    payable: true,
    prices: {
      monthly: { amount: 9_00, currency: "AUD" },
      annual: { amount: 90_00, currency: "AUD" },
    },
    features: [
      "Unlimited files",
      "Max file size: 250 MB",
      "Watermarking (PDF)",
      "Download control",
      "Revoke anytime",
      "Full analytics (views, timestamps, IP region)",
      "Priority email support",
      "Faster link generation",
    ],
    limits: {
      maxDocuments: null,
      maxFileSizeBytes: 250 * MB,
      watermarking: true,
      downloadControl: true,
      customBranding: false,
      teamAccounts: false,
      apiAccess: false,
    },
  },
  business: {
    id: "business",
    name: "Business",
    tagline: "Everything in Pro, plus team and audit features.",
    payable: true,
    prices: {
      monthly: { amount: 29_00, currency: "AUD" },
      annual: { amount: 290_00, currency: "AUD" },
    },
    features: [
      "Everything in Pro",
      "Team accounts (2-5 users)",
      "Shared dashboard",
      "Audit logs",
      "Custom branding",
      "Higher file size (500 MB)",
      "API access (future)",
    ],
    limits: {
      maxDocuments: null,
      maxFileSizeBytes: 500 * MB,
      watermarking: true,
      downloadControl: true,
      customBranding: true,
      teamAccounts: true,
      apiAccess: false, // marked "future" by client; flip to true in M3
    },
  },
};

export const PLAN_ORDER: SubscriptionPlan[] = ["free", "pro", "business"];
export const INTERVAL_ORDER: SubscriptionInterval[] = ["monthly", "annual"];

export function formatPrice(amountCents: number, currency: "AUD"): string {
  if (amountCents === 0) return "Free";
  const amount = amountCents / 100;
  return `${currency} $${amount.toFixed(amount % 1 === 0 ? 0 : 2)}`;
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
