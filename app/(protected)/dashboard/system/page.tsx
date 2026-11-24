import { PageHeader } from "@/components/admin/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { withPermission } from "@/lib/auth/guards";

export default async function SystemConfigurationPage() {
  await withPermission("users_roles", "view", async () => null);

  const checks = [
    { name: "Supabase URL", configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) },
    { name: "Supabase anon key", configured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) },
    { name: "Site URL", configured: Boolean(process.env.NEXT_PUBLIC_SITE_URL) },
    { name: "Upstash Redis URL", configured: Boolean(process.env.UPSTASH_REDIS_REST_URL) },
    { name: "Upstash Redis token", configured: Boolean(process.env.UPSTASH_REDIS_REST_TOKEN) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="System Configuration"
        description="Environment-level configuration status. Values are checked by presence only; secrets are never displayed."
      />
      <Card>
        <CardHeader>
          <CardTitle>Environment checks</CardTitle>
          <CardDescription>Presence-only checks for key integrations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {checks.map((check) => (
            <div key={check.name} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
              <span>{check.name}</span>
              <Badge tone={check.configured ? "positive" : "warning"}>
                {check.configured ? "Configured" : "Missing"}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
