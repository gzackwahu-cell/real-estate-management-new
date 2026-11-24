import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { withPermission } from "@/lib/auth/guards";

export default async function AuditLogsPage() {
  await withPermission("users_roles", "view", async () => null);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Audit Logs"
        description="Review administrative and system activity. Detailed audit event storage can be expanded here as event capture is enabled."
      />
      <Card>
        <CardHeader>
          <CardTitle>Audit trail</CardTitle>
          <CardDescription>
            Core actions are protected by server-side permission checks and recorded through application workflows.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No dedicated audit log table is currently configured in this environment. Permission checks, RLS policies, and workflow records remain active across finance, tenancy, maintenance, listings, and staff management.
        </CardContent>
      </Card>
    </div>
  );
}
