import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PLANS, formatPrice } from "@/lib/plans";

/**
 * Promotional banner shown across the top of the dashboard for users on the
 * Free plan. Two upgrade CTAs route into the pricing page with a plan
 * pre-selected, which auto-starts Stripe Checkout for that plan.
 *
 * Rendered only for free-tier users - the dashboard decides whether to
 * show it.
 */
export function UpgradeBanner() {
  const proPrice = formatPrice(PLANS.pro.prices.monthly.amount);
  const businessPrice = formatPrice(PLANS.business.prices.monthly.amount);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-brand-gradient p-5 sm:p-6">
      {/* Soft light wash for depth */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(60%_80%_at_15%_0%,rgba(255,255,255,0.22),transparent_70%)]"
      />

      <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-inset ring-white/25">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-base font-semibold text-white">You&apos;re on the Free plan</p>
            <p className="mt-0.5 text-sm leading-relaxed text-white/80">
              Upgrade for watermarking, password protection, more files, and full tracking.
            </p>
          </div>
        </div>

        {/* Both CTAs use the same solid white treatment so each one clearly
            reads as a live, clickable button against the gradient. */}
        <div className="flex flex-wrap gap-2.5">
          <Link href="/pricing?plan=pro">
            <Button className="bg-white text-slate-900 shadow-sm hover:bg-slate-100">
              Upgrade to Pro · {proPrice}/mo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
          <Link href="/pricing?plan=business">
            <Button className="bg-white text-slate-900 shadow-sm hover:bg-slate-100">
              Upgrade to Business · {businessPrice}/mo
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
