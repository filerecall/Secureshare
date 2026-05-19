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
    monthly: { amount: number; currency: "USD" };
    annual: { amount: number; currency: "USD" };
  };
  features: string[];
  limits: PlanLimits;
}

// Pricing per client spec (Johnnie.docx):
//   Free / Lead Generator: $0
//   Professional:          $15/mo, $144/yr (20% off vs 12x monthly)
//   Team:                  $59/mo, $566/yr (20% off vs 12x monthly, rounded)
//
// Feature lists only include things that are actually enforced in code.
// Spec items not yet built (password protection, branded download pages,
// storage quotas, team accounts, admin controls, custom branding, etc.)
// are M3 work and intentionally omitted to keep the page honest.
export const PLANS: Record<SubscriptionPlan, PlanDefinition> = {
  free: {
    id: "free",
    name: "Free",
    tagline: "Try FileRecall. Upgrade when the limits bite.",
    payable: false,
    prices: {
      monthly: { amount: 0, currency: "USD" },
      annual: { amount: 0, currency: "USD" },
    },
    features: [
      "Up to 5 active files",
      "Max file size: 25 MB",
      "Tokenised secure links",
      "Expiry controls (date or first-view)",
      "Instant revoke",
      "PDF watermarking",
      "Basic analytics (views + downloads)",
      "FileRecall branding on recipient pages",
    ],
    limits: {
      // Spec: "3-5 recalled files per month". Enforced as total active
      // documents (5 cap). Monthly rolling-window enforcement is M3.
      maxDocuments: 5,
      maxFileSizeBytes: 25 * MB,
      // Spec includes watermarking on free tier, so it's enabled here too.
      watermarking: true,
      downloadControl: false,
      customBranding: false,
      teamAccounts: false,
      apiAccess: false,
    },
  },
  pro: {
    id: "pro",
    name: "Professional",
    tagline: "For freelancers, lawyers, accountants, consultants, and creators.",
    payable: true,
    prices: {
      // $15 monthly, $144 annually (20% off vs 12 x $15 = $180).
      monthly: { amount: 15_00, currency: "USD" },
      annual: { amount: 144_00, currency: "USD" },
    },
    features: [
      "Everything in Free, plus:",
      "Up to 100 active files",
      "Max file size: 250 MB",
      "Email notifications to recipients",
      "Priority email support",
    ],
    limits: {
      // Spec: "100 recalled files/month". Enforced as 100-file active cap.
      maxDocuments: 100,
      maxFileSizeBytes: 250 * MB,
      watermarking: true,
      downloadControl: false,
      customBranding: false,
      teamAccounts: false,
      apiAccess: false,
    },
  },
  business: {
    id: "business",
    name: "Team",
    tagline: "For teams that need shared dashboards and audit logs.",
    payable: true,
    prices: {
      // $59 monthly, $566 annually (20% off vs 12 x $59 = $708, rounded
      // from $566.40 for a cleaner display).
      monthly: { amount: 59_00, currency: "USD" },
      annual: { amount: 566_00, currency: "USD" },
    },
    features: [
      "Everything in Professional, plus:",
      "Unlimited files",
      "Max file size: 500 MB",
      "Priority response time",
    ],
    limits: {
      maxDocuments: null,
      maxFileSizeBytes: 500 * MB,
      watermarking: true,
      downloadControl: false,
      customBranding: false,
      teamAccounts: false,
      apiAccess: false,
    },
  },
};

export const PLAN_ORDER: SubscriptionPlan[] = ["free", "pro", "business"];
export const INTERVAL_ORDER: SubscriptionInterval[] = ["monthly", "annual"];

export function formatPrice(amountCents: number, currency: "USD"): string {
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
