import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Handshake,
  KeyRound,
} from "lucide-react";
import { PropertyGrid, PropertyGridSkeleton } from "@/components/public/property-grid";
import { WhatsAppLink, whatsappHref } from "@/components/public/whatsapp-link";
import { AGENCY } from "@/lib/constants/agency";
import { getFeaturedListings } from "@/lib/listings/queries";

export const metadata: Metadata = {
  title: "Danwell Property Management Agency | Homes and Investments in Kenya",
  description:
    "Browse verified properties for rent and sale in Kenya. Danwell Property Management Agency offers professional leasing, sales and owner services.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Danwell Property Management Agency",
    description: "Property management, rentals and sales made simple in Kenya.",
    url: "/",
    type: "website",
    siteName: AGENCY.name,
  },
};

async function FeaturedProperties() {
  const listings = await getFeaturedListings(3);
  return (
    <PropertyGrid
      listings={listings}
      emptyTitle="New listings are on the way"
      emptyMessage="Published properties will appear here. In the meantime, contact Danwell and we will help you find the right home or investment."
    />
  );
}

const services = [
  {
    icon: KeyRound,
    title: "Rental management",
    description:
      "Tenant sourcing, leases, rent collection, maintenance coordination and clear owner reporting.",
  },
  {
    icon: Building2,
    title: "Property sales",
    description:
      "Professional marketing and buyer follow-up for houses, apartments, land and commercial property.",
  },
  {
    icon: ClipboardCheck,
    title: "Inspections and viewings",
    description:
      "Organised property viewings with prompt feedback and documented next steps.",
  },
  {
    icon: Handshake,
    title: "Owner partnership",
    description:
      "Transparent communication, verified ownership records and restricted owner reporting.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-danwell-navy text-white">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #0f766e 0, transparent 45%), radial-gradient(circle at 85% 75%, #d4af37 0, transparent 40%)",
          }}
        />
        <div className="relative mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-danwell-gold uppercase">
              Kenya property specialists
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl leading-tight font-semibold tracking-tight md:text-6xl">
              Find a home. Manage an investment. Work with Danwell.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-white/75">
              {AGENCY.tagline} We combine professional property management with a
              carefully presented selection of homes and investment properties.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/properties/rent"
                className="inline-flex items-center gap-2 rounded-lg bg-danwell-gold px-5 py-3 text-sm font-semibold text-danwell-navy transition-colors hover:bg-white"
              >
                Browse rentals <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              <Link
                href="/properties/sale"
                className="inline-flex items-center gap-2 rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                Properties for sale
              </Link>
              <WhatsAppLink
                message="Hello Danwell, I would like help finding a property in Kenya."
                className="inline-flex items-center gap-2 rounded-lg border border-danwell-gold/60 px-5 py-3 text-sm font-semibold text-danwell-gold transition-colors hover:bg-danwell-gold/10"
              >
                Chat with us
              </WhatsAppLink>
            </div>
          </div>

          <div className="rounded-3xl border border-white/15 bg-white/10 p-6 backdrop-blur-md">
            <p className="text-sm font-semibold text-danwell-gold">Speak to Danwell</p>
            <p className="mt-2 text-2xl font-semibold">Looking for a property?</p>
            <p className="mt-2 text-sm text-white/70">
              Tell us your budget, preferred location and move-in timeline. We will
              shortlist suitable published properties and arrange viewings.
            </p>
            <div className="mt-6 grid gap-3">
              <Link
                href="/enquire"
                className="rounded-lg bg-white px-4 py-3 text-center text-sm font-semibold text-danwell-navy hover:bg-danwell-gold"
              >
                Send an enquiry
              </Link>
              <Link
                href="/viewings/request"
                className="rounded-lg border border-white/30 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-white/10"
              >
                Request a viewing
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold tracking-wide text-danwell-teal uppercase">
              Featured properties
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-danwell-navy">
              Currently on the market
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Only approved, published listings are shown. Contact Danwell to
              confirm availability before making any payment.
            </p>
          </div>
          <Link
            href="/properties/rent"
            className="inline-flex items-center gap-2 text-sm font-semibold text-danwell-teal hover:underline"
          >
            See all properties <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>

        <div className="mt-8">
          <Suspense fallback={<PropertyGridSkeleton />}>
            <FeaturedProperties />
          </Suspense>
        </div>
      </section>

      <section className="border-y border-danwell-navy/10 bg-muted/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-16">
          <p className="text-sm font-semibold tracking-wide text-danwell-teal uppercase">
            Our services
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            One team across the full property journey
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <div
                key={service.title}
                className="rounded-2xl border border-danwell-navy/10 bg-white p-6 shadow-sm"
              >
                <service.icon aria-hidden="true" className="size-7 text-danwell-gold" />
                <h3 className="mt-4 text-lg font-semibold">{service.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{service.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16">
        <div className="overflow-hidden rounded-3xl bg-danwell-teal text-white">
          <div className="grid gap-6 p-8 md:grid-cols-2 md:items-center md:p-12">
            <div>
              <p className="text-sm font-semibold tracking-wide text-danwell-gold uppercase">
                Work with Danwell
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Ready to take the next step?
              </h2>
              <p className="mt-3 text-white/80">
                Ask about a listing, book a viewing or discuss managing your
                property. We respond during business hours.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 md:justify-end">
              <Link
                href="/contact"
                className="rounded-lg bg-white px-5 py-3 text-sm font-semibold text-danwell-teal hover:bg-danwell-gold"
              >
                Contact us
              </Link>
              <a
                href={whatsappHref("Hello Danwell, I would like to speak about a property.")}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border border-white/50 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                WhatsApp {AGENCY.whatsappNumber}
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
