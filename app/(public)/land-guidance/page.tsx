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
  title: "Land Buying Guidance",
  description:
    "General checks and questions to consider when looking at land for sale in Kenya.",
  alternates: { canonical: "/land-guidance" },
};

export default function LandGuidancePage() {
  return (
    <>
      <InfoPageHeader
        eyebrow="Buyer guidance"
        title="Land guidance"
        description="Buying land involves more than choosing a plot. The notes below are general points to raise and checks to consider; independent professional advice is recommended before you commit."
      />

      <div className="mx-auto w-full max-w-4xl px-4 pb-12">
        <div className="py-4">
          <InfoSection title="Confirm who can sell">
            <p>
              Check that the person offering the land is authorized to do so and
              that the title or ownership documents match what is being sold.
              Verify these details independently rather than relying only on
              marketing material. If anything is unclear, ask Danwell through
              the{" "}
              <Link href="/contact" className="text-danwell-teal hover:underline">
                contact page
              </Link>
              .
            </p>
          </InfoSection>

          <InfoSection title="Visit and check the land">
            <p>
              Visit the site in person, confirm boundaries and access, and
              consider whether a survey or official search is needed. Check
              planning or zoning conditions, existing use, utilities and any
              restrictions that could affect what you intend to do with the
              land.
            </p>
          </InfoSection>

          <InfoSection title="Paperwork and costs">
            <p>
              Understand the proposed written agreement, transfer requirements,
              taxes, rates, legal fees and any other costs before signing. Get
              qualified legal or conveyancing advice where appropriate, and
              keep copies of every document and receipt.
            </p>
          </InfoSection>

          <InfoSection title="Take your time">
            <p>
              Do not pay a deposit or transfer funds on the basis of a listing
              or a verbal promise alone. Confirm the payment channel and keep a
              record of what each payment is for. The public website does not
              collect payments.
            </p>
          </InfoSection>

          <InfoSection title="How Danwell can help">
            <p>
              Browse{" "}
              <Link href="/properties/sale" className="text-danwell-teal hover:underline">
                properties for sale
              </Link>
              , send an{" "}
              <Link href="/enquire" className="text-danwell-teal hover:underline">
                enquiry
              </Link>{" "}
              about a published listing, or{" "}
              <Link
                href="/viewings/request"
                className="text-danwell-teal hover:underline"
              >
                request a viewing
              </Link>{" "}
              to see the land before making decisions.
            </p>
          </InfoSection>
        </div>

        <RelatedLinks
          links={[
            { href: "/properties/sale", label: "Properties for sale" },
            { href: "/commercial-guidance", label: "Commercial guidance" },
            { href: "/faq", label: "Frequently asked questions" },
          ]}
        />

        <GeneralInformationNotice>
          This guidance is general information, not legal, surveying, planning
          or financial advice, and no outcome is guaranteed.
        </GeneralInformationNotice>

        <InfoActions
          links={[
            { href: "/properties/sale", label: "View land for sale", primary: true },
            { href: "/contact", label: "Ask Danwell" },
          ]}
        />
      </div>
    </>
  );
}
