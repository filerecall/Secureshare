"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PLANS, PLAN_ORDER, formatPrice } from "@/lib/plans";
import type { SubscriptionInterval, SubscriptionPlan } from "@/types/database";

interface Props {
  isAuthenticated: boolean;
}

export function PricingPlans({ isAuthenticated }: Props) {
  const router = useRouter();
  const [interval, setInterval] = useState<SubscriptionInterval>("monthly");
  const [startingCheckoutFor, setStartingCheckoutFor] = useState<SubscriptionPlan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(plan: Exclude<SubscriptionPlan, "free">) {
    if (!isAuthenticated) {
      // Send unauthenticated users to signup with a memo so we can resume.
      router.push(`/signup?next=${encodeURIComponent(`/pricing?plan=${plan}`)}`);
      return;
    }

    setError(null);
    setStartingCheckoutFor(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Could not start checkout.");
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStartingCheckoutFor(null);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Monthly / annual toggle */}
      <div className="mx-auto inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
        {(["monthly", "annual"] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setInterval(opt)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              interval === opt ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {opt === "monthly" ? "Monthly" : "Annual"}
            {opt === "annual" ? (
              <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                Save 17%
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const price = plan.prices[interval];
          const isPro = plan.id === "pro";
          const busy = startingCheckoutFor === plan.id;

          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border bg-white p-6 ${
                isPro ? "border-slate-900 shadow-lg ring-1 ring-slate-900" : "border-slate-200"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                {isPro ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    Most popular
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-slate-600">{plan.tagline}</p>

              <div className="mt-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold tracking-tight text-slate-900">
                    {formatPrice(price.amount, price.currency)}
                  </span>
                  {price.amount > 0 ? (
                    <span className="text-sm text-slate-500">
                      /{interval === "monthly" ? "month" : "year"}
                    </span>
                  ) : null}
                </div>
              </div>

              <ul className="mt-5 flex flex-1 flex-col gap-2 text-sm text-slate-700">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                {plan.payable ? (
                  <Button
                    fullWidth
                    variant={isPro ? "primary" : "secondary"}
                    onClick={() => startCheckout(plan.id as Exclude<SubscriptionPlan, "free">)}
                    disabled={busy}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Starting checkout...
                      </>
                    ) : isAuthenticated ? (
                      `Subscribe to ${plan.name}`
                    ) : (
                      `Sign up for ${plan.name}`
                    )}
                  </Button>
                ) : isAuthenticated ? (
                  <Link href="/dashboard">
                    <Button fullWidth variant="ghost">
                      Continue on Free
                    </Button>
                  </Link>
                ) : (
                  <Link href="/signup">
                    <Button fullWidth variant="ghost">
                      Sign up free
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
