import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactRequestForm } from "@/components/public/contact-request-form";
import { WhatsAppLink } from "@/components/public/whatsapp-link";
import { AGENCY } from "@/lib/constants/agency";
import { getPublishedListingOptions } from "@/lib/listings/queries";
import type { PublicSearchParams } from "@/lib/listings/validation";

export const metadata: Metadata = {
  title: "Property Enquiry",
  description:
    "Ask Danwell Property Management Agency about a published rental or sale property in Kenya.",
  alternates: { canonical: "/enquire" },
};

async function EnquiryContent({
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
          Property enquiry
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Ask us about a property
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Your enquiry is linked to the selected listing and is only visible to
          authorized Danwell staff.
        </p>

        <div className="mt-8 rounded-2xl border border-danwell-navy/10 bg-white p-6 shadow-sm md:p-8">
          {listings.length === 0 ? (
            <div role="status" className="rounded-lg bg-muted/60 p-5 text-sm text-muted-foreground">
              No published properties are available right now. Please contact
              Danwell directly and tell us what you are looking for.
            </div>
          ) : (
            <ContactRequestForm
              mode="enquiry"
              listings={listings}
              defaultListingSlug={selected}
            />
          )}
        </div>
      </div>

      <aside className="h-fit rounded-2xl bg-danwell-navy p-6 text-white">
        <h2 className="text-lg font-semibold text-danwell-gold">Prefer WhatsApp?</h2>
        <p className="mt-2 text-sm text-white/75">
          Send your requirements directly to Danwell management.
        </p>
        <WhatsAppLink
          message="Hello Danwell, I have a question about a property listing."
          className="mt-5 block rounded-lg bg-danwell-gold px-4 py-3 text-center text-sm font-semibold text-danwell-navy hover:bg-white"
        >
          Chat on WhatsApp
        </WhatsAppLink>
        <p className="mt-5 text-xs text-white/60">
          Phone: {AGENCY.whatsappNumber}
          <br />
          Email: {AGENCY.email}
        </p>
      </aside>
    </div>
  );
}

export default function EnquiryPage({
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
      <EnquiryContent searchParams={searchParams} />
    </Suspense>
  );
}
