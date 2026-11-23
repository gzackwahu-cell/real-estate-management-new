import type { Metadata } from "next";
import { FaqList } from "@/components/public/info/faq-list";
import {
  GeneralInformationNotice,
  InfoActions,
  InfoPageHeader,
  RelatedLinks,
} from "@/components/public/info/info-page";

export const metadata: Metadata = {
  title: "Frequently Asked Questions",
  description:
    "General answers about renting, viewings, applications, owner management and fees with Danwell Property Management Agency.",
  alternates: { canonical: "/faq" },
};

export default function FaqPage() {
  return (
    <>
      <InfoPageHeader
        eyebrow="Helpful answers"
        title="Frequently asked questions"
        description="Short, general answers to the questions we are asked most often. For anything specific to a property, a tenancy or your own circumstances, please contact Danwell."
      />

      <div className="mx-auto w-full max-w-4xl px-4 pb-12">
        <div className="py-9">
          <FaqList />
        </div>

        <RelatedLinks
          links={[
            { href: "/tenant-information", label: "Tenant information" },
            { href: "/owner-information", label: "Owner information" },
            { href: "/privacy", label: "Privacy policy" },
            { href: "/refund", label: "Refund information" },
          ]}
        />

        <GeneralInformationNotice>
          These answers are general information, not legal or financial advice,
          and they do not form part of any agreement. Confirm details for your
          situation through the contact page.
        </GeneralInformationNotice>

        <InfoActions
          links={[
            { href: "/contact", label: "Ask Danwell", primary: true },
            { href: "/enquire", label: "Make an enquiry" },
          ]}
        />
      </div>
    </>
  );
}
