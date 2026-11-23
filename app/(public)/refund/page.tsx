import type { Metadata } from "next";
import Link from "next/link";
import { AGENCY } from "@/lib/constants/agency";
import {
  GeneralInformationNotice,
  InfoActions,
  InfoPageHeader,
  InfoSection,
  RelatedLinks,
} from "@/components/public/info/info-page";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "General information about deposits, payments and how to raise a refund enquiry with Danwell Property Management Agency.",
  alternates: { canonical: "/refund" },
};

export default function RefundPage() {
  return (
    <>
      <InfoPageHeader
        eyebrow="Legal and policies"
        title="Refund policy"
        description="This page sets out general information about payments and refund enquiries. It does not create a right to a refund or change the terms of any agreement you have with Danwell."
      />

      <div className="mx-auto w-full max-w-4xl px-4 pb-12">
        <div className="py-4">
          <InfoSection title="Payments and the public website">
            <p>
              The public website is for information and enquiries. It does not
              collect rent, deposits, service charges or other payments. If you
              are asked to pay in connection with a property, confirm the
              amount, purpose and authorized channel directly with Danwell via
              the{" "}
              <a
                href={AGENCY.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-danwell-teal hover:underline"
              >
                phone and WhatsApp line
              </a>{" "}
              before sending anything.
            </p>
          </InfoSection>

          <InfoSection title="Agreed terms come first">
            <p>
              Any fee, deposit or charge, and the conditions attached to it, are
              governed by the written agreement or instructions that apply to
              your property or service. Ask Danwell for the current terms before
              committing, and keep copies of the agreement and any receipts you
              receive.
            </p>
          </InfoSection>

          <InfoSection title="Raising a refund enquiry">
            <p>
              If you believe a refund or adjustment may apply, contact Danwell
              through the{" "}
              <Link
                href="/contact"
                className="text-danwell-teal hover:underline"
              >
                contact page
              </Link>{" "}
              and include the property or reference, what was paid, when, and
              the reason for your request. Staff will review the request against
              the applicable agreement and the facts of the case. No particular
              outcome or timeline is promised on this page.
            </p>
          </InfoSection>

          <InfoSection title="Enquiries are not payments">
            <p>
              Browsing a listing, sending an enquiry or requesting a viewing does
              not create a payment, a refund entitlement or a reservation.
            </p>
          </InfoSection>
        </div>

        <RelatedLinks
          links={[
            { href: "/faq", label: "Frequently asked questions" },
            { href: "/privacy", label: "Privacy policy" },
            { href: "/terms", label: "Terms of use" },
          ]}
        />

        <GeneralInformationNotice>
          This is general information, not legal or financial advice, and it is
          not a statement that any refund will be made. Refer to your own
          agreement and contact Danwell for the process that applies to you.
        </GeneralInformationNotice>

        <InfoActions
          links={[
            { href: "/contact", label: "Contact Danwell", primary: true },
            { href: "/tenant-information", label: "Tenant information" },
          ]}
        />
      </div>
    </>
  );
}
