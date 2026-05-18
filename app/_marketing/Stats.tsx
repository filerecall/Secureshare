import { Check } from "lucide-react";

// Numbers map to real capabilities of the platform: AES-256 server-side
// encryption, 100% of recipient access goes through access_events, and
// revocation is a single update query.
const stats = [
  { value: "AES-256", label: "Encryption at rest, end to end" },
  { value: "100%", label: "Of views captured in the audit log" },
  { value: "<1s", label: "From revoke click to recipient blocked" },
];

export function Stats() {
  return (
    // bg-brand-gradient is the purple -> peach diagonal gradient defined in
    // tailwind.config.ts, matching the "To Launch Your Business" section on
    // filerecall.com.
    <section className="relative overflow-hidden bg-brand-gradient">
      {/* Soft white wash to lift contrast for the centred copy. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,0.18),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-white/80">
            Why teams choose us
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Security you can put a number on.
          </h2>
        </div>

        <dl className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-white/15 ring-1 ring-white/10 sm:grid-cols-3">
          {stats.map(({ value, label }) => (
            <div
              key={value}
              className="flex flex-col items-start gap-4 bg-white/10 p-8 backdrop-blur-sm"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/25 text-white">
                <Check className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <dt className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  {value}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-white/85">{label}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
