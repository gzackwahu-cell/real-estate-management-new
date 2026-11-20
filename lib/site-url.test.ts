import assert from "node:assert/strict";
import test from "node:test";

import { LOCAL_SITE_URL, resolveSiteUrl } from "./site-url";

test("uses the configured site URL and removes trailing slashes", () => {
  assert.equal(
    resolveSiteUrl("https://danwell.example/"),
    "https://danwell.example",
  );
  assert.equal(
    resolveSiteUrl("https://danwell.example///"),
    "https://danwell.example",
  );
});

test("trims whitespace and preserves an explicitly configured base path", () => {
  assert.equal(
    resolveSiteUrl("  https://danwell.example/app  "),
    "https://danwell.example/app",
  );
});

test("uses a valid localhost fallback only outside deployed environments", () => {
  assert.equal(resolveSiteUrl(undefined), LOCAL_SITE_URL);
  assert.equal(resolveSiteUrl("   "), LOCAL_SITE_URL);
  assert.equal(resolveSiteUrl("", { isDeployed: false }), LOCAL_SITE_URL);
});

test("fails fast when a deployed site URL is missing or empty", () => {
  assert.throws(
    () => resolveSiteUrl(undefined, { isDeployed: true }),
    /NEXT_PUBLIC_SITE_URL is missing or empty/,
  );
  assert.throws(
    () => resolveSiteUrl("  ", { isDeployed: true }),
    /NEXT_PUBLIC_SITE_URL is missing or empty/,
  );
});

test("rejects malformed and non-http site URLs", () => {
  assert.throws(
    () => resolveSiteUrl("danwell.example"),
    /non-empty absolute http\(s\) URL/,
  );
  assert.throws(
    () => resolveSiteUrl("ftp://danwell.example"),
    /non-empty absolute http\(s\) URL/,
  );
});
