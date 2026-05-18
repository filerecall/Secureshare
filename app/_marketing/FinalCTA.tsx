import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-brand-gradient">
      {/* Soft white wash for centred-copy contrast. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_40%,rgba(255,255,255,0.18),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-24">
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Stop emailing PDFs to people you trust today,
          <span className="block text-white/75">in case you don&apos;t tomorrow.</span>
        </h2>
        <p className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-sm font-medium text-white backdrop-blur-sm">
          Free while we&apos;re in beta
        </p>
        <p className="mx-auto mt-5 max-w-xl text-base text-white/85">
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
              className="text-white hover:bg-white/15 hover:text-white"
            >
              I already have an account
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
