import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExpenseForm } from "@/components/maintenance/expense-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withPermission } from "@/lib/auth/guards";
import {
  getMaintenanceExpenses,
  getMaintenanceFilterOptions,
  getMaintenanceRequests,
} from "@/lib/maintenance/queries";

type ExpenseEditPageProps = {
  params: Promise<{ id: string }>;
};

export default function ExpenseEditPage({ params }: ExpenseEditPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading expense...</p>}>
      <ExpenseEditContent params={params} />
    </Suspense>
  );
}

async function ExpenseEditContent({ params }: ExpenseEditPageProps) {
  const { id } = await params;
  const data = await withPermission("expenses", "edit", async (_context, supabase) => {
    const [expenses, options, requests] = await Promise.all([
      getMaintenanceExpenses(supabase),
      getMaintenanceFilterOptions(supabase),
      getMaintenanceRequests(supabase),
    ]);
    return { expenses, options, requests };
  });

  const expense = data.expenses.find((item) => item.id === id);
  if (!expense) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
            Maintenance expenses
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Edit expense</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Changes are audited and restricted to authorized finance/admin staff.
          </p>
        </div>
        <Link
          href="/dashboard/maintenance/expenses"
          className="inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
        >
          Back to expenses
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">{expense.description}</CardTitle>
          <CardDescription>Update the recorded cost and payment status.</CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseForm
            expense={expense}
            properties={data.options.properties.map((property) => ({
              id: property.id,
              label: property.title,
            }))}
            requests={data.requests.map((request) => ({
              id: request.id,
              label: request.title,
              propertyId: request.property_id,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
