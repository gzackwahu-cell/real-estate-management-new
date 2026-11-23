import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardNotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center rounded-xl border bg-card px-6 py-12 text-center">
      <p className="text-xs font-semibold tracking-[0.16em] text-danwell-teal uppercase">
        404
      </p>
      <h1 className="mt-2 text-lg font-semibold text-danwell-navy">
        Page not found
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The page you are looking for does not exist or you do not have access.
      </p>
      <Button asChild className="mt-5">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
