import { ContactManagementCard } from "@/components/portal/contact-management-card";
import { NoticeList } from "@/components/portal/notice-list";
import { PortalPageHeader } from "@/components/portal/portal-page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { withRoles } from "@/lib/auth/guards";
import { ROLES } from "@/lib/auth/roles";
import { getPortalNotifications } from "@/lib/portal/shared";

export default async function TenantNoticesPage() {
  const notifications = await withRoles(
    [ROLES.TENANT, ROLES.SUPER_ADMIN, ROLES.ADMIN],
    (_context, supabase) => getPortalNotifications(supabase, 30),
  );

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="My tenancy"
        title="Notices & notifications"
        description="Important messages prepared for your account only."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">
              Notification inbox
            </CardTitle>
            <CardDescription>
              Maintenance and account notices for your profile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <NoticeList notifications={notifications} />
          </CardContent>
        </Card>

        <ContactManagementCard />
      </div>
    </div>
  );
}
