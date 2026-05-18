import type { SubscriptionPlan } from "@/types/database";

/**
 * Plan identifiers that may appear in a `?plan=` URL parameter from the
 * marketing site. The marketing site uses `enterprise` to talk about the
 * top tier, which maps to our internal `business` plan. This indirection
 * keeps marketing and app vocabularies independent: marketing can rename
 * tiers without us having to migrate database values.
 */
export type PlanParam = "free" | "pro" | "enterprise" | "business";

const ALLOWED: readonly PlanParam[] = ["free", "pro", "enterprise", "business"] as const;

export interface NormalisedPlan {
  /** The PlanParam value as it appeared in the URL. */
  param: PlanParam;
  /** Our internal SubscriptionPlan value (enterprise collapses to business). */
  internal: SubscriptionPlan;
  /** Display label, e.g. "Pro" or "Enterprise". */
  label: string;
}

/**
 * Parse a raw `?plan=` URL value into a known plan, or null if the value
 * is missing / not recognised.
 */
export function parsePlanParam(raw: string | string[] | null | undefined): PlanParam | null {
  if (!raw) return null;
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return null;
  const lowered = value.toLowerCase();
  return (ALLOWED as readonly string[]).includes(lowered) ? (lowered as PlanParam) : null;
}

/** Resolve a PlanParam to our internal plan + display label. */
export function normalisePlanParam(param: PlanParam): NormalisedPlan {
  switch (param) {
    case "free":
      return { param, internal: "free", label: "Free" };
    case "pro":
      return { param, internal: "pro", label: "Pro" };
    case "enterprise":
      return { param, internal: "business", label: "Enterprise" };
    case "business":
      return { param, internal: "business", label: "Business" };
  }
}
