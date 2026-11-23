import type { ReactNode } from "react";
import Link from "next/link";

type Faq = {
  question: string;
  answer: ReactNode;
};

type FaqGroup = {
  title: string;
  items: readonly Faq[];
};

const groups: readonly FaqGroup[] = [
  {
    title: "Renting and buying",
    items: [
      {
        question: "Where can I see available properties?",
        answer: (
          <>
            Browse the published{" "}
            <Link href="/properties/rent" className="text-danwell-teal hover:underline">
              rentals
            </Link>{" "}
            and{" "}
            <Link href="/properties/sale" className="text-danwell-teal hover:underline">
              properties for sale
            </Link>
            . Listings show marketing information only, so please confirm current
            availability with Danwell through the{" "}
            <Link href="/contact" className="text-danwell-teal hover:underline">
              contact page
            </Link>
            .
          </>
        ),
      },
      {
        question: "Can I rely on the details in a listing?",
        answer: (
          <>
            Listing details such as photos, prices, measurements and availability
            can change. Treat them as a starting point and confirm anything
            important in writing. You can use the{" "}
            <Link href="/enquire" className="text-danwell-teal hover:underline">
              enquiry form
            </Link>{" "}
            or contact Danwell directly.
          </>
        ),
      },
      {
        question: "What should I check before sending money?",
        answer: (
          <>
            Confirm the property, who is authorized to deal with it and the
            payment channel directly with Danwell through the{" "}
            <Link href="/contact" className="text-danwell-teal hover:underline">
              contact page
            </Link>
            . Do not act on payment instructions received only in a social
            message, and do not pay on the strength of a listing alone. The
            public website does not collect payments; see the{" "}
            <Link href="/refund" className="text-danwell-teal hover:underline">
              refund information
            </Link>
            .
          </>
        ),
      },
    ],
  },
  {
    title: "Viewings and applications",
    items: [
      {
        question: "How do I request a viewing?",
        answer: (
          <>
            Use the{" "}
            <Link href="/viewings/request" className="text-danwell-teal hover:underline">
              viewing request form
            </Link>{" "}
            and select a published property. Danwell confirms availability
            before a viewing is arranged. If you are not sure which property
            suits you, send your requirements through the{" "}
            <Link href="/contact" className="text-danwell-teal hover:underline">
              contact page
            </Link>
            .
          </>
        ),
      },
      {
        question: "What happens after I send an enquiry?",
        answer: (
          <>
            An authorized staff member reviews the enquiry and responds using
            the contact details you provided. Basic information about how
            enquiry details are handled is on the{" "}
            <Link href="/privacy" className="text-danwell-teal hover:underline">
              privacy page
            </Link>
            .
          </>
        ),
      },
      {
        question: "What documents will I need?",
        answer: (
          <>
            Requirements depend on the property and the type of transaction.
            Ask Danwell for the current checklist through the{" "}
            <Link href="/contact" className="text-danwell-teal hover:underline">
              contact page
            </Link>{" "}
            before sending copies of personal documents.
          </>
        ),
      },
      {
        question: "Does an enquiry or viewing reserve a property?",
        answer: (
          <>
            No. Browsing, enquiring or attending a viewing does not reserve a
            property, create a tenancy or form a sale agreement. Any terms must
            be agreed in writing with Danwell.
          </>
        ),
      },
    ],
  },
  {
    title: "Owners and management",
    items: [
      {
        question: "What property management help is available?",
        answer: (
          <>
            The{" "}
            <Link href="/owner-information" className="text-danwell-teal hover:underline">
              owner information page
            </Link>{" "}
            outlines a typical management workflow, from the first conversation
            through tenant sourcing, lease administration and reporting. The
            exact scope is agreed with Danwell for each property.
          </>
        ),
      },
      {
        question: "How is my property and tenant information kept private?",
        answer: (
          <>
            Public pages show marketing listings only; tenancy, owner and
            financial records are not published. Portal access is issued by the
            agency rather than opened to public sign-up. See the{" "}
            <Link href="/privacy" className="text-danwell-teal hover:underline">
              privacy page
            </Link>{" "}
            for more detail.
          </>
        ),
      },
    ],
  },
  {
    title: "Fees and payments",
    items: [
      {
        question: "Where can I find fees?",
        answer: (
          <>
            This website does not publish a fee schedule. Fees and their scope
            depend on the service and property, so ask Danwell for current
            information through the{" "}
            <Link href="/contact" className="text-danwell-teal hover:underline">
              contact page
            </Link>{" "}
            before you commit to anything.
          </>
        ),
      },
      {
        question: "Does this website take rent, deposits or service charges?",
        answer: (
          <>
            No. The public website is for information and enquiries only. Ask
            Danwell directly which payment channels are authorized for your
            property, and keep your own receipts and records.
          </>
        ),
      },
      {
        question: "How do I ask about a refund?",
        answer: (
          <>
            See the{" "}
            <Link href="/refund" className="text-danwell-teal hover:underline">
              refund information
            </Link>{" "}
            page, then contact Danwell with the relevant details. Any outcome
            depends on the applicable agreement and the circumstances; making
            an enquiry does not by itself create a refund entitlement.
          </>
        ),
      },
    ],
  },
];

export function FaqList() {
  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.title}>
          <h2 className="text-xl font-semibold tracking-tight text-danwell-navy md:text-2xl">
            {group.title}
          </h2>
          <div className="mt-4 space-y-3">
            {group.items.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-danwell-navy/10 bg-white p-5 shadow-sm"
              >
                <summary className="cursor-pointer list-none pr-6 font-semibold text-danwell-navy marker:content-none">
                  {item.question}
                </summary>
                <div className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
