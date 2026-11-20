import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Target, UsersRound } from "lucide-react";
import { WhatsAppLink } from "@/components/public/whatsapp-link";
import { AGENCY } from "@/lib/constants/agency";

export const metadata: Metadata = {
  title: "About Danwell Property Management Agency",
  description:
    "Learn about Danwell's approach to property management, tenant care, sales and owner service in Kenya.",
  alternates: { canonical: "/about" },
};

const values = [
  {
    icon: ShieldCheck,
    title: "Careful and compliant",
    description:
      "Verified ownership records, clear tenancy documents and strict separation of public, tenant, owner and financial data.",
  },
  {
    icon: UsersRound,
    title: "People-first service",
    description:
      "Practical communication with tenants, owners and buyers so every decision is understood and every follow-up is recorded.",
  },
  {
    icon: Target,
    title: "Clear outcomes",
    description:
      "Focused marketing, organised viewings and documented maintenance and rent workflows that keep properties performing.",
  },
];

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-danwell-navy/10 bg-muted/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-16">
          <p className="text-sm font-semibold tracking-wide text-danwell-teal uppercase">
            About us
          </p>
          <h1 className="mt-2 max-w-3xl text-4xl font-semibold tracking-tight text-danwell-navy">
            Professional property care with a personal standard
          </h1>
          <p className="mt-5 max-w-3xl text-lg text-muted-foreground">
            {AGENCY.name} manages residential and commercial property in Kenya and
            presents carefully selected homes and investments to the market. Our
            work spans leasing, tenant support, maintenance coordination, owner
            reporting and property sales.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight">What we do</h2>
          <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground">
            <p>
              For property owners, we handle tenant sourcing, lease administration,
              rent follow-up and maintenance coordination while keeping financial
              and tenancy records restricted to the people who are authorized to
              see them.
            </p>
            <p>
              For tenants, we provide clear tenancy information, simple maintenance
              reporting and direct access to management through the tenant portal
              and WhatsApp.
            </p>
            <p>
              For buyers and renters, we publish approved listings with practical
              details, honest photography and direct enquiry and viewing routes.
            </p>
          </div>
        </div>

        <div className="rounded-3xl border border-danwell-navy/10 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold tracking-wide text-danwell-gold uppercase">
            Our promise
          </p>
          <p className="mt-3 text-2xl font-semibold text-danwell-navy">
            No hidden links. No exposed private records.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Public visitors only see published marketing listings. Tenant,
            owner, payment and internal enquiry information stays behind
            role-based access controls.
          </p>
          <WhatsAppLink
            message="Hello Danwell, I would like to know more about your services."
            className="mt-6 inline-flex rounded-lg bg-danwell-navy px-5 py-3 text-sm font-semibold text-white hover:bg-danwell-teal"
          >
            Ask us a question
          </WhatsAppLink>
        </div>
      </section>

      <section className="border-y border-danwell-navy/10 bg-muted/40">
        <div className="mx-auto w-full max-w-7xl px-4 py-16">
          <h2 className="text-3xl font-semibold tracking-tight">Our values</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {values.map((value) => (
              <div key={value.title} className="rounded-2xl bg-white p-6 shadow-sm">
                <value.icon aria-hidden="true" className="size-7 text-danwell-gold" />
                <h3 className="mt-4 text-lg font-semibold">{value.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-16 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">Find your next property</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
          Browse current rentals and sales, or tell Danwell what you are looking
          for and we will help you take the next step.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/properties/rent"
            className="rounded-lg bg-danwell-navy px-5 py-3 text-sm font-semibold text-white hover:bg-danwell-teal"
          >
            Properties for rent
          </Link>
          <Link
            href="/properties/sale"
            className="rounded-lg border border-danwell-navy/20 px-5 py-3 text-sm font-semibold hover:bg-muted"
          >
            Properties for sale
          </Link>
        </div>
      </section>
    </>
  );
}
