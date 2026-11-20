import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, formatPeriod } from "@/lib/finance/constants";
import type { FinanceSummary } from "@/lib/finance/queries";

type SummaryCardsProps = {
  summary: FinanceSummary;
  period?: string;
};

export function SummaryCards({ summary, period }: SummaryCardsProps) {
  const cards = [
    {
      title: "Rent billed",
      value: formatMoney(summary.totalBilled),
      description: formatPeriod(period),
    },
    {
      title: "Rent collected",
      value: formatMoney(summary.totalCollected),
      description: "Effective rent payments in period",
    },
    {
      title: "Outstanding rent",
      value: formatMoney(summary.outstandingRent),
      description: "Calculated from charges and allocations",
    },
    {
      title: "Partially paid",
      value: String(summary.partiallyPaidCharges),
      description: "Rent charges with a partial allocation",
    },
    {
      title: "Unallocated credit",
      value: formatMoney(summary.unallocatedPayments),
      description: "Rent payments not yet allocated",
    },
    {
      title: "Deposits held",
      value: formatMoney(summary.depositsHeld),
      description: `Outstanding ${formatMoney(summary.depositsOutstanding)}`,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs tracking-[0.14em] text-danwell-teal uppercase">
              {card.title}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-danwell-navy">{card.value}</p>
            <CardDescription className="mt-1 text-xs">{card.description}</CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
