import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/80 backdrop-blur">
      {/* Desktop header is 100px tall (per spec). The 200x100 logo fits
          edge-to-edge - exactly matching the filerecall.com marketing
          header proportions. Mobile shrinks to 80px with a smaller logo. */}
      <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-6 lg:h-[100px]">
        <Logo size="lg" />
        {/* Nav links at 18px (text-lg) on desktop. Hidden on mobile. */}
        <nav className="hidden items-center gap-8 md:flex">
          <a
            href="#how-it-works"
            className="text-base text-slate-700 transition hover:text-slate-900 lg:text-lg"
          >
            How it works
          </a>
          <a
            href="#features"
            className="text-base text-slate-700 transition hover:text-slate-900 lg:text-lg"
          >
            Features
          </a>
          <a
            href="#use-cases"
            className="text-base text-slate-700 transition hover:text-slate-900 lg:text-lg"
          >
            Use cases
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="hidden sm:inline-flex">
            <Button variant="ghost" size="md" className="lg:text-base">
              Log in
            </Button>
          </Link>
          {/* CTA pill matches the "Start Free Trial" button on filerecall.com.
              Uses the cta-blue colour (#467FF7) which is reserved for this
              one button per the brand spec - every other CTA in the app
              uses the standard `brand` colour (#5B5BD6). */}
          <Link href="/signup">
            <Button
              size="lg"
              className="bg-cta-blue text-base text-white hover:bg-cta-blue-hover lg:text-lg"
            >
              Get started
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
