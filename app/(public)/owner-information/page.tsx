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
  title: "Owner Information",
  description:
    "An overview of how property management conversations and workflows with Danwell are usually structured.",
  alternates: { canonical: "/owner-information" },
};

export default function OwnerInformationPage() {
  return (
    <>
      <InfoPageHeader
        eyebrow="Guidance for owners"
        title="Owner information"
        description="This page explains the typical shape of a property management conversation. Scope, responsibilities and reporting are always agreed with Danwell for the individual property."
      />

      <div className="mx-auto w-full max-w-4xl px-4 pb-12">
        <div className="py-4">
          <InfoSection title="Getting started">
            <p>
              Contact Danwell with basic details about the property, its current
              use and what you would like help with. Discuss which ownership
              records you should provide and how they will be checked before
              anything is marketed or let. Nothing is published as a result of
              an initial conversation alone.
            </p>
          </InfoSection>

          <InfoSection title="Agreeing the scope">
            <p>
              Management arrangements can cover tenant sourcing, viewings,
              lease administration, rent follow-up, maintenance coordination
              and owner reporting. Which of these apply, who makes decisions,
              and how fees are handled should be set out in writing. Current
              fee information is available through the{" "}
              <Link
                href="/contact"
                className="text-danwell-teal hover:underline"
              >
                contact page
              </Link>
              ; this site does not publish a fee schedule.
            </p>
          </InfoSection>

          <InfoSection title="Day-to-day workflow">
            <p>
              Once an arrangement is in place, the usual steps are preparing the
              property for the market, handling enquiries and viewings,
              documenting the agreed tenancy, coordinating reported maintenance
              and sharing the reporting that was agreed. Timelines and
              responsibilities depend on the property and the agreement.
            </p>
          </InfoSection>

          <InfoSection title="Records and access">
            <p>
              Tenancy, owner and financial information is not part of the public
              listings on this site. Where an owner portal is used, access is
              issued by the agency rather than through public sign-up. Read the{" "}
              <Link href="/privacy" className="text-danwell-teal hover:underline">
                privacy page
              </Link>{" "}
              for general information about how submitted details are handled.
            </p>
          </InfoSection>
        </div>

        <RelatedLinks
          links={[
            { href: "/faq", label: "Frequently asked questions" },
            { href: "/commercial-guidance", label: "Commercial guidance" },
            { href: "/privacy", label: "Privacy policy" },
          ]}
        />

        <GeneralInformationNotice>
          This page is general information, not legal, tax or financial advice.
          It does not create a management agreement or guarantee any outcome.
        </GeneralInformationNotice>

        <InfoActions
          links={[
            { href: "/contact", label: "Discuss your property", primary: true },
            { href: "/faq", label: "Read the FAQs" },
          ]}
        />
      </div>
    </>
  );
}
