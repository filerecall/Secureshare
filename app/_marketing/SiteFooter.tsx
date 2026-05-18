import { Logo } from "@/components/Logo";

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex flex-col gap-2">
          <Logo size="sm" />
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} FileRecall. All rights reserved.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
          <a href="#how-it-works" className="hover:text-slate-900">
            How it works
          </a>
          <a href="#features" className="hover:text-slate-900">
            Features
          </a>
          <a href="#use-cases" className="hover:text-slate-900">
            Use cases
          </a>
          <a href="mailto:hello@secureshare.io" className="hover:text-slate-900">
            Contact
          </a>
        </nav>
      </div>
    </footer>
  );
}
