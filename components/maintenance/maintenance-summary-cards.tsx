import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/maintenance/constants";
import type { MaintenanceSummary } from "@/lib/maintenance/queries";

type MaintenanceSummaryCardsProps = {
  summary: MaintenanceSummary;
};

export function MaintenanceSummaryCards({ summary }: MaintenanceSummaryCardsProps) {
  const cards = [
    {
      title: "Total requests",
      value: String(summary.total),
      description: "In the selected scope",
    },
    {
      title: "Open",
      value: String(summary.open),
      description: "Awaiting completion or cancellation",
    },
    {
      title: "High priority",
      value: String(summary.highPriority),
      description: "High and emergency requests",
    },
    {
      title: "Completed",
      value: String(summary.completed),
      description: "Resolved and closed",
    },
    {
      title: "Maintenance spend",
      value: formatMoney(summary.expenseTotal),
      description: "Separate from rent and tenant balances",
    },
    {
      title: "Unpaid expenses",
      value: formatMoney(summary.unpaidExpenses),
      description: "Unpaid and partially paid costs",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-danwell-navy">{card.title}</CardTitle>
            <CardDescription>{card.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold text-danwell-navy">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
