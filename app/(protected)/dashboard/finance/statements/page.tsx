import { Suspense } from "react";
import { EmptyState } from "@/components/portfolio/empty-state";
import {
  AdjustmentTable,
  ChargeTable,
  DepositTable,
  PaymentTable,
  ReceiptTable,
  ReversalTable,
} from "@/components/finance/finance-tables";
import { PrintButton } from "@/components/finance/print-button";
import { SummaryCards } from "@/components/finance/summary-cards";
import { FormField } from "@/components/portfolio/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withPermission } from "@/lib/auth/guards";
import { firstParam, isPeriod } from "@/lib/finance/constants";
import {
  getFinanceFilterOptions,
  getLeaseOptions,
  getLeaseStatement,
  getTenantStatement,
  summarizeLedger,
  type FinanceFilterOptions,
  type FinanceLedger,
} from "@/lib/finance/queries";
import type { EmbeddedLease } from "@/lib/finance/validation";
import { z } from "zod";

type StatementsPageProps = {
  searchParams: Promise<{
    tenantId?: string | string[];
    leaseId?: string | string[];
    period?: string | string[];
  }>;
};

export default function StatementsPage({ searchParams }: StatementsPageProps) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading statement...</p>}>
      <StatementsContent searchParams={searchParams} />
    </Suspense>
  );
}

function validId(value: string | undefined): string | undefined {
  return value && z.uuid().safeParse(value).success ? value : undefined;
}

async function StatementsContent({ searchParams }: StatementsPageProps) {
  const params = await searchParams;
  const rawPeriod = firstParam(params.period);
  const period = rawPeriod && isPeriod(rawPeriod) ? rawPeriod : undefined;
  const tenantId = validId(firstParam(params.tenantId));
  const leaseId = validId(firstParam(params.leaseId));

  const data = await withPermission("payments", "view", async (_context, supabase) => {
    const [options, leases] = await Promise.all([
      getFinanceFilterOptions(supabase),
      getLeaseOptions(supabase),
    ]);

    let ledger: FinanceLedger | null = null;
    if (leaseId) {
      ledger = await getLeaseStatement(supabase, leaseId, period);
    } else if (tenantId) {
      ledger = await getTenantStatement(supabase, tenantId, period);
    }

    return { options, leases, ledger };
  });

  const { options, leases, ledger } = data;
  const selectedTenant = options.tenants.find((tenant) => tenant.id === tenantId);
  const selectedLease = leases.find((lease) => lease.id === leaseId);
  const subject = selectedLease
    ? `${selectedLease.tenants?.full_name ?? "Tenant"} · ${
        selectedLease.units?.unit_number ?? "Unit"
      }`
    : selectedTenant?.full_name ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
            Account statements
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Statements</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Charges, payments, deposits and receipts for one tenant or one lease.
          </p>
        </div>
        {ledger ? <PrintButton label="Print statement" /> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatementPicker
          title="Tenant statement"
          description="All leases linked to one tenant."
          action="/dashboard/finance/statements"
          hiddenName="tenantId"
          options={options}
          selectedValue={tenantId ?? ""}
          period={period ?? ""}
          submitLabel="View tenant statement"
        />
        <LeasePicker
          leases={leases}
          selectedValue={leaseId ?? ""}
          period={period ?? ""}
        />
      </div>

      {!ledger ? (
        <Card className="border-dashed border-danwell-navy/20">
          <CardContent className="px-4 py-8 text-center">
            <p className="font-medium text-danwell-navy">Select a tenant or lease</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a statement above to view the full financial record.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-danwell-navy">
                Statement for {subject ?? "selected account"}
              </CardTitle>
              <CardDescription>
                {leaseId ? "Single lease" : "All tenant leases"} · {period ?? "all periods"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SummaryCards
                summary={summarizeLedger(ledger)}
                period={period}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-danwell-navy">Rent charges and payments</CardTitle>
              <CardDescription>Per-period billing and collection record.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {ledger.charges.length === 0 ? (
                <EmptyState
                  title="No charges"
                  description="No rent charges were found for this selection."
                />
              ) : (
                <ChargeTable charges={ledger.charges} />
              )}
              {ledger.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments found.</p>
              ) : (
                <PaymentTable payments={ledger.payments} />
              )}
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-danwell-navy">Deposits</CardTitle>
                <CardDescription>Required, held and outstanding amounts.</CardDescription>
              </CardHeader>
              <CardContent>
                {ledger.deposits.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No deposit records found.</p>
                ) : (
                  <DepositTable deposits={ledger.deposits} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-danwell-navy">Receipts</CardTitle>
                <CardDescription>Numbered proof of payment.</CardDescription>
              </CardHeader>
              <CardContent>
                {ledger.receipts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No receipts found.</p>
                ) : (
                  <ReceiptTable receipts={ledger.receipts} />
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-danwell-navy">Reversals</CardTitle>
                <CardDescription>Corrections retained in the record.</CardDescription>
              </CardHeader>
              <CardContent>
                {ledger.reversals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No reversals recorded.</p>
                ) : (
                  <ReversalTable reversals={ledger.reversals} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-danwell-navy">Adjustments</CardTitle>
                <CardDescription>Audited charge and allocation changes.</CardDescription>
              </CardHeader>
              <CardContent>
                {ledger.adjustments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No adjustments recorded.</p>
                ) : (
                  <AdjustmentTable adjustments={ledger.adjustments} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function StatementPicker({
  title,
  description,
  action,
  hiddenName,
  options,
  selectedValue,
  period,
  submitLabel,
}: {
  title: string;
  description: string;
  action: string;
  hiddenName: "tenantId";
  options: FinanceFilterOptions;
  selectedValue: string;
  period: string;
  submitLabel: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-danwell-navy">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} method="get" className="space-y-4">
          <FormField name={hiddenName} label="Tenant">
            <Select id={hiddenName} name={hiddenName} defaultValue={selectedValue} required>
              <option value="">Select a tenant</option>
              {options.tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.full_name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField name="period" label="Period (optional)">
            <Input id="period" name="period" type="month" defaultValue={period} />
          </FormField>
          <Button type="submit">{submitLabel}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function LeasePicker({
  leases,
  selectedValue,
  period,
}: {
  leases: EmbeddedLease[];
  selectedValue: string;
  period: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-danwell-navy">Lease statement</CardTitle>
        <CardDescription>One lease, including its deposits and receipts.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action="/dashboard/finance/statements" method="get" className="space-y-4">
          <FormField name="leaseId" label="Lease">
            <Select id="leaseId" name="leaseId" defaultValue={selectedValue} required>
              <option value="">Select a lease</option>
              {leases.map((lease) => (
                <option key={lease.id} value={lease.id}>
                  {lease.tenants?.full_name ?? "Tenant"} ·{" "}
                  {lease.units?.unit_number ?? "Unit"} · {lease.status}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField name="period" label="Period (optional)">
            <Input id="period" name="period" type="month" defaultValue={period} />
          </FormField>
          <Button type="submit">View lease statement</Button>
        </form>
      </CardContent>
    </Card>
  );
}
