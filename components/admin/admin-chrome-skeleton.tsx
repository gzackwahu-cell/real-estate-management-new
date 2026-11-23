import { DashboardSkeleton } from "@/components/ui/skeleton";

export function AdminChromeSkeleton() {
  return (
    <div className="min-h-screen bg-muted/25 md:pl-60">
      <div className="hidden h-full fixed inset-y-0 left-0 z-30 w-60 border-r border-danwell-navy/10 bg-danwell-navy md:block" />
      <header className="sticky top-0 z-20 h-14 border-b bg-background/90 px-4 backdrop-blur-md" />
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6">
        <DashboardSkeleton />
      </main>
    </div>
  );
}
