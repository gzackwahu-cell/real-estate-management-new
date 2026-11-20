import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactRequestForm } from "@/components/public/contact-request-form";
import { WhatsAppLink } from "@/components/public/whatsapp-link";
import { AGENCY } from "@/lib/constants/agency";
import { getPublishedListingOptions } from "@/lib/listings/queries";
import type { PublicSearchParams } from "@/lib/listings/validation";

export const metadata: Metadata = {
  title: "Request a Property Viewing",
  description:
    "Request a viewing of a published rental or sale property with Danwell Property Management Agency in Kenya.",
  alternates: { canonical: "/viewings/request" },
};

async function ViewingContent({
  searchParams,
}: {
  searchParams: Promise<PublicSearchParams>;
}) {
  const params = await searchParams;
  const listings = await getPublishedListingOptions();
  const requested = typeof params.listing === "string" ? params.listing : "";
  const selected = listings.some((item) => item.slug === requested)
    ? requested
    : "";

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 lg:grid-cols-[1.5fr_0.75fr]">
      <div>
        <p className="text-sm font-semibold tracking-wide text-danwell-teal uppercase">
          Viewing request
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Arrange a property viewing
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Choose a published property and your preferred date. Danwell will
          confirm availability before the viewing.
        </p>

        <div className="mt-8 rounded-2xl border border-danwell-navy/10 bg-white p-6 shadow-sm md:p-8">
          {listings.length === 0 ? (
            <div role="status" className="rounded-lg bg-muted/60 p-5 text-sm text-muted-foreground">
              No published properties are available for viewings right now.
              Please contact Danwell directly.
            </div>
          ) : (
            <ContactRequestForm
              mode="viewing"
              listings={listings}
              defaultListingSlug={selected}
            />
          )}
        </div>
      </div>

      <aside className="h-fit rounded-2xl bg-danwell-teal p-6 text-white">
        <h2 className="text-lg font-semibold text-danwell-gold">Need a different time?</h2>
        <p className="mt-2 text-sm text-white/80">
          Send your preferred property, date and time on WhatsApp and we will
          try to accommodate you.
        </p>
        <WhatsAppLink
          message="Hello Danwell, I would like to arrange a property viewing."
          className="mt-5 block rounded-lg bg-white px-4 py-3 text-center text-sm font-semibold text-danwell-teal hover:bg-danwell-gold"
        >
          WhatsApp management
        </WhatsAppLink>
        <p className="mt-5 text-xs text-white/70">
          Phone: {AGENCY.whatsappNumber}
          <br />
          Email: {AGENCY.email}
        </p>
      </aside>
    </div>
  );
}

export default function ViewingRequestPage({
  searchParams,
}: {
  searchParams: Promise<PublicSearchParams>;
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-6xl px-4 py-14" aria-hidden="true">
          <div className="h-72 animate-pulse rounded-2xl bg-danwell-navy/10" />
        </div>
      }
    >
      <ViewingContent searchParams={searchParams} />
    </Suspense>
  );
}
