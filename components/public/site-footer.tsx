import Link from "next/link";
import { AGENCY } from "@/lib/constants/agency";

const quickLinks = [
  { href: "/about", label: "About Danwell" },
  { href: "/properties/rent", label: "Properties for rent" },
  { href: "/properties/sale", label: "Properties for sale" },
  { href: "/enquire", label: "Make an enquiry" },
  { href: "/viewings/request", label: "Request a viewing" },
  { href: "/contact", label: "Contact us" },
];

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-danwell-navy/10 bg-danwell-navy text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 md:grid-cols-3">
        <div>
          <p className="text-lg font-semibold tracking-tight text-danwell-gold">
            {AGENCY.shortName}
          </p>
          <p className="mt-2 max-w-sm text-sm text-white/70">
            {AGENCY.tagline} Trusted rental management, property sales and owner
            services across Kenya.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-danwell-gold uppercase">
            Explore
          </h2>
          <ul className="mt-3 grid gap-2 text-sm text-white/75">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-white hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-danwell-gold uppercase">
            Talk to us
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-white/75">
            <li>
              Phone / WhatsApp:{" "}
              <a href={AGENCY.whatsappUrl} className="text-white hover:underline">
                {AGENCY.whatsappNumber}
              </a>
            </li>
            <li>
              Email:{" "}
              <a href={`mailto:${AGENCY.email}`} className="text-white hover:underline">
                {AGENCY.email}
              </a>
            </li>
            <li>
              <a
                href={AGENCY.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-lg bg-danwell-gold px-3 py-2 font-semibold text-danwell-navy"
              >
                Chat on WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/50">
        © {AGENCY.name}. All rights reserved.
      </div>
    </footer>
  );
}
