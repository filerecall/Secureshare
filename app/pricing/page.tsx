import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Logo } from "@/components/Logo";
import { PricingPlans } from "@/components/PricingPlans";
import { createClient } from "@/lib/supabase/server";
import type { SubscriptionPlan } from "@/types/database";

export const metadata: Metadata = {
  title: "Pricing - FileRecall",
  description: "Choose a FileRecall plan that fits how you share documents.",
};

export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: { checkout?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Resolve the user's EFFECTIVE plan. Only 'active' / 'past_due' grant a
  // paid plan; anything else (incomplete, cancelled, none) is treated as
  // free. This is what drives the "Current plan" disabled button.
  let currentPlan: SubscriptionPlan = "free";
  if (user) {
    const { data: row } = await supabase
      .from("users")
      .select("subscription_plan, subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    if (
      row &&
      (row.subscription_status === "active" || row.subscription_status === "past_due")
    ) {
      currentPlan = row.subscription_plan;
    }
  }

  const checkoutCancelled = searchParams.checkout === "cancelled";

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href={user ? "/dashboard" : "/login"}>
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href={user ? "/dashboard" : "/login"}
              className="text-sm font-medium text-slate-700 hover:text-slate-900"
            >
              {user ? "Dashboard" : "Log in"}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-brand">Pricing</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Simple plans for serious document sharing.
          </h1>
          <p className="mt-4 text-base text-slate-600">
            Start free. Upgrade when you outgrow it. Cancel anytime.
          </p>
        </div>

        {checkoutCancelled ? (
          <div className="mx-auto mt-8 max-w-md rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Checkout cancelled. No charges were made. Pick a plan when you&apos;re ready.
          </div>
        ) : null}

        <div className="mt-12">
          <PricingPlans isAuthenticated={!!user} currentPlan={currentPlan} />
        </div>

        <section className="mx-auto mt-16 max-w-2xl text-center">
          <h2 className="text-base font-semibold text-slate-900">All plans include</h2>
          <ul className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-700 sm:grid-cols-2">
            {[
              "AES-256 encrypted storage",
              "TLS 1.3 in transit",
              "Tokenised share links (256-bit entropy)",
              "Instant revoke",
              "Audit trail (views, downloads, blocks)",
              "Email notifications",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} FileRecall
      </footer>
    </div>
  );
}
