import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SubscriptionPlan, SubscriptionStatus } from "@/types/database";

/**
 * Resolve the "active" plan for a user id. Used by recipient-facing flows
 * (which can't authenticate the sender via cookies) to decide whether to
 * apply paid-only behaviour like watermarking or hiding free-tier branding.
 *
 * 'past_due' counts as still on the plan so a billing hiccup doesn't
 * instantly silently downgrade their recipient experience.
 */
export async function getSenderPlan(userId: string): Promise<SubscriptionPlan> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("subscription_plan, subscription_status")
    .eq("id", userId)
    .maybeSingle<{
      subscription_plan: SubscriptionPlan;
      subscription_status: SubscriptionStatus;
    }>();

  if (!data) return "free";
  if (data.subscription_status === "active" || data.subscription_status === "past_due") {
    return data.subscription_plan;
  }
  return "free";
}

/**
 * Senders on free / no subscription get a "Sent via FileRecall" footer
 * shown to their recipients. Paid tiers don't (covered by their plan).
 */
export function shouldShowFreeBranding(plan: SubscriptionPlan): boolean {
  return plan === "free";
}
