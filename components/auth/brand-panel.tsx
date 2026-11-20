import { Mail, MessageCircle } from "lucide-react";
import { AGENCY } from "@/lib/constants/agency";

export function BrandPanel() {
  return (
    <section className="relative flex flex-col justify-between overflow-hidden bg-danwell-navy px-8 py-10 text-white lg:px-12 lg:py-14">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 -right-24 size-80 rounded-full bg-danwell-teal/35 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-danwell-gold/10 blur-3xl"
      />

      <div className="relative">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl border border-danwell-gold/50 bg-danwell-gold/10 text-lg font-semibold text-danwell-gold">
            D
          </span>
          <div>
            <p className="text-lg leading-tight font-semibold tracking-tight">
              {AGENCY.shortName}
            </p>
            <p className="text-xs text-white/65">Property Management Agency</p>
          </div>
        </div>

        <div className="mt-14 max-w-md">
          <p className="text-xs font-medium tracking-[0.2em] text-danwell-gold uppercase">
            Welcome back
          </p>
          <h1 className="mt-4 text-3xl leading-tight font-semibold tracking-tight lg:text-4xl">
            {AGENCY.tagline}
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Sign in to manage properties, tenants, payments, maintenance and
            listings from one secure place.
          </p>
        </div>
      </div>

      <div className="relative mt-10 flex flex-col gap-3 text-sm text-white/75">
        <a
          className="inline-flex items-center gap-2 transition-colors hover:text-danwell-gold"
          href={AGENCY.whatsappUrl}
          target="_blank"
          rel="noreferrer"
        >
          <MessageCircle className="size-4" aria-hidden="true" />
          {AGENCY.whatsappNumber}
        </a>
        <a
          className="inline-flex items-center gap-2 transition-colors hover:text-danwell-gold"
          href={`mailto:${AGENCY.email}`}
        >
          <Mail className="size-4" aria-hidden="true" />
          {AGENCY.email}
        </a>
      </div>
    </section>
  );
}
