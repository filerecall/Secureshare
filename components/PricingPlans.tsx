"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PLANS, PLAN_ORDER, formatPrice } from "@/lib/plans";
import { normalisePlanParam, parsePlanParam } from "@/lib/plan-param";
import type { SubscriptionInterval, SubscriptionPlan } from "@/types/database";

interface Props {
  isAuthenticated: boolean;
  /** The user's effective current plan (free if not subscribed or lapsed). */
  currentPlan: SubscriptionPlan;
}

export function PricingPlans({ isAuthenticated, currentPlan }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [interval, setInterval] = useState<SubscriptionInterval>("monthly");
  const [busyPlan, setBusyPlan] = useState<SubscriptionPlan | null>(null);
  const [portalBusy, setPortalBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A user with any paid plan must NOT be sent into a fresh Checkout - that
  // would create a second Stripe subscription and double-charge them. All
  // plan changes for paying users go through the Stripe billing portal.
  const hasPaidPlan = currentPlan !== "free";

  // Auto-checkout from ?plan=X (deep link from the marketing site), but only
  // for users on the free plan. Paying users are deliberately skipped.
  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!isAuthenticated || hasPaidPlan) return;
    const plan = parsePlanParam(searchParams.get("plan"));
    if (!plan || plan === "free") return;
    const { internal } = normalisePlanParam(plan);
    if (internal === "free") return;
    autoStartedRef.current = true;
    void startCheckout(internal);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, hasPaidPlan]);

  async function startCheckout(plan: Exclude<SubscriptionPlan, "free">) {
    if (!isAuthenticated) {
      router.push(`/signup?plan=${plan}`);
      return;
    }
    setError(null);
    setBusyPlan(plan);
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
      setBusyPlan(null);
    }
  }

  async function openBillingPortal() {
    setError(null);
    setPortalBusy(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? "Could not open billing portal.");
      }
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPortalBusy(false);
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
              interval === opt ? "bg-brand text-white" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {opt === "monthly" ? "Monthly" : "Annual"}
            {opt === "annual" ? (
              <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                Save 20%
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

      {hasPaidPlan ? (
        <div className="mx-auto max-w-xl rounded-lg border border-brand/20 bg-brand-soft px-4 py-3 text-center text-sm text-slate-700">
          You&apos;re on the <strong>{PLANS[currentPlan].name}</strong> plan. To switch plans
          or cancel, use <strong>Manage billing</strong> - changes are prorated automatically.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const price = plan.prices[interval];
          const isPro = plan.id === "pro";
          const isCurrent = plan.id === currentPlan;
          const busy = busyPlan === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 transition ${
                isCurrent
                  ? "border-brand ring-2 ring-brand"
                  : isPro
                    ? "border-brand/40 shadow-lg"
                    : "border-slate-200"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
                {isCurrent ? (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    Current
                  </span>
                ) : isPro ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                    Most popular
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-slate-600">{plan.tagline}</p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-3xl font-semibold tracking-tight text-slate-900">
                  {formatPrice(price.amount)}
                </span>
                {price.amount > 0 ? (
                  <span className="text-sm text-slate-500">
                    /{interval === "monthly" ? "month" : "year"}
                  </span>
                ) : null}
              </div>

              <ul className="mt-5 flex flex-1 flex-col gap-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature.label} className="flex items-start gap-2">
                    {feature.included ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden />
                    )}
                    <span className={feature.included ? "text-slate-700" : "text-slate-400"}>
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <PlanButton
                  plan={plan.id}
                  planName={plan.name}
                  payable={plan.payable}
                  isCurrent={isCurrent}
                  isPro={isPro}
                  hasPaidPlan={hasPaidPlan}
                  isAuthenticated={isAuthenticated}
                  busy={busy}
                  portalBusy={portalBusy}
                  onCheckout={() => startCheckout(plan.id as Exclude<SubscriptionPlan, "free">)}
                  onOpenPortal={openBillingPortal}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PlanButtonProps {
  plan: SubscriptionPlan;
  planName: string;
  payable: boolean;
  isCurrent: boolean;
  isPro: boolean;
  hasPaidPlan: boolean;
  isAuthenticated: boolean;
  busy: boolean;
  portalBusy: boolean;
  onCheckout: () => void;
  onOpenPortal: () => void;
}

function PlanButton({
  planName,
  payable,
  isCurrent,
  isPro,
  hasPaidPlan,
  isAuthenticated,
  busy,
  portalBusy,
  onCheckout,
  onOpenPortal,
}: PlanButtonProps) {
  // 1. The plan the user is already on - disabled, prevents double payment.
  if (isCurrent) {
    return (
      <Button fullWidth variant="secondary" disabled>
        Current plan
      </Button>
    );
  }

  // 2. User already has a paid plan: every other plan (up or down) is a
  //    change that must go through the Stripe billing portal so Stripe can
  //    prorate and avoid creating a duplicate subscription.
  if (hasPaidPlan) {
    return (
      <Button fullWidth variant="ghost" onClick={onOpenPortal} loading={portalBusy}>
        {payable ? `Switch to ${planName}` : "Downgrade to Free"}
      </Button>
    );
  }

  // 3. User on free, looking at a paid plan: normal Checkout flow.
  if (payable) {
    return (
      <Button
        fullWidth
        variant={isPro ? "primary" : "secondary"}
        onClick={onCheckout}
        disabled={busy}
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Starting checkout...
          </>
        ) : isAuthenticated ? (
          `Subscribe to ${planName}`
        ) : (
          `Get started with ${planName}`
        )}
      </Button>
    );
  }

  // 4. The free plan when the user is on free and not authenticated.
  return isAuthenticated ? (
    <Link href="/dashboard">
      <Button fullWidth variant="ghost">
        Current plan
      </Button>
    </Link>
  ) : (
    <Link href="/signup">
      <Button fullWidth variant="ghost">
        Sign up free
      </Button>
    </Link>
  );
}
