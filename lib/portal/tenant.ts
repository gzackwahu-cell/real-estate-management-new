import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getTenantStatement,
  summarizeLedger,
  type ChargeWithBalance,
  type DepositWithBalance,
  type FinanceLedger,
  type FinanceSummary,
  type PaymentWithCredit,
} from "@/lib/finance/queries";
import { getMaintenanceRequests } from "@/lib/maintenance/queries";
import {
  loadAttachmentViews,
  type AttachmentView,
} from "@/lib/portfolio/attachment-queries";
import type {
  MaintenanceNotification,
  MaintenanceRecord,
} from "@/lib/maintenance/validation";
import { getTenantPortalData } from "@/lib/tenancy/queries";
import type { LeaseRecord, TenantRecord } from "@/lib/tenancy/validation";
import { getPortalNotifications } from "./shared";

export type TenantPortalData = {
  tenant: TenantRecord;
  leases: LeaseRecord[];
  ledger: FinanceLedger | null;
  summary: FinanceSummary | null;
  requests: MaintenanceRecord[];
  notifications: MaintenanceNotification[];
  leaseAttachments: Record<string, AttachmentView[]>;
};

/**
 * Loads only the signed-in tenant's own records. Optional finance and
 * maintenance tables may still be unapplied locally, so those reads degrade to
 * empty values rather than taking down the whole portal.
 */
export async function loadTenantPortal(
  supabase: SupabaseClient,
  userId: string,
): Promise<TenantPortalData | null> {
  const portal = await getTenantPortalData(supabase, userId);
  if (!portal) {
    return null;
  }

  const [financeResult, requestsResult, notifications, attachmentPairs] =
    await Promise.all([
      getTenantStatement(supabase, portal.tenant.id)
        .then((ledger) => ({ ledger, summary: summarizeLedger(ledger) }))
        .catch(() => null),
      getMaintenanceRequests(supabase, { tenantId: portal.tenant.id }).catch(
        () => [] as MaintenanceRecord[],
      ),
      getPortalNotifications(supabase),
      Promise.all(
        portal.leases.map(async (lease) => ({
          leaseId: lease.id,
          attachments: await loadAttachmentViews(supabase, "lease", lease.id).catch(
            () => [] as AttachmentView[],
          ),
        })),
      ),
    ]);

  const leaseAttachments = Object.fromEntries(
    attachmentPairs.map((pair) => [pair.leaseId, pair.attachments]),
  );

  return {
    ...portal,
    ledger: financeResult?.ledger ?? null,
    summary: financeResult?.summary ?? null,
    requests: requestsResult,
    notifications,
    leaseAttachments,
  };
}

export function tenantCharges(
  ledger: FinanceLedger | null,
): ChargeWithBalance[] {
  return ledger?.charges ?? [];
}

export function tenantPayments(
  ledger: FinanceLedger | null,
): PaymentWithCredit[] {
  return ledger?.payments ?? [];
}

export function tenantDeposits(
  ledger: FinanceLedger | null,
): DepositWithBalance[] {
  return ledger?.deposits ?? [];
}
