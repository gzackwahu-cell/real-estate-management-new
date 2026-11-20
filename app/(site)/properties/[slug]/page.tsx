import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BedDouble, Bath, Building2, MapPin } from "lucide-react";
import { WhatsAppLink, whatsappHref } from "@/components/public/whatsapp-link";
import {
  formatListingPrice,
  labelFor,
  listingLocation,
  LISTING_TYPES,
  PROPERTY_CATEGORIES,
  SITE_URL,
} from "@/lib/listings/constants";
import {
  getListingImages,
  getPublishedListingBySlug,
} from "@/lib/listings/queries";

type PropertyDetailProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PropertyDetailProps): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublishedListingBySlug(slug);

  if (!listing) {
    return {
      title: "Property not found",
      description: "This property listing is no longer available.",
    };
  }

  const description =
    listing.description?.slice(0, 155) ||
    `${labelFor(PROPERTY_CATEGORIES, listing.property_category)} in ${listingLocation(listing)}. Enquire through Danwell Property Management Agency.`;

  return {
    title: `${listing.title} — ${labelFor(LISTING_TYPES, listing.listing_type)} in ${listing.town}`,
    description,
    alternates: { canonical: `/properties/${listing.slug}` },
    openGraph: {
      title: listing.title,
      description,
      url: `/properties/${listing.slug}`,
      type: "article",
      siteName: "Danwell Property Management Agency",
    },
  };
}

function Gallery({ images, title }: { images: Awaited<ReturnType<typeof getListingImages>>; title: string }) {
  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-gradient-to-br from-danwell-navy/10 via-danwell-teal/10 to-danwell-gold/20 text-danwell-navy/40">
        <Building2 aria-hidden="true" className="size-16" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-danwell-navy/5">
        <Image
          src={images[0].url}
          alt={images[0].caption || title}
          fill
          priority
          unoptimized
          sizes="(max-width: 1024px) 100vw, 65vw"
          className="object-cover"
        />
      </div>
      {images.length > 1 ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {images.slice(1, 5).map((image) => (
            <div
              key={image.id}
              className="relative aspect-[4/3] overflow-hidden rounded-xl bg-danwell-navy/5"
            >
              <Image
                src={image.url}
                alt={image.caption || title}
                fill
                unoptimized
                sizes="(max-width: 640px) 33vw, 16vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

async function PropertyDetailContent({ params }: PropertyDetailProps) {
  const { slug } = await params;
  const listing = await getPublishedListingBySlug(slug);
  if (!listing) {
    notFound();
  }

  const images = await getListingImages(listing.id, listing.property_id);
  const price = formatListingPrice(
    listing.price,
    listing.price_period,
    listing.listing_type,
  );
  const location = listingLocation(listing);
  const shareMessage = `Hello Danwell, I am interested in ${listing.title} (${SITE_URL}/properties/${listing.slug}). Please share more details.`;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10">
      <Link
        href={`/properties/${listing.listing_type}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-danwell-teal hover:underline"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to {labelFor(LISTING_TYPES, listing.listing_type).toLowerCase()}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <div>
          <Gallery images={images} title={listing.title} />

          <section className="mt-10">
            <h2 className="text-2xl font-semibold tracking-tight">About this property</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {listing.description ||
                "Contact Danwell for a full description and additional details about this property."}
            </p>
          </section>

          {listing.features.length > 0 ? (
            <section className="mt-8">
              <h2 className="text-2xl font-semibold tracking-tight">Features</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {listing.features.map((feature) => (
                  <li
                    key={feature}
                    className="rounded-lg border border-danwell-navy/10 bg-white px-4 py-2.5 text-sm"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <aside className="h-fit space-y-5 lg:sticky lg:top-24">
          <div className="rounded-2xl border border-danwell-navy/10 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold tracking-wide text-danwell-teal uppercase">
              {labelFor(PROPERTY_CATEGORIES, listing.property_category)} ·{" "}
              {labelFor(LISTING_TYPES, listing.listing_type)}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-danwell-navy">
              {listing.title}
            </h1>
            <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              {location}
            </p>
            <p className="mt-5 text-3xl font-semibold text-danwell-navy">{price}</p>

            <dl className="mt-5 grid grid-cols-2 gap-3 border-y border-danwell-navy/10 py-5 text-sm">
              <div className="flex items-center gap-2">
                <BedDouble aria-hidden="true" className="size-4 text-danwell-teal" />
                <dt className="sr-only">Bedrooms</dt>
                <dd>
                  {listing.bedrooms === null ? "—" : `${listing.bedrooms} bedroom${listing.bedrooms === 1 ? "" : "s"}`}
                </dd>
              </div>
              <div className="flex items-center gap-2">
                <Bath aria-hidden="true" className="size-4 text-danwell-teal" />
                <dt className="sr-only">Bathrooms</dt>
                <dd>
                  {listing.bathrooms === null ? "—" : `${listing.bathrooms} bath${listing.bathrooms === 1 ? "" : "s"}`}
                </dd>
              </div>
            </dl>

            <div className="mt-5 space-y-3">
              <Link
                href={`/enquire?listing=${encodeURIComponent(listing.slug)}`}
                className="block rounded-lg bg-danwell-navy px-4 py-3 text-center text-sm font-semibold text-white hover:bg-danwell-teal"
              >
                Send an enquiry
              </Link>
              <Link
                href={`/viewings/request?listing=${encodeURIComponent(listing.slug)}`}
                className="block rounded-lg border border-danwell-navy/20 px-4 py-3 text-center text-sm font-semibold text-danwell-navy hover:bg-muted"
              >
                Request a viewing
              </Link>
              <WhatsAppLink
                message={shareMessage}
                className="block rounded-lg bg-danwell-gold px-4 py-3 text-center text-sm font-semibold text-danwell-navy hover:bg-danwell-gold/90"
              >
                Ask on WhatsApp
              </WhatsAppLink>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Please confirm availability and never send payment before Danwell
              issues a verified receipt.
            </p>
          </div>

          <div className="rounded-2xl bg-danwell-teal p-6 text-white">
            <h2 className="text-lg font-semibold">Need help deciding?</h2>
            <p className="mt-2 text-sm text-white/80">
              Danwell can arrange a viewing and answer questions about the area,
              lease terms or sale process.
            </p>
            <a
              href={whatsappHref(shareMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-danwell-teal hover:bg-danwell-gold"
            >
              Chat with management
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function PropertyDetailPage({ params }: PropertyDetailProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl px-4 py-10" aria-hidden="true">
          <div className="aspect-[16/10] animate-pulse rounded-2xl bg-danwell-navy/10" />
          <div className="mt-8 h-8 w-1/3 animate-pulse rounded bg-danwell-navy/10" />
        </div>
      }
    >
      <PropertyDetailContent params={params} />
    </Suspense>
  );
}
