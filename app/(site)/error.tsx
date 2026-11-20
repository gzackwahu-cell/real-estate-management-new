"use client";

import Link from "next/link";

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-20 text-center">
      <p className="text-sm font-semibold tracking-wide text-danwell-teal uppercase">
        Something went wrong
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-danwell-navy">
        This page could not be loaded
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Please try again. If the problem continues, contact Danwell directly.
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-danwell-navy px-5 py-3 text-sm font-semibold text-white hover:bg-danwell-teal"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-danwell-navy/20 px-5 py-3 text-sm font-semibold hover:bg-muted"
        >
          Return home
        </Link>
      </div>
    </div>
  );
}
