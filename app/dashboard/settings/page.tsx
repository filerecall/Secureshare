import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountSettingsForm } from "@/components/AccountSettingsForm";
import { Card } from "@/components/ui/Card";
import { BillingPortalButton } from "@/components/BillingPortalButton";
import { Button } from "@/components/ui/Button";
import { PLANS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings - FileRecall" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("users")
    .select(
      "subscription_plan, subscription_status, subscription_interval, subscription_current_period_end, stripe_customer_id",
    )
    .eq("id", user.id)
    .maybeSingle();

  const status = row?.subscription_status ?? "free";
  // The EFFECTIVE plan: only active / past_due grant the paid plan. A failed
  // first payment (status incomplete -> mapped to cancelled) must show Free,
  // not the plan the user attempted to buy.
  const isPaidNow = status === "active" || status === "past_due";
  const planId = isPaidNow ? (row?.subscription_plan ?? "free") : "free";
  const plan = PLANS[planId];
  const periodEnd = row?.subscription_current_period_end
    ? new Date(row.subscription_current_period_end)
    : null;
  const hasCustomerRecord = !!row?.stripe_customer_id;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-600">{user.email}</p>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Subscription</p>
            <p className="mt-0.5 text-xs text-slate-500">Your plan and billing details.</p>
          </div>
          <StatusPill status={status} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <p className="text-base font-semibold text-slate-900">{plan.name}</p>
            {row?.subscription_interval ? (
              <p className="text-xs text-slate-500">
                Billed {row.subscription_interval === "annual" ? "annually" : "monthly"}
              </p>
            ) : null}
          </div>
          {periodEnd && status === "active" ? (
            <p className="mt-1 text-xs text-slate-600">
              Renews on{" "}
              {periodEnd.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          ) : periodEnd && status === "cancelled" ? (
            <p className="mt-1 text-xs text-slate-600">
              Access ends on{" "}
              {periodEnd.toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </p>
          ) : status === "past_due" ? (
            <p className="mt-1 text-xs text-amber-700">
              Your most recent payment failed. Update your card to keep using paid features.
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-3">
          {hasCustomerRecord ? (
            <BillingPortalButton />
          ) : (
            <Link href="/pricing">
              <Button>Upgrade plan</Button>
            </Link>
          )}
          {planId !== "business" ? (
            <Link href="/pricing">
              <Button variant="ghost">View plans</Button>
            </Link>
          ) : null}
        </div>
      </Card>

      <Card>
        <AccountSettingsForm currentEmail={user.email ?? ""} />
      </Card>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    past_due: "bg-amber-50 text-amber-700 ring-amber-100",
    cancelled: "bg-red-50 text-red-700 ring-red-100",
    free: "bg-slate-100 text-slate-600 ring-slate-200",
  };
  const label: Record<string, string> = {
    active: "Active",
    past_due: "Payment failed",
    cancelled: "Cancelled",
    free: "Free plan",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        styles[status] ?? styles.free
      }`}
    >
      {label[status] ?? "Free plan"}
    </span>
  );
}
