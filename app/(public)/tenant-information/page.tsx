import type { Metadata } from "next";
import Link from "next/link";
import {
  GeneralInformationNotice,
  InfoActions,
  InfoPageHeader,
  InfoSection,
  RelatedLinks,
} from "@/components/public/info/info-page";

export const metadata: Metadata = {
  title: "Tenant Information",
  description:
    "An overview of the typical renting journey with Danwell, from enquiry and viewings to tenancy records and maintenance.",
  alternates: { canonical: "/tenant-information" },
};

export default function TenantInformationPage() {
  return (
    <>
      <InfoPageHeader
        eyebrow="Guidance for tenants"
        title="Tenant information"
        description="If you are looking for a home or already rent a property managed by Danwell, this page outlines the usual steps. Your signed lease and notices from management are the documents that govern your tenancy."
      />

      <div className="mx-auto w-full max-w-4xl px-4 pb-12">
        <div className="py-4">
          <InfoSection title="Finding a property and arranging a viewing">
            <p>
              Start with the published{" "}
              <Link href="/properties/rent" className="text-danwell-teal hover:underline">
                properties for rent
              </Link>
              . When something looks suitable, send an{" "}
              <Link href="/enquire" className="text-danwell-teal hover:underline">
                enquiry
              </Link>{" "}
              or use the{" "}
              <Link
                href="/viewings/request"
                className="text-danwell-teal hover:underline"
              >
                viewing request form
              </Link>
              . Danwell confirms viewing availability before arranging a time.
              An enquiry or viewing does not reserve a property.
            </p>
          </InfoSection>

          <InfoSection title="Application and move-in">
            <p>
              Application requirements vary by property. Ask Danwell through the{" "}
              <Link href="/contact" className="text-danwell-teal hover:underline">
                contact page
              </Link>{" "}
              for the current document checklist before sending personal
              information. Before you move in, make sure the lease terms are
              clear, any condition record is agreed, and you understand what
              amounts are due, why, and through which authorized channel. The
              public website does not collect payments.
            </p>
          </InfoSection>

          <InfoSection title="During your tenancy">
            <p>
              Use the contact details provided by management for questions,
              maintenance reports and notices. Keep copies of your lease,
              receipts and relevant messages. Tenant portal access, where used,
              is issued by the agency; public sign-up is not available. See the{" "}
              <Link href="/faq" className="text-danwell-teal hover:underline">
                FAQs
              </Link>{" "}
              for answers to common questions about records and payments.
            </p>
          </InfoSection>

          <InfoSection title="Privacy and further help">
            <p>
              Details sent through public forms are handled as described on the{" "}
              <Link href="/privacy" className="text-danwell-teal hover:underline">
                privacy page
              </Link>
              . For anything about your own tenancy, including payments or
              refund questions, contact Danwell directly rather than relying on
              general website guidance.
            </p>
          </InfoSection>
        </div>

        <RelatedLinks
          links={[
            { href: "/faq", label: "Frequently asked questions" },
            { href: "/refund", label: "Refund information" },
            { href: "/viewings/request", label: "Request a viewing" },
            { href: "/contact", label: "Contact Danwell" },
          ]}
        />

        <GeneralInformationNotice>
          This page is general information, not legal advice, and it does not
          replace your lease or any notice from Danwell.
        </GeneralInformationNotice>

        <InfoActions
          links={[
            { href: "/properties/rent", label: "Browse rentals", primary: true },
            { href: "/contact", label: "Contact us" },
          ]}
        />
      </div>
    </>
  );
}
