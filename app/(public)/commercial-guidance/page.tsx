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
  title: "Commercial Property Guidance",
  description:
    "General points to review when considering commercial property for rent or sale.",
  alternates: { canonical: "/commercial-guidance" },
};

export default function CommercialGuidancePage() {
  return (
    <>
      <InfoPageHeader
        eyebrow="Commercial guidance"
        title="Commercial property guidance"
        description="Commercial decisions depend on the intended use and the individual property. These notes set out questions worth asking before you commit to a lease or purchase."
      />

      <div className="mx-auto w-full max-w-4xl px-4 pb-12">
        <div className="py-4">
          <InfoSection title="Define your requirement">
            <p>
              Be clear about the intended use, required floor area, location,
              access, parking, utilities, budget and timeline. This makes it
              easier to shortlist suitable published{" "}
              <Link
                href="/properties/rent"
                className="text-danwell-teal hover:underline"
              >
                rentals
              </Link>{" "}
              and{" "}
              <Link
                href="/properties/sale"
                className="text-danwell-teal hover:underline"
              >
                sale properties
              </Link>
              .
            </p>
          </InfoSection>

          <InfoSection title="Check suitability">
            <p>
              Confirm permitted use and any zoning or approval conditions,
              inspect the condition of the building, and ask about services,
              access and any fit-out obligations. For a leased property, clarify
              who is responsible for repairs, service charges and utilities.
            </p>
          </InfoSection>

          <InfoSection title="Review the terms carefully">
            <p>
              Lease duration, rent reviews, deposits, reinstatement obligations,
              renewal options and exit terms can differ widely. Read the
              proposed written agreement and seek qualified professional advice
              where appropriate before signing. Avoid relying on verbal
              assurances that are not recorded.
            </p>
          </InfoSection>

          <InfoSection title="For property owners">
            <p>
              If you own commercial property and want help with leasing or day
              to day management, the{" "}
              <Link
                href="/owner-information"
                className="text-danwell-teal hover:underline"
              >
                owner information page
              </Link>{" "}
              outlines the usual workflow. Discuss the exact scope and fees with
              Danwell through the{" "}
              <Link href="/contact" className="text-danwell-teal hover:underline">
                contact page
              </Link>
              .
            </p>
          </InfoSection>

          <InfoSection title="Next steps">
            <p>
              Send an{" "}
              <Link href="/enquire" className="text-danwell-teal hover:underline">
                enquiry
              </Link>{" "}
              about a published property or{" "}
              <Link
                href="/viewings/request"
                className="text-danwell-teal hover:underline"
              >
                request a viewing
              </Link>
              . Availability and terms should be confirmed with Danwell before
              any commitment or payment.
            </p>
          </InfoSection>
        </div>

        <RelatedLinks
          links={[
            { href: "/owner-information", label: "Owner information" },
            { href: "/land-guidance", label: "Land guidance" },
            { href: "/faq", label: "Frequently asked questions" },
          ]}
        />

        <GeneralInformationNotice>
          This page is general information, not legal, planning, tax or financial
          advice, and it does not form part of any lease or sale agreement.
        </GeneralInformationNotice>

        <InfoActions
          links={[
            { href: "/properties/rent", label: "Commercial rentals", primary: true },
            { href: "/contact", label: "Talk to Danwell" },
          ]}
        />
      </div>
    </>
  );
}
