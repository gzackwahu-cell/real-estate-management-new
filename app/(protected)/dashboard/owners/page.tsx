import { Suspense } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/portfolio/empty-state";
import { StatusBadge } from "@/components/portfolio/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { hasPermission } from "@/lib/auth/dal";
import { withPermission } from "@/lib/auth/guards";
import { setOwnerActiveAction } from "@/lib/portfolio/actions";
import { getOwners } from "@/lib/portfolio/queries";

export default function OwnersPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading owners...</p>}>
      <OwnersContent />
    </Suspense>
  );
}

async function OwnersContent() {
  const owners = await withPermission("owners", "view", async (_context, supabase) =>
    getOwners(supabase),
  );
  const canCreate = await hasPermission("owners", "create");
  const canEdit = await hasPermission("owners", "edit");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-danwell-teal uppercase">
            Portfolio
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-danwell-navy">Owners</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Register and maintain property owners and their contact details.
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/dashboard/owners/new">Register owner</Link>
          </Button>
        ) : null}
      </div>

      {owners.length === 0 ? (
        <EmptyState
          title="No owners yet"
          description="Register an owner before adding properties to the portfolio."
          href={canCreate ? "/dashboard/owners/new" : undefined}
          actionLabel={canCreate ? "Register owner" : undefined}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-danwell-navy">
              Registered owners
            </CardTitle>
            <CardDescription>{owners.length} owner record(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2 font-medium">Owner</th>
                    <th className="pb-2 font-medium">Contact</th>
                    <th className="pb-2 font-medium">ID / reference</th>
                    <th className="pb-2 font-medium">Status</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {owners.map((owner) => (
                    <tr key={owner.id} className="border-b last:border-0">
                      <td className="py-3 pr-4 align-top">
                        <Link
                          href={`/dashboard/owners/${owner.id}`}
                          className="font-medium text-danwell-navy hover:underline"
                        >
                          {owner.full_name}
                        </Link>
                        <p className="mt-0.5 max-w-64 text-xs text-muted-foreground">
                          {owner.address}
                        </p>
                      </td>
                      <td className="py-3 pr-4 align-top">
                        <p>{owner.phone}</p>
                        {owner.email ? (
                          <p className="text-xs text-muted-foreground">{owner.email}</p>
                        ) : null}
                      </td>
                      <td className="py-3 pr-4 align-top">{owner.id_reference}</td>
                      <td className="py-3 pr-4 align-top">
                        <StatusBadge
                          label={owner.is_active ? "Active" : "Inactive"}
                          tone={owner.is_active ? "positive" : "muted"}
                        />
                      </td>
                      <td className="py-3 text-right align-top">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Link
                            href={`/dashboard/owners/${owner.id}`}
                            className="rounded-lg border px-2.5 py-1 text-xs hover:bg-muted"
                          >
                            View
                          </Link>
                          {canEdit ? (
                            <>
                              <Link
                                href={`/dashboard/owners/${owner.id}/edit`}
                                className="rounded-lg border px-2.5 py-1 text-xs hover:bg-muted"
                              >
                                Edit
                              </Link>
                              <form
                                action={setOwnerActiveAction.bind(
                                  null,
                                  owner.id,
                                  !owner.is_active,
                                )}
                              >
                                <Button
                                  type="submit"
                                  variant="ghost"
                                  size="xs"
                                  className="text-xs"
                                >
                                  {owner.is_active ? "Deactivate" : "Activate"}
                                </Button>
                              </form>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
