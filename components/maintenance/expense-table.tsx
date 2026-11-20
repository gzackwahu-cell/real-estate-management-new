import Link from "next/link";
import { StatusBadge } from "@/components/portfolio/status-badge";
import {
  formatDate,
  formatMoney,
  labelFor,
  EXPENSE_CATEGORIES,
} from "@/lib/maintenance/constants";
import type { ExpenseRecord } from "@/lib/maintenance/validation";

type ExpenseTableProps = {
  expenses: ExpenseRecord[];
  limit?: number;
  showEdit?: boolean;
};

export function ExpenseTable({ expenses, limit, showEdit = true }: ExpenseTableProps) {
  const rows = typeof limit === "number" ? expenses.slice(0, limit) : expenses;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Date</th>
            <th className="py-2 pr-3 font-medium">Description</th>
            <th className="py-2 pr-3 font-medium">Property</th>
            <th className="py-2 pr-3 font-medium">Linked request</th>
            <th className="py-2 pr-3 font-medium">Type</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium">Amount</th>
            {showEdit ? <th className="py-2 font-medium">Action</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((expense) => (
            <tr key={expense.id} className="border-b last:border-0">
              <td className="py-3 pr-3">{formatDate(expense.expense_date)}</td>
              <td className="py-3 pr-3">
                <p className="font-medium text-danwell-navy">{expense.description}</p>
                <p className="text-xs text-muted-foreground">
                  {expense.vendor || "No vendor recorded"}
                </p>
              </td>
              <td className="py-3 pr-3">
                {expense.properties?.title ?? "Property record"}
              </td>
              <td className="py-3 pr-3">
                {expense.maintenance_requests ? (
                  <Link
                    href={`/dashboard/maintenance/requests/${expense.maintenance_requests.id}`}
                    className="text-danwell-teal hover:underline"
                  >
                    {expense.maintenance_requests.title}
                  </Link>
                ) : (
                  "Not linked"
                )}
              </td>
              <td className="py-3 pr-3">
                {labelFor(EXPENSE_CATEGORIES, expense.category)}
              </td>
              <td className="py-3 pr-3">
                <StatusBadge
                  label={expense.payment_status.replace("_", " ")}
                  tone={
                    expense.payment_status === "paid"
                      ? "positive"
                      : expense.payment_status === "partial"
                        ? "warning"
                        : "muted"
                  }
                />
              </td>
              <td className="py-3 pr-3 font-medium">{formatMoney(expense.amount)}</td>
              {showEdit ? (
                <td className="py-3">
                  <Link
                    href={`/dashboard/maintenance/expenses/${expense.id}`}
                    className="text-sm text-danwell-teal hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
