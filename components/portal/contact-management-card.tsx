import { AGENCY } from "@/lib/constants/agency";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function ContactManagementCard({
  description = "Questions about your property or account? Message the Danwell management team on WhatsApp.",
}: {
  description?: string;
}) {
  return (
    <Card className="border-l-4 border-l-danwell-gold">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-danwell-navy">
          Contact management
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <a
          href={AGENCY.whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-9 items-center rounded-lg bg-danwell-teal px-4 text-sm font-medium text-white transition-colors hover:bg-danwell-teal/90"
        >
          Chat on WhatsApp
        </a>
        <p className="text-xs text-muted-foreground">
          {AGENCY.name} · {AGENCY.whatsappNumber}
        </p>
      </CardContent>
    </Card>
  );
}
