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
    <section className="bg-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-wider text-emerald-400">
            Why teams choose us
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Security you can put a number on.
          </h2>
        </div>

        <dl className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-3">
          {stats.map(({ value, label }) => (
            <div key={value} className="flex flex-col items-start gap-4 bg-slate-900 p-8">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <Check className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <dt className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  {value}
                </dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-300">{label}</dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
