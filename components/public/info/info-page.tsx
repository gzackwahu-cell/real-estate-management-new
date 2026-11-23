import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { InfoLink } from "./info-links";

export function InfoPageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section className="border-b border-danwell-navy/10 bg-muted/40">
      <div className="mx-auto w-full max-w-4xl px-4 py-12">
        <p className="text-sm font-semibold tracking-wide text-danwell-teal uppercase">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-danwell-navy md:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
          {description}
        </p>
        {children}
      </div>
    </section>
  );
}

export function InfoSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-danwell-navy/10 py-9 last:border-b-0">
      <h2 className="text-xl font-semibold tracking-tight text-danwell-navy md:text-2xl">
        {title}
      </h2>
      <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

export function GeneralInformationNotice({
  children,
}: {
  children?: ReactNode;
}) {
  return (
    <div
      role="note"
      className="mt-6 rounded-xl border border-danwell-gold/50 bg-danwell-gold/10 p-4 text-sm leading-relaxed text-danwell-navy"
    >
      <p className="font-semibold">General information only</p>
      <p className="mt-1">
        {children ??
          "This page is general information, not legal advice. Please contact Danwell for information that applies to your circumstances."}
      </p>
    </div>
  );
}

export function InfoActions({
  links,
}: {
  links: readonly (InfoLink & { primary?: boolean })[];
}) {
  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {links.map((link) => (
        <Button
          key={link.href}
          asChild
          variant={link.primary ? "default" : "outline"}
          size="lg"
          className="h-10 px-5"
        >
          <Link href={link.href}>
            {link.label}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      ))}
    </div>
  );
}

export function RelatedLinks({
  title = "Useful links",
  links,
}: {
  title?: string;
  links: readonly InfoLink[];
}) {
  return (
    <section className="py-9">
      <h2 className="text-xl font-semibold tracking-tight text-danwell-navy md:text-2xl">
        {title}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {links.map((link) => (
          <Card key={link.href} size="sm" className="h-full">
            <CardHeader>
              <CardTitle>
                <Link
                  href={link.href}
                  className="inline-flex items-center gap-2 text-danwell-navy hover:text-danwell-teal hover:underline"
                >
                  {link.label}
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
              </CardTitle>
              {link.description ? (
                <CardDescription>{link.description}</CardDescription>
              ) : null}
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
