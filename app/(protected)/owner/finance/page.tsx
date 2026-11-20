import { Suspense } from "react";
import Link from "next/link";
import { PortalDetail, PortalDetailList } from "@/components/portal/portal-detail-list";
import { PortalLoading } from "@/components/portal/portal-loading";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import { PortalStatCard } from "@/components/portal/portal-stat-card";
import { OwnerFinanceTable } from "@/components/portal/owner/owner-tables";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withRoles } from "@/lib/auth/guards";
import { ROLES } from "@/lib/auth/roles";
import { formatDate, formatMoney, firstParam } from "@/lib/tenancy/constants";
import {
  loadOwnerPortal,
  loadOwnerStatement,
  summarizeOwnerFinance,
} from "@/lib/portal/owner";

type OwnerFinancePageProps = {
  searchParams: Promise<{ propertyId?: string | string[] }>;
};

export default function OwnerFinancePage({ searchParams }: OwnerFinancePageProps) {
  return (
    <Suspense fallback={<PortalLoading label="Loading financial summaries..." />}>
      <OwnerFinanceContent searchParams={searchParams} />
    </Suspense>
  );
}

async function OwnerFinanceContent({ searchParams }: OwnerFinancePageProps) {
  const requestedPropertyId = firstParam((await searchParams).propertyId);

  const data = await withRoles(
    [ROLES.OWNER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
    async (_context, supabase) => {
      const portal = await loadOwnerPortal(supabase, _context.userId);
      const propertyId =
        requestedPropertyId && portal.ownership.has(requestedPropertyId)
          ? requestedPropertyId
          : undefined;

      const statement = propertyId
        ? await loadOwnerStatement(supabase, portal.ownership, propertyId)
        : [];

      return { ...portal, propertyId, statement };
    },
  );

  const totals = summarizeOwnerFinance(data.finance);
  const selected = data.properties.find(
    (property) => property.id === data.propertyId,
  );

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="Owner finance"
        title="Rental income & statements"
        description="Aggregate rent and payment information for your verified properties only."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <PortalStatCard label="Rent billed" value={formatMoney(totals.billed)} accent="navy" />
        <PortalStatCard label="Rent collected" value={formatMoney(totals.collected)} accent="teal" />
        <PortalStatCard
          label="Outstanding rent"
          value={formatMoney(totals.outstanding)}
          accent="gold"
        />
        <PortalStatCard
          label="Deposits held"
          value={formatMoney(totals.depositsHeld)}
          hint={`${formatMoney(totals.depositsOutstanding)} outstanding`}
          accent="navy"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Payment summary</CardTitle>
          <CardDescription>
            {totals.paymentCount} payment record(s) and {totals.receiptCount} receipt(s)
            across your portfolio. Individual tenant payment details are not exposed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.finance.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No finance summaries are available yet. The owner finance migration
              may still be pending.
            </p>
          ) : (
            <OwnerFinanceTable rows={data.finance} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">
            Property financial statement
          </CardTitle>
          <CardDescription>
            Choose one of your properties to view its monthly statement.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/owner/finance"
              className={`inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium ${
                data.propertyId
                  ? "text-danwell-navy hover:bg-muted"
                  : "border-danwell-navy bg-danwell-navy text-white"
              }`}
            >
              All properties
            </Link>
            {data.properties.map((property) => (
              <Link
                key={property.id}
                href={`/owner/finance?propertyId=${property.id}`}
                className={`inline-flex h-8 items-center rounded-lg border px-3 text-sm font-medium ${
                  data.propertyId === property.id
                    ? "border-danwell-navy bg-danwell-navy text-white"
                    : "text-danwell-navy hover:bg-muted"
                }`}
              >
                {property.title}
              </Link>
            ))}
          </div>

          {data.properties.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No verified properties are linked to your account.
            </p>
          ) : !data.propertyId ? (
            <p className="text-sm text-muted-foreground">
              Select a property above to view its statement.
            </p>
          ) : data.statement.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No statement rows are available for {selected?.title ?? "this property"}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 pr-4 font-medium">Period</th>
                    <th className="pb-2 pr-4 text-right font-medium">Billed</th>
                    <th className="pb-2 pr-4 text-right font-medium">Collected</th>
                    <th className="pb-2 text-right font-medium">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {data.statement.map((row) => (
                    <tr key={row.period_month} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-medium">
                        {formatDate(`${row.period_month}-01`)}
                      </td>
                      <td className="py-2 pr-4 text-right">{formatMoney(row.billed)}</td>
                      <td className="py-2 pr-4 text-right">{formatMoney(row.collected)}</td>
                      <td className="py-2 text-right font-medium">
                        {formatMoney(row.outstanding)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selected ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">
              Selected property
            </CardTitle>
            <CardDescription>{selected.title}</CardDescription>
          </CardHeader>
          <CardContent>
            <PortalDetailList columns="sm:grid-cols-3">
              <PortalDetail label="Location" value={`${selected.town}, ${selected.county}`} />
              <PortalDetail label="Units" value={selected.occupancy.total} />
              <PortalDetail
                label="Occupied"
                value={`${selected.occupancy.occupied} / ${selected.occupancy.total}`}
              />
            </PortalDetailList>
            <Link
              href={`/owner/properties/${selected.id}`}
              className="mt-4 inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium text-danwell-navy hover:bg-muted"
            >
              Open property details
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
