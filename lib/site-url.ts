export const LOCAL_SITE_URL = "http://localhost:3000";

export type SiteUrlOptions = {
  /** True when running in a hosted/deployed environment such as Vercel. */
  isDeployed?: boolean;
};

const MISSING_SITE_URL_ERROR =
  "NEXT_PUBLIC_SITE_URL is missing or empty. Set it to the absolute public site URL (for example, https://danwell.co.ke) in the hosting platform's environment variables for this environment, then rebuild and redeploy.";

const INVALID_SITE_URL_ERROR =
  "NEXT_PUBLIC_SITE_URL must be a non-empty absolute http(s) URL (for example, https://danwell.co.ke). Update the environment variable and rebuild.";

/**
 * Resolves the public site URL from the documented NEXT_PUBLIC_SITE_URL value.
 *
 * Empty strings are treated as missing because hosting platforms can define a
 * variable with no value. Deployed builds fail fast with an actionable error;
 * local development uses a valid localhost fallback so ordinary local checks
 * do not require a deployed domain.
 */
export function resolveSiteUrl(
  value: string | undefined,
  options: SiteUrlOptions = {},
): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    if (options.isDeployed) {
      throw new Error(MISSING_SITE_URL_ERROR);
    }
    return LOCAL_SITE_URL;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new Error(INVALID_SITE_URL_ERROR);
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    !parsed.hostname
  ) {
    throw new Error(INVALID_SITE_URL_ERROR);
  }

  return trimmed.replace(/\/+$/, "");
}
