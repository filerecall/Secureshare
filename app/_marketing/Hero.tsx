import Link from "next/link";
import { ArrowRight, Check, FileText, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Soft gradient backdrop - gives the section depth without a hero photo */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(15,23,42,0.08),transparent_70%)]"
      />
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"
      />

      <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24 lg:pt-28">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          {/* Left - copy + CTAs */}
          <div className="flex flex-col items-start">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              End-to-end secure document delivery
            </span>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Share sensitive documents{" "}
              {/* Highlighted phrase uses the brand purple-to-peach gradient
                  as a text fill (background-clip: text). Matches the gradient
                  treatment on filerecall.com landing-page highlights. */}
              <span className="block bg-brand-text-gradient bg-clip-text text-transparent">
                without losing control.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              Send tokenised links, track every view, and revoke access in one click. No email
              attachments, no forwarded files, no accidents.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href="/signup">
                <Button size="lg">
                  Start sharing securely
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="secondary">
                  See how it works
                </Button>
              </a>
            </div>

            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
              <li className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" aria-hidden /> No credit card
              </li>
              <li className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" aria-hidden /> No recipient account
                needed
              </li>
              <li className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" aria-hidden /> Revoke anytime
              </li>
              <li className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-600" aria-hidden /> Full audit trail
              </li>
            </ul>
          </div>

          {/* Right - product mockup */}
          <ProductMockup />
        </div>
      </div>
    </section>
  );
}

function ProductMockup() {
  return (
    <div className="relative">
      {/* Decorative glow */}
      <div
        aria-hidden
        className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-tr from-slate-200/50 via-emerald-200/30 to-slate-200/50 blur-2xl"
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        {/* Faux window chrome */}
        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-50 px-4 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="ml-3 inline-flex items-center gap-2 rounded-md bg-white px-2.5 py-1 text-[11px] text-slate-500 ring-1 ring-inset ring-slate-200">
            <Lock className="h-3 w-3 text-emerald-600" aria-hidden />
            app.secureshare.io/new
          </span>
        </div>

        {/* Card body */}
        <div className="space-y-5 px-6 py-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Create a secure link</h3>
            <p className="text-xs text-slate-500">Choose who, for how long, and how often.</p>
          </div>

          {/* Document row */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
                <FileText className="h-4 w-4 text-slate-700" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-900">Q4-financials.pdf</p>
                <p className="text-xs text-slate-500">2.4 MB · PDF</p>
              </div>
            </div>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-100">
              Ready
            </span>
          </div>

          {/* Fields */}
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Recipient
              </p>
              <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                anya@northwind-legal.com
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Expiry
                </p>
                <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  7 days
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                  Views
                </p>
                <div className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
                  First-view only
                </div>
              </div>
            </div>
          </div>

          {/* Token preview */}
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-600">
            https://secureshare.io/d/<span className="text-slate-900">a3f9…b41d</span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500">
              AES-256 encrypted at rest · TLS 1.3 in transit
            </span>
            <span className="inline-flex h-9 items-center rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-sm">
              Create link
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
