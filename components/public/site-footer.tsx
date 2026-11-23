import Link from "next/link";
import { DanwellLogo } from "@/components/brand/danwell-logo";
import {
  COMPANY_LINKS,
  INFORMATION_LINKS,
  LEGAL_LINKS,
  SERVICE_LINKS,
  type InfoLink,
} from "@/components/public/info/info-links";
import { AGENCY } from "@/lib/constants/agency";

function FooterLinkList({ links }: { links: readonly InfoLink[] }) {
  return (
    <ul className="mt-3 grid gap-2 text-sm text-white/75">
      {links.map((link) => (
        <li key={link.href}>
          <Link href={link.href} className="hover:text-white hover:underline">
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-danwell-navy/10 bg-danwell-navy text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <DanwellLogo
            width={48}
            height={32}
            wordmarkClassName="text-danwell-gold"
          />
          <p className="mt-3 max-w-sm text-sm text-white/70">
            {AGENCY.tagline} Trusted rental management, property sales and owner
            services across Kenya.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-danwell-gold uppercase">
            Company
          </h2>
          <FooterLinkList links={COMPANY_LINKS} />
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-danwell-gold uppercase">
            Services
          </h2>
          <FooterLinkList links={SERVICE_LINKS} />
        </div>

        <div>
          <h2 className="text-sm font-semibold tracking-wide text-danwell-gold uppercase">
            Information &amp; Legal
          </h2>
          <FooterLinkList links={[...INFORMATION_LINKS, ...LEGAL_LINKS]} />
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-7xl gap-4 border-t border-white/10 px-4 py-6 md:grid-cols-[1fr_auto] md:items-center">
        <ul className="space-y-2 text-sm text-white/75">
          <li>
            Phone / WhatsApp:{" "}
            <a href={AGENCY.whatsappUrl} className="text-white hover:underline">
              {AGENCY.whatsappNumber}
            </a>
          </li>
          <li>
            Email:{" "}
            <a
              href={`mailto:${AGENCY.email}`}
              className="text-white hover:underline"
            >
              {AGENCY.email}
            </a>
          </li>
        </ul>
        <a
          href={AGENCY.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit rounded-lg bg-danwell-gold px-3 py-2 font-semibold text-danwell-navy"
        >
          Chat on WhatsApp
        </a>
      </div>

      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-white/50">
        © {AGENCY.name}. All rights reserved.
      </div>
    </footer>
  );
}
