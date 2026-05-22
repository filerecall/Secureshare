"use client";

import { useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PLANS, formatPrice } from "@/lib/plans";

type PaidPlan = "pro" | "business";

/**
 * Warning-styled upgrade banner shown across the top of the dashboard for
 * users on the Free plan. Light amber background + bold amber border so it
 * reads as a notice. Both CTAs go straight to Stripe Checkout - no flash.
 */
export function UpgradeBanner() {
  const [busyPlan, setBusyPlan] = useState<PaidPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  const proPrice = formatPrice(PLANS.pro.prices.monthly.amount);
  const businessPrice = formatPrice(PLANS.business.prices.monthly.amount);

  async function upgrade(plan: PaidPlan) {
    setError(null);
    setBusyPlan(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval: "monthly" }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Could not start checkout.");
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusyPlan(null);
    }
  }

  return (
    <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-base font-semibold text-slate-900">You&apos;re on the Free plan</p>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
              Upgrade for watermarking, password protection, more files, and full tracking.
            </p>
            {error ? (
              <p className="mt-1 text-sm font-medium text-red-600" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        {/* Desktop: the two CTAs sit side-by-side on one row.
            Tablet + mobile: they stack into a full-width column. */}
        <div className="flex shrink-0 flex-col gap-2.5 lg:flex-row">
          <Button
            onClick={() => upgrade("pro")}
            loading={busyPlan === "pro"}
            disabled={busyPlan !== null}
            className="w-full lg:w-auto"
          >
            Upgrade to Pro · {proPrice}/mo
            {busyPlan === null ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
          </Button>
          <Button
            onClick={() => upgrade("business")}
            loading={busyPlan === "business"}
            disabled={busyPlan !== null}
            className="w-full lg:w-auto"
          >
            Upgrade to Business · {businessPrice}/mo
            {busyPlan === null ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
          </Button>
        </div>
      </div>
    </div>
  );
}
