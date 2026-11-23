export type InfoLink = {
  href: string;
  label: string;
  description?: string;
};

export const COMPANY_LINKS: readonly InfoLink[] = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Danwell" },
  { href: "/contact", label: "Contact us" },
];

export const SERVICE_LINKS: readonly InfoLink[] = [
  { href: "/properties/rent", label: "Properties for rent" },
  { href: "/properties/sale", label: "Properties for sale" },
  { href: "/properties/lease", label: "Properties for lease" },
  { href: "/enquire", label: "Make an enquiry" },
  { href: "/viewings/request", label: "Request a viewing" },
];

export const INFORMATION_LINKS: readonly InfoLink[] = [
  {
    href: "/faq",
    label: "Frequently asked questions",
    description: "Short answers about renting, viewings, management and fees.",
  },
  {
    href: "/tenant-information",
    label: "Tenant information",
    description: "The typical journey from enquiry through to day-to-day tenancy.",
  },
  {
    href: "/owner-information",
    label: "Owner information",
    description: "How property management conversations and workflows are structured.",
  },
  {
    href: "/land-guidance",
    label: "Land guidance",
    description: "General checks to consider before committing to a land purchase.",
  },
  {
    href: "/commercial-guidance",
    label: "Commercial guidance",
    description: "Points to review for commercial leasing and sales.",
  },
];

export const LEGAL_LINKS: readonly InfoLink[] = [
  {
    href: "/privacy",
    label: "Privacy policy",
    description: "How information submitted through the public website is handled.",
  },
  {
    href: "/terms",
    label: "Terms of use",
    description: "General terms for using this website and its content.",
  },
  {
    href: "/refund",
    label: "Refund policy",
    description: "General information about payments, deposits and refund requests.",
  },
];

/** All informational/legal public routes, used for navigation state and cross-links. */
export const INFO_ROUTES: readonly string[] = [
  ...INFORMATION_LINKS,
  ...LEGAL_LINKS,
].map((link) => link.href);
