export default function PublicLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-16" aria-busy="true">
      <div className="h-5 w-40 animate-pulse rounded bg-danwell-navy/10" />
      <div className="mt-4 h-12 w-2/3 max-w-2xl animate-pulse rounded bg-danwell-navy/10" />
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-80 animate-pulse rounded-2xl bg-danwell-navy/10" />
        ))}
      </div>
    </div>
  );
}
