import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Warning-styled upgrade banner shown across the top of the dashboard for
 * users on the Free plan. A single "View plans" button takes them to the
 * pricing page, where they pick and subscribe to a plan.
 *
 * Rendered only for free-tier users - the dashboard decides whether to show it.
 */
export function UpgradeBanner() {
  return (
    <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-base font-semibold text-slate-900">You&apos;re on the Free plan</p>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
              Upgrade for watermarking, password protection, more files, and full tracking.
            </p>
          </div>
        </div>

        <Link href="/pricing" className="shrink-0">
          <Button className="w-full sm:w-auto">
            View plans
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </Link>
      </div>
    </div>
  );
}
