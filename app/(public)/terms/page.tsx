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
  title: "Terms of Use",
  description:
    "General terms for using the public Danwell Property Management Agency website and its content.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <InfoPageHeader
        eyebrow="Legal and policies"
        title="Terms of use"
        description="These general terms explain what this public website is for and how its content should be used. They are information only and do not replace any agreement you make with Danwell."
      />

      <div className="mx-auto w-full max-w-4xl px-4 pb-12">
        <div className="py-4">
          <InfoSection title="About this website">
            <p>
              This website provides general information about Danwell Property
              Management Agency, published property listings and routes to
              contact the agency. Nothing on a public page is an offer, a
              reservation, a tenancy, a sale agreement or professional advice.
            </p>
          </InfoSection>

          <InfoSection title="Listings and accuracy">
            <p>
              Listing details, prices, photographs and availability are provided
              for guidance and may change. Confirm anything that matters to your
              decision in writing through the{" "}
              <a
                href={`mailto:${AGENCY.email}`}
                className="text-danwell-teal hover:underline"
              >
                contact channels
              </a>{" "}
              before making commitments or payments.
            </p>
          </InfoSection>

          <InfoSection title="Acceptable use">
            <p>
              Use the website and its forms only for lawful enquiries. Do not
              submit false or unlawful content, interfere with the operation of
              the site, attempt to access private areas, or use automated tools
              to extract data without permission. Access to private portals is
              issued by the agency; public sign-up is not available.
            </p>
          </InfoSection>

          <InfoSection title="Links and third parties">
            <p>
              Where the site links to external services, those services are
              controlled by their own providers and have their own terms.
              Danwell does not control content published outside this website.
            </p>
          </InfoSection>

          <InfoSection title="Changes and questions">
            <p>
              Pages may be updated from time to time. If anything on this site
              is unclear, or if you believe information is out of date, contact
              Danwell so the point can be checked. To the extent permitted by
              applicable law, the agency is not responsible for decisions made
              solely on the basis of general public content.
            </p>
          </InfoSection>
        </div>

        <RelatedLinks
          links={[
            { href: "/privacy", label: "Privacy policy" },
            { href: "/refund", label: "Refund policy" },
            { href: "/faq", label: "Frequently asked questions" },
          ]}
        />

        <GeneralInformationNotice>
          These terms are a general template, not legal advice, and they do not
          vary the terms of any lease, management agreement or sale transaction
          you enter into with Danwell.
        </GeneralInformationNotice>

        <InfoActions
          links={[
            { href: "/contact", label: "Ask a question", primary: true },
            { href: "/about", label: "About Danwell" },
          ]}
        />
      </div>
    </>
  );
}
