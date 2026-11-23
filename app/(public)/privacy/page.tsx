import type { Metadata } from "next";
import { AGENCY } from "@/lib/constants/agency";
import {
  GeneralInformationNotice,
  InfoActions,
  InfoPageHeader,
  InfoSection,
  RelatedLinks,
} from "@/components/public/info/info-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "General information about how details submitted through the Danwell public website are handled.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <InfoPageHeader
        eyebrow="Legal and policies"
        title="Privacy policy"
        description="This page explains, in general terms, how information submitted through the public Danwell website is handled. Private tenant, owner and staff areas are access-controlled separately."
      />

      <div className="mx-auto w-full max-w-4xl px-4 pb-12">
        <div className="py-4">
          <InfoSection title="Information you may provide">
            <p>
              Public forms may ask for your name, phone number, email address,
              the property you are interested in, preferred viewing times and
              the message you choose to send. Please only share what is needed
              for your enquiry. Documents should be sent only when requested
              through an agreed channel.
            </p>
          </InfoSection>

          <InfoSection title="How information is used">
            <p>
              Details you submit are used to respond to enquiries, arrange
              viewings, keep appropriate business records and respond to
              questions about the services described on this website. Information
              from a public form is not used to grant access to private portals.
            </p>
          </InfoSection>

          <InfoSection title="Sharing and retention">
            <p>
              Information is shared only with authorized people and service
              providers where needed to handle your request, or where applicable
              law requires it. It is not sold. Records are kept for as long as
              they are needed for the purpose they were collected for and for
              any applicable record-keeping requirements; ask Danwell for the
              practice that applies to your case.
            </p>
          </InfoSection>

          <InfoSection title="Security and your choices">
            <p>
              Access to private systems is limited to authorized users, but no
              online service can promise absolute security. You can ask about
              the information held about you, request corrections, or ask about
              deleting information that is no longer needed. Any such request
              is handled in line with applicable law and Danwell&apos;s current
              process.
            </p>
          </InfoSection>

          <InfoSection title="Cookies and contact">
            <p>
              A website may need basic technical storage to operate. For details
              of current cookies, analytics or the handling of a specific
              request, contact Danwell using the details below or through the{" "}
              <a
                href={AGENCY.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-danwell-teal hover:underline"
              >
                phone and WhatsApp line
              </a>{" "}
              or{" "}
              <a
                href={`mailto:${AGENCY.email}`}
                className="text-danwell-teal hover:underline"
              >
                {AGENCY.email}
              </a>
              .
            </p>
          </InfoSection>
        </div>

        <RelatedLinks
          links={[
            { href: "/terms", label: "Terms of use" },
            { href: "/refund", label: "Refund policy" },
            { href: "/faq", label: "Frequently asked questions" },
          ]}
        />

        <GeneralInformationNotice>
          This is a general template for public information, not legal advice or
          a binding privacy notice. Ask Danwell for the policy that currently
          applies to your interaction with the agency.
        </GeneralInformationNotice>

        <InfoActions
          links={[
            { href: "/contact", label: "Contact Danwell", primary: true },
            { href: "/faq", label: "Read the FAQs" },
          ]}
        />
      </div>
    </>
  );
}
