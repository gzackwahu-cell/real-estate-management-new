import Link from "next/link";

export default function PublicNotFound() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-20 text-center">
      <p className="text-sm font-semibold tracking-wide text-danwell-gold uppercase">
        404
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-danwell-navy">
        Property or page not found
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The listing may have been unpublished or the page address may be
        incorrect. Browse current properties instead.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <Link
          href="/properties/rent"
          className="rounded-lg bg-danwell-navy px-5 py-3 text-sm font-semibold text-white hover:bg-danwell-teal"
        >
          Properties for rent
        </Link>
        <Link
          href="/properties/sale"
          className="rounded-lg border border-danwell-navy/20 px-5 py-3 text-sm font-semibold hover:bg-muted"
        >
          Properties for sale
        </Link>
      </div>
    </div>
  );
}
