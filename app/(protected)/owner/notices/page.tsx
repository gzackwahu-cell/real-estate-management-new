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

export default async function OwnerNoticesPage() {
  const notifications = await withRoles(
    [ROLES.OWNER, ROLES.SUPER_ADMIN, ROLES.ADMIN],
    (_context, supabase) => getPortalNotifications(supabase, 30),
  );

  return (
    <div className="space-y-6">
      <PortalPageHeader
        eyebrow="Owner notices"
        title="Notices & notifications"
        description="Messages prepared for your account. Only your own notifications are loaded."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">
              Notification inbox
            </CardTitle>
            <CardDescription>
              Latest maintenance and account notices.
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
