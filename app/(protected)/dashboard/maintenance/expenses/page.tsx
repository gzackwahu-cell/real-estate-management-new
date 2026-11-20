import { Suspense } from "react";
import { ExpenseForm } from "@/components/maintenance/expense-form";
import { ExpenseTable } from "@/components/maintenance/expense-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import { formatMoney } from "@/lib/maintenance/constants";
import {
  getMaintenanceExpenses,
  getMaintenanceFilterOptions,
  getMaintenanceRequests,
} from "@/lib/maintenance/queries";

export default function MaintenanceExpensesPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading expenses...</p>}>
      <MaintenanceExpensesContent />
    </Suspense>
  );
}

async function MaintenanceExpensesContent() {
  const canCreate = await hasPermission("expenses", "create");
  const canEdit = await hasPermission("expenses", "edit");

  const data = await withPermission("expenses", "view", async (_context, supabase) => {
    const [expenses, options, requests] = await Promise.all([
      getMaintenanceExpenses(supabase),
      getMaintenanceFilterOptions(supabase),
      getMaintenanceRequests(supabase),
    ]);
    return { expenses, options, requests };
  });

  const total = data.expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const unpaid = data.expenses
    .filter((expense) => expense.payment_status !== "paid")
    .reduce((sum, expense) => sum + Number(expense.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
          Maintenance
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Expenses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Repair, materials, labour and other costs. This ledger is separate from rent payments
          and tenant balances.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-danwell-navy">Total recorded</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatMoney(total)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-danwell-navy">Unpaid / partial</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{formatMoney(unpaid)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-danwell-navy">Records</CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">{data.expenses.length}</CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {canCreate ? (
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg text-danwell-navy">Record expense</CardTitle>
              <CardDescription>
                Finance and administrator permissions are required to save costs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExpenseForm
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
        ) : null}

        <Card className={canCreate ? "lg:col-span-2" : "lg:col-span-3"}>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">Expense history</CardTitle>
            <CardDescription>
              {canEdit ? "Edit is restricted to authorized finance/admin staff." : "Read-only view."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">No maintenance expenses recorded yet.</p>
            ) : (
              <ExpenseTable expenses={data.expenses} showEdit={canEdit} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
