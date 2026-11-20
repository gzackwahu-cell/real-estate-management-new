export function PortalLoading({
  label = "Loading portal records...",
}: {
  label?: string;
}) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <div>
        <div className="h-3 w-24 rounded bg-danwell-teal/20" />
        <div className="mt-3 h-7 w-56 rounded bg-danwell-navy/15" />
        <div className="mt-2 h-4 w-72 max-w-full rounded bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className="h-24 rounded-xl border bg-white p-4">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="mt-4 h-7 w-16 rounded bg-danwell-navy/10" />
          </div>
        ))}
      </div>
      <div className="h-48 rounded-xl border bg-white p-4">
        <div className="h-4 w-40 rounded bg-muted" />
        <div className="mt-5 h-3 w-full rounded bg-muted/70" />
        <div className="mt-3 h-3 w-5/6 rounded bg-muted/70" />
        <div className="mt-3 h-3 w-4/6 rounded bg-muted/70" />
      </div>
      <p className="sr-only">{label}</p>
    </div>
  );
}
