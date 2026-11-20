import { Suspense } from "react";
import Link from "next/link";
import { OwnerForm } from "@/components/portfolio/owner-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/dal";

export default function NewOwnerPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Checking access...</p>}>
      <NewOwnerContent />
    </Suspense>
  );
}

async function NewOwnerContent() {
  await requirePermission("owners", "create");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/dashboard/owners"
          className="text-sm text-danwell-teal hover:underline"
        >
          ← Back to owners
        </Link>
        <h1 className="mt-3 text-2xl font-semibold text-danwell-navy">
          Register owner
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Owner records are private and visible only to authorized staff.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg text-danwell-navy">Owner details</CardTitle>
          <CardDescription>
            Use the owner&apos;s official ID or an internal reference number.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OwnerForm />
        </CardContent>
      </Card>
    </div>
  );
}
