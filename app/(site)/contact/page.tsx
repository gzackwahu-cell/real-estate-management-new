import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageCircle, Phone } from "lucide-react";
import { AGENCY } from "@/lib/constants/agency";

export const metadata: Metadata = {
  title: "Contact Danwell Property Management Agency",
  description:
    "Contact Danwell by phone, WhatsApp or email for property management, rentals, sales, enquiries and viewings in Kenya.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <section className="border-b border-danwell-navy/10 bg-danwell-navy text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-14">
          <p className="text-sm font-semibold tracking-wide text-danwell-gold uppercase">
            Contact us
          </p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">
            We would love to help
          </h1>
          <p className="mt-4 max-w-2xl text-white/75">
            Reach Danwell for rental and sales enquiries, property management
            questions, maintenance support or to arrange a viewing.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-14 lg:grid-cols-3">
        <div className="rounded-2xl border border-danwell-navy/10 bg-white p-6 shadow-sm">
          <Phone aria-hidden="true" className="size-7 text-danwell-gold" />
          <h2 className="mt-4 text-lg font-semibold">Phone</h2>
          <a
            href={AGENCY.whatsappUrl}
            className="mt-2 block text-danwell-teal hover:underline"
          >
            {AGENCY.whatsappNumber}
          </a>
          <p className="mt-2 text-sm text-muted-foreground">
            Call or WhatsApp during business hours.
          </p>
        </div>

        <div className="rounded-2xl border border-danwell-navy/10 bg-white p-6 shadow-sm">
          <MessageCircle aria-hidden="true" className="size-7 text-danwell-gold" />
          <h2 className="mt-4 text-lg font-semibold">WhatsApp</h2>
          <a
            href={AGENCY.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 block text-danwell-teal hover:underline"
          >
            Start a chat
          </a>
          <p className="mt-2 text-sm text-muted-foreground">
            Share your requirements and we will respond shortly.
          </p>
        </div>

        <div className="rounded-2xl border border-danwell-navy/10 bg-white p-6 shadow-sm">
          <Mail aria-hidden="true" className="size-7 text-danwell-gold" />
          <h2 className="mt-4 text-lg font-semibold">Email</h2>
          <a
            href={`mailto:${AGENCY.email}`}
            className="mt-2 block break-all text-danwell-teal hover:underline"
          >
            {AGENCY.email}
          </a>
          <p className="mt-2 text-sm text-muted-foreground">
            Useful for documents and detailed requests.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16">
        <div className="rounded-3xl bg-muted/60 p-8 md:p-12">
          <h2 className="text-2xl font-semibold tracking-tight">Start with a listing</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Property enquiries and viewing requests are linked to the exact
            published property so our team can follow up quickly.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/enquire"
              className="rounded-lg bg-danwell-navy px-5 py-3 text-sm font-semibold text-white hover:bg-danwell-teal"
            >
              Make an enquiry
            </Link>
            <Link
              href="/viewings/request"
              className="rounded-lg border border-danwell-navy/20 px-5 py-3 text-sm font-semibold hover:bg-white"
            >
              Request a viewing
            </Link>
            <Link
              href="/properties/rent"
              className="rounded-lg border border-danwell-navy/20 px-5 py-3 text-sm font-semibold hover:bg-white"
            >
              Browse rentals
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
