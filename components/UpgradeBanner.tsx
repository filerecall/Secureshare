import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

/**
 * Warning-styled upgrade banner shown across the top of the dashboard for
 * users on the Free plan. A single, prominent two-line CTA takes them to
 * the pricing page to pick and subscribe to a plan.
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

        <Link href="/pricing" className="shrink-0 sm:w-auto">
          {/* Larger two-line CTA: emphatic "UPGRADE NOW" with the action
              ("View plans") beneath it. h-auto + py override the default
              single-line button height so both lines sit comfortably. */}
          <Button
            size="lg"
            className="h-auto w-full flex-col gap-0.5 px-10 py-3 leading-tight sm:w-auto"
          >
            <span className="text-sm font-extrabold uppercase tracking-wider">Upgrade now</span>
            <span className="text-xs font-medium text-white/85">View plans</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
