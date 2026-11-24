import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { withPermission } from "@/lib/auth/guards";

export default async function SettingsPage() {
  await withPermission("users_roles", "view", async () => null);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Manage system configuration, access, and operational defaults from the areas below."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Staff & access</CardTitle>
            <CardDescription>Manage users, roles, and permission assignments.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/staff" className="text-sm font-medium text-danwell-teal hover:underline">
              Open Staff & access
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Locations</CardTitle>
            <CardDescription>Manage counties and areas used across listings and records.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/locations" className="text-sm font-medium text-danwell-teal hover:underline">
              Open Locations
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Review system notifications and communication activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/notifications" className="text-sm font-medium text-danwell-teal hover:underline">
              Open Notifications
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>System configuration</CardTitle>
            <CardDescription>Environment and integration status for deployment-managed settings.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/system" className="text-sm font-medium text-danwell-teal hover:underline">
              Open System Configuration
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
