import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-slate-900">
      {/* Subtle grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:40px_40px]"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(50%_60%_at_50%_50%,rgba(255,255,255,0.06),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Stop emailing PDFs to people you trust today,
          <span className="block text-slate-400">in case you don&apos;t tomorrow.</span>
        </h2>
        <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-300">
          Free while we&apos;re in beta
        </p>
        <p className="mx-auto mt-5 max-w-xl text-base text-slate-300">
          Create your first secure link in under a minute. No credit card required.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/signup">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
              Get started free
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
          <Link href="/login">
            <Button
              size="lg"
              variant="ghost"
              className="text-white hover:bg-white/10 hover:text-white"
            >
              I already have an account
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
