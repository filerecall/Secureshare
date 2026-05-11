// "Built on" strip. Zego shows partner customer logos here; for an MVP we
// don't have real customers to credit yet, so we show the tech foundations
// instead. Swap this for real customer logos once they're available.

function NextLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 24" fill="currentColor" className={className} aria-label="Next.js">
      <title>Next.js</title>
      <path d="M11.5 0C5.149 0 0 5.149 0 11.5S5.149 23 11.5 23 23 17.851 23 11.5 17.851 0 11.5 0Zm0 21.5a10 10 0 0 1-7.78-3.736L15.97 5.55a.5.5 0 0 1 .897.305v10.84a.5.5 0 0 1-.836.371L4.51 6.61a10 10 0 1 1 6.99 14.89Z" />
      <text x="28" y="16" fontFamily="Inter, system-ui, sans-serif" fontSize="13" fontWeight="600">
        Next.js
      </text>
    </svg>
  );
}

function SupabaseLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 110 24" fill="currentColor" className={className} aria-label="Supabase">
      <title>Supabase</title>
      <path d="M11.5 22.5a.6.6 0 0 1-.6-.7L12.3 14H4.6a.6.6 0 0 1-.5-1L14.2.7a.6.6 0 0 1 1 .7L13.9 10h7.7a.6.6 0 0 1 .5 1L12 22.3a.6.6 0 0 1-.5.2Z" />
      <text x="28" y="16" fontFamily="Inter, system-ui, sans-serif" fontSize="13" fontWeight="600">
        Supabase
      </text>
    </svg>
  );
}

function VercelLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 24" fill="currentColor" className={className} aria-label="Vercel">
      <title>Vercel</title>
      <path d="M11.5 3 22 21H1L11.5 3Z" />
      <text x="28" y="16" fontFamily="Inter, system-ui, sans-serif" fontSize="13" fontWeight="600">
        Vercel
      </text>
    </svg>
  );
}

function AwsLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 24" fill="currentColor" className={className} aria-label="AWS S3">
      <title>AWS S3</title>
      <path d="M5 14.5c0 .9.1 1.6.4 2.1l.5.9a.4.4 0 0 1-.1.5l-1.1.8a.4.4 0 0 1-.5 0 4.7 4.7 0 0 1-1-1.3 5 5 0 0 1-3.7 1.5C1.3 19 .5 18.7 0 18a3 3 0 0 1-.8-2.1c0-1 .3-1.8 1-2.4.7-.6 1.6-.9 2.8-.9.4 0 .8 0 1.3.1l1.4.3v-.9c0-1-.2-1.6-.6-2-.4-.4-1-.6-2-.6a5.6 5.6 0 0 0-2.4.6.6.6 0 0 1-.3.1.3.3 0 0 1-.3-.3v-.9c0-.2 0-.4.1-.4l.3-.2A6.2 6.2 0 0 1 3.8 7.5c1.4 0 2.5.3 3.2 1 .7.6 1 1.6 1 3v3ZM3 16.5a3 3 0 0 0 1.7-.5c.5-.3.9-.7 1.1-1.3.2-.4.2-.8.2-1.4v-.6a8 8 0 0 0-1.1-.2c-.4 0-.7-.1-1-.1-.7 0-1.3.1-1.6.4-.4.3-.6.7-.6 1.3 0 .5.2 1 .5 1.2.3.3.7.4 1.2.4Z" transform="translate(2 0)" />
      <text x="22" y="16" fontFamily="Inter, system-ui, sans-serif" fontSize="13" fontWeight="600">
        AWS S3
      </text>
    </svg>
  );
}

export function TrustedBy() {
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-center text-xs font-medium uppercase tracking-wider text-slate-500">
          Built on the same foundations as the products you already trust
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 text-slate-400">
          <NextLogo className="h-6 transition hover:text-slate-700" />
          <SupabaseLogo className="h-6 transition hover:text-slate-700" />
          <AwsLogo className="h-6 transition hover:text-slate-700" />
          <VercelLogo className="h-6 transition hover:text-slate-700" />
        </div>
      </div>
    </section>
  );
}
