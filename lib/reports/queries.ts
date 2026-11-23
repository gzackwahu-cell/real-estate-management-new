import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { hasPermission } from "@/lib/auth/dal";
import { firstParam, isPeriod } from "@/lib/finance/constants";
import {
  getFinanceDashboard,
  type FinanceFilters as FinanceFilterValues,
} from "@/lib/finance/queries";
import {
  listStaffEnquiries,
  listStaffListings,
  listStaffViewings,
} from "@/lib/listings/staff-queries";
import {
  getMaintenanceRequests,
  getMaintenanceSummary,
} from "@/lib/maintenance/queries";
import { getProperties } from "@/lib/portfolio/queries";
import { getApplications, getLeases } from "@/lib/tenancy/queries";

export type ReportFilters = {
  period?: string;
  propertyId?: string;
};

export type ReportSection<T> =
  | { state: "ready"; data: T }
  | { state: "denied"; message: string }
  | { state: "error"; message: string };

export type FinanceReport = {
  billed: number;
  collected: number;
  outstanding: number;
  depositsHeld: number;
  chargeCount: number;
  paymentCount: number;
  receiptCount: number;
  receipts: {
    id: string;
    number: string;
    issuedAt: string;
    amount: number;
    tenant: string | null;
  }[];
};

export type PortfolioReport = {
  total: number;
  active: number;
  counties: number;
  ownerLinks: number;
  options: { id: string; title: string }[];
  properties: {
    id: string;
    title: string;
    location: string;
    status: string;
    owners: number;
  }[];
};

export type TenancyReport = {
  leases: number;
  activeLeases: number;
  pendingApplications: number;
  monthlyRentRoll: number;
  recentLeases: {
    id: string;
    tenant: string;
    property: string;
    unit: string;
    status: string;
    startDate: string;
    monthlyRent: number;
  }[];
  recentApplications: {
    id: string;
    applicant: string;
    property: string;
    unit: string;
    status: string;
    applicationDate: string;
  }[];
};

export type MaintenanceReport = {
  total: number;
  open: number;
  highPriority: number;
  completed: number;
  expenseTotal: number;
  unpaidExpenses: number;
  requests: {
    id: string;
    title: string;
    property: string;
    status: string;
    priority: string;
    reportedDate: string;
  }[];
};

export type ListingsReport = {
  listings: number;
  published: number;
  featured: number;
  enquiries: number;
  viewings: number;
  items: {
    id: string;
    title: string;
    location: string;
    status: string;
    isPublished: boolean;
  }[];
  recentEnquiries: {
    id: string;
    name: string;
    listing: string;
    status: string;
    createdAt: string | null;
  }[];
  recentViewings: {
    id: string;
    name: string;
    listing: string;
    status: string;
    preferredDate: string | null;
  }[];
};

export type ReportSnapshot = {
  filters: ReportFilters;
  propertyOptions: { id: string; title: string }[];
  finance: ReportSection<FinanceReport>;
  portfolio: ReportSection<PortfolioReport>;
  tenancy: ReportSection<TenancyReport>;
  maintenance: ReportSection<MaintenanceReport>;
  listings: ReportSection<ListingsReport>;
};

const DENIED_MESSAGE =
  "Your role does not have the underlying module permission needed for this section.";
const ERROR_MESSAGE =
  "This section could not be loaded from its authorized data source.";

export function parseReportFilters(searchParams: {
  period?: string | string[];
  propertyId?: string | string[];
}): ReportFilters {
  const period = firstParam(searchParams.period);
  const propertyId = firstParam(searchParams.propertyId);

  return {
    period: period && isPeriod(period) ? period : undefined,
    propertyId:
      propertyId && z.uuid().safeParse(propertyId).success
        ? propertyId
        : undefined,
  };
}

async function loadSection<T>(
  allowed: boolean,
  loader: () => Promise<T>,
): Promise<ReportSection<T>> {
  if (!allowed) {
    return { state: "denied", message: DENIED_MESSAGE };
  }

  try {
    return { state: "ready", data: await loader() };
  } catch {
    return { state: "error", message: ERROR_MESSAGE };
  }
}

function inProperty<T extends { propertyId: string | null }>(
  rows: readonly T[],
  propertyId: string | undefined,
): T[] {
  return propertyId ? rows.filter((row) => row.propertyId === propertyId) : [...rows];
}

export async function getReportSnapshot(
  supabase: SupabaseClient,
  filters: ReportFilters,
): Promise<ReportSnapshot> {
  const [canViewFinance, canViewProperties, canViewLeases, canViewMaintenance, canViewListings] =
    await Promise.all([
      hasPermission("payments", "view"),
      hasPermission("properties", "view"),
      hasPermission("leases", "view"),
      hasPermission("maintenance", "view"),
      hasPermission("listings", "view"),
    ]);

  const financeFilters: FinanceFilterValues = {
    period: filters.period,
    propertyId: filters.propertyId,
  };

  const [finance, portfolio, tenancy, maintenance, listings] = await Promise.all([
    loadSection(canViewFinance, async () => {
      const { summary, ledger } = await getFinanceDashboard(supabase, financeFilters);
      return {
        billed: summary.totalBilled,
        collected: summary.totalCollected,
        outstanding: summary.outstandingRent,
        depositsHeld: summary.depositsHeld,
        chargeCount: ledger.charges.length,
        paymentCount: ledger.payments.length,
        receiptCount: ledger.receipts.length,
        receipts: ledger.receipts.slice(0, 5).map((receipt) => ({
          id: receipt.id,
          number: receipt.receipt_number,
          issuedAt: receipt.issued_at,
          amount: receipt.payments?.amount ?? 0,
          tenant: receipt.payments?.tenants?.full_name ?? null,
        })),
      } satisfies FinanceReport;
    }),
    loadSection(canViewProperties, async () => {
      const properties = await getProperties(supabase);
      const scoped = inProperty(
        properties.map((property) => ({
          propertyId: property.id,
          value: property,
        })),
        filters.propertyId,
      ).map((row) => row.value);

      return {
        total: scoped.length,
        active: scoped.filter((property) => property.status === "active").length,
        counties: new Set(scoped.map((property) => property.county)).size,
        ownerLinks: scoped.reduce((sum, property) => sum + property.owners.length, 0),
        options: properties.map((property) => ({
          id: property.id,
          title: property.title,
        })),
        properties: scoped.slice(0, 6).map((property) => ({
          id: property.id,
          title: property.title,
          location: [property.town, property.county].filter(Boolean).join(", "),
          status: property.status,
          owners: property.owners.length,
        })),
      } satisfies PortfolioReport;
    }),
    loadSection(canViewLeases, async () => {
      const [leases, applications] = await Promise.all([
        getLeases(supabase),
        getApplications(supabase),
      ]);
      const scopedLeases = inProperty(
        leases.map((lease) => ({
          propertyId: lease.units?.property_id ?? null,
          value: lease,
        })),
        filters.propertyId,
      ).map((row) => row.value);
      const scopedApplications = inProperty(
        applications.map((application) => ({
          propertyId: application.units?.property_id ?? null,
          value: application,
        })),
        filters.propertyId,
      ).map((row) => row.value);

      return {
        leases: scopedLeases.length,
        activeLeases: scopedLeases.filter((lease) => lease.status === "active").length,
        pendingApplications: scopedApplications.filter(
          (application) =>
            application.status === "pending" ||
            application.status === "under_review",
        ).length,
        monthlyRentRoll: scopedLeases
          .filter((lease) => lease.status === "active")
          .reduce((sum, lease) => sum + Number(lease.monthly_rent), 0),
        recentLeases: scopedLeases.slice(0, 5).map((lease) => ({
          id: lease.id,
          tenant: lease.tenants?.full_name ?? "Unassigned tenant",
          property: lease.units?.properties?.title ?? "Property record",
          unit: lease.units?.unit_number ?? "—",
          status: lease.status,
          startDate: lease.start_date,
          monthlyRent: Number(lease.monthly_rent),
        })),
        recentApplications: scopedApplications.slice(0, 5).map((application) => ({
          id: application.id,
          applicant: application.applicant_full_name,
          property: application.units?.properties?.title ?? "Property record",
          unit: application.units?.unit_number ?? "—",
          status: application.status,
          applicationDate: application.application_date,
        })),
      } satisfies TenancyReport;
    }),
    loadSection(canViewMaintenance, async () => {
      const [summary, requests] = await Promise.all([
        getMaintenanceSummary(supabase, { propertyId: filters.propertyId }),
        getMaintenanceRequests(supabase, { propertyId: filters.propertyId }),
      ]);

      return {
        total: summary.total,
        open: summary.open,
        highPriority: summary.highPriority,
        completed: summary.completed,
        expenseTotal: summary.expenseTotal,
        unpaidExpenses: summary.unpaidExpenses,
        requests: requests.slice(0, 5).map((request) => ({
          id: request.id,
          title: request.title,
          property: request.properties?.title ?? "Property record",
          status: request.status,
          priority: request.priority,
          reportedDate: request.reported_date,
        })),
      } satisfies MaintenanceReport;
    }),
    loadSection(canViewListings, async () => {
      const [listings, enquiries, viewings] = await Promise.all([
        listStaffListings(supabase),
        listStaffEnquiries(supabase),
        listStaffViewings(supabase),
      ]);
      const scopedListings = inProperty(
        listings.map((listing) => ({
          propertyId: listing.property_id,
          value: listing,
        })),
        filters.propertyId,
      ).map((row) => row.value);
      const listingIds = new Set(scopedListings.map((listing) => listing.id));

      return {
        listings: scopedListings.length,
        published: scopedListings.filter((listing) => listing.is_published).length,
        featured: scopedListings.filter((listing) => listing.is_featured).length,
        enquiries: enquiries.filter((enquiry) => listingIds.has(enquiry.listing_id)).length,
        viewings: viewings.filter((viewing) => listingIds.has(viewing.listing_id)).length,
        items: scopedListings.slice(0, 5).map((listing) => ({
          id: listing.id,
          title: listing.title,
          location: [listing.town, listing.county].filter(Boolean).join(", "),
          status: listing.status,
          isPublished: listing.is_published,
        })),
        recentEnquiries: enquiries
          .filter((enquiry) => listingIds.has(enquiry.listing_id))
          .slice(0, 5)
          .map((enquiry) => ({
            id: enquiry.id,
            name: enquiry.full_name,
            listing: enquiry.listings?.title ?? "Listing record",
            status: enquiry.status,
            createdAt: enquiry.created_at ?? null,
          })),
        recentViewings: viewings
          .filter((viewing) => listingIds.has(viewing.listing_id))
          .slice(0, 5)
          .map((viewing) => ({
            id: viewing.id,
            name: viewing.full_name,
            listing: viewing.listings?.title ?? "Listing record",
            status: viewing.status,
            preferredDate: viewing.preferred_date ?? null,
          })),
      } satisfies ListingsReport;
    }),
  ]);

  return {
    filters,
    propertyOptions: portfolio.state === "ready" ? portfolio.data.options : [],
    finance,
    portfolio,
    tenancy,
    maintenance,
    listings,
  };
}
